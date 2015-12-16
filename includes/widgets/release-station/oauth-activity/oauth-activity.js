/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'json!./widget.json',
   './helper'
], function( spec, helper ) {
   'use strict';

   var CONFIG_KEY = 'widgets.release-station.' + spec.name;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.injections = [ 'axEventBus', 'axFeatures', 'axFlowService', 'axConfiguration' ];

   Controller.create = function create( eventBus, features, flowService, configuration ) {
      return new Controller( eventBus, features, flowService, configuration );
   };

   function Controller( eventBus, features, flowService, configuration ) {
      var oauthProvider = features.provider || configuration.get( CONFIG_KEY + '.provider' );
      var oauthStorage = provideStorage( 'ax.oauth.' + oauthProvider.sessionStorageId + '.' );

      var authOnActions = features.auth.onActions;
      var dropAuthOnActions = features.auth.drop.onActions;

      var authToken = features.auth.token || configuration.get( CONFIG_KEY + '.token' );
      var authResourceName = features.auth.resource;
      var authFlagName = features.auth.flag;
      console.log( authToken );

      var promise = new Promise( function( resolve, reject ) {
         var auth = authToken ? {
            access_token: authToken,
            token_type: 'bearer',
         } : oauthStorage.getItem( 'data' );

         if( helper.search.code && ( helper.search.state === oauthStorage.getItem( 'state' ) ) ) {
            oauthStorage.removeItem( 'state' );
            resolve( getAccessToken( helper.search.code ) );
         } else if( helper.hash.access_token ) {
            resolve( helper.hash );
         } else if( auth ) {
            resolve( auth );
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
            .then( publishAuthResource )
            .then( validateAuthResource )
            .then( publishAuthFlag )
            .then( saveAuthResource );
      } );

      function publishAuthResource( data ) {
         return eventBus.publish( 'didReplace.' + authResourceName, {
            resource: authResourceName,
            data: data
         } ).then( function() {
            return data;
         } );
      }

      function validateAuthResource( data ) {
         return eventBus.publishAndGatherReplies( 'validateRequest.' + authResourceName, {
            resource: authResourceName
         } ).then( function( replies ) {
            var failures = [];

            replies.forEach( function( reply ) {
               if( reply.event.outcome === 'ERROR' ) {
                  failures.push( reply.event );
               }
            } );

            return ( failures.length == 0 ) && data;
         } );
      }

      function publishAuthFlag( data ) {
         var state = !!data;

         return eventBus.publish( 'didChangeFlag.' + authFlagName + '.' + state, {
            flag: authFlagName,
            state: state
         } ).then( function() {
            return data;
         } );
      }

      function saveAuthResource( data ) {
         if( data ) {
            oauthStorage.setItem( 'data', data );
         } else {
            oauthStorage.removeItem( 'data' );
         }

         return eventBus.publish( 'didSave.' + authResourceName, {
            resource: authResourceName,
            outcome: 'SUCCESS'
         } ).then( function() {
            return data;
         } );
      }

      function redirectToAuthProvider() {
         var parameters = {
            client_id: oauthProvider.clientId,
            redirect_uri: oauthProvider.redirectUrl || flowService.constructAbsoluteUrl( '_self' ),
            response_type: oauthProvider.clientSecret ? 'code' : 'token',
            scope: oauthProvider.scope,
            state: generateRandomString()
         };

         oauthStorage.setItem( 'state', parameters.state );

         window.location.href = oauthProvider.url + '?' + encodeArguments( parameters ).join( '&' );
      }

      function dropAuth() {
         return publishAuthFlag()
            .then( saveAuthResource );
      }

      function getAccessToken( code ) {
         var url = oauthProvider.accessTokenUrl + '?' + encodeArguments( {
            client_id: oauthProvider.clientId,
            client_secret: oauthProvider.clientSecret,
            code: code
         } ).join( '&' );

         // ask the provider for an access token
         fetch( url, {
            method: 'post',
            headers: {
               'Accept': 'application/x-www-urlencoded, application/json'
            }
         } ).then( function( response ) {
            var contentType = response.headers.get( 'Content-Type' );
            var isUrlEncoded = /^application\/x-www-urlencoded(; *)?$/.test( contentType );
            return isUrlEncoded ? response.text().then( decodeArguments ) : response.json();
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
      var backend = window.localStorage || cookieStorageFallback( 900 );

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
      name: spec.name,
      create: Controller.create,
      injections: Controller.injections
   };

} );
