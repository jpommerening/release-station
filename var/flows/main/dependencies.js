define( [
   'laxar-button-list-control/ax-button-list-control',
   'laxar-color-scale-control/ax-color-scale-control',
   'laxar-layer-control/ax-layer-control',
   'laxar-uikit/controls/i18n/ax-i18n-control',
   'laxar-application/includes/widgets/laxarjs/ax-command-bar-widget/ax-command-bar-widget',
   'laxar-application/includes/widgets/laxarjs/ax-developer-tools-widget/ax-developer-tools-widget',
   'laxar-application/includes/widgets/laxarjs/ax-headline-widget/ax-headline-widget',
   'laxar-application/includes/widgets/laxarjs/ax-popup-widget/ax-popup-widget',
   'laxar-application/includes/widgets/release-station/activity-calendar-widget/activity-calendar-widget',
   'laxar-application/includes/widgets/release-station/activity-grid-widget/activity-grid-widget',
   'laxar-application/includes/widgets/release-station/details-widget/details-widget',
   'laxar-application/includes/widgets/release-station/github-login-widget/github-login-widget',
   'laxar-application/includes/widgets/release-station/navigation-widget/navigation-widget',
   'laxar-application/includes/widgets/release-station/release-history-widget/release-history-widget',
   'laxar-application/includes/widgets/release-station/search-box-widget/search-box-widget',
   'laxar-application/includes/widgets/release-station/settings-widget/settings-widget',
   'laxar-application/includes/widgets/release-station/github-data-activity/github-data-activity',
   'laxar-application/includes/widgets/release-station/github-events-activity/github-events-activity',
   'laxar-application/includes/widgets/release-station/oauth-activity/oauth-activity'
], function() {
   'use strict';

   var modules = [].slice.call( arguments );
   return {
      'angular': modules.slice( 0, 16 ),
      'plain': modules.slice( 16, 19 )
   };
} );
