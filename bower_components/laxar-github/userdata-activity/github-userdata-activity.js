/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'json!./widget.json',
   'laxar-patterns',
   'es6!../lib/constants',
   'es6!../lib/handle-auth',
   'es6!../lib/wait-for-event',
   'es6!../lib/fetch-all'
], function(
   spec,
   patterns,
   constants,
   handleAuth,
   waitForEvent,
   fetchAll
) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.injections = [ 'axEventBus', 'axFeatures' ];

   Controller.create = function create( eventBus, features ) {
      return new Controller( eventBus, features );
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function Controller( eventBus, features ) {
      this.eventBus = eventBus;
      this.features = features;

      var baseOptions = {
         method: 'GET',
         headers: {
            Accept: constants.MEDIA_TYPE
         }
      };

      var ready = handleAuth( eventBus, features, 'auth' )
                     .then( handleAuth.setAuthHeader( baseOptions.headers ) )
                     .then( waitForEvent( eventBus, 'beginLifecycleRequest' ) );

      var user = ready
         .then( request( 'user' ) )
         .then( fetch )
         .then( function( response ) {
            var promise = response.json();

            if( response.status >= 400 ) {
               promise = Promise.reject( promise );
            } else if( features.user.resource ) {
               promise = promise.then( publish( 'user' ) );
            }

            return promise;
         } );

      var data = ( [
         'orgs',
         'repos',
         'keys',
         'followers',
         'following',
         'stars'
      ] ).filter( function( feature ) {
         return !!( features[ feature ] && features[ feature ].resource );
      } ).reduce( function( data, feature ) {
         data[ feature ] = data.user
            .then( request( feature ) )
            .then( fetchAll )
            .then( publish( feature ) );
         return data;
      }, {
         user: user
      } );

      eventBus.subscribe( 'beginLifecycleRequest', function() {
      } );

      eventBus.subscribe( 'endLifecycleRequest', function() {
      } );

      function request( feature ) {
         return function( data ) {
            var options = Object.create( baseOptions );
            var url = features[ feature ] && features[ feature ].url || ( data.url + '/' + feature );
            var args = encodeArguments( features.feature || {} );
            return new Request( url + ( args.length ? '?' + args.join( '&' ) : '' ), options );
         };
      }

      function publish( feature ) {
         var context = {
            eventBus: eventBus,
            features: features
         };
         return wrap( patterns.resources.replacePublisherForFeature( context, feature ) );
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function wrap( fn ) {
      return function( data ) {
         return fn( data ).then( function() {
            return data;
         } );
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function encodeArguments( object ) {
      return Object.keys( object ).filter( function( key ) {
         return typeof key !== 'undefined' && key !== 'resource' && key !== 'url';
      } ).map( function( key ) {
         return encodeURIComponent( key ) + '=' + encodeURIComponent( object[ key ] );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      name: spec.name,
      create: Controller.create,
      injections: Controller.injections
   };

} );
