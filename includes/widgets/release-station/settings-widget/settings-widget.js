/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'angular',
   'laxar',
   'laxar-patterns'
], function( ng, ax, patterns ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', 'axFlowService' ];

   function Controller( $scope, axFlowService ) {
      $scope.model = {
         login: null,
         settings: { repos: {} }
      };

      $scope.select = function( login ) {
         $scope.model.login = login;
      };

      $scope.enabled = function( repo ) {
         return !!($scope.model.settings.repos[ repo.id ]);
      };

      $scope.disabled = function( repo ) {
         return !$scope.enabled( repo );
      };

      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'user', {
            onReplace: function() {
               $scope.model.login = $scope.resources.user.login;
            }
         } )
         .registerResourceFromFeature( 'orgs' )
         .registerResourceFromFeature( 'repos', {
            onUpdateReplace: function() {
               var repos = $scope.resources.repos.filter( $scope.enabled );
               eventSources.replace( repos.map( eventSourceForRepository ) );
               dataSources.replace( repos.map( dataSourceForRepository ) );
            }
         } );

      var eventSources = publisherForFeature( $scope, 'settings.events' );
      var dataSources = publisherForFeature( $scope, 'settings.data' );

      var storage = ax.storage.getApplicationLocalStorage();
      var settings = {
         repositories: []
      };

      $scope.repositoryChanged = function( repo ) {
         var value = $scope.enabled( repo );
         updateSettings( settings, repo, value );
         saveSettings( settings );
      };

      $scope.setAllEnabled = function( value ) {
         $scope.resources.repos.filter( function( repo ) {
            return repo.owner.login === $scope.model.login;
         } ).forEach( function( repo ) {
            $scope.model.settings.repos[ repo.id ] = value;
            updateSettings( settings, repo, value );
         } );
         saveSettings( settings );
      };

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function() {
         settings = restoreSettings();
         $scope.model.settings.repos = settings.repositories.reduce( function( repos, repo ) {
            repos[ repo ] = true;
            return repos;
         }, {} );
      } );

      $scope.eventBus.subscribe( 'endLifecycleRequest', function() {
         saveSettings( settings );
      } );

      function updateSettings( settings, repository, enabled ) {
         var index = settings.repositories.indexOf( repository.id );
         if( enabled && index == -1 ) {
            settings.repositories.push( repository.id );
            eventSources.push( eventSourceForRepository( repository ) );
            dataSources.push( dataSourceForRepository( repository ) );
            console.log( 'push' );
         } else if( index >= 0 ) {
            var patches = [ { op: 'remove', path: '/' + index } ];
            settings.repositories.splice( index, 1 );
            eventSources.update( patches );
            dataSources.update( patches );
            console.log( 'remove' );
         }
      }

      function saveSettings( settings ) {
         if( settings.repositories.length ) {
            storage.setItem( 'repositories', settings.repositories );
         } else {
            storage.removeItem( 'repositories' );
         }
      }

      function restoreSettings() {
         return {
            repositories: storage.getItem( 'repositories' ) || []
         };
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function eventSourceForRepository( repository ) {
      return {
         type: /^(https?):/.exec( repository.events_url )[ 1 ],
         url: repository.events_url,
         events: [ "push", "issues", "release", "create" ]
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function dataSourceForRepository( repository ) {
      return {
         url: repository.url
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var nullPublisher = {};
   nullPublisher.replace = nullPublisher.update = nullPublisher.push = function() {};

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function publisherForFeature( $scope, feature ) {
      var pointer = patterns.json.pathToPointer( feature );
      var resource = patterns.json.getPointer( $scope.features, pointer );

      if( resource === undefined ) {
         return nullPublisher;
      }

      var publisher = {
         replace: patterns.resources.replacePublisherForFeature( $scope, feature ),
         update: patterns.resources.updatePublisherForFeature( $scope, feature ),
         push: function( item ) {
            return publisher.update( [ { op: 'add', path: '/-', value: item } ] );
         }
      };

      return publisher;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function buildPages( first, last, selected ) {
      var WINDOW_SIZE = 1; // number of page entries shown before and after current page
      var DWINDOW_SIZE = 2 * WINDOW_SIZE;
      var QWINDOW_SIZE = 2 * DWINDOW_SIZE;

      var pages = [];
      var i;

      var start = Math.min( selected - WINDOW_SIZE, last - QWINDOW_SIZE );
      var end = Math.max( selected + WINDOW_SIZE, first + QWINDOW_SIZE );

      for( var i = first; i <= last; i++ ) {
         if( i == first || i === last ) {
            pages.push( i ); // first or last page
         } else if( i >= start && i <= end ) {
            pages.push( i ); // inside page "window"
         } else if( i < start && start - first <= DWINDOW_SIZE ) {
            pages.push( i ); // avoid ellipses for small amounts of pages (front)
         } else if( i > end && last - end <= DWINDOW_SIZE ) {
            pages.push( i ); // avoid ellipses for small amounts pages (back)
         } else if( pages[ pages.length - 1 ] !== '' ) {
            pages.push( '' );
         }
      }

      return pages;

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function PagerController() {
      var ITEMS_PER_PAGE = 10;
      var $scope = this;

      $scope.pages = [];
      $scope.selected = 0;
      $scope.first = 0;
      $scope.last = 0;

      $scope.text = function( page ) {
         if( page === '' ) {
            return '\u2026'
         } else {
            return page+1;
         }
      };

      $scope.select = function( page ) {
         if( page < $scope.first ) page = $scope.first;
         if( page > $scope.last )  page = $scope.last;

         $scope.selected = page;
         $scope.pages = buildPages( $scope.first, $scope.last, $scope.selected );
      };
      $scope.previous = function() {
         $scope.select( $scope.selected - 1 );
      };
      $scope.next = function() {
         $scope.select( $scope.selected + 1 );
      };
      $scope.filter = ( function () {
         var length = 0;

         return function( value, index, array ) {
            if( array.length !== length ) {
               length = array.length;

               $scope.first = 0;
               $scope.last = Math.ceil( length / ITEMS_PER_PAGE ) - 1;
               $scope.selected = 0;
               $scope.pages = buildPages( $scope.first, $scope.last, $scope.selected );
            }
            var start = $scope.selected * ITEMS_PER_PAGE;

            return ( ( index >= start ) && ( index < start + ITEMS_PER_PAGE ) );
         };
      } )();
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'SettingsWidget', [] )
            .controller( 'SettingsWidgetController', Controller )
            .controller( 'PagerController', PagerController );

} );
