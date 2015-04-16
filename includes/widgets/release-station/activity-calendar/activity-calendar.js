/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'angular',
   'moment',
   'laxar_patterns'
], function( ng, moment, patterns ) {
   'use strict';

   var moduleName = 'activityCalendar';
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
         // updateEventData( $scope.weeks, $scope.resources.events, today );
      } );

      $scope.eventBus.subscribe( 'didUpdate.' + $scope.features.events.resource, function( event ) {
         patterns.json.applyPatch( incoming, event.patches );
         processEvents( incoming, $scope.resources.events );
         // updateEventData( $scope.weeks, $scope.resources.events, today );
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
                  console.log( event );
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
            var timeout = tomorrow.diff();
            console.log( 'A new day starts in ' + timeout + ' milliseconds.' );
            return $timeout( callback, timeout + 250 );
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

         // updateEventData( weeks, $scope.resources.events, today );
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

   module.controller( 'ActivityCalendarController', Controller );

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

   function ChiSqFn( k ) {
      var gammaK = (function Fak( n ) {
         var x = 1;
         while( n >= 1 ) x *= n--;
         return x;
      })( k - 1 );

      return function( x ) {
         if( x < 0 ) return 0;
         return ( Math.pow( x, k / 2 - 1 ) * Math.pow( Math.E, -x / 2 ) ) /
                ( Math.pow( 2, k / 2 ) * gammaK );
      }
   }

   function CumChiSqFn( k, x ) {
      var area = [ 1.000, 0.995, 0.990, 0.975, 0.950, 0.900, 0.750, 0.500, 0.250, 0.100, 0.050, 0.025, 0.010, 0.005 ];
      var value = [
         [ 0.00000, 0.00004, 0.00016, 0.00098, 0.00393, 0.01579, 0.10153, 0.45494, 1.32330, 2.70554, 3.84146, 5.02389, 6.63490, 7.87944 ],
         [ 0.00000, 0.01003, 0.02010, 0.05064, 0.10259, 0.21072, 0.57536, 1.38629, 2.77259, 4.60517, 5.99146, 7.37776, 9.21034, 10.59663 ],
         [ 0.00000, 0.07172, 0.11483, 0.21580, 0.35185, 0.58437, 1.21253, 2.36597, 4.10834, 6.25139, 7.81473, 9.34840, 11.34487, 12.83816 ],
         [ 0.00000, 0.20699, 0.29711, 0.48442, 0.71072, 1.06362, 1.92256, 3.35669, 5.38527, 7.77944, 9.48773, 11.14329, 13.27670, 14.86026 ]
      ][ k-1 ];
      var fn = ChiSqFn( k );

      return function( x ) {
         var d;

         for( var i=0; i < area.length - 1; i++ ) {
            if( x >= value[ i ] && x <= value[ i+1 ] ) {
               d = value[ i+1 ] - value[ i ];
               d = (x - value[ i ]) / d;
               return (1-d) * area[ i ] + d * area[ i+1 ];
            }
         }
         return area[ i ];
      };
   }

   function activity( day, mean ) {
      var weights = {
         commits: 0.4,
         issues: 0.6,
         releases: 1.9
      };

      var fn = CumChiSqFn( 3 );
      var value = Object.keys( weights ).map( function( key ) {
         return weights[ key ] * (mean[ key ] - day[ key ]);
      } ).reduce( function( a, b ) {
         return a*a + b*b;
      } );

      return fn( value );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function updateEventData( weeks, buckets, today ) {
      function getRandomForDate( date, mean, variation ) {
         if( (date.day() % 6) === 0) mean /= 3.2;
         if( date.isSame(today) ) mean /= 1.5;
         return ( date.isSame( today ) || date.isBefore( today ) ) ? Math.floor( mean + ((Math.random() - 0.5) * 2 * mean * variation) ) : 0;
      }

      var mean = {
         commits: 2.05,
         issues: 1.25,
         releases: 0.51
      };

      weeks.forEach( function( week ) {
         week.forEach( function( day ) {
            day.commits  = { length: getRandomForDate( day.date, mean.commits, 0.7 ) };
            day.issues_opened = { length: getRandomForDate( day.date, mean.issues, 0.5 ) };
            day.issues_closed = { length: getRandomForDate( day.date, mean.issues, 0.5 ) };
            day.releases = { length: getRandomForDate( day.date, mean.releases, 1 ) };
            // day.activity = activity( day, mean );
         } );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
