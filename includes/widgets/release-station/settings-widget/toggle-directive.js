/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( function() {
   'use strict';

   var directiveName = 'axToggle';
   var ACTIVE_CLASS = 'active';
   var DEFAULT_OFF_LABEL = 'off';
   var DEFAULT_ON_LABEL = 'on';
   var INTERNAL_OFF_VALUE = 'false';
   var INTERNAL_ON_VALUE = 'true';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var directive = function() {
      var id = 0;

      return {
         restrict: 'AE',
         replace: true,
         template: template,
         priority: 2,
         require: 'ngModel',
         scope: {},
         link: function( scope, element, attrs, ngModelController ) {
            var labels = element.find( 'label' );

            scope.name = 'ax-toggle-' + id++;
            scope.label = {
               off: attrs.labelOff || 'off',
               on: attrs.labelOn || 'on'
            };

            labels.find( 'input[type="radio"]' ).on( 'change', change );
            ngModelController.$render = render;

            function change( event ) {
               ngModelController.$setViewValue( this.value, event );
               ngModelController.$render();
            }

            function render() {
               if( ngModelController.$modelValue ) {
                  element.addClass( ACTIVE_CLASS );
                  labels.first().removeClass( ACTIVE_CLASS );
                  labels.last().addClass( ACTIVE_CLASS );
               } else {
                  element.removeClass( ACTIVE_CLASS );
                  labels.first().addClass( ACTIVE_CLASS );
                  labels.last().removeClass( ACTIVE_CLASS );
               }
            }

            ngModelController.$isEmpty = function( value ) {
               return ( value === '' || value === undefined );
            };

            ngModelController.$parsers.push( function( value ) {
               return ( value === INTERNAL_ON_VALUE );
            } );

            ngModelController.$formatters.push( function( value ) {
               return ( value ? INTERNAL_ON_VALUE : INTERNAL_OFF_VALUE );
            } );
         }
      };
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var template = '' +
      '<div class="ax-toggle"">' +
         '<label>' +
            '<input type="radio" name="{{name}}" value="' + INTERNAL_OFF_VALUE + '"></input>' +
            '<span>{{label.off}}</span>' +
         '</label>' +
         '<label>' +
            '<input type="radio" name="{{name}}" value="' + INTERNAL_ON_VALUE + '"></input>' +
            '<span>{{label.on}}</span>' +
         '</label>' +
      '</div>';

   return {
      axToggle: directive
   };

} );
