module.exports = {
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'opened' })),
};
