/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular',
   'laxar-patterns',
   './http-event-stream',
   './socket-event-stream'
], function( ng, patterns, HttpEventStream, SocketEventStream ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var EventStream = {
      'http': HttpEventStream,
      'https': HttpEventStream,
      'socket.io': SocketEventStream
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$q' ];

   function Controller( $scope, $q ) {
      var eventsPublisher = {
         replace: throttleReplacements( patterns.resources.replacePublisherForFeature( $scope, 'events' ) ),
         update: throttleUpdates( patterns.resources.updatePublisherForFeature( $scope, 'events' ) ),
         push: function( item ) {
            return eventsPublisher.update( [ { op: 'add', path: '/-', value: item } ] );
         }
      };

      var baseOptions = {
         headers: {},
         onEvent: deduplicate( eventsPublisher.push ),
         onError: $scope.eventBus.publish.bind( $scope.eventBus, 'didEncounterError.GITHUB_EVENTS' )
      };

      var authorized = authHandler( $scope, $q, 'auth' ).then( setAuthHeader );

      var streams = $scope.features.events.sources.map( provideStream );

      var provideActions = [ 'provide-events' ];
      var provideHandler = createRequestHandler( $scope.eventBus, function( data ) {
         return authorized.then( provideStream.bind( null, data ) );
      } );

      provideActions.forEach( function( action ) {
         $scope.eventBus.subscribe( 'takeActionRequest.' + action, provideHandler );
      } );

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function() {
         eventsPublisher.replace( [] );
         authorized.then( function() {
            connectStreams( streams );
         } );
      } );

      $scope.eventBus.subscribe( 'endLifecycleRequest', function() {
         disconnectStreams( streams );
      } );

      function setAuthHeader( data ) {
         if( data && data.access_token ) {
            baseOptions.headers[ 'Authorization' ] = 'token ' + data.access_token;
         } else {
            delete baseOptions.headers[ 'Authorization' ];
         }
      }

      function provideStream( data ) {
         var options = Object.create( baseOptions );

         options.url = data.url;
         options.events = data.events;

         return new EventStream[ data.type ]( options );
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

   function authHandler( context, q, name ) {
      var feature = context.features[ name ];
      var resource = feature.resource;
      var flag = feature.flag;

      return q( function( resolve, reject ) {
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

   return ng.module( 'gitHubEventsActivity', [] ).controller( 'GitHubEventsActivityController', Controller );

} );
