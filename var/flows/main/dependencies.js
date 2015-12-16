define( [
   'laxar-button-list-control/ax-button-list-control',
   'laxar-color-scale-control/ax-color-scale-control',
   'laxar-layer-control/ax-layer-control',
   'laxar-uikit/controls/i18n/ax-i18n-control',
   'laxar-developer-tools-widget/ax-developer-tools-widget',
   'laxar-headline-widget/ax-headline-widget',
   'laxar-html-display-widget/ax-html-display-widget',
   'laxar-popup-widget/ax-popup-widget',
   'laxar-application/includes/widgets/release-station/activity-calendar-widget/activity-calendar-widget',
   'laxar-application/includes/widgets/release-station/activity-grid-widget/activity-grid-widget',
   'laxar-application/includes/widgets/release-station/details-widget/details-widget',
   'laxar-application/includes/widgets/release-station/github-login-widget/github-login-widget',
   'laxar-application/includes/widgets/release-station/headline-selector-widget/headline-selector-widget',
   'laxar-application/includes/widgets/release-station/navigation-widget/navigation-widget',
   'laxar-application/includes/widgets/release-station/release-history-widget/release-history-widget',
   'laxar-application/includes/widgets/release-station/search-box-widget/search-box-widget',
   'laxar-application/includes/widgets/release-station/settings-widget/settings-widget',
   'laxar-github/contents-activity/github-contents-activity',
   'laxar-github/data-activity/github-data-activity',
   'laxar-github/events-activity/github-events-activity',
   'laxar-github/log-activity/github-log-activity',
   'laxar-github/userdata-activity/github-userdata-activity',
   'laxar-application/includes/widgets/release-station/oauth-activity/oauth-activity'
], function() {
   'use strict';

   var modules = [].slice.call( arguments );
   return {
      'angular': modules.slice( 0, 17 ),
      'plain': modules.slice( 17, 23 )
   };
} );
