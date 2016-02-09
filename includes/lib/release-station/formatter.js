/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar',
   'moment'
], function( ax, moment ) {

   /**
    * A custom formatter, extending the default formatter with
    * formats commonly used inside this application.
    */
   return ax.string.createFormatter( {
      /**
       * Add a "precision" parameter to strings to create substrings.
       * - `%.6s` only prints the first 6 characters.
       * - `%6s` skips the first 6 characters.
       * - `%1.6s` prints 6 characters starting at the second.
       */
      s: function formatSubstring( input, subSpecifierString ) {
         var precision = subSpecifierString.match( /^(\d+)?(?:\.(\d+))$/ ) || [];
         return ''.substr.apply( '' + input, precision.slice( 1 ) );
      },
      /**
       * Parses dates with moment.js and renders them according to
       * the given format.
       * - `%MMMMm` prints the spelled-out month, eq. "March"
       */
      m: function formatMoment( input, subSpecifierString ) {
         return moment( input ).format( subSpecifierString );
      }
   } );
} );
