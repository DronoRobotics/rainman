// @flow

if (!global.fetch) {
  require('isomorphic-fetch');
}

type RainmanResponseType = {};
type ConfigType = {
  accuracy?: number,
  cache?: boolean,
  key: string,
  provider: 'darksky' | 'openweathermap',
  ttl?: number,
  units: 'metric' | 'imperial',
};
type CacheItemType = {
  data: RainmanResponseType,
  expires: number,
};
type WindDirectionType =
  'N' | 'NNE' | 'NE' | 'ENE' |
  'E' | 'ESE' | 'SE' | 'SSE' |
  'S' | 'SSW' | 'SW' | 'WSW' |
  'W' | 'WNW' | 'NW' | 'NNW';
type LatLngType = [number, number];

export default class Rainman {
  _config: ConfigType;
  cache: {[key: string]: CacheItemType};

  /**
   * Builds the Rainman class.
   *
   * Assigns general configuration, and checks for the existence of an API key.
   * If an API key is not present, an error is thrown.
   *
   * @param {object} options - The options for the Rainman config
   * @param {number} options.accuracy - The accuracy that the latitude & longitude will be searched to
   * @param {boolean} options.cache - Whether to save the weather data to a cache
   * @param {number} options.ttl - When cache is set to true, the Time To Live for each cache item
   * @param {string} options.units - The unit system in which to retrieve temperature
   * @returns {void}
   */
  constructor (options: ConfigType): void {
    if (!options.provider) {
      throw 'No provider was passed to Rainman';
    }

    if (!options.key) {
      throw 'No API key provided to Rainman';
    }

    this._config = {
      accuracy: 2,
      cache: true,
      ttl: Math.pow(60, 3),
      units: 'metric',
      ...options,
    };
    this.cache = {};
  }

  /**
   * Adds an item to the cache, saving its data and the expiry date
   * @param {string} key - The associative key for the cache item
   * @param {object} value - The data to be saved to the cache
   * @returns {void}
   */
  _addToCache (key: string, value: RainmanResponseType): void {
    const cacheItem: CacheItemType = {
      data: value,
      expires: new Date().getTime() + this._config.ttl,
    };
    this.cache[key] = cacheItem;
  }

  /**
   * Checks the existence of an item with a given key in the cache
   * @param {string} key - The associative key in the cache object
   * @returns {boolean} - The existence status of the item in the cache
   */
  _itemExistsInCache (key: string): boolean {
    return !!this.cache[key];
  }

  /**
   * Checks whether an item has expired in the cache.
   * @param {string} key - The associative key in the cache object
   * @returns {boolean} - Returns true if the expiry date of the cache item is in the past
   */
  _itemIsValid (key: string): boolean {
    const isValid = this.cache[key].expires > new Date().getTime();

    if (!isValid) {
      delete this.cache[key];
    }

    return isValid;
  }

  /**
   * Returns an item with a given key from the cache
   * @param {string} key - The associative key in the cache object
   * @returns {object} - The cached item
   *
   */
  _getItemFromCache (key: string): CacheItemType {
    return this.cache[key];
  }

  /**
   * Builds the request string for the chosen provider
   * @param {array} latLon - Latitude and longitude
   * @returns {string} - A valid URL
   */
  _buildProviderQuery ([lat, lon]: LatLngType): string {
    const { key, provider, units } = this._config;

    const baseUrls = {
      darkSky: 'https://api.darksky.net/forecast',
      openWeatherMap: 'http://api.openweathermap.org/data/2.5/weather',
    };

    if (provider === 'openweathermap') {
      const queryParams = [
        `lat=${lat}`,
        `lon=${lon}`,
        `appid=${key}`,
        `units=${units}`,
      ].join('&');
      return `${baseUrls.openWeatherMap}?${queryParams}`;
    } else if (provider === 'darksky') {
      const queryParams = [
        'exclude=[minutely,hourly,daily,alerts,flags]',
        `units=${units}`,
      ].join('&');
      return `${baseUrls.darkSky}/${key}/${lat},${lon}?${queryParams}`;
    }

    throw `Couldn\'t find a configuration for provider: ${provider}`;
  }

  /**
   * Converts a meteorological angle into a human readable wind direction.
   *
   * See http://climate.umn.edu/snow_fence/components/winddirectionanddegreeswithouttable3.htm for more info.
   *
   * @param {number} degrees - Wind direction in meteorological degrees
   * @returns {string} - Wind direction label
   */
  convertWindDegreesToDirection (degrees: number): WindDirectionType {
    const windDirectionLabels = [
      'N', 'NNE', 'NE', 'ENE',
      'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW',
      'W', 'WNW', 'NW', 'NNW',
      'N', // Both 0º and 360º are north, so this needs to suffix the array
    ];
    return windDirectionLabels[parseInt((degrees + 11.25) / 22.5, 10)];
  }

  /**
   * Gets the current weather for a given latitude and longitude.
   *
   * Utilises the OpenWeatherMap API to retrieve the current weather forecast for a location.
   * If the cache option is true, the response will be saved in the cache for the given TTL.
   * If the item is currently in the cache, it will return the cached item if it is still valid,
   * else it will make an API request and update the cached data with the new repsonse.
   *
   * To save on API requests and allow better caching, the latitude and longitude will be trimmed
   * down to the accuracy level set in the config. The number of decimal places is the same as the
   * accuracy level.
   *
   * @param {array} latLon - Latitude and longitude
   * @return {Promise<Object>} - The current weather object for the given latitude and longitude
   */
  async get ([lat, lon]: LatLngType): Promise<RainmanResponseType> {
    const { accuracy, cache } = this._config;

    lat = parseFloat(lat.toFixed(accuracy));
    lon = parseFloat(lon.toFixed(accuracy));

    const cacheKey = `${lat}${lon}`;

    if (this._itemExistsInCache(cacheKey) && this._itemIsValid(cacheKey)) {
      return this._getItemFromCache(cacheKey).data;
    }

    try {
      const url = this._buildProviderQuery([lat, lon]);
      const response = await fetch(url);

      if (!response.ok) {
        throw response.status;
      }

      const jsonResponse = await response.json();

      if (cache) {
        this._addToCache(cacheKey, jsonResponse);
      }

      return jsonResponse;
    } catch (error) {
      throw new Error(error);
    }
  }
}
