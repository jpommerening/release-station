/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://www.laxarjs.org
 */
define( [
   'json!../widget.json',
   '../ax-developer-tools-widget',
   'angular-mocks',
   'jquery',
   'laxar/laxar_testing'
], function( descriptor, widgetModule, ngMocks, $, ax ) {
   'use strict';

   describe( 'An ax-developer-tools-widget', function() {

      var cleanup;
      var testBed;
      var windowOpenSpy;
      var windowState;

      beforeEach( function setup() {
         jasmine.Clock.useMock();
         testBed = ax.testing.portalMocksAngular.createControllerTestBed( descriptor );
         testBed.featuresMock = {
            open: {
               onActions: [ 'develop' ],
               onGlobalMethod: 'axOpenDevTools'
            }
         };

         testBed.injections.axConfiguration = {
            'get': jasmine.createSpy( 'get' ).andCallFake( function( key, fallback ) {
               return fallback;
            } )
         };

         // intercept unload registration
         cleanup = null;
         spyOn( $.prototype, 'on' ).andCallFake( function( event, callback ) {
            expect( event ).toEqual( 'beforeunload.AxDeveloperToolsWidget' );
            cleanup = callback;
         } );

         windowState = {
            closed: false,
            focus: jasmine.createSpy( 'focus' )
         };

         windowOpenSpy = spyOn( window, 'open' ).andCallFake( function() {
            return windowState;
         } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      afterEach( function() {
         if( cleanup ) {
            cleanup();
         }
         windowState.closed = true;
         delete window.axDeveloperTools;
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'with feature "open"', function() {

         beforeEach( function() {
            testBed.setup();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         afterEach( function() {
            testBed.tearDown();

            if( window.axDeveloperTools ) {
               delete window.axDeveloperTools.buffers.log;
               delete window.axDeveloperTools.buffers.events;
               delete window.axDeveloperTools.buffers;
            }
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'allows to configure an action for opening the developer tools window (R1.1)', function() {
            expect( testBed.scope.eventBus.subscribe ).toHaveBeenCalledWith(
               'takeActionRequest.develop', jasmine.any( Function ) );
            testBed.eventBusMock.publish( 'takeActionRequest.develop', { action: 'develop' } );
            jasmine.Clock.tick( 0 );
            expect( windowOpenSpy ).toHaveBeenCalled();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'allows to configure a global javascript method that opens the window directly (R1.2)', function() {
            window.axOpenDevTools();
            expect( windowOpenSpy ).toHaveBeenCalled();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'establishes a _communication channel_ to the contents of the developer tools window when open (R1.3)', function() {
            window.axOpenDevTools();
            expect( window.axDeveloperTools ).toBeDefined();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'intercepts _event bus activity_ from the host application and forwards it to the communication channel (R1.4)', function() {
            window.axOpenDevTools();
            jasmine.Clock.tick( 0 );
            testBed.eventBusMock.subscribe( 'someEvent', function() {} );
            testBed.eventBusMock.publish( 'someEvent', { content: 'develop' } );
            jasmine.Clock.tick( 0 );

            // initial subscribe for develop action + subscribe/publish/deliver for someEvent:
            expect( window.axDeveloperTools.buffers.events.length ).toBe( 4 );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'intercepts LaxarJS _log messages_ from the host application and forwards them to the communication channel (R1.5)', function() {
            window.axOpenDevTools();
            ax.log.trace( 'test log message' );
            ax.log.info( 'test log message' );
            jasmine.Clock.tick( 0 );
            expect( window.axDeveloperTools.buffers.log.length ).toBe( 2 );
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      // Note that he requirements R2 - R4 are satisfied by the content application widgets!

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'disabled by application-wide configuration', function() {

         var configPath = 'widgets.laxar-developer-tools-widget.enabled';

         beforeEach( function() {
            testBed.injections.axConfiguration = {
               'get': jasmine.createSpy( 'get' ).andCallFake( function( key, fallback ) {
                  expect( key ).toEqual( configPath );
                  expect( fallback ).toEqual( true );
                  return false;
               } )
            };

            spyOn( ax.log, 'addLogChannel' );
            testBed.setup();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         afterEach( function() {
            testBed.tearDown();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'does not subscribe to action requests (R6.1)', function() {
            expect( testBed.scope.eventBus.subscribe ).not.toHaveBeenCalled();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'does not intercept events (R6.2)', function() {
            expect( window.axDeveloperTools ).not.toBeDefined();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'does not intercept log messages (R6.3)', function() {
            expect( ax.log.addLogChannel ).not.toHaveBeenCalled();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'does not add a configured global method (R6.4)', function() {
            expect( window.axOpenDevTools ).not.toBeDefined();
            expect( window.laxarShowDeveloperTools ).not.toBeDefined();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'does not add a button (R6.5)', function() {
            expect( testBed.scope.enabled ).toBeFalsy();
         } );

      } );

   } );

} );
