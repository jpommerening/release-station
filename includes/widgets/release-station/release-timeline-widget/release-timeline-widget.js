/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular',
   'semver'
], function( ng, semver ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', 'axFlowService' ];

   function Controller( $scope, axFlowService ) {
      // :(
      $scope.log = function( a ) { console.log( a ); };
      $scope.tags = [
         '0.8.0-pre',
         '0.8.0',
         '0.8.1',
         '0.8.1+build.1',
         '0.8.2',
         '0.9.0',
         '0.9.1',
         '0.9.2',
         '0.9.3',
         '1.0.0',
         '1.0.1',
         '1.0.2',
         '1.1.0'
      ];
      $scope.versions = $scope.tags.map( semver.parse );

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'releaseTimelineWidget', [] ).controller( 'ReleaseTimelineWidgetController', Controller );

} );
