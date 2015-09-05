/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar-patterns'
], function( patterns ) {
   'use strict';

   /**
    * Coerce anything to JSONPointer syntax.
    * - Numbers will be treated as array indices
    * - Strings starting with a slash are assumed to already be JSON pointers
    * - Strings *not* starting with a sleash will be treated as JSON paths
    * - Arrays will be treated path segments and joined with slashes
    *
    * @param {String|Number|String[]} item the thing to make a JSONPointer from.
    * @return {String} a JSONPointer
    */
   return function toJsonPointer( item ) {
      if( typeof item === 'number' ) {
         return '/' + item.toString(10);
      } if( typeof item === 'string' ) {
         return item[ 0 ] === '/' ? item : patterns.json.pathToPointer( item );
      } else if( item.join ) {
         return item.map( toJsonPointer ).join();
      }
   }

} );
