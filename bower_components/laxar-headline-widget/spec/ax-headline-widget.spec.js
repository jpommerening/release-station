/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'json!../widget.json',
   '../ax-headline-widget',
   'laxar/laxar_testing',
   './fixtures'
], function( descriptor, widgetModule, ax, fixtures ) {
   'use strict';

   describe( 'An ax-headline-widget', function() {

      var testBed;
      var qMock_;
      var httpMock_;

      //////////////////////////////////////////////////////////////////////////////////////////////////

      function publish( name, payload ) {
         testBed.eventBusMock.publish( name, payload, { sender: 'spec' } );
      }

      //////////////////////////////////////////////////////////////////////////////////////////////////

      function changeFlag( flag, state ) {
         publish( 'didChangeFlag.' + flag + '.' + state, { flag: flag, state: state } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      beforeEach( function() {
         testBed = ax.testing.portalMocksAngular.createControllerTestBed( descriptor );
         testBed.useWidgetJson();

         qMock_ = ax.testing.portalMocksAngular.mockQ();
         httpMock_ = ax.testing.portalMocksAngular.mockHttp();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'with a configured headline text', function() {

         beforeEach( function() {
            testBed.featuresMock = {
               headline: {
                  i18nHtmlText: {
                     'de-DE': 'Hello World'
                  },
                  level: 4
               },

               intro: {
                  i18nHtmlText: {
                     'de-DE': 'Welcome to the headline!'
                  }
               }
            };

            testBed.setup();
            useLocale( 'de-DE' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         afterEach( function() {
            testBed.tearDown();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         // R1.1, R1.2: No complex ui tests for simple HTML markup with AngularJS directives.

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'transforms the configured features into the correct model (R1.3)', function() {
            expect( testBed.scope.model.level ).toEqual( 4 );
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'with configured buttons', function() {

         beforeEach( function() {
            testBed.featuresMock = {
               headline: {
                  i18nHtmlText: {
                     'de-DE': 'Überschrift',
                     'it-IT': 'Titolo',
                     'en-GB': 'Headline'
                  }
               }
            };
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function setupWithButtons( buttons ) {
            testBed.featuresMock.buttons = buttons;
            testBed.setup();
            useLocale( 'de-DE' );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         // R3.1:  No complex ui tests for simple CSS and HTML markup.

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'puts them into the correct areas (R3.2)', function() {
            setupWithButtons( [
               { i18nHtmlLabel: { 'de-DE': 'A' }, action: 'actionA', index:  5, align: 'RIGHT' },
               { i18nHtmlLabel: { 'de-DE': 'B' }, action: 'actionB' },
               { i18nHtmlLabel: { 'de-DE': 'C' }, action: 'actionC', index: -2, align: 'RIGHT' },
               { i18nHtmlLabel: { 'de-DE': 'D' }, action: 'actionD', index:  3, align: 'RIGHT' },
               { i18nHtmlLabel: { 'de-DE': 'E' }, action: 'actionD', index:  0, align: 'RIGHT' },
               { i18nHtmlLabel: { 'de-DE': 'F' }, action: 'actionA', index:  5, align: 'LEFT' },
               { i18nHtmlLabel: { 'de-DE': 'G' }, action: 'actionB', align: 'LEFT' },
               { i18nHtmlLabel: { 'de-DE': 'H' }, action: 'actionC', index: -2, align: 'LEFT' },
               { i18nHtmlLabel: { 'de-DE': 'I' }, action: 'actionD', index:  3, align: 'LEFT' },
               { i18nHtmlLabel: { 'de-DE': 'J' }, action: 'actionD', index:  0, align: 'LEFT' }
            ] );

            expect( testBed.scope.model.areas.right[ 0 ].htmlLabel ).toEqual( 'C' );
            expect( testBed.scope.model.areas.right[ 1 ].htmlLabel ).toEqual( 'B' );
            expect( testBed.scope.model.areas.right[ 2 ].htmlLabel ).toEqual( 'E' );
            expect( testBed.scope.model.areas.right[ 3 ].htmlLabel ).toEqual( 'D' );
            expect( testBed.scope.model.areas.right[ 4 ].htmlLabel ).toEqual( 'A' );
            expect( testBed.scope.model.areas.left[ 0 ].htmlLabel ).toEqual( 'H' );
            expect( testBed.scope.model.areas.left[ 1 ].htmlLabel ).toEqual( 'G' );
            expect( testBed.scope.model.areas.left[ 2 ].htmlLabel ).toEqual( 'J' );
            expect( testBed.scope.model.areas.left[ 3 ].htmlLabel ).toEqual( 'I' );
            expect( testBed.scope.model.areas.left[ 4 ].htmlLabel ).toEqual( 'F' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         // R3.3, R3.4: No complex ui tests for simple CSS and HTML markup.

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'excludes buttons that have been configured to be disabled (R3.5)', function() {
            setupWithButtons( [
               { i18nHtmlLabel: { 'de-DE': 'A' }, action: 'actionA' },
               { i18nHtmlLabel: { 'de-DE': 'B' }, action: 'actionB', enabled: false },
               { i18nHtmlLabel: { 'de-DE': 'C' }, action: 'actionC', enabled: true },
               { i18nHtmlLabel: { 'de-DE': 'D' }, action: 'actionD', enabled: false }
            ] );

            var modelButtons = testBed.scope.model.areas.right;

            expect( modelButtons[ 0 ].htmlLabel ).toEqual( 'A' );
            expect( modelButtons[ 1 ].htmlLabel ).toEqual( 'C' );

            expect( modelButtons.length ).toBe( 2 );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         // R3.6: No complex ui tests for simple CSS and HTML markup and no testing of LaxarJS parts.

         // R3.7: No complex ui tests for simple CSS and HTML markup and no testing of LaxarJS parts.

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'sorts the buttons based on their configured index which defaults to 0 (R3.8)', function() {
            setupWithButtons( fixtures.customButtons  );

            var buttonOrder = [ 15, 1, 2, 3, 4, 5, 10, 11, 6, 12, 13, 7, 14, 8, 9 ];
            testBed.scope.model.areas.right.forEach( function( button, i ) {
               expect( button.action ).toBe( 'action' + buttonOrder[ i ] );
            } );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'assigns a CSS class to each button based on the configured class (R3.9)', function() {
            setupWithButtons( [
               { i18nHtmlLabel: { 'de-DE': 'A' }, action: 'actionA' },
               { i18nHtmlLabel: { 'de-DE': 'B' }, action: 'actionB', 'class': 'PRIMARY' },
               { i18nHtmlLabel: { 'de-DE': 'C' }, action: 'actionC', 'class': 'INFO' },
               { i18nHtmlLabel: { 'de-DE': 'D' }, action: 'actionD', 'class': 'SUCCESS' },
               { i18nHtmlLabel: { 'de-DE': 'E' }, action: 'actionE', 'class': 'WARNING' },
               { i18nHtmlLabel: { 'de-DE': 'F' }, action: 'actionF', 'class': 'DANGER' },
               { i18nHtmlLabel: { 'de-DE': 'G' }, action: 'actionG', 'class': 'LINK' },
               { i18nHtmlLabel: { 'de-DE': 'H' }, action: 'actionH', 'class': 'INVERSE' },
               { i18nHtmlLabel: { 'de-DE': 'I' }, action: 'actionI', 'class': 'NORMAL' }
            ] );

            var modelButtons = testBed.scope.model.areas.right;

            expect( modelButtons[ 1 ].classes[ 'btn-primary' ] ).toBe( true );
            expect( modelButtons[ 2 ].classes[ 'btn-info' ] ).toBe( true );
            expect( modelButtons[ 3 ].classes[ 'btn-success' ] ).toBe( true );
            expect( modelButtons[ 4 ].classes[ 'btn-warning' ] ).toBe( true );
            expect( modelButtons[ 5 ].classes[ 'btn-danger' ] ).toBe( true );
            expect( modelButtons[ 6 ].classes[ 'btn-link' ] ).toBe( true );
            expect( modelButtons[ 7 ].classes[ 'btn-inverse' ] ).toBe( true );

            expect( modelButtons[ 0 ].classes[ 'btn-primary' ] ).toBeFalsy();
            expect( modelButtons[ 0 ].classes[ 'btn-info' ] ).toBeFalsy();
            expect( modelButtons[ 0 ].classes[ 'btn-success' ] ).toBeFalsy();
            expect( modelButtons[ 0 ].classes[ 'btn-warning' ] ).toBeFalsy();
            expect( modelButtons[ 0 ].classes[ 'btn-danger' ] ).toBeFalsy();
            expect( modelButtons[ 0 ].classes[ 'btn-link' ] ).toBeFalsy();
            expect( modelButtons[ 0 ].classes[ 'btn-inverse' ] ).toBeFalsy();

            expect( modelButtons[ 8 ].classes[ 'btn-success' ] ).toBeFalsy();
            expect( modelButtons[ 5 ].classes[ 'btn-success' ] ).toBeFalsy();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'assigns a CSS class to each button based on the configured size (R3.10)', function() {
            setupWithButtons( [
               { i18nHtmlLabel: { 'de-DE': 'A' }, action: 'actionA' },
               { i18nHtmlLabel: { 'de-DE': 'B' }, action: 'actionB', size: 'DEFAULT' },
               { i18nHtmlLabel: { 'de-DE': 'C' }, action: 'actionC', size: 'MINI' },
               { i18nHtmlLabel: { 'de-DE': 'D' }, action: 'actionD', size: 'SMALL' },
               { i18nHtmlLabel: { 'de-DE': 'E' }, action: 'actionE', size: 'LARGE' }
            ] );

            var modelButtons = testBed.scope.model.areas.right;

            expect( modelButtons[ 2 ].classes[ 'btn-xs' ] ).toBe( true );
            expect( modelButtons[ 3 ].classes[ 'btn-sm' ] ).toBe( true );
            expect( modelButtons[ 4 ].classes[ 'btn-lg' ] ).toBe( true );

            expect( modelButtons[ 0 ].classes[ 'btn-xs' ] ).toBeFalsy();
            expect( modelButtons[ 0 ].classes[ 'btn-sm' ] ).toBeFalsy();
            expect( modelButtons[ 0 ].classes[ 'btn-lg' ] ).toBeFalsy();

            expect( modelButtons[ 1 ].classes[ 'btn-xs' ] ).toBeFalsy();
            expect( modelButtons[ 1 ].classes[ 'btn-sm' ] ).toBeFalsy();
            expect( modelButtons[ 1 ].classes[ 'btn-lg' ] ).toBeFalsy();
         } );
         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'when configured flags change', function() {

            var mySpy;
            var buttons = [];


            function publishFlagChange( flag, state ) {
               testBed.eventBusMock.publish( 'didChangeFlag.' + flag + '.' + state, {
                  flag: flag,
                  state: state
               } );
               jasmine.Clock.tick( 0 );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            beforeEach( function() {
               setupWithButtons( [
                  { i18nHtmlLabel: { 'de-DE': 'A' }, action: 'actionA', disableOn: [ 'notUndoable' ] },
                  { i18nHtmlLabel: { 'de-DE': 'B' }, action: 'actionB', hideOn: [ 'guestUser' ],
                     busyOn: [ 'navigation' ] },
                  { i18nHtmlLabel: { 'de-DE': 'C' }, action: 'actionC',  omitOn: [ '!helpAvailable' ] }
               ] );

               mySpy = jasmine.createSpy( 'takeActionRequestSpy' );
               testBed.scope.eventBus.subscribe( 'takeActionRequest', mySpy );

               buttons = testBed.scope.model.areas.right;

               publishFlagChange( 'helpAvailable', true );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'on true the according css classes are applied (R3.11, R.12)', function() {
               expect( buttons[ 1 ].classes[ 'ax-invisible' ] ).toBe( false );
               expect( buttons[ 1 ].classes[ 'ax-busy' ] ).toBe( false );
               expect( buttons[ 2 ].classes[ 'ax-omitted' ] ).toBe( false );
               expect( buttons[ 0 ].classes[ 'ax-disabled' ] ).toBe( false );

               publishFlagChange( 'guestUser', true );
               publishFlagChange( 'navigation', true );
               publishFlagChange( 'helpAvailable', false );
               publishFlagChange( 'notUndoable', true );

               expect( buttons[ 1 ].classes[ 'ax-invisible' ] ).toBe( true );
               expect( buttons[ 1 ].classes[ 'ax-busy' ] ).toBe( true );
               expect( buttons[ 2 ].classes[ 'ax-omitted' ] ).toBe( true );
               expect( buttons[ 0 ].classes[ 'ax-disabled' ] ).toBe( true );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            describe( 'when all flags are active', function() {

               beforeEach( function() {
                  publishFlagChange( 'guestUser', true );
                  publishFlagChange( 'navigation', true );
                  publishFlagChange( 'helpAvailable', false );
                  publishFlagChange( 'notUndoable', true );
               } );

               ///////////////////////////////////////////////////////////////////////////////////////////////

               it( 'on false the according css classes are removed (R3.11, R3.12)', function() {
                  expect( buttons[ 1 ].classes[ 'ax-invisible' ] ).toBe( true );
                  expect( buttons[ 1 ].classes[ 'ax-busy' ] ).toBe( true );
                  expect( buttons[ 2 ].classes[ 'ax-omitted' ] ).toBe( true );
                  expect( buttons[ 0 ].classes[ 'ax-disabled' ] ).toBe( true );

                  publishFlagChange( 'guestUser', false );
                  publishFlagChange( 'navigation', false );
                  publishFlagChange( 'helpAvailable', true );
                  publishFlagChange( 'notUndoable', false );

                  expect( buttons[ 1 ].classes[ 'ax-invisible' ] ).toBe( false );
                  expect( buttons[ 1 ].classes[ 'ax-busy' ] ).toBe( false );
                  expect( buttons[ 2 ].classes[ 'ax-omitted' ] ).toBe( false );
                  expect( buttons[ 0 ].classes[ 'ax-disabled' ] ).toBe( false );
               } );

               ///////////////////////////////////////////////////////////////////////////////////////////////

               it( 'no user interaction is possible', function() {
                  testBed.scope.handleButtonClicked( buttons[ 0 ] );
                  testBed.scope.handleButtonClicked( buttons[ 1 ] );
                  testBed.scope.handleButtonClicked( buttons[ 2 ] );
                  jasmine.Clock.tick( 0 );

                  expect( mySpy.callCount ).toBe( 0 );
               } );

               ///////////////////////////////////////////////////////////////////////////////////////////////

               it( 'on false user interaction is possible again (R3.12)', function() {
                  publishFlagChange( 'guestUser', false );
                  publishFlagChange( 'navigation', false );
                  publishFlagChange( 'helpAvailable', true );
                  publishFlagChange( 'notUndoable', false );

                  testBed.scope.handleButtonClicked( buttons[ 0 ] );
                  testBed.scope.handleButtonClicked( buttons[ 1 ] );
                  testBed.scope.handleButtonClicked( buttons[ 2 ] );
                  jasmine.Clock.tick( 0 );

                  expect( mySpy.callCount ).toBe( 3 );
               } );
            } );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'when a button is pressed', function() {
            var spy;
            var buttons;

            //////////////////////////////////////////////////////////////////////////////////////////////////

            beforeEach( function() {
               buttons = [
                  { i18nHtmlLabel: { 'de-DE': 'A' }, action: 'actionY' },
                  { i18nHtmlLabel: { 'de-DE': 'B' }, action: 'actionY' }
               ];
               spy = jasmine.createSpy( 'takeActionRequestSpy' );

               setupWithButtons( buttons );
               testBed.eventBusMock.subscribe( 'takeActionRequest.actionY', spy );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'publishes a takeActionRequest for the configured action (R3.13)', function() {
               testBed.scope.handleButtonClicked( testBed.scope.model.areas.right[ 0 ] );
               jasmine.Clock.tick( 0 );

               expect( spy ).toHaveBeenCalled();
               expect( spy.calls[ 0 ].args[ 0 ].action ).toEqual( 'actionY' );
               expect( spy.calls[ 0 ].args[ 1 ].name ).toEqual( 'takeActionRequest.actionY' );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'sends the button\'s id as event.anchorDomElement (R3.13)', function() {
               testBed.scope.handleButtonClicked( testBed.scope.model.areas.right[ 0 ] );
               jasmine.Clock.tick( 0 );

               expect( spy.calls[ 0 ].args[ 0 ].anchorDomElement ).toEqual( testBed.scope.id( 'actionY_0' ) );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'has individual ids for each button (R3.13)', function() {
               expect( testBed.scope.model.areas.right[ 0 ].id ).not.
                  toEqual( testBed.scope.model.areas.right[ 1 ].id );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'the button has the css class "ax-active" while the action is being processed (R3.14)', function() {
               var modelButton = testBed.scope.model.areas.right[ 0 ];

               testBed.eventBusMock.subscribe( 'takeActionRequest.actionY', function() {
                  publish( 'willTakeAction.actionY', { action: 'actionY' } );
               } );

               testBed.scope.handleButtonClicked( modelButton );

               jasmine.Clock.tick( 0 );
               expect( modelButton.classes[ 'ax-active' ] ).toBe( true );

               publish( 'didTakeAction.actionY', { action: 'actionA' } );
               jasmine.Clock.tick( 0 );
               expect( modelButton.classes[ 'ax-active' ] ).toBe( false );
            } );

            /////////////////////////////////////////////////////////////////////////////////////////////////////

            describe( 'and the action is canceled', function() {

               var modelButton;
               beforeEach( function() {
                  modelButton = testBed.scope.model.areas.right[ 0 ];
                  testBed.scope.eventBus.publishAndGatherReplies.andCallFake( qMock_.reject );
                  testBed.scope.handleButtonClicked( modelButton );
               } );

               it( 'resets the button state (R3.14)', function() {
                  expect( modelButton.classes[ 'ax-active' ] ).toBe( true );
                  jasmine.Clock.tick( 0 );
                  expect( modelButton.classes[ 'ax-active' ] ).toBe( false );
               } );

            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'when a configured flag changes', function() {

            beforeEach( function() {
               var button = {
                  i18nHtmlLabel: { 'de-DE': 'A' },
                  action: 'actionA',
                  disableOn: [ 'NOT_UNDOABLE' ],
                  hideOn: [ 'GUEST_USER' ],
                  busyOn: [ 'NAVIGATION' ],
                  omitOn: [ '!HELP_AVAILABLE' ]
               };

               setupWithButtons( [ button ] );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'sets the respective css class accordingly (R3.11)', function() {
               changeFlag( 'GUEST_USER', true );
               changeFlag( 'NAVIGATION', true );
               changeFlag( 'HELP_AVAILABLE', true );
               changeFlag( 'NOT_UNDOABLE', true );

               var modelButton = testBed.scope.model.areas.right[ 0 ];

               expect( modelButton.classes[ 'ax-invisible' ] ).toBe( false );
               expect( modelButton.classes[ 'ax-busy' ] ).toBe( false );
               expect( modelButton.classes[ 'ax-omitted' ] ).toBe( false );
               expect( modelButton.classes[ 'ax-disabled' ] ).toBe( false );

               jasmine.Clock.tick( 0 );

               expect( modelButton.classes[ 'ax-invisible' ] ).toBe( true);
               expect( modelButton.classes[ 'ax-busy' ] ).toBe( true );
               expect( modelButton.classes[ 'ax-omitted' ] ).toBe( false );
               expect( modelButton.classes[ 'ax-disabled' ] ).toBe( true );

               changeFlag( 'GUEST_USER', false );
               changeFlag( 'NAVIGATION', false );
               changeFlag( 'HELP_AVAILABLE', false);
               changeFlag( 'NOT_UNDOABLE', false );

               jasmine.Clock.tick( 0 );

               expect( modelButton.classes[ 'ax-invisible' ] ).toBe( false );
               expect( modelButton.classes[ 'ax-busy' ] ).toBe( false );
               expect( modelButton.classes[ 'ax-omitted' ] ).toBe( true );
               expect( modelButton.classes[ 'ax-disabled' ] ).toBe( false );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'if the flag is true, no user interaction is possible (R3.11)', function() {
               var spy = jasmine.createSpy( 'takeActionRequestSpy' );
               testBed.scope.eventBus.subscribe( 'takeActionRequest', spy );

               changeFlag( 'GUEST_USER', true );
               jasmine.Clock.tick( 0 );

               testBed.scope.handleButtonClicked( testBed.scope.model.areas.right[ 0 ] );
               jasmine.Clock.tick( 0 );

               expect( spy.callCount ).toBe( 0 );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'if the flag is false user interactions will be processed again (R3.11)', function() {
               var spy = jasmine.createSpy( 'takeActionRequestSpy' );
               testBed.scope.eventBus.subscribe( 'takeActionRequest', spy );

               changeFlag( 'GUEST_USER', false );
               jasmine.Clock.tick( 0 );

               testBed.scope.handleButtonClicked( testBed.scope.model.areas.right[ 0 ] );
               jasmine.Clock.tick( 0 );

               expect( spy.callCount ).toBe( 1 );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'selects the HTML label based on the current locale (R4.1)', function() {
            var button = {
               i18nHtmlLabel: {
                  'de-DE': '<em>Deutsch</em>',
                  'it-IT': '<p>Italiano</p>',
                  'en-GB': '<div>English</div>',
                  'en-US': '<div>American English</div>'
               },
               action: 'actionA'
            };

            setupWithButtons( [ button ] );
            useLocale( 'it' );
            expect( testBed.scope.model.areas.right[ 0 ].htmlLabel ).toEqual( button.i18nHtmlLabel.it );

            setupWithButtons( [ button ] );
            useLocale( 'en-US' );
            expect( testBed.scope.model.areas.right[ 0 ].htmlLabel ).toEqual( button.i18nHtmlLabel[ 'en-US' ] );
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function useLocale( languageTag, locale ) {
         locale = locale || 'default';
         testBed.eventBusMock.publish( 'didChangeLocale.' + locale, {
            locale: locale,
            languageTag: languageTag
         } );
         jasmine.Clock.tick( 0 );
      }

   } );
} );
