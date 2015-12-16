/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import parseLinks from './parse-links';
import createLRU from './lru';

const lru = createLRU( 123 );

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

export default function cachedFetch() {
   const request = createRequest.apply( null, arguments );
   const options = {
      method: request.method,
      headers: request.headers
   };
   const key = options.method + ':' + request.url;
   const promise = lru.has( key ) ? lru.get( key ) : Promise.resolve( {} );

   const stop = arguments[ 2 ] || function( response ) {
      return Promise.resolve(false);
   };

   function handleResponse( response ) {
      const links = response.headers.get( 'Link' );
      const next = links && parseLinks( links ).next;
      const promise = response.json();

      if( next ) {
         return stop( promise )
            .then( ( halt ) => halt ? [] : fetch( next, options ).then( handleResponse ) )
            .then( ( tail ) => promise.then( ( head ) => head.concat( tail ) ) );
      } else {
         return promise;
      }
   }

   function cache( key, value, promise ) {
      return lru.set( key, promise.then( function( response ) {
         if( response.status === 304 ) {
            console.log( 'cache hit', key );
            return value;
         } else {
            return {
               etag: response.headers.get( 'Etag' ),
               date: response.headers.get( 'Last-Modified' ),
               data: handleResponse( response )
            };
         }
      } ) ).then( ( { data } ) => data );
   }

   return promise.then( function( value ) {
      if( value.etag ) {
         request.headers.set( 'If-None-Match', value.etag );
      }
      if( value.date ) {
         request.headers.set( 'If-Modified-Since', value.date );
      }
      return cache( key, value, fetch( request ) );
   } );
}



/**
 * Fetch the given URL and keep following the "next" link
 * until all results are returned.
 * @param {String|Request} input
 * @param {RequestInit} [init]
 * @return {Promise}
 */
function fetchAll() {
   const request = createRequest.apply( null, arguments );
   const options = {
      method: request.method,
      headers: request.headers
   };

   return fetch( request ).then( function handleResponse( response ) {
      const links = response.headers.get( 'Link' );
      const next = links && parseLinks( links ).next;
      const promise = response.json();

      if( next ) {
         return fetch( next, options )
            .then( handleResponse )
            .then( ( tail ) => promise.then( ( head ) => head.concat( tail ) ) );
      } else {
         return promise;
      }
   } );
}

