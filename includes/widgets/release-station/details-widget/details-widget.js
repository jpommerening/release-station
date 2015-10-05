/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org
 */
define( [
   'angular',
   'laxar',
   'laxar-patterns',
   'release-station/to-json-pointer'
], function( ng, ax, patterns, toJsonPointer ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$filter' ];

   function Controller( $scope, $filter ) {

      $scope.model = {
         tab: $scope.features.tabs[ 0 ],
         selected: 0,
         select: function( index ) {
            $scope.model.tab = $scope.features.tabs[ index ];
            $scope.model.selected = index;
         },
         links: {},
         link: function( event, column ) {
            if( column.link ) {
               var pointer = toJsonPointer( column.link );
               var value = patterns.json.getPointer( event, pointer );
            }
            return $scope.model.links[ value ] || '[0]';
         },
         fields: function( event, column ) {
            var pointers = deepMapObject( column.fields, toJsonPointer );
            return deepMapObject( pointers, function( pointer ) {
               if( pointer === '/' ) {
                  return event;
               } else {
                  return patterns.json.getPointer( event, pointer );
               }
            } );
         }
      };

      $scope.resources = {
         details: [],
         links: []
      };

      patterns.resources.handlerFor( $scope )
         .registerResourceFromFeature( 'details', {
            onReplace: function( event ) {
            },
            onUpdate: function( event ) {
            }
         } );

      if( $scope.features.links ) {
         $scope.features.links.forEach( function( link, index ) {
            var link = $scope.features.links[ index ];
            var pointer = toJsonPointer( link.field );
            var i18nHtmlFormat = link.i18nHtmlFormat;

            patterns.resources.handlerFor( $scope )
               .registerResourceFromFeature( 'links.' + index, {
                  onReplace: function( event ) {
                     var links = event.data;
                     if( !links ) {
                        return;
                     }
                     for( var i = 0; i < links.length; i++ ) {
                        if( links[ i ] ) {
                           var key = patterns.json.getPointer( links[ i ], pointer );
                           $scope.model.links[ key ] = $filter( 'axLocalizeFormat' )( i18nHtmlFormat, [], links[ i ] );
                        }
                     }
                  },
                  modelKey: link.resource
               } );
         } );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function mapObject( object, callback ) {
      if( object instanceof Array ) {
         return object.map( callback );
      } else if( typeof object === 'object' ) {
         var result = {};

         for( var key in object ) {
            if( object.hasOwnProperty( key ) ) {
               result[ key ] = callback( object[ key ], key, object );
            }
         }
         return result;
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function deepMapObject( object, callback ) {
      function recurse( value, key, object ) {
         return mapObject( value, recurse ) || callback( value, key, object );
      }
      return recurse( object )
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'detailsWidget', [] )
            .controller( 'DetailsWidgetController', Controller )
            .filter( 'axLocalizeFormat', function() {

               var format = ax.string.createFormatter( {
                  s: function( input, subSpecifierString ) {
                     var precision = subSpecifierString.match( /^\.(\d)$/ );
                     if( precision ) {
                        return ('' + input).substr( 0, precision[1] );
                     }
                     return '' + input;
                  }
               } );

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

                  return format.apply( null, args );
               }
            } )
            .filter( 'tab', function() {
               return function( events, tab ) {
                  if( !tab.filter ) {
                     return events;
                  }
                  var pointers = deepMapObject( tab.filter.fields, toJsonPointer );

                  return events.filter( function( event ) {
                     var values = deepMapObject( pointers, function( pointer ) {
                        return patterns.json.getPointer( event, pointer );
                     } );

                     return ng.equals( values, tab.filter.values );
                  } );
               };
            } );

} );
