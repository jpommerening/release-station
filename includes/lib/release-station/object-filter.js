/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar-patterns',
   './to-json-pointer'
], function( patterns, toJsonPointer ) {

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createFilter( options ) {
      var matchers = ( options.matchers || [] ).map( createMatcher );

      var keywordExtractor = createKeywordExtractor( options.matchers );
      var textMatcher = createTextMatcher( options );

      return function match( search, object ) {
         // strip special patterns from search to keep the keywords
         var keywords = keywordExtractor( search );

         return textMatcher( keywords, object ) && matchers.every( function( matcher ) {
            return matcher( search, object );
         } );
      };
   }

   function createKeywordExtractor( matchers ) {
      var regExps = ( matchers || [] ).map( function( options ) {
         var pattern = ( options.pattern || /\W+/g );
         return ( pattern instanceof RegExp ) ? pattern : new RegExp( pattern, 'g' );
      } );

      function stripRegExp( text, regExp ) {
         return text.replace( regExp, ' ' );
      }

      return function extract( text ) {
         return regExps.reduce( stripRegExp, text || '' ).trim();
      };
   }

   function createTextMatcher( options ) {
      return createMatcher( {
         pattern: /(\w+)/g,
         pointers: options.pointers,
         every: options.every || true,
         callback: fuzzyCompare
      } );
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

         if( !search ) {
            return true;
         }

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

   return {
      create: createFilter
   };
} );
