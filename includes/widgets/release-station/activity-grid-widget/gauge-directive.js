/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'angular'
], function( ng ) {
   'use strict';

   var directiveName = 'axGauge';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$interval' ];

   function Controller( $scope, $interval ) {
      var panes = [];

      if( $scope.interval ) {
         var scrollInterval = $interval(function() {
            setActivePane( $scope.active + 1 );
         }, $scope.interval );

         $scope.$on( '$destroy', $interval.cancel.bind( $interval, scrollInterval ) );
      }

      function setActivePane( num ) {
         var length = $scope.length = panes.length;

         panes.forEach( function( pane ) {
            pane.active = pane.next = pane.prev = false;
         } );

         $scope.prev = $scope.active % length;
         $scope.active = num % length;
         $scope.next = (num + 1) % length;

         panes[ $scope.prev ].prev = true;
         panes[ $scope.active ].active = true;
         panes[ $scope.next ].next = true;
      }

      this.setActivePane = setActivePane;

      this.addPane = function addPane( scope ) {
         scope.next = scope.prev = false;
         scope.active = !(panes.length);
         panes.push( scope );
         $scope.length = panes.length;
      };

      this.removePane = function removePane( scope ) {
         scope.active = scope.next = scope.prev = false;
         panes.splice( panes.indexOf( scope ), 1 );
         $scope.length = panes.length;
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var gaugeDirective = [ '$document', function( $document ) {
      var numInstances = 0;

      return {
         restrict: 'A',
         replace: true,
         template: template,
         transclude: true,
         scope: {
            value: '=' + directiveName,
            fill: '=' + directiveName + 'Fill',
            glow: '=' + directiveName + 'Glow',
            interval: '=' + directiveName + 'Interval'
         },
         link: function( scope, element, attrs ) {
            var $defs = $document.find( '#ax-gauge-defs' );
            var $fill = element.find( '.ax-gauge-fill' );
            var $glow = element.find( '.ax-gauge-glow' );
            var $progress = element.find( '.ax-gauge-progress' );

            if( $defs.length === 0 ) {
               $defs = ng.element( svgGlobalDefs );
               $document.find( 'body' ).append( $defs );
            }

            numInstances++;

            scope.active = scope.prev = scope.next = scope.length = 0;

            scope.$watch( 'value', function( newValue, oldValue ) {
               if( newValue > 0 ) {
                  setGauge( $fill[0], newValue );
                  setGauge( $glow[0], newValue );
               }
            } );
            scope.$watch( 'active', function( newValue, oldValue ) {
               /*
               if( scope.length > 0 ) {
                  setProgress( $progress[0], newValue, scope.length );
               }
               */
            } );
            scope.$watch( 'fill', function( newValue, oldValue ) {
               $fill.css( 'fill', newValue );
            } );
            scope.$watch( 'glow', function( newValue, oldValue ) {
               if( newValue ) {
                  $glow.css( 'fill', newValue );
               } else {
                  $glow.css( 'display', 'none' );
               }
            } );

            element.on( '$destroy', function() {
               if( --numInstances === 0 ) {
                  $defs.remove();
               }
            } );
         },
         controller: Controller
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var gaugePaneDirective = [ function() {
      return {
         restrict: 'A',
         replace: true,
         require: '^' + directiveName,
         template: paneTemplate,
         scope: {},
         transclude: true,
         link: function( scope, element, attrs, gaugeCtrl ) {
            gaugeCtrl.addPane( scope );

            element.on( '$destroy', gaugeCtrl.removePane.bind( gaugeCtrl, scope ) );
         }
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function setCoords( pathSeg, rad, r1, r2 ) {
      pathSeg.x = -Math.sin( rad ) * r1;
      pathSeg.y = Math.cos( rad ) * ( r2 || r1 );
   }

   function setArc( pathSeg, rad, start ) {
      setCoords( pathSeg, rad + ( start || 0 ), pathSeg.r1, pathSeg.r2 );
      pathSeg.sweepFlag = true;
      pathSeg.largeArcFlag = rad > Math.PI;
   }

   function setProgress( element, value, length ) {
      var pathSeg = element.pathSegList.getItem( 1 );
      var rad = Math.PI * 1.5 / length;
      setCoords( element.pathSegList.getItem( 0 ), rad * value, pathSeg.r1, pathSeg.r2 );
      setArc( pathSeg, rad, rad * value );
   }

   function setGauge( element, value ) {
      var pathSeg = element.pathSegList.getItem( 1 );
      var rad = Math.PI * 1.5; // value = 1.0  -> rad = 270deg = 1.5rad
      setArc( pathSeg, rad * value );
   }

   var template = '' +
      '<div class="ax-gauge">' +
         '<ol class="ax-gauge-inner" style="mask: url(#ax-gauge-inner-mask)" ng-transclude />' +
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
               /*
               '<path class="ax-gauge-progress"' +
                    ' d="M 0 30 A 30 30 0 1 0 0 30" fill="none" />' +
               */
            '</g>' +
         '</svg>' +
      '</div>';

   var paneTemplate = '<li ng-class="{ active: active, prev: prev, next: next }" ng-transclude></li>';

   var svgGlobalDefs = '' +
      '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="0" height="0"' +
          ' style="position: absolute">' +
         '<defs id="ax-gauge-defs">' +
            '<mask id="ax-gauge-ring-mask" x="0" y="0" width="100" height="100">' +
               '<path fill="white" d="M 0 48 A 48 48 0 1 1 48 0 ' +
                                     'L 33 0 A 33 33 0 1 0 0 33 z" />' +
               /*
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
               */
            '</mask>' +
            '<filter id="ax-gauge-glow">' +
               '<feGaussianBlur in="SourceGraphic" stdDeviation="2" />' +
               '<feComponentTransfer>' +
                  '<feFuncA type="linear" slope="0.4" />' +
               '</feComponentTransfer>' +
               '<feBlend mode="lighten" />' +
            '</filter>' +
            '<radialGradient id="ax-gauge-inner-fill">' +
               '<stop offset="95%" stop-color="white" />' +
               '<stop offset="100%" stop-color="black" />' +
            '</radialGradient>' +
            '<mask id="ax-gauge-inner-mask" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">' +
               '<circle cx=".5" cy=".5" r=".35" fill="url(#ax-gauge-inner-fill)" />' +
            '</mask>' +
         '</defs>' +
      '</svg>';

   return {
      createForModule: function( module ) {
         module.directive( directiveName, gaugeDirective );
         module.directive( directiveName + 'Pane', gaugePaneDirective );
      }
   };

} );
