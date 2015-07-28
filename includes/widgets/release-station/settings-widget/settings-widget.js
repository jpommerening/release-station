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

      var events = {
         replace: patterns.resources.replacePublisherForFeature( $scope, 'settings.events' ),
         update: patterns.resources.updatePublisherForFeature( $scope, 'settings.events' )
      };

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

      function eventSourceForRepository( repository ) {
         return {
            type: /^(https?):/.exec( repository.events_url )[ 1 ],
            url: repository.events_url,
            events: [ "push", "issues", "release", "create" ]
         };
      }

      $scope.toggleRepository = function( repository ) {
         var index = settings.repositories.indexOf( repository.url );
         if( repository.enabled && index == -1 ) {
            settings.repositories.push( repository.url );
            events.update( [
               { op: 'add', path: '/-', value: eventSourceForRepository( repository ) }
            ] );
         } else if( index >= 0 ) {
            settings.repositories.splice( index, 1 );
            events.update( [
               { op: 'remove', path: '/' + index }
            ] );
         }

         saveSettings( settings );
      };

      $scope.eventBus.subscribe( 'beginLifecycleRequest', function() {
         return Promise.all( settings.repositories.map( getResource ) ).then( function( repositories ) {
            return events.replace( repositories.map( eventSourceForRepository ) );
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

         return new Promise( function( resolve, reject ) {
            $scope.eventBus.subscribe( 'didTakeAction.provide-resource-' + id, function didTakeAction( event ) {
               $scope.eventBus.unsubscribe( didTakeAction );
               if( event.outcome === patterns.actions.OUTCOME_SUCCESS ) {
                  resolve( resource );
               } else {
                  reject( event.data );
               }
            } );

            $scope.eventBus.publish( 'takeActionRequest.provide-resource-' + id, {
               action: 'provide-resource',
               data: {
                  resource: id,
                  url: url
               }
            } );
         } );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'settingsWidget', [] ).controller( 'SettingsWidgetController', Controller );

} );
