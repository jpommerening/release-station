/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'laxar-patterns',
   'release-station/populate-object'
], function( patterns, populateObject ) {
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

      var ready = authHandler( this, 'auth' )
                     .then( setAuthHeader )
                     .then( waitForEvent( eventBus, 'beginLifecycleRequest' ) );

      if( features.data.sources.resource ) {
         patterns.resources.handlerFor( this )
            .registerResourceFromFeature( 'data.sources', {
               onReplace: function( event ) {
                  Promise.all( provideResources( event.data ) ).then( dataPublisher.replace );
               },
               onUpdate: function( event ) {
                  var patches = event.patches.map( mapPatchValue.bind( null, provideResource ) );
                  Promise.all( patches.map( wrapPatchInPromise ) ).then( dataPublisher.update );
               }
            } );
      } else if( features.data.sources.length ) {
         Promise.all( provideResources( features.data.sources ) ).then( dataPublisher.replace );
      }

      var provideActions = features.data.onActions || [];
      var provideHandler = createRequestHandler( eventBus, provideResource );

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

      function provideResources( sources ) {
         return sources.map( provideResource );
      }

      function provideResource( source ) {
         var options = Object.create( baseOptions );
         var follow = '/url';

         return ready
            .then( function() {
               console.log( 'p', source );
               return populateObject( follow, function( path ) {
                  var url = patterns.json.getPointer( source, path );
                  console.log( 'f', url );
                  return fetch( url, options );
               } );
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

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function mapPatchValue( callback, patch ) {
      var result = {
         op: patch.op,
         path: patch.path
      };
      if( patch.from ) {
         result.from = patch.from;
      }
      if( patch.value ) {
         result.value = callback( patch.value );
      }
      return result;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function wrapPatchInPromise( patch ) {
      if( patch.value ) {
         return patch.value.then( function( value ) {
            return mapPatchValue( function() {
               return value;
            }, patch );
         } );
      } else {
         return Promise.resolve( patch );
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

   function waitForEvent( eventBus, event ) {
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
      name: 'github-data-activity',
      create: Controller.create,
      injections: Controller.injections
   };

} );
