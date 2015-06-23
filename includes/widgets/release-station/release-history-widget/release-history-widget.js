/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular',
   'semver'
], function( ng, semver ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', 'axFlowService' ];

   function Controller( $scope, flowService ) {
      $scope.log = function( a ) { console.log( a ); };
      $scope.versions = {};

      var selected;

      $scope.eventBus.subscribe( 'beginLifecycleRequest', beginLifecycle );
      $scope.eventBus.subscribe( 'endLifecycleRequest', endLifecycle );

      $scope.eventBus.subscribe( 'didReplace.tags', function( event ) {
         $scope.versions = event.data.map( constructVersionObject ).reduce( function( versions, version ) {
            var semver = version.semver;
            var track = versions[ semver.major ] = ( versions[ semver.major ] || [] );

            track.push( version );
            return versions;
         }, {} );
      } );

      $scope.eventBus.publishAndGatherReplies( 'takeActionRequest.provide-resource-tags', {
         action: 'provide-resource',
         data: {
            resource: 'tags',
            url: 'https://api.github.com/repos/LaxarJS/laxar/tags'
         }
      } ).then( function() {
      } );

      $scope.eventBus.subscribe( 'didNavigate', function( event ) {
         var version = event.data[ 'version' ] ? event.data[ 'version' ] : '';
         selectVersion( version );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function selectVersion( version ) {
         selected = version;
         updateMetaData( $scope.versions, '', selected );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function constructVersionObject( tag ) {
         var parameters = {};

         tag.semver = semver.parse( tag.name );

         parameters[ 'version' ] = tag.name;

         tag.url = flowService.constructAbsoluteUrl( '_self', parameters );

         return tag;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function beginLifecycle() {
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function endLifecycle() {
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function updateMetaData( versions, latest, selected ) {
      for( var key in versions ) {
         if( versions.hasOwnProperty( key ) ) {
            versions[ key ].forEach( function( version ) {
               version.isSelected = version.name === selected;
            } );
         }
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'releaseHistoryWidget', [] ).controller( 'ReleaseHistoryWidgetController', Controller );

} );
