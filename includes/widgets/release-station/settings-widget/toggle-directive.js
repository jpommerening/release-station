/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( function() {
   'use strict';

   var directiveName = 'axToggle';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var directive = function() {
      var id = 0;

      return {
         restrict: 'AE',
         replace: true,
         template: template,
         require: 'ngModel',
         scope: {
            value: '=ngModel'
         },
         link: function( scope, iElement, iAttrs, ngModelController ) {
            scope.id = id++;
            scope.value = !!(ngModelController.$viewValue);

            scope.change = function() {
               ngModelController.$setViewValue(scope.value);
               ngModelController.$render();
            };
         }
      };
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var template = '' +
      '<div class="ax-toggle" ng-class="{ on: value, off: !value }">' +
         '<label ng-class="{ active: !value }">' +
            '<input type="radio" name="ax-toggle-{{id}}" ' +
                   'ng-model="value" ng-value="false" ng-change="change()"></input>' +
            '<span>off</span>' +
         '</label>' +
         '<label ng-class="{ active: value }">' +
            '<input type="radio" name="ax-toggle-{{id}}" ' +
                   'ng-model="value" ng-value="true" ng-change="change()"></input>' +
            '<span>on</span>' +
         '</label>' +
      '</div>';

   return {
      axToggle: directive
   };

} );
