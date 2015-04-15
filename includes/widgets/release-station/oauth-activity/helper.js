/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 */
// This helper exists to extract OAuth parameters
// before Angular works its magic.
define( [], (function() {
   'use strict';

   var hash = decodeQuery( window.location.hash );
   var search = decodeQuery( window.location.search );

   return function() {
      return {
         hash: hash,
         search: search
      };
   };

   function decodeQuery( str ) {
      var object = {};
      var index = (str.indexOf( '?' ) + 1) || (str.indexOf( '#' ) + 1);

      str = str.substr( index );

      str.split( '&' ) .forEach( function( parameter ) {
         var parts = parameter.split( '=', 2 );
         object[ decodeURIComponent( parts[ 0 ] ) ] = decodeURIComponent( parts[ 1 ] );
      } );
      return object;
   }
})() );