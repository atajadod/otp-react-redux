# otp-react-redux

<img src="https://github.com/opentripplanner/otp-react-redux/raw/master/otprr.png" width="500" />

A library for writing modern [OpenTripPlanner](http://www.opentripplanner.org/)-compatible multimodal journey planning applications using [React]() and [Redux]().

## Running the Example

A simple example of an OTP-RR application is included in the repository.

To run, first clone the repo and install [yarn](https://yarnpkg.com/) if needed.

Copy `example-config.yml` to `config.yml`. Update `config.yml` with your Mapzen API key, and optionally, the OTP endpoint and initial map origin. (The default values are for a Conveyal test server for Portland, OR.)

Install the dependencies and start a test instance using yarn:

```bash
yarn install
yarn start
```

To build run the below command:
```bash
yarn build
```

the you can publish it by copying the files, something like this:
```bash
cd ./dist
scp * username@server:/var/www/html/otp/  
```


## How To fix the spikes in the lines:
In node_modules, go to transit-js, under build/display
add the line below to drawPath function in canvas-display.js
```
this.ctx.lineJoin = attrs['lineJoin'] || 'miter';  
```
then goto build/renderer\renderedsegment.js, in the render function change the display.drawPath to be like this
```
  display.drawPath(this.renderData, {
        fill: 'none',
        stroke: styler.compute2('segments', 'stroke', this),
        'stroke-width': styler.compute2('segments', 'stroke-width', this),
        'stroke-dasharray': styler.compute2('segments', 'stroke-dasharray', this),
        'stroke-linecap': styler.compute2('segments', 'stroke-linecap', this),
        'lineJoin':'round',  //This is new
      });
```


## Library Documentation

Coming Soon



## We might be able to change the Leaflet tyle with vector tyle following this:
https://stackoverflow.com/questions/42765309/render-mapbox-vector-tiles-inside-react-leaflet