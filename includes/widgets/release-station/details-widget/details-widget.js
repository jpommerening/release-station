/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular',
   'laxar-patterns'
], function( ng, patterns ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope' ];

   function Controller( $scope ) {

      $scope.selectTab = function( tab ) {
         $scope.selected = tab;
      };
      $scope.tabs = [
         { name: 'commits', title: 'Commits', columns: [
            {
               title: 'Repository',
               value: 'repo.name'
            }
         ] },
         { name: 'tags', title: 'Tags' },
         { name: 'issues', title: 'Issues' }
      ];

      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'details', {
            onReplace: function( event ) {
               var data = event.data;

               $scope.tabs.forEach( function( tab ) {
                  tab.enabled = !!(data[ tab.name ] && data[ tab.name ].length);

                  if( tab.enabled && !$scope.selected ) {
                     $scope.selected = tab.name;
                  }
               } );

               console.log( data );
            }
         } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'detailsWidget', [] ).controller( 'DetailsWidgetController', Controller );

} );
