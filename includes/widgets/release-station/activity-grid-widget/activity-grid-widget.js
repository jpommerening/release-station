/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar',
   'angular',
   'semver',
   './gauge-directive',
   'release-station/event-pipeline',
   'release-station/github-events'
], function( ax, ng, semver, gauge, eventPipeline, githubEvents ) {
   'use strict';

   var moduleName = 'activityGridWidget';
   var module     = ng.module( moduleName, [] );

   gauge.createForModule( module );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$interval', 'axFlowService' ];

   function Controller( $scope, $interval, axFlowService ) {
      $scope.projects = [];
      $scope.resources = {
         events: {}
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

      var projectById = {};

      function updateProjectInfo( id, url ) {
         var resource = 'repo' + id;

         function onReplace( event ) {
            $scope.eventBus.unsubscribe( onReplace );
            var project = $scope.projects[ projectById[ id ] ];
            Object.keys( event.data ).forEach( function( key ) {
               project[ key ] = event.data[ key ];
            } );
         }

         $scope.eventBus.subscribe( 'didReplace.' + resource, onReplace );
         $scope.eventBus.publish( 'takeActionRequest.provide-resource-' + resource, {
            action: 'provide-resource',
            data: {
               resource: resource,
               url: url
            }
         } );
      }

      eventPipeline( $scope, 'events' )
         .filter( githubEvents.by.type.in( 'PushEvent', 'CreateEvent', 'IssuesEvent' ) )
         .synthesize( githubEvents.generate.commits )
         .filter( githubEvents.by.date.after( '2015-01-01' ) )
         .classify( githubEvents.by.repository )
         .forEach( function( event ) {
            var repo = event.repo;

            if( typeof projectById[ repo.id ] === 'undefined' ) {
               var name = repo.name;
               var part = name.split( '/' );
               var events = $scope.resources.events[ name ] = {};

               projectById[ repo.id ] = $scope.projects.length;
               var project = {
                  id: repo.id,
                  name: part[ 1 ],
                  full_name: name,
                  owner: {
                     login: part[ 0 ]
                  },
                  url: repo.url,
                  events: events
               };
               project.timeline_url = axFlowService.constructAbsoluteUrl( 'timeline', {
                  owner: part[ 0 ],
                  name: part[ 1 ]
               } );

               updateProjectInfo( repo.id, repo.url );

               $scope.projects.push( project );

               $scope.$watch( 'resources.events[ "' + name + '" ]', function( value ) {
                  project.gauge = getActivityEstimation( value );
               }, true );
            }
         } )
         .classify( classifyEventByType );

      $scope.eventBus.subscribe('beginLifecycleRequest', beginLifecycle);
      $scope.eventBus.subscribe('endLifecycleRequest', endLifecycle);

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function beginLifecycle() {
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function endLifecycle() {
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

   }

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

   function getActivityEstimation( events ) {
      var sum = 0;
      if( events.commits ) {
         sum += events.commits.length;
      }
      if( events.issues_opened ) {
         sum += events.issues_opened.length;
      }
      if( events.issues_closed ) {
         sum += events.issues_closed.length;
      }
      if( events.major ) {
         sum += events.major.length * 2;
      }
      if( events.minor ) {
         sum += events.minor.length * 1.3;
      }
      if( events.patch ) {
         sum += events.patch.length * 1.1;
      }
      if( events.major ) {
         sum += events.major.length * 2;
      }
      return 1 - (1 / Math.log(1 + sum));
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.controller( 'ActivityGridWidgetController', Controller );

   return module;

} );
