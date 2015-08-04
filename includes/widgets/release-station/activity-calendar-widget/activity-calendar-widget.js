/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar',
   'angular',
   'moment',
   'release-station/event-pipeline',
   'release-station/github-events'
], function( ax, ng, moment, eventPipeline, githubEvents ) {
   'use strict';

   var DATE_FORMAT = 'YYYY-MM-DD';

   var moduleName = 'activityCalendarWidget';
   var module     = ng.module( moduleName, [] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$timeout', 'axFlowService' ];

   function Controller( $scope, $timeout, flowService ) {
      var parameter = $scope.features.calendar.parameter;
      var today = moment().startOf( 'day' );
      var tomorrow = moment( today ).add( 1, 'day' );
      var selected = today;

      $scope.getActivityEstimation = function(x) { return x.activity; };
      $scope.weeks = [];
      $scope.resources = {
         events: {}
      };

      $scope.pushedRows = 0;
      $scope.unshiftedRows = 0;
      $scope.visibleRows = 6;
      $scope.active = false;

      $scope.details = function details( date ) {
         var events = eventBucket( $scope.resources.events, date );

         $scope.eventBus.publish( 'didReplace.' + $scope.features.details.resource, {
            resource: $scope.features.details.resource,
            data: events
         } );

         if( date.isSame( selected ) ) {
            $scope.eventBus.publish( 'takeActionRequest.' + $scope.features.details.action, {
               action: $scope.features.details.action
            } );
            return false;
         }
         return true;
      };

      eventPipeline( $scope, 'events', {
            onUpdateReplace: function() {
               updateActivityData( $scope.resources.events );
            }
         } )
         .filter( githubEvents.by.type.in( 'PushEvent', 'CreateEvent', 'IssuesEvent' ) )
         .synthesize( githubEvents.generate.commits )
         .classify( githubEvents.by.date )
         .classify( classifyEventByType );

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function( event ) {
         var endOfDay = callTomorrow( function toNextDay() {
            today = moment().startOf( 'day' );
            tomorrow = moment( today ).add( 1, 'day' );

            // refresh
            selectDate( selected );

            endOfDay = callTomorrow( toNextDay );
         } );

         $scope.$on( '$destroy', function() {
            $timeout.cancel( endOfDay );
         } );

         function callTomorrow( callback ) {
            var timeout = tomorrow.diff() + 250;
            ax.log.trace( 'Will update calendar at midnight, in ' + Math.ceil( timeout / 1000 ) + ' seconds.' );
            return $timeout( callback, timeout );
         }
      } );

      $scope.eventBus.subscribe( 'didNavigate', function( event ) {
         var date = event.data[ parameter ] ? moment( event.data[ parameter ] ) : today;
         selectDate( date );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function selectDate( date ) {
         var startOfMonth = moment( date ).startOf( 'month' );
         var endOfMonth = moment( date ).endOf( 'month' );

         var startOfSelectedMonth = moment( selected ).startOf( 'month' );
         var endOfSelectedMonth = moment( selected ).endOf( 'month' );

         var startOfPreviousMonth = moment( startOfSelectedMonth ).subtract( 1, 'month' );
         var endOfNextMonth = moment( endOfSelectedMonth ).add( 1, 'month' );

         selected = date;

         var weeks;

         if( $scope.weeks.length === 0 || date.isBefore( startOfPreviousMonth ) || date.isAfter( endOfNextMonth ) ) {
            weeks = initMonth( startOfMonth, endOfMonth );
            $scope.weeks = weeks;
         } else if( date.isBefore( startOfSelectedMonth ) ) {
            weeks = previousMonth( startOfMonth, endOfMonth );
            $scope.weeks.unshift.apply( $scope.weeks, weeks );
            $scope.unshiftedRows = weeks.length;
         } else if( date.isAfter( endOfSelectedMonth ) ) {
            weeks = nextMonth( startOfMonth, endOfMonth );
            $scope.weeks.push.apply( $scope.weeks, weeks );
            $scope.pushedRows = weeks.length;
         } else {
            weeks = $scope.weeks;
            updateMetaData( weeks, today, selected, startOfMonth, endOfMonth );
            return;
         }

         triggerAnimation( today, startOfMonth, endOfMonth );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function constructDayObject( date ) {
         var base = eventBucket( $scope.resources.events, date );
         var object = Object.create( base );
         var parameters = {};

         parameters[ parameter ] = date.format( DATE_FORMAT );

         object.date = date;
         object.url = flowService.constructAbsoluteUrl( '_self', parameters );
         object.commits_url = object.url + '/commits';
         object.tags_url = object.url + '/tags';
         object.issues_url = object.url + '/issues';

         return object;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function initMonth( startOfMonth, endOfMonth ) {
         var startOfCalendar = moment( startOfMonth ).weekday( startOfMonth.weekday() > 2 ? 0 : -7 );
         var endOfCalendar = moment( startOfCalendar ).add( 6, 'weeks' );
         return generateCalendar( startOfCalendar, endOfCalendar, constructDayObject );
      }

      function previousMonth( startOfMonth, endOfMonth ) {
         var startOfCalendar = moment( startOfMonth ).weekday( startOfMonth.weekday() > 2 ? 0 : -7 );
         var endOfCalendar = moment( $scope.weeks[0][0].date );
         return generateCalendar( startOfCalendar, endOfCalendar, constructDayObject );
      }

      function nextMonth( startOfMonth, endOfMonth ) {
         var startOfCalendar = moment( $scope.weeks[$scope.weeks.length-1][6].date ).add( 1, 'day' );
         var endOfCalendar = moment( endOfMonth ).weekday( endOfMonth.weekday() > 3 ? 14 : 7 );
         return generateCalendar( startOfCalendar, endOfCalendar, constructDayObject );
      }

      function triggerAnimation( today, startOfMonth, endOfMonth ) {
         $timeout( function() {
            $scope.active = true;
            updateMetaData( $scope.weeks, today, selected, startOfMonth, endOfMonth );
         }, 0 );

         $timeout( function() {
            if( $scope.pushedRows ) {
               $scope.pushedRows = 0;
               $scope.weeks.splice( 0, $scope.weeks.length - $scope.visibleRows );
            }
            if( $scope.unshiftedRows ) {
               $scope.unshiftedRows = 0;
               $scope.weeks.splice( $scope.visibleRows );
            }
            $scope.active = false;
         }, 750 );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function eventBucket( buckets, timestamp ) {
      var key = timestamp.format( DATE_FORMAT );
      return (buckets[ key ] = (buckets[ key ] || {}));
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function generateCalendar( startOfCalendar, endOfCalendar, callback ) {
      var date = moment( startOfCalendar );
      var week = [];
      var weeks = [];
      while( date.isBefore( endOfCalendar ) ) {
         week.push( callback( moment( date ) ) );
         date.add( 1, 'day' );
         if( week.length === 7 ) {
            weeks.push( week );
            week = [];
         }
      }
      return weeks;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function updateMetaData( weeks, today, selected, startOfMonth, endOfMonth ) {
      weeks.forEach( function( week ) {
         week.forEach( function( day ) {
            var date = day.date;
            day.isToday = date.isSame( today );
            day.isSelected = date.isSame( selected );
            day.isPast = date.isBefore( today );
            day.isFuture = date.isAfter( today );
            day.isWeekend = date.day() % 6 === 0;
            day.isInMonth = date.isSame( startOfMonth ) || date.isBetween( startOfMonth, endOfMonth );
            day.isWorkingDay = day.isInMonth && !(day.isWeekend || day.isFuture);
         } );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function classifyEventByType( event ) {
      var type = event.type;
      var payload = event.payload;
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
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function updateActivityData( buckets ) {
      Object.keys( buckets ).forEach( function( key ) {
         buckets[ key ].activity = getActivityEstimation( buckets[ key ] );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function getActivityEstimation( day ) {
      var sum = 0;
      if( day.commits ) {
         sum += day.commits.length;
      }
      if( day.tags ) {
         sum += day.tags.length * 1.4;
      }
      if( day.issues_opened ) {
         sum += day.issues_opened.length;
      }
      if( day.issues_closed ) {
         sum += day.issues_closed.length;
      }
      return 1 - (1 / Math.log(1 + sum));
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.controller( 'ActivityCalendarWidgetController', Controller );

   return module;

} );
