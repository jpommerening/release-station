/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 */
define( [
   'angular',
   'laxar_patterns',
   './http-event-stream',
   './socket-event-stream'
], function( ng, patterns, HttpEventStream, SocketEventStream ) {
   'use strict';

   var moduleName = 'gitHubEventSource';
   var module     = ng.module( moduleName, [] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$http', '$q' ];

   function Controller( $scope, $http, $q ) {
      var authResourceName = $scope.features.auth.resource;
      var authFlagName = $scope.features.auth.flag;
      var authAction = $scope.features.auth.action;
      var authData = $scope.features.auth.token && {
         access_token: $scope.features.auth.token,
         token_type: 'bearer',
         scopes: ''
      };

      var eventsPublisher = {
         replace: throttleReplacements( patterns.resources.replacePublisherForFeature( $scope, 'events' ) ),
         update: throttleUpdates( patterns.resources.updatePublisherForFeature( $scope, 'events' ) ),
         push: function( item ) {
            return eventsPublisher.update( [ { op: 'add', path: '/-', value: item } ] );
         }
      };

      var ids = [];
      function onEvent( event ) {
         if( event.id && ids.indexOf( event.id ) >= 0 ) {
            return;
         }
         ids.push( event.id );
         eventsPublisher.push( event );
      }

      function onError( error ) {
         $scope.eventBus.publish( 'didEncounterError.EVENT_STREAM', error );
      }

      var baseOptions = {
         onEvent: onEvent,
         onError: onError,
         headers: {}
      };

      var streams = $scope.features.events.sources.map( function( source ) {
         var options = Object.create( baseOptions );

         options.url = source.url;
         options.events = source.events;

         switch( source.type ) {
            case 'http':
            case 'https':
               return new HttpEventStream( options );
            case 'socket.io':
               return new SocketEventStream( options );
         }
      } );

      if( authResourceName ) {
         $scope.eventBus.subscribe( 'didReplace.' + authResourceName, function( event ) {
            authData = event.data;
         } );
      }

      if( authFlagName ) {
         $scope.eventBus.subscribe( 'didChangeFlag.' + authFlagName, function() {
            baseOptions.headers[ 'Authorization' ] = 'token ' + authData.access_token;
         } );
      }

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function() {
         eventsPublisher.replace( [] );
         streams.forEach( function( stream ) {
            stream.connect( stream.options.url );
         } );
      } );

      $scope.eventBus.subscribe( 'endLifecycleRequest', function() {
         streams.forEach( function( stream ) {
            stream.disconnect();
         } );
      } );
   }

   module.controller( 'GitHubEventSourceController', Controller );

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
