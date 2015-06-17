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

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$http', '$q' ];

   function Controller( $scope, $http, $q ) {
      var baseOptions = {
         method: 'GET',
         headers: {}
      };

      var authorized = authHandler( $scope, $q, 'auth' ).then( setAuthHeader );

      var resources = {};

      var provideActions = [ 'provide-resource' ];
      var provideHandler = createRequestHandler( $scope.eventBus, function( data ) {
         return authorized.then( provideResource.bind( null, data ) );
      } );

      provideActions.forEach( function( action ) {
         $scope.eventBus.subscribe( 'takeActionRequest.' + action, provideHandler );
      } );

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function() {
      } );

      $scope.eventBus.subscribe( 'endLifecycleRequest', function() {
      } );

      function setAuthHeader( data ) {
         if( data && data.access_token ) {
            baseOptions.headers[ 'Authorization' ] = 'token ' + data.access_token;
         } else {
            delete baseOptions.headers[ 'Authorization' ];
         }
      }

      function provideResource( data ) {
         var options = Object.create( baseOptions );

         options.url = data.url;

         var promise = resources[ data.resource ] || ( resources[ data.resource ] = $http( options ) );

         return promise.then( null, function( error ) {
            // Cache failures too, but prune them after 10 seconds
            if( !promise.timeout ) {
               promise.timeout = setTimeout( function() {
                  delete resources[ data.resource ];
               }, 10000 );
            }
            throw error;
         } );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function authHandler( context, q, name ) {
      var feature = context.features[ name ];
      var resource = feature.resource;
      var flag = feature.flag;

      return q( function( resolve, reject ) {
         var data = {};
         var state = !flag

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
         var resource = data.resource;
         var topic = action + '-' + resource;

         return eventBus.publish( 'willTakeAction.' + topic, {
            action: action,
            data: data
         } ).then( function() {
            return provider( data );
         } ).then( function( response ) {
            return eventBus.publish( 'didReplace.' + resource, {
               resource: resource,
               data: response.data
            } );
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

   return ng.module( 'gitHubDataActivity', [] ).controller( 'GitHubDataActivityController', Controller );

} );
