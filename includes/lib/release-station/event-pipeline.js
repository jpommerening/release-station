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
    * @constructor
    * @param {Object}   context
    * @param {EventBus} context.eventBus
    * @param {Object}   context.features
    * @param {Object}   context.resources
    * @param {String}   feature
    * @param {Object}   options
    * @param {Function|Function[]} options.onUpdate
    * @param {Function|Function[]} options.onReplace
    * @param {Function|Function[]} options.onUpdateReplace
    * @param {Boolean}             options.omitFirstReplace
    */
   function EventPipeline( context, feature, options ) {
      if( !(this instanceof EventPipeline) ) {
         return new EventPipeline( context, feature, options );
      }

      var resource = this.resource = context.features[ feature ].resource;
      var pipeline = this.pipeline = [];
      var model = this.model = context.resources[ feature ] = ( context.resources[ feature ] || {} );
      var processor = this.processor = new Processor( pipeline );
      var events = [];

      var replaceHandlers = arrayOfFunctions( options.onReplace )
                               .concat( arrayOfFunctions( options.onUpdateReplace ) );;
      var updateHandlers = arrayOfFunctions( options.onUpdate )
                              .concat( arrayOfFunctions( options.onUpdateReplace ) );;
      var omitNextReplace = options.omitFirstReplace || false;

      context.eventBus.subscribe( 'didReplace.' + resource, onReplace );
      context.eventBus.subscribe( 'didUpdate.' + resource, onUpdate );

      function onReplace( event ) {
         events = event.data;
         processor.clear( model );
         processor.process( events );
         processor.merge( model );

         if( !omitNextReplace ) {
            replaceHandlers.forEach( function( handler ) {
               return handler( event );
            } );
         }
         omitNextReplace = false;
      }

      function onUpdate( event ) {
         var incoming = [];
         var length = events.length;

         jsonPatch.apply( incoming, event.patches );
         jsonPatch.apply( events, event.patches );

         if( events.length === incoming.length + length ) {
            // only additions
            processor.process( incoming );
         } else {
            // more complex changes, replay all events
            processor.clear( model );
            processor.process( events );
         }
         processor.merge( model );
         updateHandlers.forEach( function( handler ) {
            return handler( event );
         } );
      }

      this.replay = function() {
         processor.clear( model );
         processor.process( events );
         processor.merge( model );
      };

   }

   function arrayOfFunctions( arrayOrFunction ) {
      if( typeof arrayOrFunction === 'function' ) {
         return [ arrayOrFunction ];
      }

      if( arrayOrFunction instanceof Array ) {
         return arrayOrFunction;
      }

      return [];
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
    * A helper to process chunks of event data using a pipeline and
    * insert the date into a model.
    *
    * @constructor
    * @param {Function[]} pipeline a list of functions used for processing.
    */
   function Processor( pipeline, model ) {
      if( !(this instanceof Processor) ) {
         return new Processor( pipeline, model );
      }

      this.pipeline = pipeline;
      this.pending = null;
   }

   Processor.prototype.process = function( chunk ) {
      return ( this.pending = merge( this.pending, processWithPipeline( this.pipeline, chunk ) ) );
   };

   Processor.prototype.merge = function( model ) {
      merge( model, this.pending );
      clear( this.pending );
      return model;
   };

   Processor.prototype.clear = function( model ) {
      return clearWithPipeline( this.pipeline, model );
   };

   /**
    * Process events in chunks.
    * If processing takes "too long", execution will be interrupted and will
    * continue asynchronously.
    *
    * @param {Array} events
    *    The events to process (processed items will be removed from the array).
    * @param {Processor} processor
    *    A processor.
    * @param {Number} timeout
    *    The maximum time in milliseconds for synchronous processing.
    */
   function processEvents( events, processor, timeout ) {
      var stopTime = new Date().getTime() + ( timeout || 250 );

      function shouldStop() {
         return ( new Date().getTime() ) > stopTime;
      }

      while( events.length > 0 && !shouldStop() ) {
         processor.process( events.splice( 0, 10 ) );
      }

      if( events.length > 0 ) {
         setTimeout( function() {
            processEvents( events, processor, timeout );
         }, 10 );
      }
   }

   function processWithPipeline( pipeline, chunk ) {
      var i, key;

      for( i = 0; i < pipeline.length && chunk instanceof Array; i++ ) {
         chunk = pipeline[ i ]( chunk );
      }

      pipeline = pipeline.slice( i );

      if( pipeline.length ) {
         for( key in chunk ) {
            if( chunk.hasOwnProperty( key ) ) {
               chunk[ key ] = processWithPipeline( pipeline, chunk[ key ] );
            }
         }
      }

      return chunk;
   }

   function clearWithPipeline( pipeline, model ) {
      var i, key, chunk = [];

      for( i = 0; i < pipeline.length && chunk instanceof Array; i++ ) {
         chunk = pipeline[ i ]( chunk );
      }

      pipeline = pipeline.slice( i );

      if( pipeline.length ) {
         for( key in model ) {
            if( model.hasOwnProperty( key ) ) {
               clearWithPipeline( pipeline, model[ key ] );
            }
         }
      } else {
         clear( model );
      }

      return model;
   }

   function merge( target, source ) {
      if( !target ) {
         target = source;
      } else if( ( target instanceof Array ) && ( source instanceof Array ) ) {
         target.push.apply( target, source );
      } else if( ( typeof target === 'object' ) && ( typeof source === 'object' ) ) {
         for( var key in source ) {
            if( source.hasOwnProperty( key ) ) {
               target[ key ] = merge( target[ key ], source[ key ] );
            }
         }
      } else {
         target = source;
      }
      return target;
   }

   function clear( target ) {
      if( target instanceof Array ) {
         target.splice( 0, target.length );
      } else {
         for( key in target ) {
            if( target.hasOwnProperty( key ) ) {
               delete target[ key ];
            }
         }
      }
   }

   EventPipeline.create = function create( context, feature, options ) {
      return new EventPipeline( context, feature, options || {} );
   };

   return EventPipeline.create;
} );
