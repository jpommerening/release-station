/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'angular',
   'moment',
   'laxar',
   'laxar-patterns',
   'event-pipeline'
], function( ng, moment, ax, patterns, eventPipeline ) {
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

      eventPipeline( $scope, 'events' )
         .filter( function( e ) {
            return ( [
               'PushEvent',
               'CreateEvent',
               'IssuesEvent'
            ].indexOf( e.type ) >= 0 );
         } )
         .synthesize( function( e ) {
            if( e.type === 'PushEvent' ) {
               return e.payload.commits.filter( function( c ) {
                  return c.distinct;
               } ).map( function( c, i ) {
                  return {
                     id: e.id + '.' + i,
                     type: 'CommitEvent',
                     payload: c,
                     actor: e.actor,
                     repo: e.repo,
                     org: e.org,
                     public: e.public,
                     created_at: e.created_at
                  };
               } );
            } else {
               return [];
            }
         } )
         .classify( function( e ) {
            return moment.parseZone( e.created_at ).format( 'YYYY-MM-DD' );
         } )
         .classify( function( e ) {
            var type = e.type;
            var payload = e.payload;
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
         } )
         .map( function( e ) {
            console.log( e );
            return e;
         } );

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

         console.log( eventBucket( $scope.resources.events, date ) );
      } );

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

      function constructDayObject( date ) {
         var base = eventBucket( $scope.resources.events, date );
         var object = Object.create( base );
         var parameters = {};

         parameters[ parameter ] = date.format( 'YYYY-MM-DD' );

         object.date = date;
         object.weekend = date.day() % 6 === 0;
         object.url = flowService.constructAbsoluteUrl( '_self', parameters );

         return object;
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

   function eventBucket( buckets, timestamp ) {
      var key = timestamp.format( 'YYYY-MM-DD' );
      return buckets[ key ] = (buckets[ key ] || {});
   }

   function pushItem( bucket, key, item ) {
      return (bucket[ key ] = (bucket[ key ] || [])).push( item );
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
            day.isInMonth = date.isSame( startOfMonth ) || date.isBetween( startOfMonth, endOfMonth );
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
