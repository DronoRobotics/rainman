export const validAPIKey = { key: '1234567890' };
export const invalidAPIKey = { key: undefined };
export const noCache = {
  ...validAPIKey,
  cache: false,
};
export const openWeatherMapProvider = {
  ...validAPIKey,
  provider: 'openweathermap',
};
export const darkSkyProvider = {
  ...validAPIKey,
  provider: 'darksky',
};
