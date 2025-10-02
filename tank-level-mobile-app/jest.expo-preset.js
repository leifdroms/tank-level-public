const path = require('path');

const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
  setupFiles: [
    path.resolve(__dirname, 'jest.setup-env.js'),
    ...(expoPreset.setupFiles ?? []),
    path.resolve(__dirname, 'jest.setup.js'),
  ],
};
