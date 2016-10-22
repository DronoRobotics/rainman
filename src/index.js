// @flow

import 'isomorphic-fetch';

type Config = {
  cache?: boolean,
  key: string,
  ttl?: number
};
type CacheItem = {
  data: Object,
  expires: number
};

export default class Rainman {
  _config: Config;
  cache: Object;

  /**
   * Builds the Rainman class.
   *
   * Assigns general configuration, and checks for the existence of an API key.
   * If an API key is not present, an error is thrown.
   *
   * @param {object} options - The options for the Rainman config
   * @returns {void}
   */
  constructor (options: Config) {
    try {
      this._config = {
        cache: true,
        ttl: Math.pow(60, 3),
        ...options
      };

      if (!this._config.key) {
        throw 'Invalid API Key provided to Rainman!';
      }

      this.cache = {};
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * Adds an item to the cache, saving its data and the expiry date
   * @param {string} key - The associative key for the cache item
   * @param {object} value - The data to be saved to the cache
   * @returns {void}
   */
  _addToCache (key: string, value: Object) {
    const cacheItem: CacheItem = {
      data: value,
      expires: new Date().getTime() + this._config.ttl
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
  _getItemFromCache (key: string): CacheItem {
    return this.cache[key];
  }

  /**
   * Gets the current weather for a given latitude and longitude.
   *
   * Utilises the OpenWeatherMap API to retrieve the current weather forecast for a location.
   * If the cache option is true, the response will be saved in the cache for the given TTL.
   * If the item is currently in the cache, it will return the cached item if it is still valid,
   * else it will make an API request and update the cached data with the new repsonse.
   *
   * @param  {array}  lat, lon - Latitude and longitude
   * @return {Promise<Object>} - The current weather object for the given latitude and longitude
   */
  async get ([lat, lon]: [number, number]): Promise<Object> {
    const { cache, key } = this._config;
    const cacheKey = `${lat}${lon}`;

    if (this._itemExistsInCache(cacheKey) && this._itemIsValid(cacheKey)) {
      return this._getItemFromCache(cacheKey).data;
    }

    const queryParams = [
      `lat=${lat}`,
      `lon=${lon}`,
      `appid=${key}`
    ].join('&');
    const url = `http://api.openweathermap.org/data/2.5/weather?${queryParams}`;
    const response = await fetch(url);
    const jsonResponse = await response.json();

    if (cache) {
      this._addToCache(cacheKey, jsonResponse);
    }

    return jsonResponse;
  }
}
