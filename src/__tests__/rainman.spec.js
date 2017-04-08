import { expect } from 'chai';
import nock from 'nock';
import sinon from 'sinon';

import {
  rainmanFixtures,
  openWeatherMapFixtures,
  darkSkyFixtures,
} from './__fixtures__';

import Rainman from '../';

describe('Rainman', () => {
  let rainman;
  beforeEach(() => {
    rainman = new Rainman(rainmanFixtures.openWeatherMapProvider);
  });
  describe('Importation', () => {
    const fetchCopy = global.fetch;
    after(() => {
      global.fetch = fetchCopy;
      delete require.cache[require.resolve('../')];
      require('../');
    });
    it('should import isomorphic-fetch if fetch is undefined', () => {
      global.fetch = undefined;
      require('../');
      expect(fetch).to.be.defined;
    });
    it('should not import isomorphic-fetch fetch is defined', () => {
      const fetchMock = { test: true };
      global.fetch = fetchMock;
      require('../');
      expect(global.fetch).to.deep.equal(fetchMock);
    });
  });
  describe('Initialisation', () => {
    it('should assign default values when passed no parameters', () => {
      const expectedValue = {
        ...rainmanFixtures.openWeatherMapProvider,
        accuracy: 2,
        cache: true,
        ttl: Math.pow(60, 3),
        units: 'metric',
      };
      expect(rainman._config).to.deep.equal(expectedValue);
    });
    it('should assign the config passed to the constructor', () => {
      const expectedValue = {
        ...rainmanFixtures.openWeatherMapProvider,
        accuracy: 2,
        cache: false,
        ttl: Math.pow(60, 3),
        units: 'metric',
      };
      rainman = new Rainman({
        ...rainmanFixtures.noCache,
        ...rainmanFixtures.openWeatherMapProvider,
      });
      expect(rainman._config).to.deep.equal(expectedValue);
    });
    it('should create an empty cache', () => {
      expect(rainman.cache).to.deep.equal({});
    });
    it('should throw an error when passing an invalid API key', () => {
      expect(() => new Rainman({
        ...rainmanFixtures.openWeatherMapProvider,
        ...rainmanFixtures.invalidAPIKey,
      })).to.throw();
    });
    it('should throw an error if no provider is selected', () => {
      expect(() => new Rainman(rainmanFixtures.validAPIKey)).to.throw();
    });
  });
  describe('Method: _addToCache()', () => {
    it('should save the given object to the cache', () => {
      const clock = sinon.useFakeTimers(new Date().getTime());
      rainman = new Rainman(rainmanFixtures.openWeatherMapProvider);
      const expectedValue = {
        data: openWeatherMapFixtures.validResponse,
        expires: new Date().getTime() + rainman._config.ttl,
      };
      const key = '12345678';
      rainman._addToCache(key, openWeatherMapFixtures.validResponse);
      expect(rainman.cache[key]).to.deep.equal(expectedValue);
      clock.restore();
    });
  });
  describe('Method: _itemExistsInCache()', () => {
    it('should return true if the item exists in the cache', () => {
      rainman.cache['123'] = {};
      expect(rainman._itemExistsInCache('123')).to.be.true;
    });
    it('should return false if the item does not exist in the cache', () => {
      expect(rainman._itemExistsInCache('123')).to.be.false;
    });
  });
  describe('Method: _itemIsValid', () => {
    it('should return true if the current time is before the expiry date', () => {
      rainman.cache['123'] = { expires: new Date().getTime() + 1000000 };
      expect(rainman._itemIsValid('123')).to.be.true;
    });
    it('should return false if the current time is after the expiry date', () => {
      rainman.cache['123'] = { expires: new Date().getTime() - 1000000 };
      expect(rainman._itemIsValid('123')).to.be.false;
    });
    it('should delete the cached item if the item is invalid', () => {
      rainman.cache['123'] = { expires: 0 };
      rainman._itemIsValid('123');
      expect(rainman.cache['123']).to.be.undefined;
    });
  });
  describe('Method: _getItemFromCache()', () => {
    it('should return the requested item from the cache', () => {
      const expectedCacheItem = rainman.cache['123'] = {
        data: {},
        expires: 0,
      };
      expect(rainman._getItemFromCache('123')).to.deep.equal(expectedCacheItem);
    });
  });
  describe('Method: convertWindDegreesToDirection()', () => {
    it('should return the correct direction label when given a value in degrees', () => {
      const expectedValues = [
        { label: 'N', value: 0 },
        { label: 'NNE', value: 22.5 },
        { label: 'NE', value: 45 },
        { label: 'ENE', value: 67.5 },
        { label: 'E', value: 90 },
        { label: 'ESE', value: 112.5 },
        { label: 'SE', value: 135 },
        { label: 'SSE', value: 157.5 },
        { label: 'S', value: 180 },
        { label: 'SSW', value: 202.5 },
        { label: 'SW', value: 225 },
        { label: 'WSW', value: 247.5 },
        { label: 'W', value: 270 },
        { label: 'WNW', value: 292.5 },
        { label: 'NW', value: 315 },
        { label: 'NNW', value: 337.5 },
        { label: 'N', value: 360 },
      ];
      expectedValues.forEach(direction => {
        expect(rainman.convertWindDegreesToDirection(direction.value)).to.equal(direction.label);
      });
    });
  });
  describe('Method: _buildProviderQuery', () => {
    it('should throw an error if no provider is selected', async () => {
      // In theory this is a useless test seeing as the provider is checked on class construction,
      // but it's worth checking in case the config is overwritten after the fact
      rainman = new Rainman(rainmanFixtures.openWeatherMapProvider);
      rainman._config.provider = null;
      expect(() => rainman._buildProviderQuery([0, 0])).to.throw();
    });
  });
  describe('Method: get()', () => {
    beforeEach(() => {
      rainman = new Rainman(rainmanFixtures.openWeatherMapProvider);
      nock('http://api.openweathermap.org/data/2.5')
        .get('/weather')
        .query(true)
        .reply(200, openWeatherMapFixtures.validResponse);
    });
    afterEach(() => {
      nock.cleanAll();
    });
    it('should query openWeatherMap if config.provider = openweathermap', async () => {
      const fetchSpy = sinon.spy(global, 'fetch');
      rainman = new Rainman(rainmanFixtures.openWeatherMapProvider);
      await rainman.get([0, 0]);
      expect(fetchSpy.calledWithMatch('api.openweathermap.org')).to.be.true;
      fetchSpy.restore();
    });
    it('should query DarkSky if config.provider = darksky', async () => {
      const fetchSpy = sinon.spy(global, 'fetch');
      nock('https://api.darksky.net')
        .get(`/forecast/${rainmanFixtures.validAPIKey.key}/0,0`)
        .query(true)
        .reply(200, darkSkyFixtures.validResponse);
      rainman = new Rainman(rainmanFixtures.darkSkyProvider);
      await rainman.get([0, 0]);
      expect(fetchSpy.calledWithMatch('api.darksky.net')).to.be.true;
      fetchSpy.restore();
    });
    it('should retrieve the correct data', async () => {
      const result = await rainman.get([0, 0]);
      expect(result).to.deep.equal(openWeatherMapFixtures.validResponse);
    });
    it('should search at the correct accuracy level', async () => {
      await rainman.get([1.2345, 6.7890]);
      expect(rainman.cache['1.236.79']).to.not.be.undefined;
    });
    it('should query using the correct units', async () => {
      const fetchSpy = sinon.spy(global, 'fetch');
      await rainman.get([0, 0]);
      expect(fetchSpy.calledWithMatch(`units=${rainman._config.units}`)).to.be.true;
      fetchSpy.restore();
    });
    it('should throw an error if the result cannot be retrieved', async () => {
      nock('http://api.openweathermap.org/data/2.5')
        .get('/weather')
        .query({
          appid: rainmanFixtures.validAPIKey.key,
          lat: 0,
          lon: 0,
          units: 'metric',
        })
        .reply(408);

      try {
        await rainman.get([0, 0]);
      } catch (error) {
        expect(error.message).to.equal('408');
      }
    });
    describe('When the requested resource is not in the cache', () => {
      it('should cache if _config.cache is true', sinon.test(async () => {
        const addToCacheSpy = sinon.spy(rainman, '_addToCache');
        await rainman.get([0, 0]);
        expect(addToCacheSpy.calledOnce).to.be.true;
      }));
      it('should not cache if _config.cache is false', sinon.test(async () => {
        rainman = new Rainman({
          ...rainmanFixtures.openWeatherMapProvider,
          ...rainmanFixtures.noCache,
        });
        const addToCacheSpy = sinon.spy(rainman, '_addToCache');
        await rainman.get([0, 0]);
        expect(addToCacheSpy.notCalled).to.be.true;
      }));
    });
    describe('When the requested resource is in the cache', () => {
      describe('When the cached item is valid', () => {
        it('should not make an API request to get new data', () => {
          const fetchSpy = sinon.spy(global, 'fetch');
          rainman.cache['00'] = {
            data: {},
            expires: new Date().getTime() + 10000,
          };
          rainman.get([0, 0]);
          expect(fetchSpy.calledOnce).to.be.false;
          fetchSpy.restore();
        });
        it('should return the cached item', async () => {
          const clock = sinon.useFakeTimers(new Date().getTime());
          const cacheItem = rainman.cache['00'] = {
            data: {
              test: true,
            },
            expires: new Date().getTime() + 10000,
          };
          expect(await rainman.get([0, 0])).to.deep.equal(cacheItem.data);
          clock.restore();
        });
      });
      describe('When the cached item is invalid', () => {
        beforeEach(() => {
          rainman.cache['00'] = {
            data: {},
            expires: 0,
          };
        });
        it('should make an API request to get new data', () => {
          const fetchSpy = sinon.spy(global, 'fetch');
          rainman.get([0, 0]);
          expect(fetchSpy.calledOnce).to.be.true;
          fetchSpy.restore();
        });
        it('should overwrite the item in the cache with the new data', async () => {
          await rainman.get([0, 0]);
          expect(rainman.cache['00'].data).to.deep.equal(openWeatherMapFixtures.validResponse);
        });
      });
    });
  });
});
