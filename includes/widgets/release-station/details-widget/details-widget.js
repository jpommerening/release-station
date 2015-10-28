/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular',
   'laxar',
   'laxar-patterns',
   'release-station/to-json-pointer',
   'release-station/extract-pointers',
   'release-station/custom-localize'
], function( ng, ax, patterns, toJsonPointer, extractPointers, customLocalize ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope' ];

   function Controller( $scope ) {

      $scope.model = {
         tab: $scope.features.tabs[ 0 ],
         tabs: $scope.features.tabs,
         selected: 0,
         select: function( index ) {
            $scope.model.tab = $scope.model.tabs[ index ];
            $scope.model.selected = index;
            $scope.model.events = filterEventsForTab( $scope.resources.details, $scope.model.tab );
         },
         events: [],
         links: {},
      };

      $scope.resources = {
         details: [],
         links: []
      };

      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'details', {
            onUpdateReplace: function( event ) {
               var tab = $scope.model.tab;
               var details = $scope.resources.details;
               var events = filterEventsForTab( details, tab );

               $scope.model.tab = null;
               $scope.model.tabs = [];
               $scope.model.selected = -1;
               $scope.model.events = [];

               if( events.length > 0 ) {
                  $scope.model.tab = tab;
                  $scope.model.events = events;
               }

               for( var i = 0; i < $scope.features.tabs.length; i++ ) {
                  tab = $scope.features.tabs[ i ];

                  if( tab === $scope.model.tab ) {
                     events = $scope.model.events;
                     $scope.model.tab = null;
                     $scope.model.selected = -1;
                     $scope.model.events = null;
                  } else {
                     events = filterEventsForTab( details, tab );
                  }
                  if( events.length > 0 ) {
                     if( !$scope.model.tab ) {
                        $scope.model.tab = tab;
                        $scope.model.selected = $scope.model.tabs.length;
                        $scope.model.events = events;
                     }
                     $scope.model.tabs.push( tab );
                  }
               }
            }
         } );

      if( $scope.features.links ) {
         $scope.features.links.forEach( function( link, index ) {
            var link = $scope.features.links[ index ];
            var pointer = toJsonPointer( link.field );
            var i18nHtmlFormat = link.i18nHtmlFormat;

            patterns.resources.handlerFor( $scope )
               .registerResourceFromFeature( 'links.' + index, {
                  onUpdateReplace: function( event ) {
                     var links = $scope.resources[ link.resource ];
                     if( !links ) {
                        return;
                     }
                     for( var i = 0; i < links.length; i++ ) {
                        if( links[ i ] ) {
                           var key = patterns.json.getPointer( links[ i ], pointer );
                           $scope.model.links[ key ] = customLocalize( i18nHtmlFormat, $scope.i18n, links[ i ] );
                        }
                     }
                  },
                  modelKey: link.resource
               } );
         } );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function filterEventsForTab( events, tab ) {
      if( !tab.filter ) {
         return events;
      }

      var fields = tab.filter.fields;

      return events.filter( function( event ) {
         var values = extractPointers( event, fields );

         return ng.equals( values, tab.filter.values );
      } );
   }

   return ng.module( 'detailsWidget', [] )
            .controller( 'DetailsWidgetController', Controller )
            .filter( 'axRenderColumn', function() {
               return function( event, i18n, column, links ) {
                  var fields = extractPointers( event, column.fields );
                  var text = customLocalize( column.i18nHtmlFormat, i18n, fields );

                  if( column.link ) {
                     var pointer = toJsonPointer( column.link );
                     var value = patterns.json.getPointer( event, pointer );
                  }
                  var link = links[ value ] || '[0]';

                  return customLocalize( link, i18n, text );
               };
            } );

} );
