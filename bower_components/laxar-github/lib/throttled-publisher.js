define( [
   'laxar-patterns'
], function( patterns ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var nullPublisher = {};
   nullPublisher.replace = nullPublisher.update = nullPublisher.update = function() {};

   function throttledPublisherForFeature( context, feature, options ) {
      if( !(context.features[ feature ] && context.features[ feature ].resource) ) {
         return nullPublisher;
      }

      var replace = throttleReplacements( patterns.resources.replacePublisherForFeature( context, feature ), options );
      var update = throttleUpdates( patterns.resources.updatePublisherForFeature( context, feature ), options );

      return {
         replace: function( data ) {
            update.flush();
            replace( data );
         },
         update: function( patches ) {
            replace.flush();
            update( patches );
         },
         flush: function() {
            replace.flush();
            update.flush();
         },
         push: function( item ) {
            update( [ { op: 'add', path: '/-', value: item } ] );
         }
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function throttleReplacements( publisher, options ) {
      var timeout;
      var buffer;
      var maxLatency = (options || {}).maxLatency || 150;

      function replace() {
         var data = buffer;
         if( buffer ) {
            publisher( buffer );
            timeout = setTimeout( function() {
               if( buffer !== data ) {
                  publisher( buffer );
               }
               buffer = null;
            }, maxLatency );
         }
      }

      function handleReplacements( data ) {
         var first = !buffer;

         buffer = data;

         if( first ) {
            replace();
         }
      }

      handleReplacements.flush = replace;

      return handleReplacements;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function throttleUpdates( publisher, options ) {
      var timeout;
      var batch = [];
      var maxBatchSize = (options || {}).maxBatchSize || 20;
      var maxLatency = (options || {}).maxLatency || 150;

      function update() {
         if( batch.length ) {
            publisher( batch );
            batch = [];
         }
         if( timeout ) {
            clearTimeout( timeout );
            timeout = null;
         }
      }

      function handleUpdates( patches ) {
         batch.push.apply( batch, patches );

         if( batch.length >= maxBatchSize ) {
            update();
         } else if( !timeout ) {
            timeout = setTimeout( update, maxLatency );
         }
      }

      handleUpdates.flush = update;

      return handleUpdates;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return throttledPublisherForFeature;

} );
