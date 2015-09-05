/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   './parse-links'
], function( parseLinks ) {
   'use strict';

   /**
    * Wrapper around Request constructor to allow `.apply`.
    * This is partly a workaround for a bug in the fetch polyfill where the Request
    * constructor does not accept another Request object as input.
    * @param {String|Request} input
    * @param {RequestInit} [init]
    * @return {Request}
    */
   function createRequest( input, init ) {
      if( Request.prototype.isPrototypeOf( input ) ) {
         return input;
      } else {
         return new Request( input, init );
      }
   }

   /**
    * Fetch the given URL and keep following the "next" link
    * until all results are returned.
    * @param {String|Request} input
    * @param {RequestInit} [init]
    * @return {Promise}
    */
   return function fetchAll() {
      var request = createRequest.apply( null, arguments );
      var options = {
         method: request.method,
         headers: request.headers
      };

      return fetch( request ).then( function handleResponse( response ) {
         var promise = response.json();
         var links = response.headers.get( 'Link' );
         var next = links && parseLinks( links ).next;

         if( next ) {
            return fetch( next, options )
               .then( handleResponse )
               .then( function( tail ) {
                  return promise.then( function( head ) {
                     return head.concat( tail );
                  } );
               } );
         } else {
            return promise;
         }
      } );
   }

} );
