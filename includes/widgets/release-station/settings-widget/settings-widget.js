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
      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'user', {
            onReplace: replaceUser
         } );

      var eventSources = publisherForFeature( $scope, 'settings.events' );
      var dataSources = publisherForFeature( $scope, 'settings.data' );

      var ITEMS_PER_PAGE = 10;

      var storage = ax.storage.getApplicationLocalStorage();
      var settings = restoreSettings();
      var repositories = {};
      var pager = {};

      $scope.selectAccount = function( account ) {
         var login = account.login;

         $scope.login = login;
         $scope.pager = pager[ login ];
         $scope.repositories = repositories[ login ];
         $scope.selectPage( $scope.pager.current );
      };

      $scope.selectPage = function( page ) {
         if( page >= $scope.pager.first && page <= $scope.pager.last ) {
            $scope.pager.current = page;
            $scope.pager.start = (page - 1) * ITEMS_PER_PAGE;
            $scope.pager.end = $scope.pager.start + ITEMS_PER_PAGE;
         }
      };

      $scope.toggleRepository = function( repository ) {
         var index = settings.repositories.indexOf( repository.url );
         if( repository.enabled && index == -1 ) {
            settings.repositories.push( repository.url );
            eventSources.push( eventSourceForRepository( repository ) );
            dataSources.push( dataSourceForRepository( repository ) );
         } else if( index >= 0 ) {
            var patches = [ { op: 'remove', path: '/' + index } ];
            settings.repositories.splice( index, 1 );
            eventSources.update( patches );
            dataSources.update( patches );
         }

         saveSettings( settings );
      };

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function() {
         return Promise.all( settings.repositories.map( getResource ) ).then( function( repositories ) {
            eventSources.replace( repositories.map( eventSourceForRepository ) );
            dataSources.replace( repositories.map( dataSourceForRepository ) );
         } );
      } );

      $scope.eventBus.subscribe( 'endLifecycleRequest', function() {
         saveSettings( settings );
      } );

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

      function replaceUser( event ) {
         var user = event.data;

         $scope.accounts = [ user ];

         var promise = addAccount( user ).then( function() {
            $scope.selectAccount( user );
            $scope.selectPage( 1 );
         } );

         return getAccountOrganizations( user )
            .then( function( organizations ) {
               $scope.accounts.push.apply( $scope.accounts, organizations );

               return Promise.all( [ promise ].concat( organizations.map( addAccount ) ) );
            } );
      }

      function addAccount( account ) {
         return getAccountRepos( account )
            .then( addSortedRepositories )
            .then( addPager );
      }

      function addSortedRepositories( repos ) {
         if( repos && repos.length ) {
            var owner = repos[ 0 ].owner.login;
            repositories[ owner ] = repos.sort( function( a, b ) {
               return ( new Date( b.pushed_at ).getTime() - new Date( a.pushed_at ).getTime() );
            } ).map( function( repository ) {
               repository.enabled = ( settings.repositories.indexOf( repository.url ) >= 0 );
               return repository;
            } );
         }

         return repos;
      }

      function addPager( repos ) {
         if( repos && repos.length ) {
            var owner = repos[ 0 ].owner.login;
            pager[ owner ] = {
               current: 1,
               first: 1,
               last: Math.ceil( repos.length / 10 ),
               start: 0,
               end: 0,
               pages: []
            };

            for( var page = pager[ owner ].first; page <= pager[ owner ].last; page++ ) {
               pager[ owner ].pages.push( page );
            }
         }

         return repos;
      }

      function getAccountOrganizations( account ) {
         return getResource( account.organizations_url );
      }

      function getAccountRepos( account ) {
         return getResource( account.repos_url );
      }

      function getResource( url ) {
         var resource;
         var id = Math.ceil( Math.random() * 1345981345 ).toString( 16 );

         $scope.eventBus.subscribe( 'didReplace.' + id, function onReplace( event ) {
            $scope.eventBus.unsubscribe( onReplace );
            resource = event.data;
         } );

         return $scope.eventBus.publishAndGatherReplies( 'takeActionRequest.provide-resource-' + id, {
            action: 'provide-resource',
            data: {
               resource: id,
               url: url
            }
         } )
         .then( function( replies ) {
            if( !(replies.length) || resource === undefined ) {
               return Promise.reject();
            }

            return resource;
         } );
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

   return ng.module( 'settingsWidget', [] ).controller( 'SettingsWidgetController', Controller );

} );
