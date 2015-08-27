var require = {
   baseUrl: 'bower_components',
   deps: [
      'promise-polyfill',
      'fetch',
   /* 'moment/locale/en',
      'moment/locale/de'
      'moment/locale/fr'
      'moment/locale/es'
      'moment/locale/ja'
      'moment/locale/zh-cn' */
      'moment/locale/en-gb'
   ],
   packages: [
      {
         name: 'laxar-application',
         location: '..',
         main: 'init'
      },
      {
         name: 'laxar',
         location: 'laxar',
         main: 'laxar'
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
      semver: 'semver/semver.browser',
      'chroma-js': 'chroma-js/chroma',

      // LaxarJS Core Testing:
      jasmine: 'jasmine/lib/jasmine-core/jasmine',
      jasmine2: 'jasmine2/lib/jasmine-core/jasmine',
      q_mock: 'q_mock/q',
      'promise-polyfill': 'promise-polyfill/Promise',
      'fetch': 'fetch/fetch',

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

      'release-station': '../includes/lib/release-station',

      'laxar': 'laxar/dist/laxar',
      'laxar-uikit': 'laxar-uikit/dist/laxar-uikit',
      'laxar-uikit/controls': 'laxar-uikit/dist/controls',
      'laxar-patterns': 'laxar-patterns/dist/laxar-patterns',
      'laxar-testing': 'laxar-testing/dist/laxar-testing',

      // App Parts:
      'laxar-path-root': '..',
      'laxar-path-layouts': '../application/layouts',
      'laxar-path-pages': '../application/pages',
      'laxar-path-widgets': '../includes/widgets',
      'laxar-path-themes': '../includes/themes',
      'laxar-path-flow': '../application/flow/flow.json',

      'laxar-path-default-theme': 'laxar-uikit/dist/themes/default.theme',

      'laxar-application-dependencies': '../var/static/laxar_application_dependencies'
   },
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
   }
};
