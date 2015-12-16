/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { json } from 'laxar-patterns';

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
export default function toJsonPointer( item ) {
   const type = typeof item;
   if( type === 'number' ) {
      return '/' + item.toString(10);
   } if( type === 'string' ) {
      return item[ 0 ] === '/' ? item : json.pathToPointer( item );
   } else if( item.join ) {
      return item.map( toJsonPointer ).join();
   }
}
