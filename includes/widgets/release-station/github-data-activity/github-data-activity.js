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
      var resources = {};

      window.eventBus = $scope.eventBus;

      var provideAction = 'provide';

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
      } );

      $scope.eventBus.subscribe( 'takeActionRequest.' + provideAction, function( event ) {
         var action = event.action;
         var resource = event.data.resource;
         var url = event.data.url;
         var topic = action + '-' + resource;
         var data = {
            resource: resource,
            url: url
         };

         return $scope.eventBus.publish( 'willTakeAction.' + topic, {
            action: action,
            data: data
         } ).then( function() {
            return fetchAndReplaceResource( resource, url )
               .then( function() {
                  return 'SUCCESS';
               }, function() {
                  return 'ERROR';
               } )
               .then( function( outcome ) {
                  return $scope.eventBus.publish( 'didTakeAction.' + topic + '.' + outcome, {
                     action: action,
                     outcome: outcome,
                     data: data
                  } );
               } );
         } );
      } );

      function fetchAndReplaceResource( resource, url ) {
         var promise = resources[ url ] || ( resources[ url ] = $http( {
            method: 'GET',
            url: url,
            headers: headers
         } ) );

         return promise.then( function( response ) {
            return $scope.eventBus.publish( 'didReplace.' + resource, {
               resource: resource,
               data: response.data
            } );
         }, function( response ) {
            // Cache failures too, but prune them after 10 seconds
            if( !resources[ url ].timeout ) {
               resources[ url ].timeout = setTimeout( function() {
                  delete resources[ url ];
               }, 10000 );
            }
            throw response;
         } );
      }
   }

   module.controller( 'GitHubDataActivityController', Controller );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
