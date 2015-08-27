/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   './helper'
], function( helper ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.injections = [ 'axEventBus', 'axFeatures', 'axFlowService' ];

   Controller.create = function create( eventBus, features, flowService ) {
      return new Controller( eventBus, features, flowService );
   };

   function Controller( eventBus, features, flowService ) {
      var oauthProvider = features.provider;
      var oauthStorage = provideStorage( 'ax.oauth.' + oauthProvider.sessionStorageId + '.' );

      var authOnActions = features.auth.onActions;
      var dropAuthOnActions = features.auth.drop.onActions;

      var authToken = features.auth.token;
      var authResourceName = features.auth.resource;
      var authFlagName = features.auth.flag;

      var auth = {
         data: oauthStorage.getItem( 'data' ) || authToken && {
            access_token: authToken,
            token_type: 'bearer',
            scopes: ''
         },
         state: oauthStorage.getItem( 'state' ) || generateRandomString(),
         save: false
      };

      var promise = new Promise( function( resolve, reject ) {
         if( helper.search.code && ( helper.search.state === auth.state ) ) {
            resolve( getAccessToken( helper.search.code ) );
         } else if( helper.hash.access_token ) {
            resolve( helper.hash );
         } else if( auth.data ) {
            resolve( auth.data );
         } else {
            reject();
         }
      } );

      authOnActions.forEach( function( action ) {
         eventBus.subscribe( 'takeActionRequest.' + action, redirectToAuthProvider );
      } );

      dropAuthOnActions.forEach( function( action ) {
         eventBus.subscribe( 'takeActionRequest.' + action, dropAuth );
      } );

      eventBus.subscribe( 'saveRequest.' + authResourceName, saveAuthResource );

      eventBus.subscribe( 'beginLifecycleRequest', function() {
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
         return eventBus.publish( 'didReplace.' + authResourceName, {
            resource: authResourceName,
            data: data
         } );
      }

      function publishAuthFlag( state ) {
         return eventBus.publish( 'didChangeFlag.' + authFlagName + '.' + state, {
            flag: authFlagName,
            state: state
         } );
      }

      function saveAuthResource() {
         if( auth.data ) {
            oauthStorage.setItem( 'data', auth.data );
         } else {
            oauthStorage.removeItem( 'data' );
            console.log( 'remove' );
         }

         return eventBus.publish( 'didSave.' + authResourceName, {
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

      function dropAuth() {
         auth.data = undefined;

         return publishAuthFlag( false )
            .then( saveAuthResource );
      }

      function getAccessToken( code ) {
         // discard the previous random state
         auth.state = generateRandomString();
         oauthStorage.removeItem( 'state' );

         // ask the provider for an access token
         fetch( {
            method: 'post',
            ur: oauthProvider.accessTokenUrl + '?' + encodeArguments( {
               client_id: oauthProvider.clientId,
               client_secret: oauthProvider.clientSecret,
               code: code
            } ),
            headers: {
               'Accept': 'application/x-www-urlencoded, application/json'
            }
         } ).then( function( response ) {
               var contentType = response.headers.get( 'Content-Type' );
               var urlencoded = /^application\/x-www-urlencoded(; *)?$/.test( contentType );
               return urlencoded ? response.text().then( decodeArguments ) : response.json();
         } );
      }

      function validateAuthResource() {
         return eventBus.publishAndGatherReplies( 'validateRequest.' + authResourceName, {
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
            setCookie( key, '', '; max-age=0' );
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

   return {
      name: 'oauth-activity',
      create: Controller.create,
      injections: Controller.injections
   };

} );
