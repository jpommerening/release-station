/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   '../lib/parse-links'
], function( parseLinks ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Helper class to differentiate between interrupted polling and failed HTTP communication.
    * If the polling is interrupted (for example when the user navigates to another page and the
    * activity is destroyed), the polling promise will be rejected with an `InterruptedException`.
    */
   function InterruptedException() {}
   InterruptedException.prototype = new Error( 'interrupted' );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function HttpEventStream( options ) {
      this.options = options || {};

      this.onEvent_ = this.options.onEvent;
      this.onError_ = this.options.onError;
      this.events_ = this.options.events || [ '*' ];

      this.pollInterval_ = this.options.pollInterval || 360000;

      var eventTypes = this.events_.map( eventNameToType );

      this.client_ = createPollingClient();
      this.eventFilter_ = this.events_.indexOf( '*' ) >= 0 ?
                          function( event ) { return true; }
                        : function( event ) { return ( eventTypes.indexOf( event.type ) >= 0 ); };
   }

   HttpEventStream.prototype = {

      handleEvents_: function( data ) {
         if( this.onEvent_ ) {
            data.filter( this.eventFilter_ ).forEach( this.onEvent_ );
         }
      },

      handleErrors_: function( error ) {
         if( this.onError_ ) {
            this.onError_( error );
         }
      },

      connect: function connect( url ) {
         var interrupted = false;
         var pollInterval = this.pollInterval_;
         var etags = {};

         var handleEvents = this.handleEvents_.bind( this );
         var handleErrors = this.handleErrors_.bind( this );

         var poll = this.client_.poll;

         var options = Object.create( this.options );

         function fetchAll( url, delay ) {
            options.method = 'get';
            options.headers = options.headers || {};

            if( etags[ url ] ) {
               options.headers[ 'If-None-Match' ] = etags[ url ];
            }

            return poll( url, options, pollInterval, delay )
               .then( function( response ) {
                  var etag = response.headers.get( 'ETag' );
                  var links = parseLinks( response.headers.get( 'Link' ) );
                  var interval = response.headers.get( 'X-Poll-Interval' );

                  if( interval && (interval * 1000) > pollInterval ) {
                     pollInterval = interval * 1000;
                  }

                  if( etag && response.status === 200 ) {
                     etags[ url ] = etag;
                  }

                  response.json().then( handleEvents, handleErrors );

                  if( links.next ) {
                     return fetchAll( links.next );
                  }
               }, function( response ) {
                  if( response instanceof InterruptedException ) {
                     interrupted = true;
                  } else {
                     handleErrors( response );
                  }
               } );
         }

         function repeat() {
            if( !interrupted ) {
               return fetchAll( url, pollInterval )
                  .then( repeat );
            }
         }

         fetchAll( url ).then( repeat );

         return this;
      },

      disconnect: function disconnect() {
         this.client_.cancel( new InterruptedException() );
         return this;
      }

   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function eventNameToType( name ) {
      return name.replace( /(^|_)([a-z])/g, function( _1, _2, letter ) {
         return letter.toUpperCase();
      } ) + 'Event';
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createPollingClient() {
      var timeout;
      var cancel;

      function wait( delay ) {
         clearTimeout( timeout );
         return new Promise( function( resolve, reject ) {
            cancel = reject;
            var t = ( timeout = setTimeout( function() {
               cancel = null;
               if( t === timeout ) {
                  resolve();
               } else {
                  reject( new Error( 'Polling client received multiple, concurrent requests.' ) );
               }
            }, delay || 0 ) );
         } );
      }

      function poll( url, options, pollInterval, initialDelay ) {
         function fetchAndPoll( delay ) {
            return wait( delay )
               .then( function() {
                  return fetch( url, options );
               } )
               .then( pollUntilChanged );
         }

         function pollUntilChanged( response ) {
            if( response.status === 200 ) {
               return response;
            }
            return fetchAndPoll( pollInterval || 1000 );
         }

         return fetchAndPoll( initialDelay || 0 );
      }

      return {
         fetch: fetch,
         poll: poll,
         cancel: function( response ) {
            if( cancel ) {
               cancel( response );
            }
            if( timeout ) {
               clearTimeout( timeout );
            }
         }
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return HttpEventStream;
} );
