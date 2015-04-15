/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 */
define( [
   'angular',
   './helper'
], function( ng, helper ) {
   'use strict';

   var moduleName = 'oAuthActivity';
   var module     = ng.module( moduleName, [] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$http', '$location', 'axFlowService' ];

   function Controller( $scope, $http, $location, flowService ) {
      var oauthProvider = $scope.features.provider;
      var oauthStorage = provideStorage( 'ax.oauth.' + oauthProvider.sessionStorageId + '.' );
      var oauthRandomState = oauthStorage.getItem( 'nonce' ) || generateRandomString();
      var oauthTarget = oauthStorage.getItem( 'target' ) || flowService.constructAbsoluteUrl( '_self' );

      var authResourceName = $scope.features.auth.resource;
      var authFlagName = $scope.features.auth.flag;

      var authData = oauthStorage.getItem( 'data' ) || undefined;
      var authState = oauthStorage.getItem( 'state' ) || false;
      var authRetries = oauthStorage.getItem( 'retries' ) || 0;

      var authenticating = false;

      function getAccessToken( code ) {
         /* discard the nonce */
         oauthRandomState = generateRandomString();
         oauthStorage.removeItem( 'nonce' );
         obtainAccessToken( $http, oauthProvider.accessTokenUrl, {
            client_id: oauthProvider.clientId,
            client_secret: oauthProvider.clientSecret,
            code: code
         } ).success( function( data ) {
            authData = data;
         } ).error( function( data, status, headers ) {
            authData = data;

            $scope.eventBus.publish( 'didEncounterError.HTTP_POST-OAUTH_TOKEN', {
               code: status,
               message: 'Failed to obtain an OAuth access token.',
               data: data
            } );
         } ).then( function() {
            oauthStorage.setItem( 'data', authData );
         } );
      }

      if( !authState && helper.hash.access_token ) {
         authData = helper.hash;
         oauthStorage.setItem( 'data', authData );
      }
      if( !authState && helper.search.code && (helper.search.state === oauthRandomState) &&
          !authenticating ) {
         authenticating = true;
         $scope.eventBus.subscribe( 'didNavigate', function( event ) {
            getAccessToken( helper.search.code );
         } );
      }

      $scope.features.auth.onActions.forEach( function( action ) {
         $scope.eventBus.subscribe( 'takeActionRequest.' + action, authenticate );
      } );

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function() {
         publishAuthResource()
            .then( validateAuthResource )
            .then( publishAuthFlag, retryAuthentication );
      } );

      function retryAuthentication() {
         if( authRetries < 2 ) {
            authRetries += 1;
            authData = undefined;
            oauthStorage.setItem( 'retries', authRetries );
            oauthStorage.removeItem( 'data' );
            authenticate();
         }
      }

      function validateAuthResource() {
         return $scope.eventBus.publishAndGatherReplies( 'validateRequest.' + authResourceName, {
            resource: authResourceName
         } ).then( function( replies ) {
            var failures = [];

            replies.forEach( function( reply ) {
               if( reply.event.outcome === 'ERROR' ) {
                  failures.push( reply.event );
               }
            } );

            if( failures.length > 0 ) {
               throw new Error( 'Error validating access token' );
            }

            authState = true;
            oauthStorage.setItem( 'state', authState );

            return replies;
         } );
      }

      function publishAuthFlag() {
         return $scope.eventBus.publish( 'didChangeFlag.' + authFlagName + '.' + authState, {
            flag: authFlagName,
            state: authState
         } );
      }

      function publishAuthResource() {
         return $scope.eventBus.publish( 'didReplace.' + authResourceName, {
            resource: authResourceName,
            data: authData
         } );
      }

      function authenticate() {
         if( typeof authData === 'undefined' && !authenticating ) {
            authenticating = true;

            var oauthParameters = {
               client_id: oauthProvider.clientId,
               redirect_uri: oauthProvider.redirectUrl || flowService.constructAbsoluteUrl( '_self' ),
               response_type: oauthProvider.clientSecret ? 'code' : 'token',
               scope: oauthProvider.scope,
               state: oauthRandomState
            };

            oauthStorage.setItem( 'target', oauthTarget );
            oauthStorage.setItem( 'nonce', oauthRandomState );

            window.location.href = oauthProvider.url + '?' + encodeArguments( oauthParameters ).join( '&' );
         }
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function obtainAccessToken( $http, url, params ) {
      return $http( {
         method: 'POST',
         url: url,
         params: {
            client_id: params.client_id,
            client_secret: params.client_secret,
            code: params.code
         },
         headers: {
            'Accept': 'application/x-www-urlencoded, application/json'
         },
         transformResponse: $http.defaults.transformResponse.concat( [ function( data, headers ) {
            var contentType = headers( 'Content-Type' );

            if( typeof data === 'string' && /^application\/x-www-urlencoded(; *)?$/.test( contentType ) ) {
               data = decodeArguments( data );
            }

            return data;
         } ] )
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function generateRandomString() {
      var MAX_INT = Number.MAX_SAFE_INTEGER || 9007199254740991; // Math.pow( 2, 53 ) - 1
      return Math.floor( Math.random() * MAX_INT ).toString( 16 );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function provideStorage( prefix ) {
      var backend = window.sessionStorage || window.localStorage || cookieStorageFallback( 900 );

      return {
         getItem: function( key ) {
            return JSON.parse( backend.getItem( prefix + key ) );
         },
         setItem: function( key, value ) {
            backend.setItem( prefix + key, JSON.stringify( value ) );
         },
         removeItem: function( key ) {
            backend.removeItem( prefix + key );
         }
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function cookieStorageFallback( maxAge ) {
      var options = maxAge ? '; max-age=' + maxAge : '';

      function allCookies() {
         return decodeArguments( document.cookie.split( /; */g ) );
      }

      function setCookie( key, value, options ) {
         document.cookie = encodeURIComponent( key ) + '=' + encodeURIComponent( value ) + options;
      }

      return {
         getItem: function( key ) {
            return allCookies()[ key ];
         },
         setItem: function( key, value ) {
            setCookie( key, value, options );
         },
         removeItem: function( key ) {
            setCookie( key, value, '; max-age=0' );
         }
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function encodeArguments( object ) {
      return Object.keys( object ).filter( function( key ) {
         return typeof key !== 'undefined';
      } ).map( function( key ) {
         return encodeURIComponent( key ) + '=' + encodeURIComponent( object[ key ] );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function decodeArguments( array ) {
      return array.reduce( function( object, parameter ) {
         var parts = parameter.split( '=', 2 );
         object[ decodeURIComponent( parts[ 0 ] ) ] = decodeURIComponent( parts[ 1 ] );
         return object;
      }, {} );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.controller( 'OAuthActivityController', Controller );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
