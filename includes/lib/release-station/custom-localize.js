/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar',
   './formatter'
], function( ax, formatter ) {

   return function( i18nValue, i18n ) {
      var args = [].slice.call( arguments, 2 );
      if( typeof args[ 0 ] !== 'object' ) {
         args[ 0 ] = [ args[ 0 ] ];
      } else if( !(args[ 0 ] instanceof Array) ) {
         args.unshift( [] );
      }

      if( typeof i18nValue !== 'object' ) {
         args.unshift( i18nValue );
      } else {
         if( !i18n || !i18n.locale || !i18n.tags ) {
            return undefined;
         }
         var languageTag = i18n.tags[ i18n.locale ];
         if( !languageTag ) {
            return undefined;
         }
         args.unshift( ax.i18n.localizer( languageTag )( i18nValue ) );
      }

      return formatter.apply( null, args );
   };

} );
