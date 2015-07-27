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
      $scope.repos = [
         {
            "name": "laxar",
            "html_url": "https://github.com/LaxarJS/laxar",
            "enabled": true
         },
         {
            "name": "laxar-patterns",
            "html_url": "https://github.com/LaxarJS/laxar-patterns",
            "enabled": false
         },
         {
            "name": "laxar-uikit",
            "html_url": "https://github.com/LaxarJS/laxar-uikit",
            "enabled": false
         }
      ];
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'settingsWidget', [] ).controller( 'SettingsWidgetController', Controller );

} );
