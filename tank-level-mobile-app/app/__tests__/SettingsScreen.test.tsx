import React, { useEffect } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import SettingsScreen from '../(tabs)/settings';
import { TankProvider, useTankContext } from '@/context/TankContext';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

const { SafeAreaProvider } = jest.requireMock('react-native-safe-area-context');

const ContextBridge = ({ onReady }: { onReady: (context: ReturnType<typeof useTankContext>) => void }) => {
  const context = useTankContext();
  useEffect(() => {
    onReady(context);
  }, [context, onReady]);
  return null;
};

describe('Settings screen', () => {
  const renderWithProvider = async () => {
    let capturedContext: ReturnType<typeof useTankContext> | undefined;

    const utils = render(
      <SafeAreaProvider>
        <TankProvider>
          <ContextBridge onReady={(ctx) => (capturedContext = ctx)} />
          <SettingsScreen />
        </TankProvider>
      </SafeAreaProvider>
    );

    await waitFor(() => expect(capturedContext).toBeDefined());

    return { ...utils, getContext: () => capturedContext! };
  };

  it('toggles alert switches and updates context state', async () => {
    const { getByTestId, getContext } = await renderWithProvider();

    await act(async () => {
      fireEvent(getByTestId('alert-grey13-switch'), 'valueChange', true);
    });

    await waitFor(() => expect(getContext().state.alerts.grey13).toBe(true));
  });
});
