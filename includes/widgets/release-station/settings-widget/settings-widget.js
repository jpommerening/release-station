/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'angular',
   'laxar-patterns'
], function( ng, patterns ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', 'axFlowService' ];

   function Controller( $scope, axFlowService ) {
      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'user', {
            onReplace: replaceUser
         } );

      var ITEMS_PER_PAGE = 10;
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
         console.log(repository);
      };

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
         return getResource( account.login + '/organizations', account.organizations_url );
      }

      function getAccountRepos( account ) {
         return getResource( account.login + '/repos', account.repos_url );
      }

      function getResource( id, url ) {
         var resource;
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
