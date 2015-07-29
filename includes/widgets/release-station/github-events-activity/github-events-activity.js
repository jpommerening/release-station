/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'laxar-patterns',
   './http-event-stream',
   './socket-event-stream'
], function( patterns, HttpEventStream, SocketEventStream ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var EventStream = {
      'http': HttpEventStream,
      'https': HttpEventStream,
      'socket.io': SocketEventStream
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var nullPublisher = {};
   nullPublisher.replace = nullPublisher.update = nullPublisher.update = function() {};

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.injections = [ 'axEventBus', 'axFeatures' ];

   Controller.create = function create( eventBus, features ) {
      return new Controller( eventBus, features );
   };

   function Controller( eventBus, features ) {
      this.eventBus = eventBus;
      this.features = features;

      var eventsPublisher = ( features.events && features.events.resource ) ? {
         replace: throttleReplacements( patterns.resources.replacePublisherForFeature( this, 'events' ) ),
         update: throttleUpdates( patterns.resources.updatePublisherForFeature( this, 'events' ) ),
         push: function( item ) {
            return eventsPublisher.update( [ { op: 'add', path: '/-', value: item } ] );
         }
      } : nullPublisher;

      var baseOptions = {
         headers: {},
         onEvent: deduplicate( eventsPublisher.push ),
         onError: eventBus.publish.bind( eventBus, 'didEncounterError.GITHUB_EVENTS' )
      };

      var streams = [];
      var ready = authHandler( this, 'auth' )
                     .then( setAuthHeader )
                     .then( waitForEvent( 'beginLifecycleRequest' ) )
                     .then( function() { eventsPublisher.replace( [] ) } );

      if( features.events.sources.resource ) {
         patterns.resources.handlerFor( this )
            .registerResourceFromFeature( 'events.sources', {
               onReplace: function( event ) {
                  disconnectStreams( streams );
                  streams = provideStreams( event.data );
               },
               onUpdate: function( event ) {
                  applyPatches( streams, event.patches );
               }
            } );
      } else if( features.events.sources.length ) {
         streams = provideStreams( features.events.sources );
      }

      var provideActions = features.events.onActions || [];
      var provideHandler = createRequestHandler( eventBus, function( source ) {
         var stream = provideStream( source );
         streams.push( stream );
         return stream;
      } );

      provideActions.forEach( function( action ) {
         eventBus.subscribe( 'takeActionRequest.' + action, provideHandler );
      } );

      eventBus.subscribe( 'beginLifecycleRequest', function() {
      } );

      eventBus.subscribe( 'endLifecycleRequest', function() {
         disconnectStreams( streams );
      } );

      function setAuthHeader( data ) {
         if( data && data.access_token ) {
            baseOptions.headers[ 'Authorization' ] = 'token ' + data.access_token;
         } else {
            delete baseOptions.headers[ 'Authorization' ];
         }
      }

      function waitForEvent( event ) {
         var promise = new Promise( function( resolve, reject ) {
            eventBus.subscribe( event, function wait() {
               eventBus.unsubscribe( wait );
               resolve();
            } );
         } );

         return function() {
            return promise;
         };
      }

      function provideStreams( sources ) {
         return sources.map( provideStream );
      }

      function provideStream( source ) {
         var options = Object.create( baseOptions );

         options.url = source.url;
         options.events = source.events;

         var stream = new EventStream[ source.type ]( options );

         return ready.then( function() {
            stream.connect( source.url );
            return stream;
         } );
      }

      function applyPatches( streams, patches ) {
         function disconnectStream( pointer ) {
            disconnectStreams( [ patterns.json.getPointer( streams, pointer ) ] );
         }

         for( var i = 0; i < patches.length; i++ ) {
            switch( patches[ i ].op ) {
               case 'add':
                  patches[ i ].value = provideStream( patches[ i ].value );
                  break;
               case 'remove':
                  disconnectStream( patches[ i ].path );
                  break;
               case 'replace':
                  disconnectStream( patches[ i ].path );
                  patches[ i ].value = provideStream( patches[ i ].value );
                  break;
            }
         }
         patterns.json.applyPatch( streams, patches );
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function authHandler( context, name ) {
      var feature = context.features[ name ];
      var resource = feature.resource;
      var flag = feature.flag;

      return new Promise( function( resolve, reject ) {
         var data = {};
         var state = !flag;

         if( !resource && !flag ) {
            return resolve( data );
         }

         if( resource ) {
            context.eventBus.subscribe( 'didReplace.' + resource, function( event ) {
               data = event.data;
               if( state ) {
                  resolve( data );
               }
            } );
         }

         if( flag ) {
            context.eventBus.subscribe( 'didChangeFlag.' + flag, function( event ) {
               state = event.state;
               if( !state ) {
                  reject( data );
               } else if( data ) {
                  resolve( data );
               }
            } );
         }
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function disconnectStreams( streams ) {
      return Promise.all( streams ).then( function( streams ) {
         streams.forEach( function( stream ) {
            stream.disconnect();
         } );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createRequestHandler( eventBus, provider ) {
      var OUTCOME_ERROR = patterns.actions.OUTCOME_ERROR;
      var OUTCOME_SUCCESS = patterns.actions.OUTCOME_SUCCESS;

      return function( event ) {
         var action = event.action;
         var data = event.data;
         var topic = action;

         return eventBus.publish( 'willTakeAction.' + topic, {
            action: action,
            data: data
         } ).then( function() {
            return provider( data );
         } ).then( function() {
            return OUTCOME_SUCCESS;
         }, function() {
            return OUTCOME_ERROR;
         } ).then( function( outcome ) {
            return eventBus.publish( 'didTakeAction.' + topic + '.' + outcome, {
               action: action,
               outcome: outcome,
               data: data
            } );
         } );
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function deduplicate( callback ) {
      var ids = [];
      return function( event ) {
         if( event.id ) {
            if( ids.indexOf( event.id ) >= 0 ) {
               return;
            }
            ids.push( event.id );
         }
         return callback( event );
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function throttleReplacements( publisher, options ) {
      var timeout;
      var buffer;
      var maxLatency = (options || {}).maxLatency || 150;

      function replace() {
         var data = buffer;
         publisher( buffer );
         timeout = setTimeout( function() {
            if( buffer !== data ) {
               publisher( buffer );
            }
            buffer = null;
         }, maxLatency );
      }

      return function( data ) {
         var first = !buffer;

         buffer = data;

         if( first ) {
            replace();
         }
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function throttleUpdates( publisher, options ) {
      var timeout;
      var batch = [];
      var maxBatchSize = (options || {}).maxBatchSize || 10;
      var maxLatency = (options || {}).maxLatency || 150;

      function update() {
         if( batch.length ) {
            publisher( batch );
            batch = [];
         }
         timeout = null;
      }

      return function( patches ) {
         batch.push.apply( batch, patches );

         if( batch.length >= maxBatchSize ) {
            update();
         } else if( !timeout ) {
            timeout = setTimeout( update, maxLatency );
         }
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      name: 'githubEventsActivity',
      create: Controller.create,
      injections: Controller.injections
   };

} );
