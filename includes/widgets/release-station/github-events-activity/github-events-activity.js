/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular',
   'laxar_patterns',
   './http-event-stream',
   './socket-event-stream'
], function( ng, patterns, HttpEventStream, SocketEventStream ) {
   'use strict';

   var moduleName = 'gitHubEventsActivity';
   var module     = ng.module( moduleName, [] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$http', '$q' ];

   function Controller( $scope, $http, $q ) {
      var authResourceName = $scope.features.auth.resource;
      var authFlagName = $scope.features.auth.flag;
      var authData;

      var eventsPublisher = {
         replace: throttleReplacements( patterns.resources.replacePublisherForFeature( $scope, 'events' ) ),
         update: throttleUpdates( patterns.resources.updatePublisherForFeature( $scope, 'events' ) ),
         push: function( item ) {
            return eventsPublisher.update( [ { op: 'add', path: '/-', value: item } ] );
         }
      };

      var EventStream = {
         'http': HttpEventStream,
         'https': HttpEventStream,
         'socket.io': SocketEventStream
      };

      var baseOptions = {
         headers: {},
         onEvent: deduplicate( eventsPublisher.push ),
         onError: $scope.eventBus.publish.bind( $scope.eventBus, 'didEncounterError.EVENT_STREAM' )
      };

      var streams = $scope.features.events.sources.map( function( source ) {
         var options = Object.create( baseOptions );

         options.url = source.url;
         options.events = source.events;

         return new EventStream[ source.type ]( options );
      } );

      if( authResourceName ) {
         $scope.eventBus.subscribe( 'didReplace.' + authResourceName, function( event ) {
            authData = event.data;
         } );
      }

      if( authFlagName ) {
         $scope.eventBus.subscribe( 'didChangeFlag.' + authFlagName, function() {
            baseOptions.headers[ 'Authorization' ] = 'token ' + authData.access_token;
            connectStreams( streams );
         } );
      }

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function() {
         eventsPublisher.replace( [] );
         if( authData ) {
            baseOptions.headers[ 'Authorization' ] = 'token ' + authData.access_token;
            connectStreams( streams );
         }
      } );

      $scope.eventBus.subscribe( 'endLifecycleRequest', function() {
         disconnectStreams( streams );
      } );
   }

   module.controller( 'GitHubEventsActivityController', Controller );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Connect the given list of streams.
    */
   function connectStreams( streams ) {
      streams.forEach( function( stream ) {
         stream.connect( stream.options.url );
      } );

      console.log( streams );
   }

   /**
    * Disconnect the given list of streams.
    */
   function disconnectStreams( streams ) {
      streams.forEach( function( stream ) {
         stream.disconnect();
      } );
   }

   /**
    * Cross the given list of streams.
    * (!!!NEVER EVER CALL THIS!!!)
    */
   function crossStreams( streams ) {
      haha, jk;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function deduplicate( callback ) {
      var ids = [];
      return function( event ) {
         if( !event.id ) {
            // TODO: deep compare
         } else if( ids.indexOf( event.id ) >= 0 ) {
            return;
         } else {
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

   return module;

} );