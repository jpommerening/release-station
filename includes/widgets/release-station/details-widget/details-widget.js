/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular',
   'laxar-patterns',
   'release-station/to-json-pointer'
], function( ng, patterns, toJsonPointer ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope' ];

   function Controller( $scope ) {

      $scope.model = {
         tab: $scope.features.tabs[ 0 ],
         selected: 0,
         select: function( index ) {
            $scope.model.tab = $scope.features.tabs[ index ];
            $scope.model.selected = index;
         }
      };

      $scope.resources = {
         details: [],
         links: []
      };

      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'details', {
            onReplace: function( event ) {
               var data = event.data;

               console.log( data );
            }
         } );

      if( $scope.features.links ) {
         $scope.features.links.forEach( function( link, index ) {
            patterns.resources.handlerFor( $scope )
               .registerResourceFromFeature( 'links.' + index, {
                  onReplace: function( event ) {
                     console.log( 'link', event );
                  },
                  modelKey: link.resource
               } );
         } );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'detailsWidget', [] )
            .controller( 'DetailsWidgetController', Controller )
            .filter( 'pointer', function() {
               return function( object, pointer ) {
                  return patterns.json.getPointer( object, toJsonPointer( pointer ) );
               };
            } )
            .filter( 'tab', function() {
               return function( events, tab ) {
                  if( !tab.filter ) {
                     return events;
                  }
                  var pointer = toJsonPointer( tab.filter.field );
                  return events.filter( function( event ) {
                     return ( patterns.json.getPointer( event, pointer ) === tab.filter.value );
                  } );
               };
            } );

} );
