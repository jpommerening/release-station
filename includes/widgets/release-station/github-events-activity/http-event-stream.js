/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular'
], function( ng ) {
   'use strict';

   var $injector = angular.injector( [ 'ng' ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function HttpEventStream( options ) {
      this.options = options || {};

      this.onEvent_ = this.options.onEvent;
      this.onError_ = this.options.onError;
      this.events_ = this.options.events || [ '*' ];

      this.pollInterval_ = this.options.pollInterval || 360000;

      var eventTypes = this.events_.map( eventNameToType );

      this.client_ = $injector.invoke( [ '$http', '$q', createPollingClient ] );
      this.eventFilter_ = eventTypes.indexOf( '*' ) >= 0
                        ? function( event ) { return true; }
                        : function( event ) { return (eventTypes.indexOf( event.type ) >= 0); };
   }

   HttpEventStream.prototype = {

      handleEvents_: function( response ) {
         if( this.onEvent_ ) {
            response.data.filter( this.eventFilter_ ).forEach( this.onEvent_ );
         }
      },

      handleErrors_: function( response ) {
         if( this.onError_ ) {
            this.onError_( response.data, response.status, response.headers );
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
         var headers = options.headers || {};

         function fetch( url, delay ) {
            options.method = 'GET';
            options.url = url;
            options.headers = Object.keys( headers ).reduce( function( object, key ) {
               object[ key ] = object[ key ] || headers[ key ];
               return object;
            }, {
               'If-None-Match': etags[ url ]
            } );

            return poll( options, pollInterval, delay )
               .then( function( response ) {
                  var url = response.config.url;
                  var etag = response.headers( 'ETag' );
                  var links = parseLinks( response.headers( 'Link' ) );
                  var interval = response.headers( 'X-Poll-Interval' );

                  if( etag && response.status === 200 ) {
                     etags[ url ] = etag;
                  }

                  handleEvents( response );

                  if( links.next ) {
                     return fetch( links.next );
                  }

                  if( interval && (interval * 1000) > pollInterval ) {
                     pollInterval = interval * 1000;
                  }
               }, function( response ) {
                  if( response instanceof InterruptedException ) {
                     interrupted = true;
                     return;
                  }

                  handleErrors( response );
               } );
         }

         function repeat() {
            if( !interrupted ) {
               return fetch( url, pollInterval )
                  .then( repeat );
            }
         }

         fetch( url ).then( repeat );

         return this;
      },

      disconnect: function disconnect() {
         this.client_.cancel();
         return this;
      }

   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function InterruptedException() {}

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function eventNameToType( name ) {
      return name.replace( /(^|_)([a-z])/g, function( _1, _2, letter ) {
         return letter.toUpperCase();
      } ) + 'Event';
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function parseLinks( string ) {
      var pattern = /^\s*<([^>]+)>;\s*rel="(\w+)"\s*$/;

      if( !string ) {
         return {};
      }

      return string
         .split( ',' )
         .map( pattern.exec.bind( pattern ) )
         .reduce( function( object, match ) {
            if( match ) {
               object[ match[ 2 ] ] = match[ 1 ];
            }
            return object;
         }, {} );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createPollingClient( $http, $q ) {
      var timeout;
      var cancel;

      function fetch( options, delay ) {
         clearTimeout( timeout );
         return $q( function( resolve, reject ) {
            cancel = reject;
            var t = timeout = setTimeout( function() {
               cancel = null;
               if( t === timeout ) {
                  $http( options ).then( resolve, reject );
               } else {
                  reject( new Error( 'Polling client received multiple, concurrent requests.' ) );
               }
            }, delay || 0 );
         } );
      }

      function poll( options, pollInterval, initialDelay ) {
         function fetchAndPoll( delay ) {
            return fetch( options, delay )
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
         cancel: function() {
            if( cancel ) {
               cancel( new InterruptedException() );
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
