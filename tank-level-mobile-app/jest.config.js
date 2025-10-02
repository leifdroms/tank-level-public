module.exports = {
  preset: './jest.expo-preset.js',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      [
        'react-native',
        '@react-native',
        'react-native-ble-plx',
        'react-native-reanimated',
        'react-native-gesture-handler',
        'react-native-safe-area-context',
        'react-native-screens',
        'react-native-svg',
        '@react-native-async-storage',
        '@react-navigation',
        'expo',
        'expo-asset',
        'expo-constants',
        'expo-font',
        'expo-haptics',
        'expo-image',
        'expo-linking',
        'expo-modules-core',
        'expo-notifications',
        'expo-router',
        'expo-splash-screen',
        'expo-status-bar',
        'expo-system-ui',
        'expo-web-browser',
        '@expo/vector-icons',
        'moti',
        'react-clone-referenced-element'
      ].join('|') +
    ')/)'
  ],
  testPathIgnorePatterns: ['\\\.expo\\/', '<rootDir>/node_modules/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  testEnvironment: 'node'
};
