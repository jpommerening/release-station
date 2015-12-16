/*jshint quotmark:false,-W079*/
var require = { 
   "baseUrl": "bower_components", 
   "deps": [
      "promise-polyfill",
      "fetch",
      "moment/locale/en-gb"
   ], 
   "packages": [
      { 
         "name": "laxar-application", 
         "location": "..", 
         "main": "init"
      },
      { 
         "name": "moment", 
         "main": "moment", 
         "location": "moment"
      }
   ], 
   "paths": { 
      "requirejs": "requirejs/require", 
      "jquery": "jquery/dist/jquery", 
      "angular": "angular/angular", 
      "angular-mocks": "angular-mocks/angular-mocks", 
      "angular-route": "angular-route/angular-route", 
      "angular-sanitize": "angular-sanitize/angular-sanitize", 
      "angular-animate": "angular-animate/angular-animate", 
      "jjv": "jjv/lib/jjv", 
      "jjve": "jjve/jjve", 
      "jasmine": "jasmine/lib/jasmine-core/jasmine", 
      "jasmine2": "jasmine2/lib/jasmine-core/jasmine", 
      "q_mock": "q_mock/q", 
      "promise-polyfill": "promise-polyfill/Promise", 
      "fetch": "fetch/fetch", 
      "text": "requirejs-plugins/lib/text", 
      "json": "requirejs-plugins/src/json", 
      "json-patch": "fast-json-patch/src/json-patch-duplex", 
      "jquery_ui": "jquery_ui/ui", 
      "bootstrap-tooltip": "bootstrap-sass-official/assets/javascripts/bootstrap/tooltip", 
      "bootstrap-affix": "bootstrap-sass-official/assets/javascripts/bootstrap/affix", 
      "trunk8": "trunk8/trunk8", 
      "chroma-js": "chroma-js/chroma", 
      "es6": "requirejs-babel/es6", 
      "babel": "requirejs-babel/babel-5.8.22.min", 
      "release-station": "../includes/lib/release-station", 
      "laxar": "laxar/dist/laxar", 
      "laxar-uikit": "laxar-uikit/dist/laxar-uikit", 
      "laxar-uikit/controls": "laxar-uikit/dist/controls", 
      "laxar-patterns": "laxar-patterns/dist/laxar-patterns", 
      "laxar-testing": "laxar-testing/dist/laxar-testing", 
      "laxar-path-root": "..", 
      "laxar-path-layouts": "../application/layouts", 
      "laxar-path-pages": "../application/pages", 
      "laxar-path-widgets": "../includes/widgets", 
      "laxar-path-themes": "../includes/themes", 
      "laxar-path-flow": "../application/flow/flow.json", 
      "laxar-path-default-theme": "laxar-uikit/dist/themes/default.theme", 
      "laxar-application-dependencies": "../var/static/laxar_application_dependencies", 
      "socket.io": "socket.io-client/socket.io", 
      "semver": "semver/semver.browser"
   }, 
   "shim": { 
      "angular": { 
         "deps": [
            "jquery"
         ], 
         "exports": "angular"
      }, 
      "angular-mocks": { 
         "deps": [
            "angular"
         ], 
         "init": function ( angular ) {
            'use strict';
            return angular.mock;
         }
      }, 
      "angular-route": { 
         "deps": [
            "angular"
         ], 
         "init": function ( angular ) {
            'use strict';
            return angular;
         }
      }, 
      "angular-sanitize": { 
         "deps": [
            "angular"
         ], 
         "init": function ( angular ) {
            'use strict';
            return angular;
         }
      }, 
      "angular-animate": { 
         "deps": [
            "angular"
         ], 
         "init": function ( angular ) {
            'use strict';
            return angular;
         }
      }, 
      "json-patch": { 
         "exports": "jsonpatch"
      }, 
      "underscore": { 
         "exports": "_", 
         "init": function () {
            'use strict';
            return this._.noConflict();
         }
      }
   }, 
   "config": { 
      "es6": { 
         "sourceMap": "inline", 
         "resolveModuleSource": function ( source ) {
            // Assume relative paths from within an ES6 import are also ES6 modules
            return ( source[0] === '.' ) ? 'es6!'+source : source;
         }
      }
   }
};
