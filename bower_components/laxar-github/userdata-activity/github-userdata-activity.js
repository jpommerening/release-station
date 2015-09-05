/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'laxar-patterns',
   '../lib/handle-auth',
   '../lib/wait-for-event',
   '../lib/fetch-all'
], function( patterns, handleAuth, waitForEvent, fetchAll ) {
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

      var ready = handleAuth( eventBus, features, 'auth' )
                     .then( setAuthHeader )
                     .then( waitForEvent( eventBus, 'beginLifecycleRequest' ) );


      var baseOptions = {
         method: 'GET',
         headers: {}
      };

      var user = ready
         .then( request( 'user' ) )
         .then( fetch )
         .then( function( response ) {
            var promise = response.json();

            if( features.user.resource ) {
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

      function setAuthHeader( data ) {
         if( data && data.access_token ) {
            baseOptions.headers[ 'Authorization' ] = 'token ' + data.access_token;
         } else {
            delete baseOptions.headers[ 'Authorization' ];
         }
      }

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
      name: 'github-userdata-activity',
      create: Controller.create,
      injections: Controller.injections
   };

} );
