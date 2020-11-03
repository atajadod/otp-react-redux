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
## Library Documentation

Coming Soon



## We might be able to change the Leaflet tyle with vector tyle following this:
https://stackoverflow.com/questions/42765309/render-mapbox-vector-tiles-inside-react-leaflet