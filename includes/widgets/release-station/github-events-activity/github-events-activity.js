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

   Controller.injections = [ 'axEventBus', 'axFeatures' ];

   Controller.create = function create( eventBus, features ) {
      return new Controller( eventBus, features );
   };

   function Controller( eventBus, features ) {
      this.eventBus = eventBus;
      this.features = features;

      var eventsPublisher = {
         replace: throttleReplacements( patterns.resources.replacePublisherForFeature( this, 'events' ) ),
         update: throttleUpdates( patterns.resources.updatePublisherForFeature( this, 'events' ) ),
         push: function( item ) {
            return eventsPublisher.update( [ { op: 'add', path: '/-', value: item } ] );
         }
      };

      var baseOptions = {
         headers: {},
         onEvent: deduplicate( eventsPublisher.push ),
         onError: eventBus.publish.bind( eventBus, 'didEncounterError.GITHUB_EVENTS' )
      };

      var ready = false;
      var authorized = authHandler( this, 'auth' ).then( setAuthHeader );
      var streams = [];

      if( features.events.sources.resource ) {
         patterns.resources.handlerFor( this )
            .registerResourceFromFeature( 'events.sources', {
               onReplace: function( event ) {
                  disconnectStreams( streams );
                  streams = [];
                  provideStreams( event.data );
               },
               onUpdate: function( event ) {
                  var patches = event.patches;

                  for( var i = 0; i < patches.length; i++ ) {
                     switch( patches[ i ].op ) {
                        case 'add':
                           patches[ i ].value = provideStream( patches[ i ].value );
                           break;
                        case 'remove':
                           patterns.json.getPointer( streams, patches[ i ].path ).disconnect();
                           break;
                        case 'replace':
                           patches[ i ].value = provideStream( patches[ i ].value );
                           patterns.json.getPointer( streams, patches[ i ].path ).disconnect();
                           break;
                     }
                  }

                  patterns.json.applyPatch( streams, patches );
               }
            } );
      } else if( features.events.sources.length ) {
         provideStreams( features.events.sources );
      }

      var provideActions = [ 'provide-events' ];
      var provideHandler = createRequestHandler( eventBus, provideStream );

      provideActions.forEach( function( action ) {
         eventBus.subscribe( 'takeActionRequest.' + action, provideHandler );
      } );

      eventBus.subscribe( 'beginLifecycleRequest', function() {
         eventsPublisher.replace( [] );
         authorized.then( function() {
            ready = true;
            connectStreams( streams );
         } );
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

      function provideStreams( sources ) {
         return sources.map( provideStream );
      }

      function provideStream( source ) {
         var options = Object.create( baseOptions );

         options.url = source.url;
         options.events = source.events;

         var stream = new EventStream[ source.type ]( options );

         if( ready ) {
            stream.connect( source.url );
         }

         streams.push( stream );

         return stream;
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Connect the given list of streams.
    */
   function connectStreams( streams ) {
      streams.forEach( function( stream ) {
         if( !stream.connected ) {
            stream.connect( stream.options.url );
            stream.connected = true;
         }
      } );
   }

   /**
    * Disconnect the given list of streams.
    */
   function disconnectStreams( streams ) {
      streams.forEach( function( stream ) {
         if( stream.connected ) {
            stream.disconnect();
            stream.connected = false;
         }
      } );
   }

   /**
    * Cross the given list of streams.
    * Note: Don't call. It would be bad.
    */
   function crossStreams( streams ) {
      var haha, jk;
      return [
         { P: 'I\'m fuzzy on the whole good/bad thing. What do you mean, "bad"?' },
         { E: 'Try to imagine all life as you know it stopping instantaneously and every molecule in your ' +
              'body exploding at the speed of light.' },
         { P: 'Right. That\'s bad. Okay. All right. Important safety tip. Thanks, Egon.' }
      ] && jk;
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
