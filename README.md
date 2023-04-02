# CandyPie
## a configurable, interactive 3d pie chart in your browser

Let's break down that sentence ..

- candy: don't take it that seriously. Pie charts are not always loved.. One should not use 3d for charts.. Negative times negative equals positive?
- pie: yes indeed, a pie chart. See above.
- configurable: all options are described below. Curious which other options will prove to be interesting later on.
- interactive: the result is not a static image, but a 3d object one can rotate. Or zoom into a slice.
- 3d: standing on the shoulders of babylon.js
- browser: works in a modern browser, desktop & mobile

## playground

Try it out, play with the options, in the [playground](https://thierryvergult.github.io/CandyPie/playground.htm).

## usage

1. Load first the babylon.js code into your webpage, and add then the candy-pie javascript.

2. Define a canvas element in your html page, and call one single javascript function to place the 3d pie chart on that canvas element. All data and configuration options are defined in one single javascript object.

Supports two data sets, one that sets the height of the slices, and one (optional) set that sets the angle (width) of the slices.

example
```
let pie3d_2 = {
'htmlCanvasId': 'candy-pie-id01',
'slices': [
  { 'height': 100, 'color': 'indianred'},
  { 'height': 100, 'color': 'steelblue'},
  { 'height': 100, 'color': 'olive'}
],
'spaceBetweenSlices': true,
'innerRadiusPct': 40,
'backgroundColor': 'lightgrey'
};
```

## screenshots

![Screenshot-candy-pie](https://user-images.githubusercontent.com/11560767/184908958-1da16ce2-3e11-40a1-995b-c9620535cee9.png)

![Screenshot-candy-pie2](https://user-images.githubusercontent.com/11560767/184909403-5629809d-d356-4082-b2b2-8a775b4ca131.png)

## more

[more info, examples and configuration options](https://thierryvergult.github.io/CandyPie/)