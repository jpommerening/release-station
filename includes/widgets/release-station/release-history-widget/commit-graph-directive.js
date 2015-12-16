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

   var directive = [ 'axFlowService', function( flowService ) {
      return {
         restrict: 'AE',
         replace: true,
         template: template,
         scope: {
            commits: '=axCommitGraph',
            tags: '=axCommitGraphTags'
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

            scope.$watch( 'commits', function() {

               var lookup = options.lookup = graph.nodeResolver(options, scope.commits);
               var children = graph.childResolver(options);
               var sorted = graph.nodelist(options).apply(null, scope.commits).reverse();

               var display = {};
               var tags = scope.tags.reduce( function( tags, tag ) {
                  var id = options.id( tag.commit );

                  if( tags[ id ] ) {
                     tags[ id ].push( tag );
                  } else {
                     tags[ id ] = [ tag ];
                  }
                  return tags;
               }, {} );

               var track = graph.branchTracker({
                  id: function(node) { return node.id; },
                  parents: function(node) { return node.parents; }
               });
               var distance = graph.distanceAccumulator({
                  id: function(node) { return node.id; },
                  parents: function(node) { return node.parents; },
                  distance: function(nodea, nodeb) {
                     return options.distance(nodea.data, nodeb.data);
                  }
               });

               scope.nodes = sorted.map( function( commit ) {
                  var id = options.id( commit );
                  var parents = options.parents( commit );
                  var parent = parents[ 0 ];

                  if( tags[ id ] ) {
                     display[ id ] = true;
                  }
                  if( display[ id ] ) {
                     display[ parent ] = true;
                  }

                  return {
                     id: id,
                     parents: parents,
                     children: children( commit ),
                     tags: tags[ id ],
                     data: commit
                  };
               } ).filter( function( node ) {
                  return display[ node.id ];
               } ).map( function( node, i, nodes ) {
                  var prev = i ? nodes[ i - 1 ] : node;

                  node.parents = node.parents.filter( function( id ) { return display[ id ]; } );
                  node.children = node.children.filter( function( id ) { return display[ id ]; } );

                  node.track = track(node);
                  node.delta = distance(node, prev);

                  return node;
               } ).map( function( node, i, nodes ) {
                  var params = {};

                  if( node.tags && node.tags.length ) {
                     params.version = node.tags[ 0 ].name;
                  } else {
                     params.version = node.id;
                  }

                  node.url = flowService.constructAbsoluteUrl( '_self', params );

                  node.x = Math.round( nodes[ nodes.length - 1 ].delta - node.delta ) + 0.5;
                  node.y = node.track * SPACING;

                  return node;
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
                  width: scope.nodes.length > 0 ? scope.nodes[ 0 ].x + 49.5 : 49.5,
                  height: 200
               } );
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

            scope.formatPath = formatPath;

            scope.clk = function( node ) {
               console.log( node );
            };
         }

      };
   } ];

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
            '<a ng-repeat="node in nodes" ' +
               'ng-click="clk(node)" ' +
               'xlink:href="{{node.url}}" ' +
               'xlink:title="{{node.title}}">' +
               '<text ' +
                  'ng-if="node.tags" ' +
                  'ng-attr-x="{{node.x - 5}}" ng-attr-y="{{node.y + 15}}">{{node.tags[0].name}}</text>' +
               '<circle ' +
                  'ng-mouseenter="highlight($event, true)" ' +
                  'ng-mouseleave="highlight($event, false)" ' +
                  'ng-attr-cx="{{node.x}}" ng-attr-cy="{{node.y}}" r="' + RADIUS + '" ' +
                  'data-node="{{node.id}}"/>' +
            '</a>' +
         '</g>' +
      '</svg>';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      axCommitGraph: directive
   };

} );
