/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
import { string } from 'laxar';
import { AUTH_HEADER_NAME, AUTH_HEADER_VALUE } from './constants';

/**
 * Wait for authentication and resolve the returned promise once the user
 * is authenticated.
 */
export default function handleAuth( eventBus, features, name ) {
   const feature = features[ name ];
   const resource = feature.resource;
   const flag = feature.flag;

   return new Promise( function( resolve, reject ) {
      let data = {};
      let state = !flag;

      if( !resource && !flag ) {
         return resolve( data );
      }

      if( resource ) {
         eventBus.subscribe( 'didReplace.' + resource, function( event ) {
            data = event.data;
            if( state ) {
               resolve( data );
            }
         } );
      }

      if( flag ) {
         eventBus.subscribe( 'didChangeFlag.' + flag, function( event ) {
            state = event.state;
            if( !state ) {
               reject( data );
            } else if( data ) {
               resolve( data );
            }
         } );
      }
   } );
}

handleAuth.setAuthHeader = function setAuthHeader( headers ) {
   return function( data ) {
      if( data && data.access_token ) {
         headers[ AUTH_HEADER_NAME ] = string.format( AUTH_HEADER_VALUE, [], data );
      } else {
         delete headers[ AUTH_HEADER_NAME ];
      }
   };
}
