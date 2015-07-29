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

   var nullPublisher = {};
   nullPublisher.replace = nullPublisher.update = nullPublisher.update = function() {};

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.injections = [ 'axEventBus', 'axFeatures' ];

   Controller.create = function create( eventBus, features ) {
      return new Controller( eventBus, features );
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function Controller( eventBus, features ) {
      this.eventBus = eventBus;
      this.features = features;

     var dataPublisher = features.data.resource ? {
         replace: patterns.resources.replacePublisherForFeature( this, 'data' ),
         update: patterns.resources.updatePublisherForFeature( this, 'data' ),
         push: function( item ) {
            return dataPublisher.update( [ { op: 'add', path: '/-', value: item } ] );
         }
      } : nullPublisher;

      var baseOptions = {
         method: 'GET',
         headers: {}
      };

      var resources = [];
      var ready = authHandler( this, 'auth' )
                     .then( setAuthHeader )
                     .then( waitForEvent( 'beginLifecycleRequest' ) );

      if( features.data.sources.resource ) {
         patterns.resources.handlerFor( this )
            .registerResourceFromFeature( 'data.sources', {
               onReplace: function( event ) {
                  resources = provideResources( event.data );
                  Promise.all( resources ).then( dataPublisher.replace );
               },
               unUpdate: function( event ) {
                  applyPatches( resources, event.patches );
               }
            } );
      } else if( features.data.sources.length ) {
         resources = provideResources( features.data.sources );
         Promise.all( resources ).then( dataPublisher.replace );
      }

      var provideActions = features.data.onActions || [];
      var provideHandler = createRequestHandler( eventBus, function( source ) {
         var resource = provideResource( source );
         resources.push( resource );
         resource.then( dataPublisher.push );
         return resource;
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

      function waitForEvent( event ) {
         var promise = new Promise( function( resolve, reject ) {
            eventBus.subscribe( event, function wait() {
               eventBus.unsubscribe( wait );
               resolve();
            } );
         } );

         return function() {
            return promise;
         };
      }

      function provideResources( sources ) {
         return sources.map( provideResource );
      }

      function provideResource( source ) {
         var options = Object.create( baseOptions );

         return ready
            .then( function() {
               return fetch( source.url, options )
            } )
            .then( function handleResponse( response ) {
               var promise = response.json();
               var links = response.headers.get( 'Link' );
               var next = links && parseLinks( links ).next;

               if( next ) {
                  return fetch( next, options )
                     .then( handleResponse )
                     .then( function( tail ) {
                        return promise.then( function( head ) {
                           return head.concat( tail );
                        } );
                     } );
               } else {
                  return promise;
               }
            } );
      }

      function applyPatches( resources, patches ) {
         for( var i = 0; i < patches.length; i++ ) {
            switch( patches[ i ].op ) {
               case 'add':
                  patches[ i ].value = provideResource( patches[ i ].value );
                  break;
               case 'replace':
                  patches[ i ].value = provideResource( patches[ i ].value );
                  break;
            }
         }
         patterns.json.applyPatch( resources, patches );
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function parseLinks( string ) {
      var pattern = /^\s*<([^>]+)>;\s*rel="(\w+)"\s*$/;

      if( !string ) {
         return {};
      }

      return string
         .split( ',' )
         .map( pattern.exec.bind( pattern ) )
         .reduce( function( object, match ) {
            if( match ) {
               object[ match[ 2 ] ] = match[ 1 ];
            }
            return object;
         }, {} );
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
