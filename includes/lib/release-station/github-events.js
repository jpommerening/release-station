/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'moment'
], function( moment ) {
   'use strict';

   function filterTypes( types ) {
      return function( event ) {
         return types.indexOf( event.type ) >= 0;
      };
   }

   function commitEvents( event ) {
      if( event.type === 'PushEvent' ) {
         return event.payload.commits.filter( function( commit ) {
            return commit.distinct;
         } ).map( function( commit, index ) {
            return {
               id: event.id + '.' + index,
               type: 'CommitEvent',
               actor: event.actor,
               repo: event.repo,
               payload: commit,
               public: event.public,
               created_at: event.created_at,
               org: event.org
            };
         } );
      } else {
         return [];
      }
   }

   function pick( /* property1, property2, ..., propertyN */ ) {
      var path = [].slice.apply( arguments );
      var getter = function( event ) {
         return path.reduce( function( object, property ) {
            return ( object || {} )[ property ];
         }, event );
      };

      getter.equals = function( value ) {
         return function( event ) {
            return getter( event ) === value;
         };
      };
      getter.in = function() {
         var values = [].slice.apply( arguments );
         return function( event ) {
            return values.indexOf( getter( event ) ) >= 0;
         };
      };

      return getter;
   }

   function momentObject( event ) {
      return moment.parseZone( event.created_at );
   }

   function date( format ) {
      return function( event ) {
         return momentObject( event ).format( format );
      };
   }

   function momentCall( method ) {
      return function momentMethod() {
         var args = [].slice.call( arguments );
         return function( event ) {
            var date = momentObject( event );
            return date[ method ].apply( date, args );
         };
      };
   }

   var by = {
      date: date( 'YYYY-MM-DD' ),
      type: pick( 'type' ),
      types: filterTypes,
      repository: pick( 'repo', 'name' ),
      actor: pick( 'actor', 'login' ),
      organization: pick( 'org', 'login' )
   };

   by.date.format = date;
   by.date.before = momentCall( 'isBefore' );
   by.date.same = momentCall( 'isSame' );
   by.date.after = momentCall( 'isAfter' );
   by.date.between = momentCall( 'isBetween' );

   return {
      moment: momentObject,
      payload: pick( 'payload' ),
      generate: {
         commits: commitEvents
      },
      by: by
   };
} );
