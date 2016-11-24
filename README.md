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

| option   | type      | required? | default     | notes
|----------|-----------|-----------|-------------|-------|
| key      | *string*  | ✔         |             | You can get this from [OpenWeatherMap](https://home.openweathermap.org/api_keys).|
| accuracy | *number*  |           | `2`         | This rounds your latitude and longitude to the corresponding number of decimal places. e.g., `[40.293480, -29.307948]` will be rounded to `[40.29, -29.31]` at an accuracy of `2`. This helps in caching requests and will work just fine if you don't need extremely specific weather data.|
| cache    | *boolean* |           | `true`      | Turning this off will mean that no API calls will be cached. Turn off at your own risk, as you may be charged for extra API calls! |
| ttl      | *number*  |           | 1 hour (60\*60\*60)      | Time To Live for cached requests |
| units    | `'metric' | 'imperial'`  |           | `'celcius'` |  |

#### Roadmap

* Integrate extra services (Yahoo, DarkSky)
* Give the option to standardise API responses into a single object
