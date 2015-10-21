/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   './graph'
], function( graph ) {
   'use strict';

   var SPACING = 32;
   var RADIUS = 4;

   var directive = function() {
      return {
         restrict: 'AE',
         replace: true,
         template: template,
         scope: {
            commits: '=axCommitGraph'
         },
         link: function( scope, element, attrs ) {
            var options = {
               id: function (commit) {
                  return commit.sha;
               },
               parents: function (commit) {
                  return commit.parents.map(options.id);
               },
               time: function (commit) {
                  return (new Date(commit.commit.committer.date)).getTime();
               },
               distance: function (commit1, commit2) {
                  var t1 = options.time(commit1);
                  var t2 = options.time(commit2);
                  var d = (t2 <= t1) ? 0 : Math.log( 1 + ((t2 - t1) / 86400000) ) * SPACING;

                  if( options.parents(commit2).indexOf(options.id(commit1)) >= 0 ) {
                     return SPACING + (d / 3);
                  } else {
                     return (SPACING / 3) + d;
                  }
               }
            };

            var lookup = options.lookup = graph.nodeResolver(options, scope.commits);
            var commits = graph.nodelist(options).apply(null, scope.commits).reverse();

            var children = graph.childResolver(options);
            var distance = graph.distanceAccumulator(options, 0);
            var track = graph.branchTracker(options, [ options.id( commits[ 0 ] ) ]);

            scope.nodes = commits.map( function( commit, i, commits ) {
               var prev = i ? commits[ i - 1 ] : commit;

               return {
                  id: options.id(commit),
                  parents: options.parents(commit),
                  children: children(commit),
                  track: track(commit),
                  delta: distance(commit, prev)
               };
            } ).map( function( node, i, nodes ) {
               return {
                  id: node.id,
                  parents: node.parents,
                  children: node.children,
                  x: Math.round( (nodes[ nodes.length - 1 ].delta) - node.delta ) + 0.5,
                  y: node.track * SPACING
               };
            } );

            scope.connections = [].concat.apply( [], scope.nodes.map( function( node ) {
               node.parents.forEach( function( parent ) {
                  if( !this[ parent ] ) {
                     this[ parent ] = [];
                  }
                  this[ parent ].push( node );
               }, this );

               if( !this[ node.id ] ) {
                  return [];
               }
               return this[ node.id ].map( function( child ) {
                  return {
                     from: node,
                     to: child
                  };
               } );
            }, { /* map parent -> children */ } ) );

            element.attr( {
               width: scope.nodes[ 0 ].x + 19.5,
               height: 200
            } );

            scope.highlight = function ($event, value) {
               var node = $event.target;
               var id = node.getAttribute('data-node');
               var from = node.getAttribute('data-from');
               var to = node.getAttribute('data-to');

               function updateClass(element, classes) {
                  if( value ) {
                     return element.attr( 'class', classes );
                  } else {
                     return element.removeAttr( 'class' );
                  }
               }

               var cls = {
                  hl: 'highlight',
                  from: 'highlight from',
                  to: 'highlight to'
               };

               updateClass( element.find(node), cls.hl );

               if( id ) {
                  updateClass( element.find('[data-from="' + id + '"]'), cls.from );
                  updateClass( element.find('[data-to="' + id + '"]'), cls.to );
               }
               if( from ) {
                  updateClass( element.find('[data-node="' + from + '"]'), cls.from );
               }
               if( to ) {
                  updateClass( element.find('[data-node="' + to + '"]'), cls.to );
               }
            };

            scope.clk = function (node) {
               console.log( node );
            };

            scope.formatPath = formatPath;
         }

      };
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function formatPath(from, to) {
      var radius = RADIUS;
      var limit = SPACING + Math.log(Math.pow(to.y - from.y, 2));
      var segments = [ move(from) ];
      var via;

      function move(to) {
         return 'M ' + (to.x + radius) + ' ' + to.y;
      }

      function line(to) {
         return 'L ' + (to.x - radius) + ' ' + to.y;
      }

      function curve(from, to) {
         var factor = Math.log(Math.pow(to.y - from.y, 2)) / Math.sqrt(to.x - from.x);
         return 'C' + ((from.x + factor*to.x) / (1+factor)) + ' ' + from.y + ', ' +
                      ((from.x*factor + to.x) / (1+factor)) + ' ' + to.y + ', ' +
                      (to.x - radius) + ' ' + to.y;
      }


      if( from.y === to.y ) {
         segments.push( line( to ) );
      } else if( (to.x - from.x) < limit ) {
         segments.push( curve( from, to ) );
      } else if( to.y < from.y ) {
         via = { x: to.x - limit, y: from.y };
         segments.push( line(via) );
         segments.push( curve(via, to) );
      } else {
         via = { x: from.x + limit, y: to.y };
         segments.push( curve(from, via) );
         segments.push( line(to) );
      }

      return segments.join( ' ' );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var template = '' +
      '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
         '<g transform="translate(10 10)">' +
            '<path class="grid" ' +
               'ng-repeat="node in nodes" ' +
               'ng-attr-d="M {{node.x}} 200 L {{node.x}} {{node.y + ' + RADIUS + '}}"/>' +
            '<path ' +
               'ng-repeat="connection in connections"' +
            /* 'ng-mouseenter="highlight($event, true)" ' +
               'ng-mouseleave="highlight($event, false)" ' + */
               'ng-attr-d="{{formatPath(connection.from, connection.to)}}" ' +
               'data-from="{{connection.from.id}}" ' +
               'data-to="{{connection.to.id}}"/>' +
            '<a ng-repeat="node in nodes" xlink:href="" ng-click="clk(node)" xlink:title="{{node.title}}">' +
               '<circle ' +
                  'ng-attr-cx="{{node.x}}" ng-attr-cy="{{node.y}}" r="' + RADIUS + '" ' +
                  'ng-mouseenter="highlight($event, true)" ' +
                  'ng-mouseleave="highlight($event, false)" ' +
                  'data-node="{{node.id}}"/>' +
            '</a>' +
         '</g>' +
      '</svg>';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      axCommitGraph: directive
   };

} );
