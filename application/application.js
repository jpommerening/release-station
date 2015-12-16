// See https://github.com/LaxarJS/laxar/blob/master/docs/manuals/configuration.md
window.laxar = ( function() {
   'use strict';

   var modeAttribute = 'data-ax-application-mode';
   var mode = document.querySelector( 'script[' + modeAttribute + ']' ).getAttribute( modeAttribute );

   return {
      name: 'release-station',
      description: 'All the repos, all the releases, all in one place',

      theme: 'cube',
      useMergedCss: mode === 'RELEASE',
      useEmbeddedFileListings: mode === 'RELEASE',

      i18n: {
         locales: {
            'default': 'en-US'
         }
      },

      controls: {},
      widgets: {}

   };

} )();
