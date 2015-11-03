/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'laxar-patterns',
   'angular',
   'semver',
   './commit-graph-directive'
], function( patterns, ng, semver, commitGraph ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', 'axFlowService' ];

   function Controller( $scope, flowService ) {
      var versionParameter = 'version'; // $scope.features.version.parameter;

      $scope.eventBus.subscribe( 'beginLifecycleRequest', beginLifecycle );
      $scope.eventBus.subscribe( 'endLifecycleRequest', endLifecycle );

      $scope.resources = {
         tags: [],
         log: []
      };

      $scope.model = {
         tags: [],
         commits: []
      };

      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'tags', {
            onUpdateReplace: function() {
               $scope.model.tags = $scope.resources.tags.filter( function( tag ) {
                  var version = semver.parse( tag.name );
                  return version.version && version.prerelease.length === 0 && version.build.length === 0;
               } );

               var tags = $scope.model.tags;
               var commits = $scope.model.commits;

               /* if tags don't match commits... */
               if( !tags.some( function( tag ) {
                  return commits.some( function( commit ) {
                     return tag.commit.sha === commit.sha;
                  } );
               } ) ) {
                  $scope.model.commits = [];
               }
            }
         } )
         .registerResourceFromFeature( 'log', {
            onUpdateReplace: function() {
               $scope.model.commits = $scope.resources.log.filter( function( commit ) {;
                  if( !commit ) return false;
                  if( this[ commit.sha ] ) return false;
                  return (this[ commit.sha ] = true);
               }, {} );
            }
         } );

      $scope.eventBus.subscribe( 'didNavigate', function( event ) {
         var place = flowService.place();
         var version = event.data[ versionParameter ] && semver.parse( event.data[ versionParameter ] );

         if( versionParameter && !version && place.expectedParameters.indexOf( versionParameter ) >= 0 ) {
         } else if( version ){
         }
      } );

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
