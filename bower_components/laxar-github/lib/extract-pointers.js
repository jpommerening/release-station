/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar-patterns',
   './to-json-pointer'
], function( patterns, toJsonPointer ) {
   'use strict';

   /**
    * Like [].map but also for Object properties and working with promises.
    *
    * @param {Object|Array} object
    * @param {Function} callback
    * @return {Promise}
    */
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

   /**
    * Apply the given callback to each leaf-node of the input object and return
    * promise resolving to an object of the same shape, where the leave nodes
    * are replaced with the return values of the callback (or the values they
    * resolve to, if the callback returns a promise).
    *
    * Example:
    *
    *     deepMapPromise( [
    *        {
    *           repo: 'https://api.github.com/repos/LaxarJS/laxar',
    *           issues: 'https://api.github.com/issues/LaxarJS/laxar'
    *        },
    *        {
    *           repo: 'https://api.github.com/repos/LaxarJS/laxar',
    *           issues: 'https://api.github.com/issues/LaxarJS/laxar'
    *        }
    *     ], fetch ).then( function( results ) {
    *        results[ 0 ].repo instanceof Response;
    *        results[ 0 ].issues instanceof Response;
    *        results[ 1 ].repo instanceof Response;
    *        results[ 1 ].issues instanceof Response;
    *     } );
    *
    * @param {Object|Array} object
    * @param {Function} callback
    * @return {Promise}
    */
   function deepMapPromise( object, callback ) {

      function recurse( object ) {
         try {
            var result = mapPromise( object, recurse ) || callback( object );
         }
         catch( error ) {
            return Promise.reject( error );
         }

         return ( typeof result.then === 'function' ) ? result : Promise.resolve( result );
      };

      return recurse( object );
   };

   /**
    * Take a source object and an object/array/string of JSON pointers, call the
    * given callback for each pointer, with the value of the property of source object
    * referenced by the pointer and finally, resolve the returned promise with an object
    * of the same shape as the pointers object where the pointers are replaced with
    * the return values of the callback.
    *
    * Example:
    *
    *     extractPointers( {
    *        id: 123,
    *        user: {
    *           url: 'https://localhost/user.json',
    *        },
    *        data_url: 'https://localhost/data.json'
    *     }, {
    *        user: '/user/url',
    *        data: '/data_url'
    *     }, fetch ).then( function( results ) {
    *        results.user instanceof Response;
    *        results.data instanceof Response;
    *     } );
    *
    * @param {Object|Array} object
    * @param {Object|Array|String} pointers
    * @param {Function} callback
    * @return {Promise}
    */
   function extractPointers( object, pointers, callback ) {
      return deepMapPromise( pointers, function( pointer ) {
         var value = patterns.json.getPointer( object, toJsonPointer( pointer ) );
         return callback( value, pointer );
      } );
   };

   return extractPointers;

} );
