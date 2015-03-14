/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'require',
   './gauge-directive',
   'angular'
], function( require, gauge, ng ) {
   'use strict';

   var moduleName = 'activityGrid';
   var module     = ng.module( moduleName, [] );

   gauge.createForModule( module );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$interval' ];

   function Controller( $scope, $interval ) {
      $scope.toUrl = require.toUrl;

      function stats(factor) {
         var total = 0;
         return ([
            {
               text: ['Commits'],
               value: Math.floor(Math.random()*23*factor),
               weight: 1
            },
            {
               text: ['Issues', 'closed'],
               value: Math.floor(Math.random()*5*factor),
               weight: 2
            },
            {
               text: ['Issues', 'opened'],
               value: Math.floor(Math.random()*4*factor),
               weight: 1
            },
            {
               text: ['Version', 'released'],
               value: Math.floor(1.5+Math.random()*factor),
               weight: 3
            }
         ]).map(function(stat) {
            stat.contributionStart = total;
            stat.contribution = stat.weight * stat.value;
            total += stat.contribution;
            return stat;
         }).map(function(stat) {
            stat.contribution /= total;
            stat.contributionStart /= total;
            return stat;
         });
      }

      $scope.projects = [ {
         owner: 'LaxarJS',
         name: 'laxar',
         url: 'https://github.com/LaxarJS/laxar',
         metrics: {
            value: 0.5 + Math.random() * (1/1.5),
            stats: stats(1),
            current: 0,
            prev: 3,
            next: 1
         }
      }, {
         owner: 'LaxarJS',
         name: 'laxar_patterns',
         url: 'https://github.com/LaxarJS/laxar_patterns',
         metrics: {
            value: 0.3 + Math.random() * (1/1.3),
            stats: stats(0.7),
            current: 0,
            prev: 3,
            next: 1
         }
      } ];

      var gaugeProgress;
      var gaugeFill;
      var gaugeGlow;

      $scope.eventBus.subscribe('beginLifecycleRequest', beginLifecycle);

      $scope.eventBus.subscribe('endLifecycleRequest', endLifecycle);
   }

   function beginLifecycle() {
   }

   function endLifecycle() {
   }

   module.controller( 'ActivityGridController', Controller );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////


   return module;

} );
