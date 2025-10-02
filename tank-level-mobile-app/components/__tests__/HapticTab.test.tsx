import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render } from '@testing-library/react-native';

import { HapticTab } from '../HapticTab';
import * as Haptics from 'expo-haptics';

describe('HapticTab', () => {
  beforeEach(() => {
    (Haptics.impactAsync as jest.Mock).mockClear();
  });

  it('triggers haptic feedback on iOS press in', () => {
    const originalExpoOs = process.env.EXPO_OS;
    process.env.EXPO_OS = 'ios';
    const onPressIn = jest.fn();

    const { getByTestId } = render(
      <NavigationContainer>
        <HapticTab testID="tab" onPressIn={onPressIn} to="/" accessibilityRole="button" />
      </NavigationContainer>
    );

    fireEvent(getByTestId('tab'), 'pressIn');

    expect(Haptics.impactAsync).toHaveBeenCalled();
    expect(onPressIn).toHaveBeenCalled();

    process.env.EXPO_OS = originalExpoOs;
  });
});
