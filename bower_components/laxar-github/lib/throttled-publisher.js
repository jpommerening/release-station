/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { resources } from 'laxar-patterns';
import errorPublisher from './error-publisher';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

const nullPublisher = {};
nullPublisher.replace = nullPublisher.update = nullPublisher.update = () => null;

export default function throttledPublisherForFeature( context, feature, options ) {
   if( !(context.features[ feature ] && context.features[ feature ].resource) ) {
      return nullPublisher;
   }

   const replace = throttleReplacements( resources.replacePublisherForFeature( context, feature ), options );
   const update = throttleUpdates( resources.updatePublisherForFeature( context, feature ), options );
   const error = errorPublisher( context, options );

   return {
      replace: function( data ) {
         return update.flush().then( () => replace( data ) );
      },
      update: function( patches ) {
         return replace.flush().then( () => update( patches ) );
      },
      flush: function() {
         replace.flush();
         update.flush();
      },
      push: ( item ) => update( [ { op: 'add', path: '/-', value: item } ] ),
      error: error
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function throttleReplacements( publisher, options ) {
   const maxLatency = (options || {}).maxLatency || 150;
   let timeout;
   let buffer;

   function replace() {
      const data = buffer;
      if( buffer ) {
         timeout = setTimeout( function() {
            if( buffer !== data ) {
               publisher( buffer );
            }
            buffer = null;
         }, maxLatency );
         return publisher( buffer );
      } else {
         return Promise.resolve();
      }
   }

   function handleReplacements( data ) {
      const first = !buffer;

      buffer = data;

      if( first ) {
         replace();
      }
   }

   handleReplacements.flush = replace;

   return handleReplacements;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function throttleUpdates( publisher, options ) {
   const maxBatchSize = (options || {}).maxBatchSize || 20;
   const maxLatency = (options || {}).maxLatency || 150;
   let timeout;
   let batch = [];

   function update() {
      const data = batch;
      if( timeout ) {
         clearTimeout( timeout );
         timeout = null;
      }
      if( data.length ) {
         batch = [];
         return publisher( data );
      } else {
         return Promise.resolve();
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
