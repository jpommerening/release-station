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

   Controller.$inject = [ '$scope' ];

   function Controller( $scope ) {
      var now = moment();
      var today = moment(now).startOf('day');
      var startOfMonth = moment(now).startOf('month');
      var endOfMonth = moment(now).endOf('month');
      var startOfCalendar = moment(startOfMonth).weekday( startOfMonth.weekday() > 2 ? 0 : -7);
      var endOfCalendar = moment(endOfMonth).weekday(7);

      var weeks = generateCalendar( startOfCalendar, endOfCalendar );

      var targets = {
         previousMonth: previousMonth,
         nextMonth: nextMonth,
         thisMonth: thisMonth
      };

      updateMetaData( weeks, today, startOfMonth, endOfMonth, targets );
      updateEventData( weeks, today );

      $scope.weeks = weeks;

      function previousMonth( date ) {
         var startOfMonth = moment( date ).startOf( 'month' );
         var endOfMonth = moment( date ).endOf( 'month' );

         var startOfCalendar = moment(startOfMonth).weekday( startOfMonth.weekday() > 2 ? 0 : -7);
         var endOfCalendar = moment($scope.weeks[0][0].date);

         var weeks = generateCalendar( startOfCalendar, endOfCalendar );

         updateEventData( weeks, today );

         $scope.weeks.unshift.apply( $scope.weeks, weeks );
         $scope.unshiftedRows = weeks.length;

         /* this animation specific stuff should go into a directive */
         setTimeout( function() {
            $scope.$apply( function() {
               $scope.active = true;
               updateMetaData( $scope.weeks, today, startOfMonth, endOfMonth, targets );
            } );
         }, 10 );

         setTimeout( function() {
            $scope.$apply( function() {
               $scope.unshiftedRows = 0;
               $scope.active = false;
               $scope.weeks.splice(6);
            } );
         }, 700 );
      }

      function nextMonth( date ) {
         var startOfMonth = moment( date ).startOf( 'month' );
         var endOfMonth = moment( date ).endOf( 'month' );
         var startOfCalendar = moment($scope.weeks[$scope.weeks.length-1][6].date).add(1, 'day');
         var endOfCalendar = moment(endOfMonth).weekday( endOfMonth.weekday() > 3 ? 14 : 7);

         var weeks = generateCalendar( startOfCalendar, endOfCalendar );

         updateEventData( weeks, today );

         $scope.weeks.push.apply( $scope.weeks, weeks );
         $scope.pushedRows = weeks.length;

         /* this animation specific stuff should go into a directive */
         setTimeout( function() {
            $scope.$apply( function() {
               $scope.active= true;
               updateMetaData( $scope.weeks, today, startOfMonth, endOfMonth, targets );
            } );
         }, 10 );

         setTimeout( function() {
            $scope.$apply( function() {
               $scope.pushedRows = 0;
               $scope.active = false;
               $scope.weeks.splice(0, $scope.weeks.length - 6);
            } );
         }, 700 );
      }

      function thisMonth( date ) {
      }
   }

   module.controller( 'ActivityCalendarController', Controller );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function getWeek( date ) {
      var startOfWeek = moment( date ).startOf( 'day' ).weekday( -7 );

      return new Array( 7 ).map( function( value, index ) {
         return { date: moment( startOfWeek ).days( index ) };
      } );
   }

   function generateCalendar( startOfCalendar, endOfCalendar ) {
      var date = moment( startOfCalendar );
      var week = [];
      var weeks = [];
      while( date.isBefore( endOfCalendar ) ) {
         week.push( {
            date: moment( date ),
            weekend: date.day() % 6 === 0
         } );

         date.add(1, 'day');
         if( week.length === 7 ) {
            weeks.push( week );
            week = [];
         }
      }
      return weeks;
   }

   function updateMetaData( weeks, today, startOfMonth, endOfMonth, targets ) {
      weeks.forEach( function( week ) {
         week.forEach( function( day ) {
            var date = day.date;
            day.isInMonth = date.isSame( startOfMonth ) || ( date.isAfter( startOfMonth ) && date.isBefore( endOfMonth ) );
            day.isPast = date.isBefore( today );
            day.isToday = date.isSame( today );
            day.isFuture = date.isAfter( today );

            if( date.isBefore( startOfMonth ) ) {
               day.target = targets.previousMonth
            } else if( date.isAfter( endOfMonth ) ) {
               day.target = targets.nextMonth;
            } else {
               day.target = targets.thisMonth;
            }
         } );
      } );
   }

   function updateEventData( weeks, today ) {
      function getRandomForDate( date, amount ) {
         if( (date.day() % 6) === 0) amount /= 3.2;
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
