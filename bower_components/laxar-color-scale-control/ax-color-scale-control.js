/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'angular',
   'chroma-js'
], function( ng, chroma ) {
   'use strict';

   var directiveName = 'axColorScale';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var directive = [ function colorScaleDirective() {
      return {
         restrict: 'A',
         replace: true,
         template: '<ol class="ax-color-scale" style="display: none"><li class="ax-color-stop"></li></ol>',
         scope: {
            scale: '=?' + directiveName
         },
         link: function( scope, iElement, iAttrs ) {
            var base = iElement.find( '.ax-color-stop' );
            var colors = getColorStops( iElement, base );

            getColorStopsAsync( iElement, base, function( colors ) {
               scope.scale = chroma.scale( chroma.bezier( colors ) );
            } );
         }
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Same as `getColorStops` but if the returned array is empty, wait for all stylesheets to load and
    * try again. Call the given callback with the array obtained from `getColorStops`.
    * @param {jQuery} element the root element to insert color stops into
    * @param {jQuery} base a "template" to clone color stops from
    * @param {Function} callback the function to call with the colors
    */
   function getColorStopsAsync( element, base, callback ) {
      var colors = getColorStops( element, base );
      var styles;

      if( colors.length > 0 ) {
         callback( colors );
      } else {
         styles = ng.element( 'link[rel="stylesheet"]' );

         styles.on( 'load', function onLoad() {
            colors = getColorStops( element, base );

            if( colors.length > 0 ) {
               styles.off( 'load', onLoad );
               callback( colors );
            }
         } );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Build an array of colors stops.
    * Create copies of the given base element and insert them into the root element.
    * Attach the `ax-color-stop-$n` class to each element, as long as the elements appear to have a
    * background color.
    * Return an array of colors or an empty array if there were no matching styles.
    * @param {jQuery} element the root element to insert color stops into
    * @param {jQuery} base a "template" to clone color stops from
    * @return {String[]} colors stops
    */
   function getColorStops( element, base ) {
      var nocolor = getBackgroundColor( base[ 0 ] );
      var colors = [];
      var stop;
      var i;

      base.remove();

      for( i = 0; i < 10; i++ ) {
         stop = base.clone();
         stop.addClass( 'ax-color-stop-' + i );
         element.append( stop );
         colors.unshift( getBackgroundColor( stop[ 0 ] ) );

         if( colors[ 0 ] === nocolor ) {
            colors.shift();
            break;
         }
      }

      element.children().remove();
      element.append( base );

      return colors.reverse();
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Try to determine the given element's current background color as defined by CSS.
    * @param {jQuery} element the element to inspect
    * @return {String} the background color
    */
   function getBackgroundColor( element ) {
      if( getComputedStyle ) {
         return getComputedStyle( element )[ 'background-color' ];
      } else {
         return element.currentStyle.backgroundColor;
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( directiveName + 'Control', [] ).directive( directiveName, directive );

} );
