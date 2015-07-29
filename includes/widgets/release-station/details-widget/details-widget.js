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
      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'details', {
            onReplace: function( event ) {
               var data = event.data;
               $scope.tabs[0].disabled = !(data.commits && data.commits.length);
               $scope.tabs[1].disabled = !(data.tags && data.tags.length);
            }
         } );

      $scope.selectTab = function( tab ) {
         $scope.selected = tab;
      };
      $scope.tabs = [
         { name: 'commits', title: 'Commits' },
         { name: 'tags', title: 'Tags' },
         { name: 'issues', title: 'Issues' }
      ];

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'detailsWidget', [] ).controller( 'DetailsWidgetController', Controller );

} );
