/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar',
   'laxar-patterns',
   'angular',
   'moment',
   'release-station/event-pipeline',
   'release-station/github-events',
   'release-station/object-filter'
], function( ax, patterns, ng, moment, eventPipeline, githubEvents, objectFilter ) {
   'use strict';

   var DATE_FORMAT = 'YYYY-MM-DD';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$timeout', 'axFlowService' ];

   function Controller( $scope, $timeout, flowService ) {
      var dateParameter = $scope.features.calendar.parameter;

      var today = moment().startOf( 'day' );
      var tomorrow = moment( today ).add( 1, 'day' );
      var selected = today;
      var range = {
         min: moment( today ),
         max: moment( today )
      };

      $scope.model = {
         weeks: [],
         push: function( weeks ) {
            this.weeks.push.apply( this.weeks, weeks );
            this.pushedRows += weeks.length;
         },
         unshift: function( weeks ) {
            this.weeks.unshift.apply( this.weeks, weeks );
            this.unshiftedRows += weeks.length;
         },
         active: false,
         visibleRows: 6,
         pushedRows: 0,
         unshiftedRows: 0,
         details: publishDetails
      };

      $scope.resources = {
         events: {},
         repos: [],
         search: ''
      };

      var detailsPublisher = {
         replace: patterns.resources.replacePublisherForFeature( $scope, 'details' ),
         update: patterns.resources.updatePublisherForFeature( $scope, 'details' ),
         action: patterns.actions.publisherForFeature( $scope, 'details' )
      };

      var searchFilter = objectFilter.create( {
         pointers: $scope.features.search.fields,
         matchers: Object.keys( $scope.features.search.match || {} ).map( function( pattern ) {
            return {
               pattern: pattern,
               pointers: $scope.features.search.match[ pattern ]
            };
         } )
      } );

      var pipeline = eventPipeline( $scope, 'events', {
            onUpdateReplace: function() {
               updateActivityData( $scope.model.weeks );
               publishNavigationTargets( selected, range.min, range.max );
            }
         } )
         .filter( githubEvents.by.type.in( 'PushEvent', 'CreateEvent', 'IssuesEvent' ) )
         .synthesize( githubEvents.generate.commits )
         .classify( githubEvents.by.date )
         .filter( function( event ) {
            return searchFilter( $scope.resources.search, event );
         } ).forEach( function( event ) {
            if( range.min.isAfter( event.created_at ) ) {
               range.min = moment( event.created_at );
            }

            if( range.max.isBefore( event.created_at ) ) {
               range.max = moment( event.created_at );
            }
         } );

      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'repos' );

      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'search', {
            onUpdateReplace: function() {
               pipeline.replay();
               updateActivityData( $scope.model.weeks );
            }
         } );

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function( event ) {
         var endOfDay = callTomorrow( function toNextDay() {
            today = moment().startOf( 'day' );
            tomorrow = moment( today ).add( 1, 'day' );

            selectDate( selected ); // refresh

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
         var place = flowService.place();
         var date = event.data[ dateParameter ] && moment( event.data[ dateParameter ] );
         var parameters = {};

         if( dateParameter && !date && place.expectedParameters.indexOf( dateParameter ) >= 0 ) {
            parameters[ dateParameter ] = today.format( DATE_FORMAT );
            $scope.eventBus.publish( 'navigateRequest', {
               target: '_self',
               data: parameters
            } );
         } else {
            selectDate( date || today );
         }
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

         if( $scope.model.weeks.length === 0 || date.isBefore( startOfPreviousMonth ) || date.isAfter( endOfNextMonth ) ) {
            weeks = initMonth( startOfMonth, endOfMonth );
            $scope.model.weeks = weeks;
         } else if( date.isBefore( startOfSelectedMonth ) ) {
            weeks = previousMonth( $scope.model.weeks, startOfMonth, endOfMonth );
            $scope.model.unshift( weeks );
         } else if( date.isAfter( endOfSelectedMonth ) ) {
            weeks = nextMonth( $scope.model.weeks, startOfMonth, endOfMonth );
            $scope.model.push( weeks );
         } else {
            weeks = $scope.model.weeks;
            updateMetaData( weeks, today, selected, startOfMonth, endOfMonth );
            return;
         }

         publishNavigationTargets( selected, range.min, range.max );
         triggerAnimation( today, startOfMonth, endOfMonth );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function publishDetails( date ) {
         function getEvents( $scope ) {
            return eventBucket( $scope.resources.events, date );
         }

         if( publishDetails.unwatch ) {
            publishDetails.unwatch();
         }

         publishDetails.unwatch = $scope.$watch( getEvents, function( newValue, oldValue ) {
            var patches = patterns.json.createPatch( oldValue, newValue );
            detailsPublisher.update( patches );
         }, true );

         detailsPublisher.replace( getEvents( $scope ) ).then( function() {
            detailsPublisher.action();
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function publishNavigationTargets( date, min, max ) {
         var resource;
         var interval;
         var next;

         var targets = [ date ];

         if( $scope.features.navigation ) {
            resource = $scope.features.navigation.resource;
            interval = $scope.features.navigation.interval || 'months';

            next = date;
            do {
               next = moment( next ).add( -1, interval );
               targets.unshift( next );
            } while( next.isAfter( min ) );

            next = date;
            do {
               next = moment( next ).add( 1, interval );
               targets.push( next );
            } while( next.isBefore( max ) );

            $scope.eventBus.publish( 'didReplace.' + resource, {
               resource: resource,
               data: targets.map( function( date ) {
                  return { date: date };
               } )
            } );
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function constructDayObject( date ) {
         var object = {};
         var parameters = {};

         parameters[ dateParameter ] = date.format( DATE_FORMAT );

         object.events = eventBucket( $scope.resources.events, date );
         object.date = date;
         object.url = flowService.constructAbsoluteUrl( '_self', parameters );

         object.isWeekend = date.day() % 6 === 0;

         return object;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function getDayObject( date, weeks ) {
         var i;
         var j;
         if( weeks[ 0 ][ 0 ].date.isAfter( day ) ||
             weeks[ weeks.length ][ weeks[ weeks.length ].length ].date.isBefore( day ) ) {
            return;
         }

         for( i = 0; i < weeks.length; i++ ) {
            for( j = 0; j < weeks[ i ].length; i++ ) {
               if( weeks[ i ][ j ].date.isSame( date ) ) {
                  return weeks[ i ][ j ];
               }
            }
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function initMonth( startOfMonth, endOfMonth ) {
         var startOfCalendar = moment( startOfMonth ).weekday( startOfMonth.weekday() > 1 ? 0 : -7 );
         var endOfCalendar = moment( startOfCalendar ).add( 6, 'weeks' );
         return generateCalendar( startOfCalendar, endOfCalendar, constructDayObject );
      }

      function previousMonth( weeks, startOfMonth, endOfMonth ) {
         var currentStart = weeks[ 0 ][ 0 ].date;
         var startOfCalendar = moment( startOfMonth ).weekday( startOfMonth.weekday() > 1 ? 0 : -7 );
         var endOfCalendar = moment( currentStart );
         return generateCalendar( startOfCalendar, endOfCalendar, constructDayObject );
      }

      function nextMonth( weeks, startOfMonth, endOfMonth ) {
         var currentEnd = weeks[ weeks.length - 1 ][ 6 ].date;
         var startOfCalendar = moment( currentEnd ).add( 1, 'day' );
         var endOfCalendar = moment( endOfMonth ).weekday( endOfMonth.weekday() > 2 ? 14 : 7 );
         return generateCalendar( startOfCalendar, endOfCalendar, constructDayObject );
      }

      function triggerAnimation( today, startOfMonth, endOfMonth ) {
         $timeout( function() {
            $scope.model.active = true;
            updateMetaData( $scope.model.weeks, today, selected, startOfMonth, endOfMonth );
         }, 0 );

         $timeout( function() {
            if( $scope.model.pushedRows ) {
               $scope.model.pushedRows = 0;
               $scope.model.weeks.splice( 0, $scope.model.weeks.length - $scope.model.visibleRows );
            }
            if( $scope.model.unshiftedRows ) {
               $scope.model.unshiftedRows = 0;
               $scope.model.weeks.splice( $scope.model.visibleRows );
            }
            $scope.model.active = false;
         }, 750 );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function eventBucket( buckets, timestamp ) {
      var key = timestamp.format( DATE_FORMAT );
      return (buckets[ key ] = (buckets[ key ] || []));
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
            day.isPast = day.isPast || date.isBefore( today );
            day.isFuture = date.isAfter( today );
            day.isInMonth = date.isSame( startOfMonth ) || date.isBetween( startOfMonth, endOfMonth );
            day.isWorkingDay = day.isInMonth && !(day.isWeekend || day.isFuture);
         } );
      } );
      updateActivityData( weeks );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function updateActivityData( weeks ) {
      weeks.forEach( function( week ) {
         week.forEach( function( day ) {
            var sum = day.events.reduce( function( sum, event ) {
               var type = event.type;
               var payload = event.payload;
               var score = 0.05;
               switch( type ) {
                  case 'CommitEvent':
                     score = 1;
                  break;
                  case 'CreateEvent':
                     score = (payload.ref_type === 'tag') ? 1.5 : 0;
                  break;
                  /*
                  case 'IssuesEvent':
                     if( [ 'opened', 'reopened', 'closed' ].indexOf( payload.action ) >= 0 ) {
                        score = 0.25;
                     }
                  break;
                  */
               }
               return sum + score;
            }, 1 );
            day.activity = 1 - (1 / (1 + Math.log(sum)));
         } );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'activityCalendarWidget', [] )
            .controller( 'ActivityCalendarWidgetController', Controller )
            .filter( 'commits', function() {
               return function( events ) {
                  return events.filter( function( event ) {
                     return event.type === 'CommitEvent';
                  } );
               };
            } )
            .filter( 'tags', function() {
               return function( events ) {
                  return events.filter( function( event ) {
                     return event.type === 'CreateEvent' &&
                        event.payload.ref_type === 'tag';
                  } );
               };
            } )
            .filter( 'issues', function() {
               return function( events ) {
                  return events.filter( function( event ) {
                     return event.type === 'IssuesEvent' &&
                        ( [ 'opened', 'reopened', 'closed' ].indexOf( event.payload.action ) >= 0 );
                  } );
               };
            } );

} );
