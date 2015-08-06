/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar-patterns'
], function( patterns ) {

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createFilter( options ) {

      var matchers = [ createMatcher( {
         pattern: /(\w+)/g,
         pointers: options.pointers,
         every: true,
         callback: fuzzyCompare
      } ) ].concat( ( options.matchers || [] ).map( createMatcher ) );

      return function match( search, object ) {
         return matchers.every( function( matcher ) {
            return matcher( search, object );
         } );
      };
   }

   /**
    * Create a matcher that uses a pattern to extract search terms from a search query and uses a callback
    * to match terms against object properties identified by JSON pointers.
    *
    * @param {Object} options
    * @param {RegExp|String} options.pattern
    * @param {Object[]} options.pointers
    * @param {Boolean} options.every
    * @param {Function} options.callback
    *
    * @return {Function}
    */
   function createMatcher( options ) {
      var pattern = ( options.pattern || /.*/g );
      var regExp = ( pattern instanceof RegExp ) ? pattern : new RegExp( pattern, 'g' );
      var pointers = ( options.pointers || [] ).map( toJsonPointer );
      var callback = options.callback || function( a, b ) { return ( a == b ); };
      var every = options.every;

      return function match( search, object ) {
         var values;
         var term;
         var result = true;

         values = pointers.map( function( pointer ) {
            return patterns.json.getPointer( object, pointer );
         } );


         while( ( term = regExp.exec( search ) ) ) {
            term = term.pop();

            result = values.some( function( value ) {
               return callback( term, value );
            } );

            if( every ^ result ) {
               regExp.lastIndex = 0;
               break;
            }
         }
         return result;
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////
   function fuzzyCompare( term, value ) {
      if( typeof value === 'string' ) {
         return ( value.toUpperCase().indexOf( term.toUpperCase() ) >= 0 );
      } else {
         return value == term;
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function toJsonPointer( item ) {
      if( typeof item === 'number' ) {
         return '/' + item.toString(10);
      } if( typeof item === 'string' ) {
         return item[ 0 ] === '/' ? item : patterns.json.pathToPointer( item );
      } else if( item.join ) {
         return '/' + item.join( '/' );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      create: createFilter
   };
} );
