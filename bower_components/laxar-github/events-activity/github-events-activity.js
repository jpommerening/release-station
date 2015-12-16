/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'json!./widget.json',
   'json-patch',
   'es6!../lib/constants',
   'es6!../lib/get-pointer',
   'es6!../lib/handle-auth',
   'es6!../lib/wait-for-event',
   'es6!../lib/extract-pointers',
   'es6!../lib/throttled-publisher',
   './http-event-stream',
   './socket-event-stream',
], function(
   spec,
   jsonPatch,
   constants,
   getPointer,
   handleAuth,
   waitForEvent,
   extractPointers,
   throttledPublisherForFeature,
   HttpEventStream,
   SocketEventStream
) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var EventStream = {
      'http': HttpEventStream,
      'https': HttpEventStream,
      'ws': SocketEventStream,
      'wss': SocketEventStream
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.injections = [ 'axEventBus', 'axFeatures' ];

   Controller.create = function create( eventBus, features ) {
      return new Controller( eventBus, features );
   };

   function Controller( eventBus, features ) {
      this.eventBus = eventBus;
      this.features = features;

      var baseOptions = {
         headers: {
            Accept: constants.MEDIA_TYPE
         },
         events: features.events.types
      };

      var streams = [];
      var queue = handleAuth( eventBus, features, 'auth' )
                     .then( handleAuth.setAuthHeader( baseOptions.headers ) )
                     .then( waitForEvent( eventBus, 'beginLifecycleRequest' ) );

      var publisher = throttledPublisherForFeature( this, 'events' );

      baseOptions.onEvent = deduplicate( publisher.push );
      baseOptions.onError = publisher.error;

      if( features.events.sources.init ) {
         pushQueue( handleReplace, features.events.sources.init );
      }

      if( features.events.sources.resource ) {
         eventBus.subscribe( 'didReplace.' + features.events.sources.resource, function( event ) {
            return pushQueue( handleReplace, event.data );
         } );
         eventBus.subscribe( 'didUpdate.' + features.events.sources.resource, function( event ) {
            return pushQueue( handleUpdate, event.patches );
         } );
      }

      eventBus.subscribe( 'beginLifecycleRequest', function() {
      } );

      eventBus.subscribe( 'endLifecycleRequest', function() {
         disconnectStreams( streams );
      } );

      function pushQueue( callback ) {
         var args = [].slice.call( arguments, 1 );
         return queue = queue.then( function() {
            return callback.apply( null, args );
         } );
      }

      function setAuthHeader( data ) {
         if( data && data.access_token ) {
            baseOptions.headers[ 'Authorization' ] = 'token ' + data.access_token;
         } else {
            delete baseOptions.headers[ 'Authorization' ];
         }
      }

      function handleReplace( data ) {
         disconnectStreams( streams );
         streams = [];

         publisher.replace( [] );
         return Promise.all( streams = provideStreams( data ) );
      }

      function handleUpdate( patches ) {
         var promises = [];
         patches = patches.map( mapPatchValue.bind( null, function( source ) {
            var promise = provideStream( source );
            promises.push( promise );
            return promise;
         } ) );
         var removed = removedItems( streams, patches );
         disconnectStreams( removed );
         publisher.update( [] ); // TODO: determine removed indexes?
         jsonPatch.apply( streams, patches );
         return Promise.all( promises );
      }

      function provideStreams( sources ) {
         return sources.map( provideStream );
      }

      function provideStream( source ) {
         var options = Object.create( baseOptions );
         var fields = features.events.sources.fields;

         return extractPointers( source, fields, function( url ) {
            var match = /^(https?|wss?):/.exec( url );
            var proto = match[ 1 ] || 'http';
            var stream = new EventStream[ proto ]( options );
            stream.connect( url );
            return stream;
         } );
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function removedItems( items, patches ) {
      return patches.filter( function( patch ) {
         return ( patch.op === 'remove' || patch.op === 'replace' );
      } ).map( function( patch ) {
         return getPointer( items, patch.path );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function disconnectStreams( streams ) {
      return Promise.all( streams ).then( function( streams ) {
         streams.forEach( function( stream ) {
            stream.disconnect();
         } );
      } );
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

   function deduplicate( callback ) {
      var idx = 0;
      var ids = {};
      return function( event ) {
         if( event.id ) {
            if( event.id in ids ) {
               return;
            }
            ids[ event.id ] = idx++;
         }
         return callback( event );
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      name: spec.name,
      create: Controller.create,
      injections: Controller.injections
   };

} );
