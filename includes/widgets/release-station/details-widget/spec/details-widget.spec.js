/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'json!../widget.json',
   'laxar-testing'
], function( descriptor, testing ) {
   'use strict';

   describe( 'A DetailsWidget', function() {

      beforeEach( testing.createSetupForWidget( descriptor ) );
      beforeEach( testing.widget.load );
      afterEach( testing.tearDown );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'still needs some tests.' );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

   } );
} );
