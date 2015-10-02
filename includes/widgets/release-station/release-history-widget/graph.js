/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( function() {
  'use strict'

  // Utilities for working with directed acyclic graphs
  // Most methods accept an `options` parameter that specifies
  // how to get information about the nodes.

  /**
   * Check whether `node` is a parent of `child`.
   * @param {Object} options
   * @param {Function} options.parents
   * @param {Function} options.id
   * @param {Object} node
   * @param {Object} child
   * @return {Boolean} true if `node` is a parent of `child`
   */
  function isParent(options, node, child) {
    return (options.parents(child).indexOf(options.id(node)) >= 0);
  }

  /**
   * Check whether `node` is an ancestor of `descendant`.
   * @param {Object} options
   * @param {Function} options.parents
   * @param {Function} options.id
   * @param {Function} options.lookup
   * @param {Object} node
   * @param {Object} descendant
   * @return {Boolean} true if `node` is an ancestor of `descendant`
   */
  function isAncestor(options, node, descendant) {
    var visited = {};
    var ancestors = options.parents(descendant);
    var ancestor;
    var id = options.id(node);

    function once(id) {
      if (visited[ id ]) return false;
      return (visited[ id ] = true);
    }

    function parents(id) {
      var node = options.lookup(id);
      if (!node) return [];
      return options.parents(node).filter(once);
    }

    while (ancestor = ancestors.shift()) {
      if (ancestor === id) return true;
      ancestors.push.apply(ancestors, parents(ancestor));
    }
    return false;
  }

  /**
   * Check whether `node1` is located before `node2`.
   * @param {Object} options
   * @param {Function} options.parents
   * @param {Function} options.id
   * @param {Function} options.lookup
   * @param {Function} options.time
   * @param {Object} node1
   * @param {Object} node2
   * @return {Boolean} true if `node1` is located before `node2`.
   */
  function isBefore(options, node1, node2) {
    if (isAncestor(options, node1, node2)) {
      return true;
    }
    if (isAncestor(options, node2, node1)) {
      return false;
    }
    return (options.time(node1) < options.time(node2));
  }

  /** Sorting comparator */
  function nodeSorter(options) {
    return function (node1, node2) {
      return isBefore(options, node1, node2) ? 1 : -1;
    };
  }

  /** Lookup function */
  function nodeResolver(options, nodes) {
    var ids = nodes.reduce(function (ids, node) {
      ids[ options.id( node ) ] = node;
      return ids;
    }, {});

    return function (id) {
      return ids[ id ];
    };
  }

  /** Determine on which track to display each node */
  function childResolver(options) {
    var children = {};

    function push(id, child) {
      if (!children[id]) children[id] = [];
      children[id].push(child);
    }

    function pop(id) {
      var result = children[id] || [];
      delete children[id];
      return result;
    }

    return function (node) {
      var id = options.id(node);

      options.parents(node).forEach(function (parent) {
        push(parent, id);
      });

      return pop(id);
    };
  }

  /** Determine on which track to display each node */
  function branchTracker(options, tracks) {
    tracks = tracks || [];

    return function (node) {
        var id = options.id(node);
        var parents = options.parents(node).slice();
        var track = -1;
        var i;

        for (i = 0; i < tracks.length; i++) {
           if (typeof tracks[ i ] === 'undefined') continue;

           if (tracks[ i ] === id) {
              delete tracks[ i ];
              if (track < 0) track = i;
           }
        }

        for (i = (track < 0) ? 0 : track; parents.length; i++) {
           if (typeof tracks[ i ] === 'undefined') {
              tracks[ i ] = parents.shift();
              if (track < 0) track = i;
           }
        }

        return track;
    };
  }

  /** Accumulate relative distances */
  function distanceAccumulator(options, distance) {
    distance = distance || 0;
    return function (node1, node2) {
      return distance += options.distance(node1, node2);
    };
  }

  function nodelist(options) {
    var nodes = [];
    var pivot = 0;

    function sort() {
      var i = pivot, j, k;
      var ppivot = pivot, start;
      var node, time, parents;

      // First, record all sorted ids for easy lookup
      var ids = nodes.slice(0, pivot).map(options.id);

      // then, iterate through all unsorted nodes
      while (i < nodes.length) {
        start = 0;
        node = nodes[i];
        parents = options.parents(node);

        // check if all parents are in the sorted sublist
        for (j = 0; j < parents.length; j++) {
          k = ids.indexOf(parents[j]);

          // if the parent was not found (but is present in the set)
          if (k < 0 && options.lookup(parents[j])) {
            start = -1;
            break;
          } else if (k >= start) {
            // record largest index pointing to a parent
            start = k + 1;
          }
        }

        // if we found all parents
        if (start >= 0) {
          // add the id
          time = options.time(node);

          // move the pivot element to place where "node" was
          nodes[ i ] = nodes[ pivot ];

          // shift all sorted elements between "start" and "pivot"
          // to the back until we find a slot for "node" depending
          // on the configured notion of "time"
          for (j = pivot; j > start; j--) {
            if (options.time(nodes[j-1]) < time) {
              break;
            }
            nodes[ j ] = nodes[ j-1 ];
            ids[ j ] = ids[ j-1 ];
          }

          // insert the node into the correct slot
          nodes[ j ] = node;
          ids[ j ] = options.id(node);

          // move pivot to the next element
          pivot += 1;
        }

        // if we reached the end of the array, repeat from the pivot,
        // unless the pivot did not change from the last run
        if( ++i === nodes.length && ppivot != pivot) {
          i = ppivot = pivot;
        }
      }
      return nodes.slice(0, pivot).reverse();
    }

    function add() {
      nodes.push.apply(nodes, arguments);
      return sort();
    }

    return add;
  }

  return {
    isParent: isParent,
    isAncestor: isAncestor,
    isBefore: isBefore,
    nodeSorter: nodeSorter,
    nodeResolver: nodeResolver,
    childResolver: childResolver,
    branchTracker: branchTracker,
    distanceAccumulator: distanceAccumulator,
    nodelist: nodelist
  };
} );
