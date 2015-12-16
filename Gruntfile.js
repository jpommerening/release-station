/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * www.laxarjs.org
 */
/*global module,__dirname,__filename */
module.exports = function( grunt ) {
   'use strict';

   grunt.initConfig( {
      'laxar-configure': {
         options: {
            flows: [
               {
                  target: 'main',
                  src: 'application/flow/flow.json'
               },
               {
                  target: 'embed',
                  src: 'application/flow/embed.json',
                  init: '../init-embed'
               }
            ],
            ports: {
               develop: 8000,
               test: 9000,
               livereload: 35729
            }
         }
      }
   } );

   grunt.loadNpmTasks( 'grunt-laxar' );

   // basic aliases
   grunt.registerTask( 'test', [ 'laxar-test' ] );
   grunt.registerTask( 'build', [ 'laxar-build' ] );
   grunt.registerTask( 'dist', [ 'laxar-dist' ] );
   grunt.registerTask( 'develop', [ 'laxar-develop' ] );

   // additional (possibly) more intuitive aliases
   grunt.registerTask( 'optimize', [ 'laxar-dist' ] );
   grunt.registerTask( 'start', [ 'laxar-develop' ] );
   grunt.registerTask( 'start-no-watch', [ 'laxar-develop-no-watch' ] );
   grunt.registerTask( 'default', [ 'build', 'test' ] );
};
