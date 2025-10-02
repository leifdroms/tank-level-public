import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { ExternalLink } from '../ExternalLink';
import * as WebBrowser from 'expo-web-browser';

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Link: ({ onPress, children, ...rest }: any) =>
      React.createElement(
        Text,
        {
          ...rest,
          onPress: (event: any) => onPress?.({ preventDefault() {}, nativeEvent: event }),
        },
        children
      ),
  };
});

describe('ExternalLink', () => {
  beforeEach(() => {
    (WebBrowser.openBrowserAsync as jest.Mock).mockClear();
  });

  it('opens link in browser on native platforms', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    const { getByText } = render(
      <ExternalLink href="https://example.com">Open</ExternalLink>
    );

    fireEvent.press(getByText('Open'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://example.com');

    if (descriptor) {
      Object.defineProperty(Platform, 'OS', descriptor);
    }
  });
});
