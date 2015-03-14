/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'angular'
], function( ng, template ) {
   'use strict';

   var directiveName = 'axGauge';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var gaugeDirective = [ '$document', '$interval', function( $document, $interval ) {
      var numInstances = 0;

      return {
         restrict: 'A',
         replace: true,
         template: template,
         transclude: true,
         scope: {
            value: '=' + directiveName,
            interval: '=' + directiveName + 'Interval'

         },
         link: function( scope, element, attrs ) {
            var defs = $document.find( '#ax-gauge-defs' );
            var fill = element.find( '.ax-gauge-fill' )[0];
            var glow = element.find( '.ax-gauge-glow' )[0];

            if( defs.length === 0 ) {
               defs = ng.element( svgGlobalDefs );
               $document.find( 'body' ).append( defs );
            }

            numInstances++;

            scope.active = scope.prev = scope.next = 0;

            scope.$watch( 'value', function( newValue, oldValue ) {
               setGauge( fill, newValue );
               setGauge( glow, newValue );
            } );

            element.on( '$destroy', function() {
               if( --numInstances === 0 ) {
                  defs.remove();
               }
            } );
         },
         controller: function( $scope ) {
            var panes = [];

            var scrollInterval = $interval(function() {
               setActivePane( $scope.active + 1 );
            }, 5000 );

            function setActivePane( num ) {
               var length = panes.length;

               panes.forEach( function( pane ) {
                  pane.active = pane.next = pane.prev = false;
               } );

               $scope.prev = $scope.active % length;
               $scope.active = num % length;
               $scope.next = (num + 1) % length;

               panes[ $scope.prev ].prev = true;
               panes[ $scope.active ].active = true;
               panes[ $scope.next ].next = true;
            };

            this.addPane = function( scope ) {
               scope.next = scope.prev = false;
               scope.active = panes.length === 0;
               panes.push( scope );
            };

            this.removePane = function( scope ) {
               scope.active = scope.next = scope.prev = false;
               panes.splice( panes.indexOf( scope ), 1 );
            };
         }
      };
   } ];

   var gaugePaneDirective = [ function() {
      return {
         restrict: 'A',
         replace: true,
         require: '^' + directiveName,
         template: '<li ng-class="{ active: active, prev: prev, next: next }" ng-transclude></li>',
         scope: {},
         transclude: true,
         link: function( scope, element, attrs, gaugeCtrl ) {
            gaugeCtrl.addPane( scope );

            element.on( '$destroy', gaugeCtrl.removePane.bind( gaugeCtrl, scope ) );
         }
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function setArc( pathSeg, rad ) {
      pathSeg.x = -Math.sin( rad ) * pathSeg.r1;
      pathSeg.y = Math.cos( rad ) * pathSeg.r2;
      pathSeg.sweepFlag = true;
      pathSeg.largeArcFlag = rad > Math.PI;
   }

   function setGauge( element, value ) {
      var rad = Math.PI * value * 1.5; // value = 1.0  -> rad = 270deg = 1.5rad
      setArc(element.pathSegList.getItem(1), rad);
   }

   var template = '' +
      '<div class="ax-gauge">' +
         '<ol class="ax-gauge-inner" ng-transclude />' +
         '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewbox="-50 -50 100 100">' +
            '<g transform="rotate(45)">' +
               '<g mask="url(#ax-gauge-ring-mask)">' +
                  '<path class="ax-gauge-back" d="M 0 50 A 50 50 0 1 1 50 0 L 0 0 z" />' +
                  '<path class="ax-gauge-fill" d="M 0 50 A 50 50 0 1 0 0 50 L 0 0 z" />' +
               '</g>' +
               '<g filter="url(#ax-gauge-glow)">' +
                  '<path class="ax-gauge-glow" mask="url(#ax-gauge-ring-mask)"' +
                       ' d="M 0 50 A 50 50 0 1 0 0 50 L 0 0 z" />' +
               '</g>' +
            '</g>' +
         '</svg>' +
      '</div>';

   var svgGlobalDefs = '' +
      '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="0" height="0"' +
          ' style="position: absolute">' +
         '<defs id="ax-gauge-defs">' +
            '<mask id="ax-gauge-ring-mask" x="0" y="0" width="100" height="100">' +
               '<path fill="white" d="M 0 48 A 48 48 0 1 1 48 0 ' +
                                     'L 33 0 A 33 33 0 1 0 0 33 z" />' +
               '<path stroke="black" stroke-width="3"' +
                    ' d="M 0 50 L 0 0 ' +
                        'M -50 50 L 0 0 ' +
                        'M -50 0 L 0 0 ' +
                        'M -50 -50 L 0 0 ' +
                        'M 0 -50 L 0 0 ' +
                        'M 50 -50 L 0 0 ' +
                        'M 50 0 L 0 0" />' +
               '<path stroke="black" stroke-width="3" transform="rotate(22.5)"' +
                    ' d="M 0 50 L 0 0 ' +
                        'M -50 50 L 0 0 ' +
                        'M -50 0 L 0 0 ' +
                        'M -50 -50 L 0 0 ' +
                        'M 0 -50 L 0 0 ' +
                        'M 50 -50 L 0 0" />' +
            '</mask>' +
            '<filter id="ax-gauge-glow">' +
               '<feGaussianBlur in="SourceGraphic" stdDeviation="2" />' +
               '<feComponentTransfer>' +
                  '<feFuncA type="linear" slope="0.4" />' +
               '</feComponentTransfer>' +
               '<feBlend mode="screen"/>' +
            '</filter>' +
         '</defs>' +
      '</svg>';

   return {
      createForModule: function( module ) {
         module.directive( directiveName, gaugeDirective );
         module.directive( directiveName + 'Pane', gaugePaneDirective );
      }
   };

} );
