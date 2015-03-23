/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'angular',
   'moment'
], function( ng, moment ) {
   'use strict';

   var moduleName = 'activityCalendar';
   var module     = ng.module( moduleName, [] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', 'axFlowService' ];

   function Controller( $scope, flowService ) {
      var parameter = $scope.features.calendar.parameter;
      var today = moment().startOf( 'day' );
      var selected = today;

      $scope.weeks = [];

      $scope.pushedRows = 0;
      $scope.unshiftedRows = 0;
      $scope.visibleRows = 6;
      $scope.active = false;

      $scope.eventBus.subscribe( 'didNavigate', function( event ) {
         var data = event.data;
         var date = data[ parameter ] ? moment( data[ parameter ] ) : today;

         goToDate( date );
      } );

      function constructDateUrl( date ) {
         var data = {};
         data[ parameter ] = date.format( 'YYYY-MM-DD' );

         return flowService.constructAbsoluteUrl( '_self', data );
      }

      function goToDate( date ) {
         var startOfMonth = moment( selected ).startOf( 'month' );
         var endOfMonth = moment( selected ).endOf( 'month' );

         var startOfPreviousMonth = moment( startOfMonth ).subtract( 1, 'month' );
         var endOfNextMonth = moment( endOfMonth ).add( 1, 'month' );

         selected = date;

         if( !$scope.weeks.length ) {
            initMonth( date );
         } else if( date.isBefore( startOfPreviousMonth ) || date.isAfter( endOfNextMonth ) ) {
            initMonth( date );
         } else if( date.isBefore( startOfMonth ) ) {
            previousMonth( date );
         } else if( date.isAfter( endOfMonth ) ) {
            nextMonth( date );
         } else {
            /* thisMonth( date ) */
         }
      }

      function initMonth( date ) {
         var startOfMonth = moment( date ).startOf( 'month' );
         var endOfMonth = moment( date ).endOf( 'month' );
         var startOfCalendar = moment( startOfMonth ).weekday( startOfMonth.weekday() > 2 ? 0 : -7 );
         var endOfCalendar = moment( startOfCalendar ).add( 6, 'weeks' );

         var weeks = generateCalendar( startOfCalendar, endOfCalendar, constructDateUrl );

         updateMetaData( weeks, today, selected, startOfMonth, endOfMonth );
         updateEventData( weeks, today );

         $scope.weeks = weeks;
      }

      function previousMonth( date ) {
         var startOfMonth = moment( date ).startOf( 'month' );
         var endOfMonth = moment( date ).endOf( 'month' );
         var startOfCalendar = moment( startOfMonth ).weekday( startOfMonth.weekday() > 2 ? 0 : -7 );
         var endOfCalendar = moment( $scope.weeks[0][0].date );

         var weeks = generateCalendar( startOfCalendar, endOfCalendar, constructDateUrl );

         updateEventData( weeks, today );

         $scope.weeks.unshift.apply( $scope.weeks, weeks );
         $scope.unshiftedRows = weeks.length;

         triggerAnimation( today, startOfMonth, endOfMonth );
      }

      function nextMonth( date ) {
         var startOfMonth = moment( date ).startOf( 'month' );
         var endOfMonth = moment( date ).endOf( 'month' );
         var startOfCalendar = moment( $scope.weeks[$scope.weeks.length-1][6].date ).add( 1, 'day' );
         var endOfCalendar = moment( endOfMonth ).weekday( endOfMonth.weekday() > 3 ? 14 : 7 );

         var weeks = generateCalendar( startOfCalendar, endOfCalendar, constructDateUrl );

         updateEventData( weeks, today );

         $scope.weeks.push.apply( $scope.weeks, weeks );
         $scope.pushedRows = weeks.length;

         triggerAnimation( today, startOfMonth, endOfMonth );
      }

      function triggerAnimation( today, startOfMonth, endOfMonth ) {
         /* this animation specific stuff should go into a directive */
         setTimeout( function() {
            $scope.$apply( function() {
               $scope.active = true;
               updateMetaData( $scope.weeks, today, selected, startOfMonth, endOfMonth );
            } );
         }, 10 );

         setTimeout( function() {
            $scope.$apply( function() {
               if( $scope.pushedRows ) {
                  $scope.pushedRows = 0;
                  $scope.weeks.splice( 0, $scope.weeks.length - $scope.visibleRows );
               }
               if( $scope.unshiftedRows ) {
                  $scope.unshiftedRows = 0;
                  $scope.weeks.splice( $scope.visibleRows );
               }
               $scope.active = false;
            } );
         }, 750 );
      }
   }

   module.controller( 'ActivityCalendarController', Controller );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function generateCalendar( startOfCalendar, endOfCalendar, constructDateUrl ) {
      var date = moment( startOfCalendar );
      var week = [];
      var weeks = [];
      while( date.isBefore( endOfCalendar ) ) {
         week.push( {
            date: moment( date ),
            weekend: date.day() % 6 === 0,
            url: constructDateUrl( date )
         } );

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
            day.isPast = date.isBefore( today );
            day.isToday = date.isSame( today );
            day.isSelected = date.isSame( selected );
            day.isFuture = date.isAfter( today );
         } );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function updateEventData( weeks, today ) {
      function getRandomForDate( date, amount ) {
         if( (date.day() % 6) === 0) amount /= 3.2;
         if( date.isSame(today) ) amount /= 1.5;
         return ( date.isSame( today ) || date.isBefore( today ) ) ? Math.floor(Math.random()*amount) : 0;
      }

      weeks.forEach( function( week ) {
         week.forEach( function( day ) {
            day.commits  = getRandomForDate( day.date, 4.1 );
            day.issues   = getRandomForDate( day.date, 2.5 );
            day.releases = getRandomForDate( day.date, 1.1 );
         } );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
