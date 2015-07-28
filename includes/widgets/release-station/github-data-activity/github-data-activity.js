/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'laxar-patterns'
], function( patterns ) {
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
         headers: {}
      };

      var authorized = authHandler( this, 'auth' ).then( setAuthHeader );

      var resources = {};

      var provideActions = [ 'provide-resource' ];
      var provideHandler = createRequestHandler( eventBus, function( data ) {
         return authorized.then( provideResource.bind( null, data ) );
      } );

      provideActions.forEach( function( action ) {
         eventBus.subscribe( 'takeActionRequest.' + action, provideHandler );
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

      function provideResource( data ) {
         var options = Object.create( baseOptions );

         var promise = resources[ data.resource ];

         if( !promise ) {
            promise = fetch( data.url, options ).then( function( response ) {
               return response.json();
            } );
         }

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

   function authHandler( context, name ) {
      var feature = context.features[ name ];
      var resource = feature.resource;
      var flag = feature.flag;

      return new Promise( function( resolve, reject ) {
         var data = {};
         var state = !flag;

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
         } ).then( function( data ) {
            return eventBus.publish( 'didReplace.' + resource, {
               resource: resource,
               data: data
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

   return {
      name: 'githubDataActivity',
      create: Controller.create,
      injections: Controller.injections
   };

} );
