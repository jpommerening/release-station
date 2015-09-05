# ax-github

> :octocat: Activites to provide GitHub data and events as resources


```json
"activies": [

   {
      "widget": "amd:laxar-github/userdata-activity",
      "features": {
         "auth": {
            "resource": "accessToken",
            "flag": "authenticated"
         },
         "user": {
            "resource": "user",
         },
         "repos": {
            "resource": "repos",
            "sort": "updated",
            "direction": "desc"
         }
      }
   },
   {
      "widget": "amd:laxar-github/data-activity",
      "features": {
         "auth": {
            "resource": "accessToken",
            "flag": "authenticated"
         },
         "data": {
            "resource": "issues",
            "sources": {
               "resource": "resource",
               "follow": "issues_url"
            }
         }
      }
   },
   {
      "widget": "amd:laxar-github/events-activity",
      "features": {
         "auth": {
            "resource": "accessToken",
            "flag": "authenticated"
         },
         "events": {
            "resource": "events",
            "sources": {
               "resource": "repos",
               "follow": "events_url"
            }
         }
      }
   }

]
```
