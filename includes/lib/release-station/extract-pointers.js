/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'laxar-patterns',
   './to-json-pointer'
], function( patterns, toJsonPointer ) {

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function mapObject( object, callback ) {
      if( object instanceof Array ) {
         return object.map( callback );
      } else if( typeof object === 'object' ) {
         var result = {};

         for( var key in object ) {
            if( object.hasOwnProperty( key ) ) {
               result[ key ] = callback( object[ key ], key, object );
            }
         }
         return result;
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function deepMapObject( object, callback ) {
      function recurse( value, key, object ) {
         return mapObject( value, recurse ) || callback( value, key, object );
      }
      return recurse( object )
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return function( object, fields ) {
      var pointers = deepMapObject( fields, toJsonPointer );
      return deepMapObject( pointers, function( pointer ) {
         if( pointer === '/' ) {
            return object;
         } else {
            return patterns.json.getPointer( object, pointer );
         }
      } );
   };

} );
