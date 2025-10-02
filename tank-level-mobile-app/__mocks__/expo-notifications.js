const scheduleNotificationAsync = jest.fn(() => Promise.resolve());
const setBadgeCountAsync = jest.fn(() => Promise.resolve());
const getPermissionsAsync = jest.fn(() => Promise.resolve({ status: 'granted' }));
const requestPermissionsAsync = jest.fn(() => Promise.resolve({ status: 'granted' }));
const setNotificationHandler = jest.fn();
const setNotificationChannelAsync = jest.fn(() => Promise.resolve());

module.exports = {
  scheduleNotificationAsync,
  setBadgeCountAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationHandler,
  setNotificationChannelAsync,
  AndroidImportance: { HIGH: 'high' },
  AndroidNotificationPriority: { HIGH: 'high' },
};
