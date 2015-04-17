/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'angular',
   'moment',
   'laxar',
   'laxar_patterns'
], function( ng, moment, ax, patterns ) {
   'use strict';

   var moduleName = 'activityCalendarWidget';
   var module     = ng.module( moduleName, [] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$timeout', 'axFlowService' ];

   function Controller( $scope, $timeout, flowService ) {
      var parameter = $scope.features.calendar.parameter;
      var today = moment().startOf( 'day' );
      var tomorrow = moment( today ).add( 1, 'day' );
      var selected = today;

      var incoming = [];

      $scope.resources = {
         events: {}
      };

      // Track changes to the events resource and process them asynchronously,
      // but don't keep a copy of all the unprocessed events.

      $scope.eventBus.subscribe( 'didReplace.' + $scope.features.events.resource, function( event ) {
         incoming = event.data;
         $scope.resources.events = {};
         processEvents( incoming, $scope.resources.events );
      } );

      $scope.eventBus.subscribe( 'didUpdate.' + $scope.features.events.resource, function( event ) {
         patterns.json.applyPatch( incoming, event.patches );
         processEvents( incoming, $scope.resources.events );
      } );

      function eventBucket( buckets, timestamp ) {
         var key = timestamp.format( 'YYYY-MM-DD' );
         return buckets[ key ] = (buckets[ key ] || {});
      }

      function pushItem( bucket, key, item ) {
         return (bucket[ key ] = (bucket[ key ] || [])).push( item );
      }

      function processEvents( events, buckets ) {
         var event;
         ax.log.trace( 'Processing ' + events.length + ' events.' );
         while( event = events.pop() ) {
            var bucket = eventBucket( buckets, moment.parseZone( event.created_at ) );
            var type = event.type;
            var payload = event.payload;

            pushItem( bucket, 'events', event );
            switch( type ) {
               case 'PushEvent':
                  payload.commits.forEach( function( commit ) {
                     if( commit.distinct ) {
                        pushItem( bucket, 'commits', commit );
                     }
                  } );
                  break;
               case 'CreateEvent':
                  if( payload.ref_type === 'tag' ) {
                     pushItem( bucket, 'tags', payload );
                  }
                  break;
               case 'ReleaseEvent':
                  // TODO: Do something with releases
                  break;
               case 'IssuesEvent':
                  if( payload.action === 'opened' || payload.action === 'reopened') {
                     pushItem( bucket, 'issues_opened', payload.issue );
                  } else if( payload.action === 'closed' ) {
                     pushItem( bucket, 'issues_closed', payload.issue );
                  }
                  break;
            }
         }
      }

      $scope.weeks = [];

      $scope.pushedRows = 0;
      $scope.unshiftedRows = 0;
      $scope.visibleRows = 6;
      $scope.active = false;

      var endOfDay;

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function( event ) {
         endOfDay = callTomorrow( function toNextDay() {
            today = moment().startOf( 'day' );
            tomorrow = moment( today ).add( 1, 'day' );

            // refresh
            selectDate( selected );

            endOfDay = callTomorrow( toNextDay );
         } );

         function callTomorrow( callback ) {
            var timeout = tomorrow.diff() + 250;
            ax.log.trace( 'Will update calendar at midnight, in ' + Math.ceil( timeout / 1000 ) + ' seconds.' );
            return $timeout( callback, timeout );
         }
      } );

      $scope.eventBus.subscribe( 'endLifecycleRequest', function( event ) {
         $timeout.cancel( endOfDay );
      } );

      $scope.eventBus.subscribe( 'didNavigate', function( event ) {
         var date = event.data[ parameter ] ? moment( event.data[ parameter ] ) : today;
         selectDate( date );
      } );

      function constructDateUrl( date ) {
         var data = {};
         data[ parameter ] = date.format( 'YYYY-MM-DD' );
         return flowService.constructAbsoluteUrl( '_self', data );
      }

      function constructDayObject( date ) {
         var base = eventBucket( $scope.resources.events, date );
         var object = Object.create( base );
         object.date = date;
         object.weekend = date.day() % 6 === 0;
         object.url = constructDateUrl( date );

         return object;
      }

      function selectDate( date ) {
         var startOfMonth = moment( date ).startOf( 'month' );
         var endOfMonth = moment( date ).endOf( 'month' );

         var startOfSelectedMonth = moment( selected ).startOf( 'month' );
         var endOfSelectedMonth = moment( selected ).endOf( 'month' );

         var startOfPreviousMonth = moment( startOfSelectedMonth ).subtract( 1, 'month' );
         var endOfNextMonth = moment( endOfSelectedMonth ).add( 1, 'month' );

         selected = date;

         var weeks;

         if( $scope.weeks.length == 0 || date.isBefore( startOfPreviousMonth ) || date.isAfter( endOfNextMonth ) ) {
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
   }

   module.controller( 'ActivityCalendarWidgetController', Controller );

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
            day.isInMonth = date.isSame( startOfMonth ) || ( date.isAfter( startOfMonth ) && date.isBefore( endOfMonth ) );
            day.isToday = date.isSame( today );
            day.isSelected = date.isSame( selected );
            day.isPast = date.isBefore( today );
            day.isFuture = date.isAfter( today );
         } );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
