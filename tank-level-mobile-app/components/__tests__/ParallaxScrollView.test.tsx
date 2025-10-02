import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

jest.mock('../ui/TabBarBackground', () => ({
  __esModule: true,
  default: () => null,
  useBottomTabOverflow: () => 0,
}));

import ParallaxScrollView from '../ParallaxScrollView';

describe('ParallaxScrollView', () => {
  it('renders header image and children content', () => {
    const { getByTestId, getByText } = render(
      <ParallaxScrollView
        headerImage={<Text testID="header">Header</Text>}
        headerBackgroundColor={{ light: '#fff', dark: '#000' }}
      >
        <Text>Body</Text>
      </ParallaxScrollView>
    );

    expect(getByTestId('header')).toBeTruthy();
    expect(getByText('Body')).toBeTruthy();
  });
});
