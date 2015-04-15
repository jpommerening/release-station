/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular',
   'laxar_patterns',
   'require'
], function( ng, patterns, require ) {
   'use strict';

   var moduleName = 'gitHubLoginWidget';
   var module     = ng.module( moduleName, [] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$http', '$q' ];

   function Controller( $scope, $http, $q ) {
      var userUrl = $scope.features.user.url;

      $scope.widgetUrl = require.toUrl('.');
      $scope.authenticate = function() {
         $scope.eventBus.publish( 'takeActionRequest.' + $scope.features.auth.action, {} );
      };

      var userPublisher = patterns.resources.replacePublisherForFeature( $scope, 'user', {
         deliverToSender: true
      } );

      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'user' )
         .registerResourceFromFeature( 'auth', {
            onReplace: fetchUserData
         } );

      patterns.validation.handlerFor( $scope )
         .registerResourceFromFeature( 'auth', {
            onValidate: authResourceValidator( $http, $q, userUrl )
         } );

      function fetchUserData( event ) {
         var headers = {};
         var accessToken = event.data.access_token;

         if( accessToken ) {
            headers[ 'Authorization' ] = 'token ' + accessToken;
         }

         return $http( {
            method: 'GET',
            url: userUrl,
            headers: headers
         } ).then( function( response ) {
            console.log( 'Got user data', response.data );
            userPublisher( response.data );
         }, function( response ) {
            userPublisher( {} );
         } );
      }
   }

   module.controller( 'GitHubLoginWidgetController', Controller );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function authResourceValidator( $http, $q, url ) {
      return function validateAccessToken( resource, data ) {
         var accessToken = (data || {}).access_token;
         var htmlApiLink = '<a href="' + url + '" title="GitHub API">GitHub API</a>';

         if( !accessToken ) {
            return $q.when( [
               { en_US: 'Can\'t connect to ' + htmlApiLink + ' without an access token.' }
            ] );
         }

         return $http( {
            method: 'HEAD',
            url: url,
            headers: {
               'Authorization': 'token ' + accessToken
            }
         } ).then( function( data ) {
            return [
               { en_US: 'Successfully validated access token <i>' + accessToken + '</i>. ' +
                        'Received authentication success from ' + htmlApiLink + '.' }
            ];
         }, function( response ) {
            var statusText = response.status + ' ' + response.statusText;
            return $q.reject( [
                  { en_US: 'Validation of GitHub access token <i>' + accessToken + '</i> failed. ' +
                           'Received HTTP status <i>' + statusText + '</i> from ' + htmlApiLink + '.' }
            ] );
         } );

      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function validationHandlerFor( context ) {
      return {
         registerResourceFromFeature: function( featurePath, options ) {
            var feature = context.features[ featurePath ] || {};
            var resource = feature.resource;

            return this.registerResource( resource, options );
         },
         registerResource: function( resource, options ) {
            var eventBus = context.eventBus;
            var validateHandler = options.onValidate;
            var data;

            eventBus.subscribe( 'didReplace.' + resource, function( event ) {
               data = event.data;
            } );

            eventBus.subscribe( 'didUpdate.' + resource, function( event ) {
               patterns.json.applyPatch( data, event.patches );
            } );

            eventBus.subscribe( 'validateRequest.' + resource, function( event ) {
               if( !validateHandler ) {
                  return;
               }

               eventBus.publish( 'willValidate.' + resource );

               validateHandler( resource, data ).then( function( messages ) {
                  return eventBus.publish(
                     'didValidate.' + resource,
                     patterns.validation.successEvent( resource, messages )
                  );
               }, function( messages ) {
                  return eventBus.publish(
                     'didValidate.' + resource,
                     patterns.validation.errorEvent( resource, messages )
                  );
               } );
            } );

            return this;
         }
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   (function patchPatterns() {
      var original = patterns;
      patterns = Object.create( patterns );
      patterns.validation = Object.create( patterns.validation );
      patterns.validation.handlerFor = validationHandlerFor;
   })();

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );