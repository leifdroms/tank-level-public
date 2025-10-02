import React from 'react';

jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: jest.fn(() => 24),
}));

const { default: BlurTabBarBackground, useBottomTabOverflow } = require('../ui/TabBarBackground');

describe('TabBarBackground (iOS)', () => {
  it('returns mocked bottom tab height', () => {
    expect(useBottomTabOverflow()).toBe(24);
  });

  it('exposes blur background component', () => {
    expect(typeof BlurTabBarBackground).toBe('function');
  });
});
