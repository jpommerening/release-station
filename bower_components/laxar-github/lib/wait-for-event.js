/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( function() {
   'use strict';

   /**
    * Wait for a specific event to occur on the EventBus.
    * @param {EventBus} eventBus the EventBus instance to subscribe on
    * @param {String} event the event to wait for, e.g. "beginLifecycleRequest"
    * @return {Promise} a promise that is resolved when the event was delivered
    */
   return function waitForEvent( eventBus, event ) {
      var promise = new Promise( function( resolve, reject ) {
         eventBus.subscribe( event, function wait() {
            eventBus.unsubscribe( wait );
            resolve();
         } );
      } );

      return function() {
         return promise;
      };
   }

} );
