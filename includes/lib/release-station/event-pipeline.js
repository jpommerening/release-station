/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'json-patch'
], function( jsonPatch ) {

   /**
    * A handler for resources that behave like event streams (one replace,
    * followed by updates that append to the resource).
    *
    * This handler listens to replacements and updates to a list resource
    * and processes with user defined functions.
    *
    * @param {Object}   context
    * @param {EventBus} context.eventBus
    * @param {Object}   context.features
    * @param {Object}   context.resources
    * @param {String}   feature
    *
    * @return {Object}
    */
   function EventPipeline( context, feature ) {
      if( !(this instanceof EventPipeline) ) {
         return new EventPipeline( context, feature );
      }

      var resource = this.resource = context.features[ feature ].resource;
      var pipeline = this.pipeline = [];
      var model = this.model = context.resources[ feature ] = {};
      var processor = createProcessor( pipeline, model );
      var events = [];

      context.eventBus.subscribe( 'didReplace.' + resource, onReplace );
      context.eventBus.subscribe( 'didUpdate.' + resource, onUpdate );
      context.eventBus.subscribe( 'endLifecycleRequest', function() {
         context.eventBus.unsubscribe( onReplace );
         context.eventBus.unsubscribe( onUpdate );
      } );

      function onReplace( event ) {
         events = event.data;
         processor.clear();
         processor( events );
      }

      function onUpdate( event ) {
         var incoming = [];
         var length = events.length;

         jsonPatch.apply( incoming, event.patches );
         jsonPatch.apply( events, event.patches );

         if( events.length === incoming.length + length ) {
            // only additions
            processor( incoming );
         } else {
            // more complex changes, replay all events
            processor.clear( events );
         }
      }
   }

   function pushApply( fn ) {
      return function() {
         var args = [].slice.apply( arguments );
         this.pipeline.push( function( events ) {
            return fn.apply( events, args );
         } );
         return this;
      };
   }

   EventPipeline.prototype.forEach = function( fn ) {
      this.pipeline.push( function( events ) {
         events.forEach( fn );
         return events;
      } );
      return this;
   };

   EventPipeline.prototype.filter = pushApply( [].filter );
   EventPipeline.prototype.map = pushApply( [].map );
   EventPipeline.prototype.reduce = pushApply( [].reduce );

   EventPipeline.prototype.classify = function( classifier ) {
      this.pipeline.push( function( events ) {
         return events.reduce( function( model, event ) {
            var key = classifier( event );
            if( key ) {
               model[ key ] = model[ key ] || [];
               model[ key ].push( event );
            }
            return model;
         }, {} );
      } );
      return this;
   };

   EventPipeline.prototype.synthesize = function( synthesizer ) {
      return this.reduce( function( events, event ) {
         return events.concat( [ event ].concat( synthesizer( event ) ) );
      }, [] );
   };

   /**
    * Process events in chunks.
    * If processing takes "too long", execution will be interrupted and will
    * continue asynchronously.
    *
    * @param {Array} events
    *    The events to process (processed items will be removed from the array).
    * @param {Function} processor
    *    A function that processes one chunk.
    * @param {Number} timeout
    *    The maximum time in milliseconds for synchronous processing.
    */
   function processEvents( events, processor, timeout ) {
      var stopTime = new Date().getTime() + ( timeout || 250 );

      function shouldStop() {
         return ( new Date().getTime() ) > stopTime;
      }

      while( events.length > 0 && !shouldStop() ) {
         processor( events.splice( 0, 10 ) );
      }

      if( events.length > 0 ) {
         setTimeout( function() {
            processEvents( events, processor, timeout );
         }, 10 );
      }
   }

   function createProcessor( pipeline, model ) {
      function process( chunk, start, model, clear ) {
         var i, key;

         for( i = start; i < pipeline.length && chunk instanceof Array; i++ ) {
            chunk = pipeline[ i ]( chunk );
         }

         if( !(chunk instanceof Array) ) {
            if( clear ) {
               for( key in model ) {
                  if( model.hasOwnProperty( key ) ) {
                     process( chunk[ key ] || [], i, model[ key ], true );
                  }
               }
            } else {
               for( key in chunk ) {
                  if( chunk.hasOwnProperty( key ) ) {
                     if( i < pipeline.length ) {
                        chunk[ key ] = process( chunk[ key ], i, model && model[ key ] );
                     }

                     if( model && !model[ key ] ) {
                        model[ key ] = chunk[ key ];
                     }
                  }
               }
            }
         } else if( model && (model instanceof Array) ) {
            if( clear ) {
               model.splice.apply( model, [ 0, model.length ].concat( chunk ) );
            } else {
               model.splice.apply( model, [ model.length, 0 ].concat( chunk ) );
            }
         }
         return model || chunk;
      }

      function processor( chunk ) {
         return process( chunk, 0, model );
      }

      processor.clear = function clear( chunk ) {
         return process( chunk || [], 0, model, true );
      };

      return processor;
   }

   EventPipeline.create = function create( context, feature ) {
      return new EventPipeline( context, feature );
   };

   return EventPipeline;
} );
