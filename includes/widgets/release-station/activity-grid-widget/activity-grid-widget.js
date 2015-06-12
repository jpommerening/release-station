/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar',
   'angular',
   './gauge-directive',
   'release-station/event-pipeline',
   'release-station/github-events'
], function( ax, ng, gauge, eventPipeline, githubEvents ) {
   'use strict';

   var moduleName = 'activityGridWidget';
   var module     = ng.module( moduleName, [] );

   gauge.createForModule( module );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$interval' ];

   function Controller( $scope, $interval ) {
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
         }
      ];

      var projectById = {};

      function updateRepositoryInfo( id, url ) {
         var resource = 'repo' + id;

         function onReplace( event ) {
            $scope.eventBus.unsubscribe( onReplace );
            var project = $scope.projects[ projectById[ id ] ];
            Object.keys( event.data ).forEach( function( key ) {
               project[ key ] = event.data[ key ];
            } );
         }

         $scope.eventBus.subscribe( 'didReplace.' + resource, onReplace );
         $scope.eventBus.publish( 'takeActionRequest.provide-' + resource, {
            action: 'provide',
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
         .classify( function( event ) {
            var type = event.type;
            var payload = event.payload;

            if( typeof projectById[ event.repo.id ] === 'undefined' ) {
               var name = event.repo.name;
               var part = name.split( '/' );
               var events = $scope.resources.events[ name ] = {};

               projectById[ event.repo.id ] = $scope.projects.length;
               var project = {
                  id: event.repo.id,
                  name: part[ 1 ],
                  full_name: name,
                  owner: {
                     login: part[ 0 ]
                  },
                  url: event.repo.url,
                  events: Object.create( events )
               };

               $scope.projects.push( project );

               setTimeout( function() {
                  updateRepositoryInfo( project.id, project.url );
               }, 1000 );

               $scope.$watch( 'resources.events[ "' + name + '" ]', function( value ) {
                  var sum = 0;
                  if( value.commits ) {
                     sum += value.commits.length;
                  }
                  if( value.issues_opened ) {
                     sum += value.issues_opened.length;
                  }
                  if( value.issues_closed ) {
                     sum += value.issues_closed.length;
                  }
                  if( value.tags ) {
                     sum += value.tags.length;
                  }
                  project.gauge = 1 - (1 / Math.log(1 + sum));
               }, true );
            }

            switch( type ) {
               case 'CommitEvent':
                  return 'commits';
               case 'CreateEvent':
                  if( payload.ref_type === 'tag' ) {
                     return 'tags';
                  }
                  return;
               case 'IssuesEvent':
                  if( payload.action === 'opened' || payload.action === 'reopened' ) {
                     return 'issues_opened';
                  } else if( payload.action === 'closed' ) {
                     return 'issues_closed';
                  }
                  return;
            }

         } );

      $scope.eventBus.subscribe('beginLifecycleRequest', beginLifecycle);

      $scope.eventBus.subscribe('endLifecycleRequest', endLifecycle);
   }

   function beginLifecycle() {
   }

   function endLifecycle() {
   }

   module.controller( 'ActivityGridWidgetController', Controller );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////


   return module;

} );
