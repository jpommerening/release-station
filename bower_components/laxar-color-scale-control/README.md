# AxColorScaleControl

> A control for CSS styled, bezier interpolated color scales.


## Installation

To retrieve a copy of this control you can either clone it directly using git or alternatively install it via Bower.
For general information on installing, styling and optimizing controls, have a look at the [LaxarJS documentation](https://github.com/LaxarJS/laxar/blob/master/docs/manuals/installing_controls.md).

### Setup Using Bower

Install the control:

```sh
bower install laxar-color-scale-control
```

Make sure that [`chroma-js`](https://github.com/gka/chroma.js) can be found by RequireJS.
For example, assuming that your `baseUrl` is `'bower_components'`, add this to the `paths` section of your `require_config.js`:

```js
'chroma-js': 'chroma-js/chroma'
```

Now you may reference the control from the `widget.json` of your widget:

```json
"controls": [ "laxar-color-scale-control" ]
```


## Usage

Place the control into you HTML template (it should not produce any visible artifacts).
This will place a [color scale function](http://gka.github.io/chroma.js/#color-scales)
into the current `$scope`. The color scale function accepts values from zero to one and
produces interpolated [colors](http://gka.github.io/chroma.js/#chroma) that you can use
in the rest of your template.

```html
<!-- publish the color scale function as $scope.scale -->
<span ax-color-scale="scale"></span>

<!-- use the function to get interpolated color values -->
<div ng-repeat="value in [ 0, 0.25, 0.5, 0.75, 1 ]"
     ng-style="{ 'background-color': scale(value); }">
  {{value}}
</div>
```

Without any CSS, this would interpolate between black and white. To create color stops
with CSS all you need to do is define the CSS class `ax-color-stop-$n` where `$n` >= 0.
The color scale control will then create hidden elements starting with `$n` = 0 and
determine their background color as long as the background color is not `transparent`.

```css
// four color stops
.my-widget .ax-color-scale .ax-color-stop-0 { background-color: #6090c0; }
.my-widget .ax-color-scale .ax-color-stop-1 { background-color: #108070; }
.my-widget .ax-color-scale .ax-color-stop-2 { background-color: #b0e090; }
.my-widget .ax-color-scale .ax-color-stop-3 { background-color: #c8e050; }
```
