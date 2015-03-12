/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'require',
   'jquery',
   'angular',
   'angular-animate'
], function( require, $, ng ) {
   'use strict';

   var moduleName = 'activityGrid';
   var module     = ng.module( moduleName, [ 'ngAnimate' ] );

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
            previous: 2
         }
      }, {
         owner: 'LaxarJS',
         name: 'laxar_patterns',
         url: 'https://github.com/LaxarJS/laxar_patterns',
         metrics: {
            value: 0.3 + Math.random() * (1/1.3),
            stats: stats(0.7),
            current: 0,
            previous: 2
         }
      } ];

      var gaugeProgress;
      var gaugeFill;
      var gaugeGlow;

      var scrollStats = $interval(function() {
         $scope.projects.forEach(function(project) {
            project.metrics.previous = project.metrics.current;
            project.metrics.current = (project.metrics.current + 1) % project.metrics.stats.length;
         });
      }, 5000);

      $scope.eventBus.subscribe('beginLifecycleRequest', beginLifecycle);

      $scope.eventBus.subscribe('endLifecycleRequest', endLifecycle);

      $scope.arcPath = arcPath;
   }

   function beginLifecycle() {
   }

   function endLifecycle() {
   }

   function arcPath(radius, from, to) {
      from = from * Math.PI;
      to = to * Math.PI;

      var x0 = -Math.sin(from) * radius;
      var y0 = Math.cos(from) * radius;
      var x1 = -Math.sin(to) * radius;
      var y1 = Math.cos(to) * radius;

      return [
         "M", x0, y0,
         "A", radius, radius, 0, ((to-from) > Math.PI) ? 1 : 0, 1, x1, y1
      ].join(" ");
   }

   /*
   function setArc(pathSeg, rad) {
      pathSeg.x = -Math.sin(rad) * pathSeg.r1;
      pathSeg.y = Math.cos(rad) * pathSeg.r2;
      pathSeg.largeArcFlag = rad > Math.PI;
   }

   function setGauge(element, value) {
      // value = 1.0  -> rad = 270deg = 1.5rad
      setArc(element.pathSegList[1], Math.PI * value * 1.5);
   }*/

   module.controller( 'ActivityGridController', Controller );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////


   return module;

} );
