/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'laxar-patterns',
   'angular',
   'semver',
   './commit-graph-directive',
   'json!laxar-application/commitdata.json'
], function( patterns, ng, semver, commitGraph, commitdata ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', 'axFlowService' ];

   function Controller( $scope, flowService ) {

      $scope.eventBus.subscribe( 'beginLifecycleRequest', beginLifecycle );
      $scope.eventBus.subscribe( 'endLifecycleRequest', endLifecycle );

      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'tags' )
         .registerResourceFromFeature( 'log' );

      $scope.commits = commitdata.filter(function (commit) {
         if (this[ commit.sha ]) return false;
         return (this[ commit.sha ] = true);
      }, {});

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function beginLifecycle() {
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function endLifecycle() {
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'releaseHistoryWidget', [] )
            .controller( 'ReleaseHistoryWidgetController', Controller )
            .directive( 'axCommitGraph', commitGraph.axCommitGraph );

} );
