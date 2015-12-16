/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */

/**
 * Wait for a specific event to occur on the EventBus.
 * @param {EventBus} eventBus the EventBus instance to subscribe on
 * @param {String} event the event to wait for, e.g. "beginLifecycleRequest"
 * @return {Promise} a promise that is resolved when the event was delivered
 */
export default function waitForEvent( eventBus, event ) {
   const promise = new Promise( ( resolve, reject ) => {
      eventBus.subscribe( event, function wait() {
         eventBus.unsubscribe( wait );
         resolve();
      } );
   } );

   return () => promise;
}
