/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'socket.io'
], function( io ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function SocketEventStream( options ) {
      this.options = options || {};
      this.onEvent_ = this.options.onEvent;
      this.onError_ = this.options.onError;
      this.events_ = this.options.events || [ '*' ];
      this.socket_ = null;
   }

   SocketEventStream.prototype = {

      connect: function connect( url ) {
         this.disconnect();

         var socket = io.connect( url, this.options );

         if( this.onEvent_ ) {
            for( var i = 0; i < this.events_.length; i++ ) {
               socket.on( this.events_[ i ], this.onEvent_ );
            }
         }
         if( this.onError_ ) {
            socket.on( 'error', this.onError_ );
         }

         this.socket_ = socket;

         return this;
      },

      disconnect: function disconnect() {
         if( this.socket_ ) {
            this.socket_.disconnect();
         }
         return this;
      }

   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return SocketEventStream;
} );
