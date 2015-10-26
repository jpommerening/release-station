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

      function selected( repo ) {
         return repo.owner.login === $scope.model.login;
      }

      function enabled( repo ) {
         return !!($scope.model.settings.repos[ repo.id ]);
      }

      $scope.select = function( login ) {
         $scope.model.login = login;
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
               var repos = $scope.resources.repos;

               $scope.model.settings.repos = repos.reduce( function( repos, repo ) {
                  var id = repo.id;
                  repos[ id ] = ( settings.repositories.indexOf( id ) >= 0 );
                  return repos;
               }, {} );

               publisher.replace( repos.filter( enabled ) );
            }
         } );

      var publisher = publisherForFeature( $scope, 'settings.repos' );

      var storage = ax.storage.getApplicationLocalStorage();
      var settings = {
         repositories: []
      };

      $scope.repositoryChanged = function( repo ) {
         var value = enabled( repo );
         var patch = createPatch( settings.repositories, repo, value );
         if( patch ) {
            publisher.update( [ patch ] );
         }
         saveSettings( settings );
      };

      $scope.setAllEnabled = function( value ) {
         var repos = $scope.resources.repos.filter( selected );

         repos.forEach( function( repo ) {
            $scope.model.settings.repos[ repo.id ] = value;
         } );

         publisher.update( repos.map( function( repo ) {
            return createPatch( settings.repositories, repo, value );
         } ).filter( function( patch ) { return !!patch; } ) );
         saveSettings( settings );
      };

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function() {
         settings = restoreSettings();
      } );

      $scope.eventBus.subscribe( 'endLifecycleRequest', function() {
         saveSettings( settings );
      } );

      function createPatch( repositories, repository, enabled ) {
         var index = repositories.indexOf( repository.id );
         if( enabled && index == -1 ) {
            repositories.push( repository.id );
            return { op: 'add', path: '/-', value: repository };
         } else if( index >= 0 ) {
            repositories.splice( index, 1 );
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
