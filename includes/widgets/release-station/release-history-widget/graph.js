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

        if (track >= 0) {
          tracks[ track ] = parents.shift();
        }

        for (i = 0; parents.length; i++) {
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

  return {
    isParent: isParent,
    isAncestor: isAncestor,
    isBefore: isBefore,
    nodeSorter: nodeSorter,
    nodeResolver: nodeResolver,
    childResolver: childResolver,
    branchTracker: branchTracker,
    distanceAccumulator: distanceAccumulator
  };
} );
