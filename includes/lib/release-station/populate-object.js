/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( function() {

   function mapPromise( object, callback ) {
      var result = {};
      if( object instanceof Array ) {
         return Promise.all( object.map( callback ) );
      } else if( typeof object === 'object' ) {
         return Promise.all( Object.keys( object ).map( function( key ) {
            return callback( object[ key ] ).then( function( value ) {
               result[ key ] = value;
            } );
         } ) ).then( function() {
            return result;
         } );
      }
   }

   function populateObject( object, callback ) {

      function populate( object ) {
         var result = mapPromise( object, populate ) || callback( object );

         return ( typeof result.then === 'function' ) ? result : Promise.resolve( result );
      };

      return populate( object );
   };

   return populateObject;
} );
