/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'angular',
   'laxar',
   'laxar-patterns',
   './pager-directive',
   './toggle-directive'
], function( ng, ax, patterns, pager, toggle ) {
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

      function enabled( repo ) {
         return !!($scope.model.settings.repos[ repo.id ]);
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
               var repos = $scope.resources.repos.filter( enabled );
               publisher.replace( repos );
            }
         } );

      var publisher = publisherForFeature( $scope, 'settings.repos' );

      var storage = ax.storage.getApplicationLocalStorage();
      var settings = {
         repositories: []
      };

      $scope.repositoryChanged = function( repo ) {
         var value = enabled( repo );
         var patch = createPatch( settings, repo, value );
         if( patch ) {
            publisher.update( [ patch ] );
         }
         saveSettings( settings );
      };

      $scope.setAllEnabled = function( value ) {
         var repos = $scope.resources.repos.filter( function( repo ) {
            return repo.owner.login === $scope.model.login;
         } );

         repos.forEach( function( repo ) {
            $scope.model.settings.repos[ repo.id ] = value;
         } );

         publisher.update( repos.map( function( repo ) {
            return createPatch( settings, repo, value );
         } ).filter( function( patch ) { return !!patch; } ) );
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

      function createPatch( settings, repository, enabled ) {
         var index = settings.repositories.indexOf( repository.id );
         if( enabled && index == -1 ) {
            settings.repositories.push( repository.id );
            return { op: 'add', path: '/-', value: repository };
         } else if( index >= 0 ) {
            settings.repositories.splice( index, 1 );
            return { op: 'remove', path: '/' + index };
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
         update: patterns.resources.updatePublisherForFeature( $scope, feature )
      };

      return publisher;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'SettingsWidget', [] )
            .directive( 'axPager', pager.axPager )
            .directive( 'axToggle', toggle.axToggle )
            .controller( 'SettingsWidgetController', Controller );

} );
