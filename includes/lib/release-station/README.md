# ReleaseStation utilities

This directory contains utility functions and classes used by the widgets in
[`../../widgets/release-station`](../../widgets/release-station).

## Localization (custom-localize.js)

The `custom-localize` module exports a single function that wraps LaxarJS'
localize function. It can be used as a AngularJS filter and can handle named
_and_ anonymous formatting parameters.

## EventPipeline (event-pipeline.js)

The _EventPipeline_ is a class modeled on the reactive [Observable][observable]
pattern.  It can be attached to the [_EventBus_][eventbus] and will watch all
updates to a stream-like resource (an initially empty array where new items
are appended in terms of `didUpdate` events to the end of the array).

EventPipeline objects have some array-like methods (`map`, `filter`, `reduce`)
that can be used to merge the events into a widget's view model.

The EventPipeline has _record & replay_ functionality to implement ad-hoc
filtering of the processed events and reflect the changes in the widget's
view model.

### Example:

```javascript
var pipeline = eventPipeline( {
   eventBus: $scope.eventBus,
   features: $scope.features,
   resources: $scope.resources
}, 'myResource', {
   onUpdate: updateCallback,
   onReplace: replaceCallback
} );

pipeline.filter( function( event ) {
   return event.status !== 'success';
} ).forEach( function( event ) {
   console.log( 'Not successful:', event );
} ).classify( function( event ) {
   // Create separate event lists:
   // $scope.resources.myResource[ event.status ] = [ event ];
   return event.status;
} );
```

## Pointer extraction (extract-pointers.js)

The `extract-pointers` module exports a single function that takes an object
and a collection (object, array, or any nested combination thereof) of
[JSONPointer][jsonpointer] strings and returns a collection of the same shape,
where the JSONPointer values are replaced with the values from the other object
that correspond to the pointers.

### Example:

```javascript
var object = {
   a: 'foo',
   b: 'bar',
   c: [ 1, 2, 3 ]
};

extractPointers( object, {
   x: [ '/a', '/b' ],
   y: '/c'
} );
// {
//    x: [ 'foo', 'bar' ],
//    y: [ 1, 2, 3 ]
// }

```

## Formatting (formatter.js)

The `formatter` module exports an `ax.string` formatter that supports
additional formats for strings (mainly SHA-1 digests, `%s`) and dates (via
moment.js, `%m`).

## GitHub specific events (github-events.js)

The `github-events` module exports utility functions for extracting information
from [GitHub Events][github-events].

Example:

```javascript
// Ignore events after 2016 and pick the payload property from each event
var payloads = events.filter( githubEvents.by.date.before('2016-01-01') )
                     .map( githubEvents.payload );
```

## Parametric object filters (object-filter.js)

## JSONPointer conversion (to-json-pointer.js)

The `to-json-pointer` module exports a single function that converts JSON paths
to the JSONPointer format. Strings that already are JSONPointers remain
unchanged. Arrays are converted to JSONPointers that represent each array
element as a property accessor.

### Example:

```javascript
toJsonPointer( [ 'a', 1, 'c' ] );
// '/a/1/c'
toJsonPointer( 'a.1.c' );
// '/a/1/c'
toJsonPointer( '/a/1/c' );
// '/a/1/c'
```

[observable]: https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md "Observable – RxJS"
[eventbus]: https://github.com/LaxarJS/laxar/blob/master/docs/manuals/events.md#the-event-bus-api "The Event Bus API – LaxarJS"
[jsonpointer]: https://tools.ietf.org/html/rfc6901 "RFC 6901 – JavaScript Object Notation (JSON) Pointer"
[github-events]: https://developer.github.com/v3/activity/events/ "Events – GitHub Developer Guide"
