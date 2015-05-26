define( [
   'laxar',
   'laxar_patterns'
], function( ax, patterns ) {

   function EventPipeline( context, feature ) {
      var pipeline = this.pipeline = [];
      var resource = this.resource = context.features[ feature ].resource;
      var model    = this.model    = context.resources[ feature ] = {};
      var incoming = [];

      context.eventBus.subscribe( 'didReplace.' + resource, function( event ) {
         incoming.concat( event.data );
         processEvents( incoming, proc );
      } );

      context.eventBus.subscribe( 'didUpdate.' + resource, function( event ) {
         patterns.json.applyPatch( incoming, event.patches );
         processEvents( incoming, proc );
      } );

      function proc( chunk ) {
         return processor( chunk, 0, model );
      }

      function processor( chunk, start, model ) {
         var i, key;

         for( i = start; i < pipeline.length && chunk instanceof Array; i++ ) {
            chunk = pipeline[ i ]( chunk );
         }

         if( !(chunk instanceof Array) ) {
            for( key in chunk ) {
               if( chunk.hasOwnProperty( key ) ) {
                  if( i < pipeline.length ) {
                     chunk[ key ] = processor( chunk[ key ], i, model && model[ key ] );
                  }

                  if( model && !model[ key ] ) {
                     model[ key ] = chunk[ key ];
                  }
               }
            }
         } else if( model && (model instanceof Array) ) {
            model.splice.apply( model, [ model.length, 0 ].concat( chunk ) );
         }
         return model || chunk;
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

   function processEvents( events, processor ) {
      var chunk;
      var start = new Date().getTime();

      function shouldStop() {
         return ( new Date().getTime() ) > ( start + 250 );
      }

      while( events.length > 0 && !shouldStop() ) {
         chunk = events.splice( 0, 10 );
         processor( chunk );
      }

      if( events.length > 0 ) {
         setTimeout( function() {
            processEvents( events, processor );
         }, 50 );
      }
   }

   return function( context, feature ) {
      return new EventPipeline( context, feature );
   };

} );
