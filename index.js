// @flow

import 'isomorphic-fetch';

type Config = {
  API_KEY: string,
  cache: boolean,
  ttl: number
}
type CacheItem = {
  retrievedAt: number,
  data: Object
}

export default class Rainman {
  cache: Array<CacheItem>;
  _config: Config;

  constructor (options: Config) {
    try {
      this._config = {
        cache: true,
        ttl: Math.pow(60, 3),
        ...options
      };

      if (!this._config.API_KEY) {
        throw 'Invalid API Key provided to Rainman!';
      }

      this.cache = [];
    } catch (e) {
      throw new Error(e);
    }
  }

  async get ([lat, lon]: [number, number]): Promise<Object> {
    const { API_KEY } = this._config;
    const response = await fetch(`http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    return await response.json();
  }
}
