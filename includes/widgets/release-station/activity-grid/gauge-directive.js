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
   var numInstances = 0;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var directive = [ '$document', function( $document ) {

      return {
         restrict: 'A',
         template: svgTemplate,
         transclude: true,
         scope: {
            value: '=' + directiveName
         },
         link: function( scope, element, attrs ) {
            var globalDefs = $document.find('#ax-gauge-defs');
            if( globalDefs.length === 0 ) {
               globalDefs = ng.element(svgGlobalDefs);
               $document.find('body').append(globalDefs);
            }

            var fill = element.find('.ax-gauge-fill')[0];
            var glow = element.find('.ax-gauge-glow')[0];

            scope.$watch( 'value', function( newValue, oldValue ) {
               setGauge( fill, newValue );
               setGauge( glow, newValue );
            } );

            numInstances++;
            element.on( '$destroy', function() {
               if( --numInstances === 0 ) {
                  globalDefs.remove();
               }
            } );
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

   var svgTemplate = (
      '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewbox="0 0 100 100" class="ax-gauge">'
    + '<g transform="translate(50, 50)">'
    +    '<g transform="rotate(45)">'
    +       '<g mask="url(#ax-gauge-ring-mask)">'
    +          '<path class="ax-gauge-back" d="M 0 50 A 50 50 0 1 1 50 0 L 0 0 z" />'
    +          '<path class="ax-gauge-fill" d="M 0 50 A 50 50 0 1 0 0 50 L 0 0 z" />'
    +       '</g>'
    +       '<g filter="url(#ax-gauge-glow)">'
    +          '<path class="ax-gauge-glow" mask="url(#ax-gauge-ring-mask)"'
    +               ' d="M 0 50 A 50 50 0 1 0 0 50 L 0 0 z" />'
    +       '</g>'
    +    '</g>'
    +    '<g mask="url(#ax-gauge-text-mask)">'
    +       '<circle x="0" y="0" r="28" fill="none" />'
    +       '<g ng-transclude />'
    +    '</g>'
    + '</g>'
    + '</svg>' );

   var svgGlobalDefs = (
      '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position: absolute">'
    + '<defs id="ax-gauge-defs">'
    +    '<mask id="ax-gauge-ring-mask" x="0" y="0" width="100" height="100">'
    +       '<path fill="white" d="M 0 48 A 48 48 0 1 1 48 0 '
    +                             'L 33 0 A 33 33 0 1 0 0 33 z" />'
    +       '<path stroke="black" stroke-width="3"'
    +            ' d="M 0 50 L 0 0 '
    +                'M -50 50 L 0 0 '
    +                'M -50 0 L 0 0 '
    +                'M -50 -50 L 0 0 '
    +                'M 0 -50 L 0 0 '
    +                'M 50 -50 L 0 0 '
    +                'M 50 0 L 0 0" />'
    +       '<path stroke="black" stroke-width="3" transform="rotate(22.5)"'
    +            ' d="M 0 50 L 0 0 '
    +                'M -50 50 L 0 0 '
    +                'M -50 0 L 0 0 '
    +                'M -50 -50 L 0 0 '
    +                'M 0 -50 L 0 0 '
    +                'M 50 -50 L 0 0" />'
    +    '</mask>'
    +    '<filter id="ax-gauge-glow">'
    +       '<feGaussianBlur in="SourceGraphic" stdDeviation="2" />'
    +       '<feComponentTransfer>'
    +          '<feFuncA type="linear" slope="0.4" />'
    +       '</feComponentTransfer>'
    +       '<feBlend mode="screen"/>'
    +    '</filter>'
    +    '<radialGradient id="ax-gauge-text-mask-fill">'
    +       '<stop offset="70%" stop-color="white" />'
    +       '<stop offset="100%" stop-color="black" />'
    +    '</radialGradient>'
    +    '<mask id="ax-gauge-text-mask" x="0" y="0" width="60" height="60">'
    +       '<circle cx="0" cy="0" r="28" fill="url(#ax-gauge-text-mask-fill)" />'
    +    '</mask>'
    + '</defs>'
    + '</svg>' );

   return {
      createForModule: function( module ) {
         module.directive( directiveName, directive );
      }
   };

} );
