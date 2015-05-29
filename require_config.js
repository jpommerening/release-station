var require = {
   baseUrl: 'bower_components',
   deps: [
   /* 'moment/locale/en',
      'moment/locale/de'
      'moment/locale/fr'
      'moment/locale/es'
      'moment/locale/ja'
      'moment/locale/zh-cn' */
      'moment/locale/en-gb'
   ],
   shim: {
      angular: {
         deps: [
            'jquery'
         ],
         exports: 'angular'
      },
      'angular-mocks': {
         deps: [
            'angular'
         ],
         init: function ( angular ) {
            'use strict';
            return angular.mock;
         }
      },
      'angular-route': {
         deps: [
            'angular'
         ],
         init: function ( angular ) {
            'use strict';
            return angular;
         }
      },
      'angular-sanitize': {
         deps: [
            'angular'
         ],
         init: function ( angular ) {
            'use strict';
            return angular;
         }
      },
      'angular-animate': {
         deps: [
            'angular'
         ],
         init: function ( angular ) {
            'use strict';
            return angular;
         }
      },
      'json-patch': {
         exports: 'jsonpatch'
      },
      underscore: {
         exports: '_',
         init: function () {
            'use strict';
            return this._.noConflict();
         }
      }
   },
   packages: [
      {
         name: 'laxar-application',
         location: '..',
         main: 'init'
      },
      {
         name: 'moment',
         location: 'moment',
         main: 'moment'
      }
   ],
   paths: {
      // LaxarJS Core:
      requirejs: 'requirejs/require',
      jquery: 'jquery/dist/jquery',
      underscore: 'underscore/underscore',
      angular: 'angular/angular',
      'angular-mocks': 'angular-mocks/angular-mocks',
      'angular-route': 'angular-route/angular-route',
      'angular-sanitize': 'angular-sanitize/angular-sanitize',
      'angular-animate': 'angular-animate/angular-animate',
      jjv: 'jjv/lib/jjv',
      jjve: 'jjve/jjve',
      'socket.io': 'socket.io-client/socket.io',

      // LaxarJS Core Testing:
      jasmine: 'jasmine/lib/jasmine-core/jasmine',
      q_mock: 'q_mock/q',

      // LaxarJS Core Legacy:
      text: 'requirejs-plugins/lib/text',
      json: 'requirejs-plugins/src/json',

      // LaxarJS Patterns:
      'json-patch': 'fast-json-patch/src/json-patch-duplex',

      // LaxarJS UIKit:
      jquery_ui: 'jquery_ui/ui',
      'bootstrap-tooltip': 'bootstrap-sass-official/assets/javascripts/bootstrap/tooltip',
      'bootstrap-affix': 'bootstrap-sass-official/assets/javascripts/bootstrap/affix',
      trunk8: 'trunk8/trunk8',

      'event-pipeline': '../includes/lib/event-pipeline/event-pipeline',

      'laxar': 'laxar/dist/laxar',
      'laxar-uikit': 'laxar-uikit/dist/laxar-uikit',
      'laxar-uikit/controls': 'laxar-uikit/dist/controls',
      'laxar-patterns': 'laxar-patterns/dist/laxar-patterns',

      // App Parts:
      'laxar-path-root': '..',
      'laxar-path-layouts': '../application/layouts',
      'laxar-path-pages': '../application/pages',
      'laxar-path-widgets': '../includes/widgets',
      'laxar-path-themes': '../includes/themes',
      'laxar-path-flow': '../application/flow/flow.json',

      'laxar-path-default-theme': 'laxar-uikit/dist/themes/default.theme',

      'laxar-application-dependencies': '../var/static/laxar_application_dependencies'
   }
};
