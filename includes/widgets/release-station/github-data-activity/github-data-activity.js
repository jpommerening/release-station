/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular',
   'laxar-patterns'
], function( ng, patterns ) {
   'use strict';

   var moduleName = 'gitHubDataActivity';
   var module     = ng.module( moduleName, [] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$http', '$q' ];

   function Controller( $scope, $http, $q ) {
      var authResourceName = $scope.features.auth.resource;
      var authFlagName = $scope.features.auth.flag;
      var authData;

      var baseOptions = {
         headers: {},
         onEvent: deduplicate( eventsPublisher.push ),
         onError: $scope.eventBus.publish.bind( $scope.eventBus, 'didEncounterError.HTTP' )
      };

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

   module.controller( 'GitHubDataActivityController', Controller );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
