![](https://travis-ci.org/DronoRobotics/rainman.svg?branch=master)


# Rainman

A small library to get weather data. Currently only supports [OpenWeatherMap](http://openweathermap.org).

### Usage

```javascript
import Rainman from 'rainman';

const rainman = new Rainman({ key: 'YOUR_API_KEY' });

rainman.get([0, 0]).then(response => {
  console.log(response);
});
```

#### Options

| key      | type      | optional? | default |
| -----    | --------- | --------- | ------- |
| accuracy | *number*  | *         | 2       |
| cache    | *boolean* | *         | true    |
| ttl      | *number*  | *         | 1 hour  |
| key      | *string*  |           |         |

#### Roadmap

* Integrate extra services (Yahoo, DarkSky)
* Give the option to standardise API responses into a single object
