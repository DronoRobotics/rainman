import { expect } from 'chai';
import nock from 'nock';

import * as rainmanFixtures from './__fixtures__/rainman.fixture';
import * as openWeatherMapFixtures from './__fixtures__/openWeatherMap.fixture';

import Rainman from '../';

describe('Rainman', () => {
  let rainman;
  describe('initialisation', () => {
    beforeEach(() => {
      rainman = new Rainman(rainmanFixtures.validAPIKey);
    });
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
      expect(rainman.cache).to.deep.equal([]);
    });
    it('should throw an error when passing no API key', () => {
      expect(() => new Rainman(rainmanFixtures.invalidAPIKey)).to.throw('Invalid API Key provided to Rainman!');
    });
  });
  describe('#get', () => {
    beforeEach(() => {
      rainman = new Rainman(rainmanFixtures.validAPIKey);
      nock('http://api.openweathermap.org/data/2.5')
        .get('/weather')
        .query(true)
        .reply(200, {
          body: openWeatherMapFixtures.validResponse
        });
    });
    afterEach(() => {
      nock.cleanAll();
    });
    it('should query the API');
    describe('When "_config.cache" is true', () => {
      it('should save the result to cache');
    });
  });
});
