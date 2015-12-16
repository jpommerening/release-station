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
      $scope.model = {
         navigation: $scope.features.navigation.map( function( item ) {
            return {
               icon: item.icon,
               i18nHtmlLabel: item.i18nHtmlLabel,
               url: axFlowService.constructAnchor( item.place, item.parameters ),
               active: ( axFlowService.place().targets._self === item.place )
            };
         } )
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'navigationWidget', [] ).controller( 'NavigationWidgetController', Controller );

} );
