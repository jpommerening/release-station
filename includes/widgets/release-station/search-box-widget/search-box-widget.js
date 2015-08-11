/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 */
define( [
   'angular',
   'laxar',
   'laxar-patterns',
   './messages'
], function( ng, ax, patterns, messages ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$location', 'axEventBus' ];

   function Controller( $scope, $location, eventBus ) {
      var queryParameter = $scope.features.search.parameter;

      $scope.messages = messages;

      patterns.i18n.handlerFor( $scope ).scopeLocaleFromFeature( 'i18n' );

      $scope.model = {
         queryString: ''
      };

      var searchPublisher = patterns.resources.replacePublisherForFeature( $scope, 'search' );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      eventBus.subscribe( 'didNavigate', function( event ) {
         var query = $location.search()[ queryParameter ] || '';
         if( query && query.length > 0 ) {
            $scope.model.queryString = query;
            $scope.functions.startSearch();
         }
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      $scope.functions = {

         startSearch: function() {
            $location.search( queryParameter, $scope.model.queryString || null );
            searchPublisher( $scope.model.queryString );
         }

      };

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'searchBoxWidget', [] ).controller( 'SearchBoxWidgetController', Controller );

} );
