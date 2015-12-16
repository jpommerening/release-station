/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */

/**
 * Parse the value of an HTTP "Link" header.
 * @param {String} header the value of the header field.
 * @return {Object} an object mapping the rel="" values to link URLs
 */
export default function parseLinks( header ) {
   const LINK_PATTERN = /^\s*<([^>]+)>;\s*rel="(\w+)"\s*$/;

   return ( header || '' )
      .split( ',' )
      .map( ( string ) => LINK_PATTERN.exec( string ) )
      .filter( ( match ) => match )
      .reduce( function( object, [ _, value, key ] ) {
         object[ key ] = value;
         return object;
      }, {} );
}
