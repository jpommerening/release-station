/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular',
   './helper'
], function( ng, helper ) {
   'use strict';

   var moduleName = 'oAuthActivity';
   var module     = ng.module( moduleName, [] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$http', '$q', '$location', 'axFlowService' ];

   function Controller( $scope, $http, $q, $location, flowService ) {
      var oauthProvider = $scope.features.provider;
      var oauthStorage = provideStorage( 'ax.oauth.' + oauthProvider.sessionStorageId + '.' );

      var authOnActions = $scope.features.auth.onActions;
      var authResourceName = $scope.features.auth.resource;
      var authFlagName = $scope.features.auth.flag;

      var auth = {
         data: oauthStorage.getItem( 'data' ),
         state: oauthStorage.getItem( 'state' ) || generateRandomString(),
         save: false
      };

      var promise = $q( function( resolve, reject ) {
         if( helper.search.code && ( helper.search.state === auth.state ) ) {
            resolve( getAccessToken( search.code ) );
         } else if( helper.hash.access_token ) {
            resolve( helper.hash );
         } else if( auth.data ) {
            resolve( auth.data );
         } else {
            reject();
         }
      } );

      authOnActions.forEach( function( action ) {
         $scope.eventBus.subscribe( 'takeActionRequest.' + action, redirectToAuthProvider );
      } );

      $scope.eventBus.subscribe( 'saveRequest.' + authResourceName, saveAuthResource );

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function() {
         promise
            .then( function( data ) {
               if( auth.data !== data ) {
                  auth.save = true;
                  auth.data = data;
               }

               return data;
            } )
            .then( publishAuthResource )
            .then( validateAuthResource )
            .then( publishAuthFlag )
            .then( function() {
               if( auth.save ) {
                  return saveAuthResource();
               }
            } );
      } );

      function publishAuthResource( data ) {
         return $scope.eventBus.publish( 'didReplace.' + authResourceName, {
            resource: authResourceName,
            data: data
         } );
      }

      function publishAuthFlag( state ) {
         return $scope.eventBus.publish( 'didChangeFlag.' + authFlagName + '.' + state, {
            flag: authFlagName,
            state: state
         } );
      }

      function saveAuthResource() {
         oauthStorage.setItem( 'data', auth.data );

         return $scope.eventBus.publish( 'didSave.' + authResourceName, {
            resource: authResourceName,
            outcome: 'SUCCESS'
         } );
      }

      function redirectToAuthProvider() {
         var parameters = {
            client_id: oauthProvider.clientId,
            redirect_uri: oauthProvider.redirectUrl || flowService.constructAbsoluteUrl( '_self' ),
            response_type: oauthProvider.clientSecret ? 'code' : 'token',
            scope: oauthProvider.scope,
            state: auth.state
         };

         oauthStorage.setItem( 'state', auth.state );

         window.location.href = oauthProvider.url + '?' + encodeArguments( parameters ).join( '&' );
      }

      function getAccessToken( code ) {
         // discard the previous random state
         auth.state = generateRandomString();
         oauthStorage.removeItem( 'state' );

         // ask the provider for an access token
         $http( {
            method: 'POST',
            ur: oauthProvider.accessTokenUrl,
            params: {
               client_id: oauthProvider.clientId,
               client_secret: oauthProvider.clientSecret,
               code: code
            },
            headers: {
               'Accept': 'application/x-www-urlencoded, application/json'
            },
            transformResponse: $http.defaults.transformResponse.concat( [ function( data, headers ) {
               var urlencoded = /^application\/x-www-urlencoded(; *)?$/.test( headers( 'Content-Type' ) );
               return urlencoded ? decodeArguments( data ) : data;
            } ] )
         } ).then( function( response ) {
            return response.data;
         } );
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

            if( failures.length > 0 || replies <= 0 ) {
               return false;
            } else {
               return true;
            }
         } );
      }

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
