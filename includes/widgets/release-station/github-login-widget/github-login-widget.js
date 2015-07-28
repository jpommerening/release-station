/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular',
   'laxar',
   'laxar-patterns'
], function( ng, ax, patterns ) {
   'use strict';

   var moduleName = 'gitHubLoginWidget';
   var module     = ng.module( moduleName, [] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', 'axFlowService' ];

   function Controller( $scope, axFlowService ) {
      var userUrl = $scope.features.user.url;

      $scope.authenticated = false;
      $scope.authenticate = function() {
         $scope.eventBus.publish( 'takeActionRequest.' + $scope.features.auth.action, {
            action: $scope.features.auth.action
         } );
      };

      $scope.dropdown = {
         open: false,
         toggle: function() {
            this.open = !this.open;
         },
         click: function( item ) {
            if( item.action ) {
               $scope.eventBus.publish( 'takeActionRequest.' + item.action, {
                  action: item.action,
                  data: item
               } );
               this.open = false;
               return false;
            }
            return true;
         },
         menu: $scope.features.menu.map( function( item ) {
            if( item.place ) {
               item.url = axFlowService.constructAnchor( item.place, item.parameters );
            }
            return item;
         } )
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
            onValidate: authResourceValidator( userUrl )
         } );

      patterns.flags.handlerFor( $scope )
         .registerFlagFromFeature( 'auth.flag', {
            onChange: function( state ) {
               $scope.authenticated = state;
            }
         } );

      function fetchUserData( event ) {
         var headers = {};
         var accessToken = event.data.access_token;

         if( accessToken ) {
            headers[ 'Authorization' ] = 'token ' + accessToken;
         }

         return fetch( userUrl, {
            method: 'get',
            headers: headers
         } ).then( function( response ) {
            ax.log.info( 'Got user data' );
            response.json().then( userPublisher );
         }, function( response ) {
            userPublisher( {} );
         } );
      }
   }

   module.controller( 'GitHubLoginWidgetController', Controller );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function authResourceValidator( url ) {
      return function validateAccessToken( resource, data ) {
         var accessToken = (data || {}).access_token;
         var htmlApiLink = '<a href="' + url + '" title="GitHub API">GitHub API</a>';

         if( !accessToken ) {
            return Promise.resolve( [
               { en_US: 'Can\'t connect to ' + htmlApiLink + ' without an access token.' }
            ] );
         }

         return fetch( url, {
            method: 'head',
            headers: {
               'Authorization': 'token ' + accessToken
            }
         } ).then( function( response ) {
            var i18nHtmlMessage = {
               en_US: 'Successfully validated access token <i>' + accessToken + '</i>. ' +
                      'Received authentication success from ' + htmlApiLink + '.'
            };
            ax.log.trace( i18nHtmlMessage.en_US );
            return [ i18nHtmlMessage ];
         }, function( response ) {
            var statusText = response.status + ' ' + response.statusText;
            var i18nHtmlMessage = {
               en_US: 'Validation of GitHub access token <i>' + accessToken + '</i> failed. ' +
                      'Received HTTP status <i>' + statusText + '</i> from ' + htmlApiLink + '.'
            };
            ax.log.trace( i18nHtmlMessage.en_US );
            return Promise.reject( [ i18nHtmlMessage ] );
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
