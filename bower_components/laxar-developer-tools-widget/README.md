# ax-developer-tools-widget [![Build Status](https://travis-ci.org/LaxarJS/ax-developer-tools-widget.svg?branch=master)](https://travis-ci.org/LaxarJS/ax-developer-tools-widget)

The ax-developer-tools-widget allows to open a _developer tools window_ that displays log messages and events about the containing LaxarJS application.


## Content
* [Appearance](#appearance)
* [Usage](#usage)
* [Features](#features)
* [Integration](#integration)
* [References](#references)


## Appearance

![The window opened by the ax-developer-tools-widget](docs/example.png)


## Usage

### Installation

For installation instruction take a look at the [LaxarJS documentation](https://github.com/LaxarJS/laxar/blob/master/docs/manuals/installing_widgets.md).

### Configuration example

```json
{
   "widget": "laxarjs/ax-developer-tools-widget"
}
```

Use this configuration on a page to have a button that will open the developer tools window.
The window will also open when the global method `window.laxarShowDeveloperTools()` is called.

```json
{
   "widget": "laxarjs/ax-developer-tools-widget",
   "features": {
      "button": {
         "enabled": false
      },
      "open": {
         "onActions": [ "showDevTools" ],
         "onGlobalMethod": "goDevelop"
      }
   }
}
```

Use this configuration on a page to have a developer tools window without visual representation, that will open when the action `showDevTools` is requested.
Alternatively, the window can be opened by calling the method `window.goDevelop()` (for example, from a bookmark).
_Note:_ To open the developer window in this fashion, it might be necessary to add an exception to the browser's popup blocker. 

For full configuration options refer to the [widget.json](widget.json).

### Development

To _develop_ (and not just use) the ax-developer-tools-widget _itself,_ the content application must be prepared:

```sh
cd content
npm install
```

To build and _release a new version_, the release-version of the embedded application must be committed:
 
```sh
cd content
npm run-script optimize
git add var
git commit ...
```


### Features

### 1. Allow to Open a Developer Tools Window _(open)_

Because the developer tools should exist independently of the host application state and navigation, they are opened in a separate window.
 
*R1.1* The widget MUST allow to configure an action for opening the developer tools window.
_Note:_ To open the developer window in this fashion, it might be necessary for the user to add an exception to the browser's popup blocker.
Alternatively, a _button_ (see below) may be used.

*R1.2* The widget MUST allow to configure a global javascript method name that opens the window directly.
_Note:_ This method is intended to be invoked manually by developers, and not as an API.

*R1.3* The widget MUST establish a _communication channel_ to the contents of the developer tools window when open.

*R1.4* The widget MUST intercept _event bus activity_ from the host application and forward it to the communication channel.

*R1.5* The widget MUST intercept LaxarJS _log messages_ from the host application and forward them to the communication channel.

*R1.6* The widget MUST provide _content_ that must not depend in any way on the contents of the host application, except for relying on the communication channel. 
The widget MUST observe the communication channel from within the window and update its contents with no more than a second delay.
Refer to the [AxHostConnectorWidget](content/includes/widgets/developer-tools/ax-host-connector-widget/README.md) for details.


### 2. Provide Access through a Graphical Button _(button)_

*R2.1* The widget MUST allow to render a graphical button.
This should be the default behavior.

*R2.2* It must be possible to disable the button.

*R2.3* It must be possible to configure a different label for the button.


### 3. Display Events from the Host Application

*R3.1* The widget MUST allow to view events from the host application.
Refer to the [AxEventsDisplayWidget](content/includes/widgets/developer-tools/ax-events-display-widget/README.md) for details.


### 4. Display Log Messages from the Host Application

*R4.1* The widget MUST allow to view log messages from the host application.
Refer to the [AxLogDisplayWidget](content/includes/widgets/developer-tools/ax-log-display-widget/README.md) for details.


### 5. Visualize Widget Positions within the Host Application

*R5.1* The widget MUST help to identify widgets and their grid-alignment within the host application.
Refer to the [AxDeveloperToolbarWidget](content/includes/widgets/developer-tools/ax-developer-toolbar-widget/README.md) for details.


### 6. No-Op Mode

The widget MUST support being disabled completely using an application-wide _enabled-flag_.

*R6.1* The enabled-flag must be read from the LaxarJS configuration path `widgets.laxar-developer-tools-widget.enabled`.
The default value for the enabled-flag is `true`.
If the enabled-flag value is `false`, the widget MUST NOT subscribe to _takeActionRequest_ events, even if configured for the _open_ feature.

*R6.2* If the enabled-flag value is `false`, the widget MUST NOT intercept any events.

*R6.3* If the enabled-flag value is `false`, the widget MUST NOT intercept any log messages.

*R6.4* If the enabled-flag value is `false`, a global method MUST NOT be added, even if configured for the _open_ feature.

*R6.5* If the enabled-flag value is `false`, a button MUST NOT be rendered, even if the _button_ feature has been enabled (see above).


## Integration

### Patterns

The widget supports the following event patterns as specified by the [LaxarJS Patterns] documentation.

#### Actions

* Action: open.onActions
* Role: Receiver
* Description: Opens the developer tools window


## References

The following resources are useful or necessary for the understanding of this document.
The links refer to the latest version of the documentation.
Refer to the [bower.json](bower.json) for the specific version that is normative for this document.

* [LaxarJS Concepts]
* [LaxarJS Patterns]

[LaxarJS Concepts]: https://github.com/LaxarJS/laxar/blob/master/docs/concepts.md "LaxarJS Concepts"
[LaxarJS Patterns]: https://github.com/LaxarJS/laxar_patterns/blob/master/docs/index.md "LaxarJS Patterns"
