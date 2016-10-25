import { expect } from 'chai';
import nock from 'nock';
import sinon from 'sinon';

import * as rainmanFixtures from './__fixtures__/rainman.fixture';
import * as openWeatherMapFixtures from './__fixtures__/openWeatherMap.fixture';

import Rainman from '../';

describe('Rainman', () => {
  let rainman;
  beforeEach(() => {
    rainman = new Rainman(rainmanFixtures.validAPIKey);
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
        ...rainmanFixtures.validAPIKey,
        cache: true,
        ttl: Math.pow(60, 3)
      };
      expect(rainman._config).to.deep.equal(expectedValue);
    });
    it('should assign the config passed to the constructor', () => {
      const expectedValue = {
        ...rainmanFixtures.validAPIKey,
        cache: false,
        ttl: Math.pow(60, 3)
      };
      rainman = new Rainman(rainmanFixtures.noCache);
      expect(rainman._config).to.deep.equal(expectedValue);
    });
    it('should create an empty cache', () => {
      expect(rainman.cache).to.deep.equal({});
    });
    it('should throw an error when passing an invalid API key', () => {
      expect(() => new Rainman(rainmanFixtures.invalidAPIKey)).to.throw('Invalid API Key provided to Rainman!');
    });
  });
  describe('Method: _addToCache()', () => {
    it('should save the given object to the cache', () => {
      const clock = sinon.useFakeTimers(new Date().getTime());
      rainman = new Rainman(rainmanFixtures.validAPIKey);
      const expectedValue = {
        data: openWeatherMapFixtures.validResponse,
        expires: new Date().getTime() + rainman._config.ttl
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
        expires: 0
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
        { label: 'N', value: 360 }
      ];
      expectedValues.forEach(direction => {
        expect(rainman.convertWindDegreesToDirection(direction.value)).to.equal(direction.label);
      });
    });
  });
  describe('Method: get()', () => {
    beforeEach(() => {
      rainman = new Rainman(rainmanFixtures.validAPIKey);
      nock('http://api.openweathermap.org/data/2.5')
        .get('/weather')
        .query({
          appid: rainmanFixtures.validAPIKey.key,
          lat: 0,
          lon: 0
        })
        .reply(200, openWeatherMapFixtures.validResponse);
    });
    afterEach(() => {
      nock.cleanAll();
    });
    it('should retrieve the correct data', async () => {
      const result = await rainman.get([0, 0]);
      expect(result).to.deep.equal(openWeatherMapFixtures.validResponse);
    });
    it('should throw an error if the result cannot be retrieved', done => {
      nock.cleanAll();
      nock('http://api.openweathermap.org/data/2.5')
        .get('/weather')
        .query({
          appid: rainmanFixtures.validAPIKey.key,
          lat: 0,
          lon: 0
        })
        .reply(408);
      const response = rainman.get([0, 0]);
      response.then(() => {
        done(new Error('Promise should have been rejected'));
      });
      response.catch(error => {
        expect(error).to.not.be.null;
        done();
      });
    });
    describe('When the requested resource is not in the cache', () => {
      it('should cache if _config.cache is true', sinon.test(async () => {
        const addToCacheSpy = sinon.spy(rainman, '_addToCache');
        await rainman.get([0, 0]);
        expect(addToCacheSpy.calledOnce).to.be.true;
      }));
      it('should not cache if _config.cache is false', sinon.test(async () => {
        rainman = new Rainman(rainmanFixtures.noCache);
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
            expires: new Date().getTime() + 10000
          };
          rainman.get([0, 0]);
          expect(fetchSpy.calledOnce).to.be.false;
          fetchSpy.restore();
        });
        it('should return the cached item', async () => {
          const clock = sinon.useFakeTimers(new Date().getTime());
          const cacheItem = rainman.cache['00'] = {
            data: {
              test: true
            },
            expires: new Date().getTime() + 10000
          };
          expect(await rainman.get([0, 0])).to.deep.equal(cacheItem.data);
          clock.restore();
        });
      });
      describe('When the cached item is invalid', () => {
        beforeEach(() => {
          rainman.cache['00'] = {
            data: {},
            expires: 0
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
