export const validAPIKey = { key: '1234567890' };
export const invalidAPIKey = { key: undefined };
export const noCache = {
  ...validAPIKey,
  cache: false
};
