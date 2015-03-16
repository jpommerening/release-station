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
      var startOfCalendar = moment(startOfMonth).weekday(0);
      var endOfCalendar = moment(endOfMonth).weekday(7);

      $scope.month = startOfMonth;
      $scope.weeks = [];

      var week = [];
      var date = moment(startOfCalendar);
      while( date.isBefore(endOfCalendar) ) {
         week.push( {
            date: moment(date),
            isWeekend: date.day() % 6 === 0,
            isInMonth: date.isAfter( startOfMonth ) && date.isBefore( endOfMonth ),
            isToday: date.isSame( today ),
            commits: date.isBefore( today ) ? Math.floor(Math.random()*4.1) : 0,
            issues: date.isBefore( today ) ? Math.floor(Math.random()*2.1) : 0,
            releases: date.isBefore( today ) ? Math.floor(Math.random()*1.1) : 0
         } );
         date.add(1, 'day');
         if( week.length === 7 ) {
            $scope.weeks.push( week );
            week = [];
         }
      }
   }

   module.controller( 'ActivityCalendarController', Controller );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
