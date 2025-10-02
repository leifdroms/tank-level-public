require('whatwg-fetch');

const mockSafeAreaContext = require('react-native-safe-area-context/jest/mock');

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  Reanimated.useScrollViewOffset = () => ({ value: 0 });
  Reanimated.useAnimatedRef = () => ({ current: null });
  return Reanimated;
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-font', () => ({
  useFonts: () => [true],
}));

jest.mock('expo-notifications');
jest.mock('expo-haptics');
jest.mock('expo-web-browser');
jest.mock('expo-blur');
jest.mock('react-native-ble-plx');
jest.mock('expo-symbols', () => {
  const React = require('react');
  return {
    SymbolView: ({ children, ...props }) =>
      React.createElement('SymbolView', props, children ?? null),
  };
});
