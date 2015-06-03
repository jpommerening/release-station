/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular'
], function( ng ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', 'axFlowService' ];

   function Controller( $scope, axFlowService ) {
      $scope.navigation = $scope.features.navigation.items.map( function( item ) {
         item.url = axFlowService.constructAnchor( item.place, item.parameters );
         item.active = axFlowService.place().targets._self === item.place;
         return item;
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'navigationWidget', [] ).controller( 'NavigationWidgetController', Controller );

} );
