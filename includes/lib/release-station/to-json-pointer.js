/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar-patterns'
], function( patterns ) {

   return function toJsonPointer( item ) {
      var type = typeof item;
      if( type === 'number' ) {
         return '/' + item.toString(10);
      } if( type === 'string' ) {
         return item[ 0 ] === '/' ? item : patterns.json.pathToPointer( item );
      } else if( item.join ) {
         return '/' + item.join( '/' );
      }
   }

} );
