/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( function() {
   'use strict';

   var directiveName = 'axPager';
   var ITEMS_PER_PAGE = 10;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var directive = function() {
      return {
         restrict: 'A',
         replace: true,
         template: template,
         scope: {
            pager: '=?' + directiveName
         },
         link: function( scope, iElement, iAttrs ) {
            var length = 0;
            var items = ITEMS_PER_PAGE;

            scope.pages = [];
            scope.selected = 0;
            scope.first = 0;
            scope.last = 0;

            scope.select = function( page ) {
               if( page < scope.first ) page = scope.first;
               if( page > scope.last )  page = scope.last;

               scope.selected = page;
               scope.pages = buildPages( scope.first, scope.last, scope.selected );
            };
            scope.previous = function() {
               scope.select( scope.selected - 1 );
            };
            scope.next = function() {
               scope.select( scope.selected + 1 );
            };

            scope.pager = function( value, index, array ) {
               if( array.length !== length ) {
                  length = array.length;

                  scope.first = 0;
                  scope.last = Math.ceil( length / items ) - 1;
                  scope.selected = 0;
                  scope.pages = buildPages( scope.first, scope.last, scope.selected );
               }
               var start = scope.selected * items;

               return ( ( index >= start ) && ( index < start + items ) );
            };
         }
      };
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function buildPages( first, last, selected ) {
      var ws  = 1; // window size: number of page entries shown before and after current page
      var dws = 2 * ws;

      var pages = [];
      var i;

      var start = Math.min( selected - ws, last - dws - 2 );
      var end = Math.max( selected + ws, first + dws + 2 );

      for( var i = first; i <= last; i++ ) {
         if( i == first || i === last ) {
            pages.push( i ); // first or last page
         } else if( i >= start && i <= end ) {
            pages.push( i ); // inside page "window"
         } else if( i < start && start - first <= 2 ) {
            pages.push( i ); // avoid ellipses for single pages (front)
         } else if( i > end && last - end <= 2 ) {
            pages.push( i ); // avoid ellipses for single pages (back)
         } else if( pages[ pages.length - 1 ] !== -1 ) {
            pages.push( -1 );
         }
      }

      return pages;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var template = '' +
      '<div class="btn-group" role="group">' +
         '<ul class="pagination">' +
            '<li ng-repeat="page in pages track by $index" ' +
                'ng-class="{ active: selected === page }">' +
               '<a href="#" ng-if="page >= 0" ng-click="select(page)">' +
                  '{{page + 1}}' +
               '</a>' +
               '<span ng-if="page < 0">&hellip;</span>' +
            '</li>' +
         '</ul>' +
      '</div>';

   return {
      axPager: directive
   };

} );
