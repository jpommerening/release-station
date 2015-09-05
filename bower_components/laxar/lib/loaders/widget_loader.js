/**
 * Copyright 2014 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   '../logging/log',
   '../utilities/path',
   '../utilities/assert',
   '../utilities/object',
   '../utilities/string',
   './paths',
   './features_provider',
   '../widget_adapters/adapters'
], function( log, path, assert, object, string, paths, featuresProvider, adapters ) {
   'use strict';

   var TYPE_WIDGET = 'widget';
   var TYPE_ACTIVITY = 'activity';
   var TECHNOLOGY_ANGULAR = 'angular';

   var DEFAULT_INTEGRATION = { type: TYPE_WIDGET, technology: TECHNOLOGY_ANGULAR };

   var ID_SEPARATOR = '-';
   var INVALID_ID_MATCHER = /[^A-Za-z0-9_\.-]/g;

   /**
    * @param {Q} q
    *    a promise library
    * @param {Object} services
    *    all services available to the loader an widgets
    *
    * @returns {{load: Function}}
    */
   function create( q, services ) {

      var fileResourceProvider = services.axFileResourceProvider;
      var themeManager = services.axThemeManager;
      var cssLoader = services.axCssLoader;
      var eventBus = services.axGlobalEventBus;


      return {
         load: load
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Load a widget using an appropriate adapter
       *
       * First, get the given widget's specification to validate and instantiate the widget features.
       * Then, instantiate a widget adapter matching the widget's technology. Using the adapter, create the
       * widget controller. The adapter is returned and can be used to attach the widget to the DOM, or to
       * destroy it.
       *
       * @param {Object} widgetConfiguration
       *    a widget instance configuration (as used in page definitions) to instantiate the widget from
       * @param {Object} [optionalOptions]
       *    map of additonal options
       * @param {Function} optionalOptions.onBeforeControllerCreation
       *    a function to call just before the controller is set up. It receives environment and adapter
       *    specific injections as arguments
       *
       * @return {Promise} a promise for a widget adapter, with an already instantiated controller
       */
      function load( widgetConfiguration, optionalOptions ) {
         var resolvedWidgetPath = path.resolveAssetPath( widgetConfiguration.widget, paths.WIDGETS, 'local' );
         var widgetJsonPath = path.join( resolvedWidgetPath, 'widget.json' );

         var options = object.options( optionalOptions, {
            onBeforeControllerCreation: function() {}
         } );

         return fileResourceProvider.provide( widgetJsonPath )
            .then( function( specification ) {
               var integration = object.options( specification.integration, DEFAULT_INTEGRATION );
               var type = integration.type;
               var technology = integration.technology;
               // Handle legacy widget code:
               if( type === TECHNOLOGY_ANGULAR ) {
                  type = TYPE_WIDGET;
               }
               if( type !== TYPE_WIDGET && type !== TYPE_ACTIVITY ) {
                  throwError( widgetConfiguration, 'unknown integration type ' + type );
               }

               var throwWidgetError = throwError.bind( null, widgetConfiguration );
               var features =
                  featuresProvider.featuresForWidget( specification, widgetConfiguration, throwWidgetError );
               var anchorElement = document.createElement( 'DIV' );
               anchorElement.className = normalizeClassName( specification.name );
               anchorElement.id = 'ax' + ID_SEPARATOR + widgetConfiguration.id;
               var widgetEventBus = createEventBusForWidget( eventBus, specification, widgetConfiguration );

               var adapterFactory = adapters.getFor( technology );
               var adapter = adapterFactory.create( {
                  anchorElement: anchorElement,
                  context: {
                     eventBus: widgetEventBus,
                     features: features,
                     id: createIdGeneratorForWidget( widgetConfiguration.id ),
                     widget: {
                        area: widgetConfiguration.area,
                        id: widgetConfiguration.id,
                        path: widgetConfiguration.widget
                     }
                  },
                  specification: specification
               }, services );
               adapter.createController( options );

               return {
                  id: widgetConfiguration.id,
                  adapter: adapter,
                  destroy: function() {
                     widgetEventBus.release();
                     adapter.destroy();
                  },
                  applyViewChanges: adapterFactory.applyViewChanges || null,
                  templatePromise: loadAssets( resolvedWidgetPath, integration, specification )
               };

            }, function( err ) {
               var message = 'Could not load spec for widget [0] from [1]: [2]';
               log.error( message, widgetConfiguration.widget, widgetJsonPath, err );
            } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Locates and loads the widget HTML template for this widget (if any) as well as any CSS stylesheets
       * used by this widget or its controls.
       *
       * @param widgetPath
       *    The path suffix used to look up the widget, as given in the instance configuration.
       * @param integration
       *    Details on the integration type and technology: Activities do not require assets.
       * @param widgetSpecification
       *    The widget specification, used to find out if any controls need to be loaded.
       *
       * @return {Promise<String>}
       *    A promise that will be resolved with the contents of any HTML template for this widget, or with
       *    `null` if there is no template (for example, if this is an activity).
       */
      function loadAssets( widgetPath, integration, widgetSpecification ) {
         return integration.type === TYPE_ACTIVITY ? q.when( null ) : resolve().then( function( urls ) {
            urls.cssFileUrls.forEach( function( url ) { cssLoader.load( url ); } );
            return urls.templateUrl ? fileResourceProvider.provide( urls.templateUrl ) : null;
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function resolve() {
            var specifiedName = widgetSpecification.name;
            var specifiedHtmlFile = specifiedName + '.html';
            var specifiedCssFile = path.join( 'css/', specifiedName + '.css' );
            var technicalName = widgetPath.split( '/' ).pop();
            var technicalHtmlFile = technicalName + '.html';
            var technicalCssFile = path.join( 'css/', technicalName + '.css' );

            var promises = [];
            promises.push( themeManager.urlProvider(
               path.join( widgetPath, '[theme]' ),
               path.join( paths.THEMES, '[theme]', 'widgets', widgetPath )
            ).provide( [
               specifiedHtmlFile,
               specifiedCssFile,
               technicalHtmlFile,
               technicalCssFile
            ] ) );

            promises = promises.concat( ( widgetSpecification.controls || [] )
               .map( function( controlReference ) {
                  // By appending a path now and .json afterwards, trick RequireJS into generating the
                  // correct descriptor path when loading from a 'package'.
                  var resolvedControlPath = path.resolveAssetPath( controlReference, paths.CONTROLS );
                  var descriptorUrl = path.join( resolvedControlPath, 'control.json' );
                  return fileResourceProvider.provide( descriptorUrl )
                     .then( function( descriptor ) {
                        // LaxarJS 1.x style control (name determined from descriptor):
                        var name = descriptor.name;
                        return themeManager.urlProvider(
                           path.join( resolvedControlPath, '[theme]' ),
                           path.join( paths.THEMES, '[theme]', 'controls', name )
                        ).provide( [ path.join( 'css/',  name + '.css' ) ] );
                     }, function() {
                        // LaxarJS 0.x style controls (no descriptor, uses AMD path as name):
                        var name = controlReference.split( '/' ).pop();
                        return themeManager.urlProvider(
                           path.join( resolvedControlPath, '[theme]' ),
                           path.join( paths.THEMES, '[theme]', controlReference )
                        ).provide( [ path.join( 'css/', name + '.css' ) ] );
                     } );
               } ) );

            return q.all( promises )
               .then( function( results ) {
                  var widgetUrls = results[ 0 ];
                  var cssUrls = results.slice( 1 )
                     .map( function( urls ) { return urls[ 0 ]; } )
                     .concat( ( widgetUrls[ 1 ] || widgetUrls[ 3 ] ) )
                     .filter( function( url ) { return !!url; } );

                  return {
                     templateUrl: widgetUrls[ 0 ] || widgetUrls[ 2 ] || '',
                     cssFileUrls: cssUrls
                  };
               } );
         }
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function normalizeClassName( str ) {
      return str
         .replace( /([a-z0-9])([A-Z])/g, function( $_, $0, $1 ) {
            return $0 + '-' + $1;
         } )
         .replace( /_/g, '-' )
         .toLowerCase();
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function throwError( widgetConfiguration, message ) {
      throw new Error( string.format(
         'Error loading widget "[widget]" (id: "[id]"): [0]', [ message ], widgetConfiguration
      ) );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createIdGeneratorForWidget( widgetId ) {
      var charCodeOfA = 'a'.charCodeAt( 0 );
      function fixLetter( l ) {
         // We map invalid characters deterministically to valid lower case letters. Thereby a collision of
         // two ids with different invalid characters at the same positions is less likely to occur.
         return String.fromCharCode( charCodeOfA + l.charCodeAt( 0 ) % 26 );
      }

      var prefix = 'ax' + ID_SEPARATOR + widgetId.replace( INVALID_ID_MATCHER, fixLetter ) + ID_SEPARATOR;
      return function( localId ) {
         return prefix + ( '' + localId ).replace( INVALID_ID_MATCHER, fixLetter );
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createEventBusForWidget( eventBus, widgetSpecification, widgetConfiguration ) {

      var collaboratorId = 'widget.' + widgetSpecification.name + '#' + widgetConfiguration.id;

      function forward( to ) {
         return function() {
            return eventBus[ to ].apply( eventBus, arguments );
         };
      }

      function augmentOptions( optionalOptions ) {
         return object.options( optionalOptions, { sender: collaboratorId } );
      }

      var subscriptions = [];
      function unsubscribe( subscriber ) {
         eventBus.unsubscribe( subscriber );
      }

      return {
         addInspector: forward( 'addInspector' ),
         setErrorHandler: forward( 'setErrorHandler' ),
         setMediator: forward( 'setMediator' ),
         unsubscribe: unsubscribe,
         subscribe: function( eventName, subscriber, optionalOptions ) {
            subscriptions.push( subscriber );

            var options = object.options( optionalOptions, { subscriber: collaboratorId } );

            eventBus.subscribe( eventName, subscriber, options );
         },
         publish: function( eventName, optionalEvent, optionalOptions ) {
            return eventBus.publish( eventName, optionalEvent, augmentOptions( optionalOptions ) );
         },
         publishAndGatherReplies: function( eventName, optionalEvent, optionalOptions ) {
            return eventBus.publishAndGatherReplies( eventName, optionalEvent, augmentOptions( optionalOptions ) );
         },
         release: function() {
            subscriptions.forEach( unsubscribe );
         }
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      create: create
   };

} );
