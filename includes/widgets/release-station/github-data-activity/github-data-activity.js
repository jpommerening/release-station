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
      var headers = {};

      window.eventBus = $scope.eventBus;

      var provideAction = 'provide';

      function provideResource( resource, url ) {
         return $http( {
            method: 'GET',
            url: url,
            headers: headers
         } ).then( function( response ) {
            return $scope.eventBus.publish( 'didReplace.' + resource, {
               resource: resource,
               data: response.data
            } );
         } );
      }

      if( authResourceName ) {
         $scope.eventBus.subscribe( 'didReplace.' + authResourceName, function( event ) {
            authData = event.data;
         } );
      }

      if( authFlagName ) {
         $scope.eventBus.subscribe( 'didChangeFlag.' + authFlagName, function() {
            headers[ 'Authorization' ] = 'token ' + authData.access_token;
         } );
      }

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function() {
         if( authData ) {
            headers[ 'Authorization' ] = 'token ' + authData.access_token;
         }
      } );

      $scope.eventBus.subscribe( 'endLifecycleRequest', function() {
         disconnectStreams( streams );
      } );

      $scope.eventBus.subscribe( 'takeActionRequest.' + provideAction, function( event ) {
         var action = event.action;
         var resource = event.data.resource;
         var url = event.data.url;

         $scope.eventBus.publish( 'willTakeAction.' + action + '-' + resource, {
            action: action,
            data: {
               resource: resource,
               url: url
            }
         } );

         console.log( event );

         provideResource( resource, url )
            .then( function() {
               return 'SUCCESS';
            }, function() {
               return 'ERROR';
            } )
            .then( function( outcome ) {
               return {
                  action: action,
                  outcome: outcome,
                  data: {
                     resource: resource,
                     url: url
                  }
               };
            } )
            .then( function( responseEvent ) {
               $scope.eventBus.publish( 'didTakeAction.' + responseEvent.action + '-' + resource + '.' + responseEvent.outcome, responseEvent );
            } );
      } );

   }


   module.controller( 'GitHubDataActivityController', Controller );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
