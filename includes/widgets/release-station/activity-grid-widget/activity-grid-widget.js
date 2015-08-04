/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'angular',
   'laxar',
   'laxar-patterns',
   'semver',
   'moment',
   './gauge-directive',
   'release-station/event-pipeline',
   'release-station/github-events'
], function( ng, ax, patterns, semver, moment, gauge, eventPipeline, githubEvents ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$interval', 'axFlowService' ];

   function Controller( $scope, $interval, axFlowService ) {

      $scope.projects = [];
      $scope.resources = {
         events: {},
         repos: []
      };

      $scope.stats = [
         {
            text: [ 'Commits' ],
            value: 'commits'
         },
         {
            text: [ 'Issues', 'opened' ],
            value: 'issues_opened'
         },
         {
            text: [ 'Issues', 'closed' ],
            value: 'issues_closed'
         },
         {
            text: [ 'Tags' ],
            value: 'tags'
         }
      ];

      eventPipeline( $scope, 'events', {
            onUpdateReplace: function() {
               updateActivityData( $scope.resources.events );
            }
         } )
         .filter( githubEvents.by.type.in( 'PushEvent', 'CreateEvent', 'IssuesEvent' ) )
         .synthesize( githubEvents.generate.commits )
         .filter( githubEvents.by.date.after( moment().add( -30, 'days' ) ) )
         .classify( githubEvents.by.repository )
         .classify( classifyEventByType );

      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'repos', {
            onUpdateReplace: function() {
               $scope.projects = $scope.resources.repos.map( constructProjectObject );
            }
         } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function constructProjectObject( repo ) {
         var base = eventBucket( $scope.resources.events, repo );
         var object = Object.create( base );

         object.repo = repo;

         return object;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function eventBucket( buckets, repo ) {
      var key = repo.id;
      return (buckets[ key ] = (buckets[ key ] || {}));
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function classifyEventByType( event ) {
      var type = event.type;
      var payload = event.payload;

      if( type === 'IssuesEvent' ) {
         if( payload.action === 'opened' || payload.action === 'reopened' ) {
            return 'issues_opened';
         } else if( payload.action === 'closed' ) {
            return 'issues_closed';
         }
      } else if( type === 'CommitEvent' ) {
         return 'commits';
      } else if( type === 'CreateEvent' && payload.ref_type === 'tag' ) {
         var version = semver.parse( payload.ref );

         if( version.build.length ) {
            return 'build';
         } else if( version.prerelease.length ) {
            return 'prerelease';
         } else if( version.patch ) {
            return 'patch';
         } else if( version.minor ) {
            return 'minor';
         } else if( version.major ) {
            return 'major';
         } else {
            return 'tags';
         }
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function updateActivityData( buckets ) {
      Object.keys( buckets ).forEach( function( key ) {
         buckets[ key ].activity = getActivityEstimation( buckets[ key ] );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function getActivityEstimation( project ) {
      var sum = 0;
      if( project.commits ) {
         sum += project.commits.length;
      }
      if( project.issues_opened ) {
         sum += project.issues_opened.length;
      }
      if( project.issues_closed ) {
         sum += project.issues_closed.length;
      }
      if( project.major ) {
         sum += project.major.length * 2;
      }
      if( project.minor ) {
         sum += project.minor.length * 1.3;
      }
      if( project.patch ) {
         sum += project.patch.length * 1.1;
      }
      if( project.major ) {
         sum += project.major.length * 2;
      }
      return 1 - (1 / Math.log(1 + sum));
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'activityGridWidget', [] )
            .directive( 'axGauge', gauge.axGauge )
            .directive( 'axGaugePane', gauge.axGaugePane )
            .controller( 'ActivityGridWidgetController', Controller );

} );
