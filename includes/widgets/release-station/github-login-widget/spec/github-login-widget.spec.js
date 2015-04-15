/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   '../github-login-widget',
   'laxar/laxar_testing'
], function( widgetModule, ax ) {
   'use strict';

   describe( 'A GitHubLoginWidget', function() {

      var testBed_;

      beforeEach( function setup() {
         testBed_ = ax.testing.portalMocksAngular.createControllerTestBed( 'release-station/github-login-widget' );
         testBed_.featuresMock = {};

         testBed_.useWidgetJson();
         testBed_.setup();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      afterEach( function() {
         testBed_.tearDown();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'still needs some tests.' );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

   } );
} );