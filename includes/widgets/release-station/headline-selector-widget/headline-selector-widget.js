/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 */
define( [
   'angular',
   'laxar',
   'laxar-patterns',
   'release-station/to-json-pointer',
   'release-station/extract-pointers',
   'release-station/formatter',
   'release-station/custom-localize'
], function( ng, ax, patterns, toJsonPointer, extractPointers, formatter, customLocalize ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope', '$location', '$document', 'axFlowService' ];

   function Controller( $scope, $location, $document, flowService ) {
      patterns.i18n.handlerFor( $scope ).scopeLocaleFromFeature( 'i18n' );

      $scope.model = {
         parameters: {},
         selections: []
      };

      $scope.features.selections.forEach( function( selection, index ) {
         var resource = selection.options.resource;

         if( resource ) {
            patterns.resources.handlerFor( $scope )
               .registerResourceFromFeature( 'selections.' + index + '.options', {
                  onUpdateReplace: function( event ) {
                     $scope.model.selections[ index ] = provideSelection( selection, $scope.resources[ resource ] );
                  },
                  modelKey: resource
               } );
         } else if( selection.options.init ) {
            $scope.model.selections[ index ] = provideSelection( selection, selection.options.init );
         }
      } );

      function selectFromParameters( selection, fallback ) {
         var value = $scope.model.parameters[ selection.parameter ];
         var i;
         for( i = 0; i < selection.choices.length; i++ ) {
            if( selection.choices[ i ].value === value ) {
               return selection.select( i );
            }
         }
         if( fallback !== undefined ) {
            return selection.select( fallback );
         }
      }

      function provideSelection( selection, choices ) {
         var resource = selection.resource;
         var parameter = selection.parameter;
         var parameterFormat = selection.options.parameterFormat;
         var i18nHtmlFormat = selection.options.i18nHtmlFormat;
         var fields = selection.options.fields;

         var result = {
            selected: null,
            parameter: parameter,
            choices: choices.map( function( data ) {
               var values = extractPointers( data, fields );
               var value = formatter.apply( ax.string, asFormatArguments( parameterFormat, values ) );
               var htmlText = customLocalize( i18nHtmlFormat, $scope.i18n, values );

               if( this.hasOwnProperty( value ) ) {
                  this[ value ].push( data );
                  return false;
               } else {
                  this[ value ] = [ data ];
               }

               return {
                  data: this[ value ],
                  value: value,
                  htmlText: htmlText
               };
            }, {} ).filter( function( choice ) {
               return choice;
            } ),
            select: function( index ) {
               var selected = result.selected = result.choices[ index ];
               var parameters = $scope.model.parameters;

               if( !selected ) {
                  return;
               }

               if( parameter && parameters[ parameter ] !== selected.value ) {
                  parameters[ parameter ] = selected.value;

                  $scope.eventBus.publish( 'navigateRequest._self', {
                     target: '_self',
                     data: parameters
                  } );
               }

               if( resource ) {
                  $scope.eventBus.publish( 'didReplace.' + resource, {
                     resource: resource,
                     data: selected.data
                  } );
               }
            }
         };

         selectFromParameters( result, 0 );

         return result;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      $scope.eventBus.subscribe( 'didNavigate', function( event ) {
         var parameters = Object.assign( $scope.model.parameters, event.data );
         $scope.model.selections.forEach( function( selection ) {
            return selectFromParameters( selection );
         } );
      } );

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function asFormatArguments() {
      var args = [].slice.call( arguments );

      if( typeof args[ 1 ] !== 'object' ) {
         args[ 1 ] = [ args[ 1 ] ];
      } else if( !( args[ 1 ] instanceof Array ) ) {
         args.splice( 1, 0, [] );
      }

      return args;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'headlineSelectorWidget', [] )
            .controller( 'HeadlineSelectorWidgetController', Controller )
            .directive( 'axHeadline', [ '$document', '$sce', function( $document, $sce ) {
               var ACTIVE_CLASS = 'active';

               return {
                  restrict: 'A',
                  replace: true,
                  transclude: true,
                  template: '<div><span ng-bind-html="html"></span><span ng-hide ng-transclude></span></div>',
                  scope: {
                     format: '=axHeadline',
                     level: '=axHeadlineLevel'
                  },
                  link: function( scope, element, attrs ) {
                     var attr = 'data-ax-placeholder';
                     var format = scope.format;
                     var level = scope.level;
                     var active;

                     element.wrap('<h' + level + '>');

                     scope.html = $sce.trustAsHtml( format.replace( /\[(\d+)\]/g, function( match, index ) {
                        return '<span ' + attr + '="' + parseInt( index, 10 ) + '"/>';
                     } ) );

                     function selector( index ) {
                        var value = ( index === undefined ) ? '' : ( '="' + index + '"' );
                        return element.find( '[' + attr + value + ']' ).first();
                     }

                     $document.on( 'click', function( $event ) {
                        /* if the click occured outside the selection ... */
                        var target = selector( active ).find( $event.target );
                        if( active !== undefined && target.length === 0 ) {
                           selector( active ).removeClass( 'active' );
                        }
                     } );

                     scope.replace = function( index, replacement ) {
                        replacement.detach();
                        selector( index ).replaceWith( replacement );
                        replacement.attr( attr, index );
                     };

                     scope.select = function( index, value ) {
                        selector( active ).removeClass( 'active' );
                        if( index !== active && value ) {
                           selector( index ).addClass( 'active' );
                           active = index;
                        } else {
                           selector( index ).removeClass( 'active' );
                           active = undefined;
                        }
                     };
                  },
                  controller: [ '$scope', function( $scope ) {
                     this.replace = function() {
                        return $scope.replace.apply( this, arguments );
                     };
                     this.select = function() {
                        return $scope.select.apply( this, arguments );
                     };
                  } ]
               };
            } ] )
            .directive( 'axReplacement', function() {
               return {
                  restrict: 'A',
                  require: '^axHeadline',
                  scope: {
                     index: '=axReplacement',
                     trigger: '=axReplacementTrigger'
                  },
                  link: function( scope, element, attrs, headlineController ) {
                     scope.trigger = headlineController.select.bind( headlineController, scope.index );
                     return headlineController.replace( scope.index, element );
                  }
               };
            } );

} );
