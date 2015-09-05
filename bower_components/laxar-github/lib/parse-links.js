/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( function() {
   'use strict';

   /**
    * Parse the value of an HTTP "Link" header.
    * @param {String} header the value of the header field.
    * @return {Object} an object mapping the rel="" values to link URLs
    */
   return function parseLinks( header ) {
      var pattern = /^\s*<([^>]+)>;\s*rel="(\w+)"\s*$/;

      if( !header ) {
         return {};
      }

      return header
         .split( ',' )
         .map( pattern.exec.bind( pattern ) )
         .reduce( function( object, match ) {
            if( match ) {
               object[ match[ 2 ] ] = match[ 1 ];
            }
            return object;
         }, {} );
   }

} );
