import React, { PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react-native';

import { TankProvider, useTankContext } from '@/context/TankContext';
import {
  useTankAlertsState,
  useTankAuthenticationState,
  useTankConnectionState,
  useTankDataState,
  useTankLastNotificationState,
} from '../useTankSelectors';

describe('useTankSelectors', () => {
  const wrapper = ({ children }: PropsWithChildren) => <TankProvider>{children}</TankProvider>;

  it('selects slices of state from context', async () => {
    const { result } = renderHook(
      () => ({
        selectors: {
          connection: useTankConnectionState(),
          alerts: useTankAlertsState(),
          auth: useTankAuthenticationState(),
          tank: useTankDataState(),
          notifications: useTankLastNotificationState(),
        },
        context: useTankContext(),
      }),
      { wrapper }
    );

    expect(result.current.selectors.connection.connected).toBe(false);
    expect(result.current.selectors.alerts.greyFull).toBe(false);
    expect(result.current.selectors.auth.authenticated).toBe(false);
    expect(result.current.selectors.tank.tankData).toBeDefined();
    expect(result.current.selectors.notifications.greyAlerted).toBe(false);

    await act(async () => {
      result.current.context.dispatch({ type: 'SET_CONNECTED', payload: true });
      result.current.context.dispatch({
        type: 'SET_ALERTS',
        payload: { ...result.current.selectors.alerts, greyFull: true },
      });
    });

    expect(result.current.selectors.connection.connected).toBe(true);
    expect(result.current.selectors.alerts.greyFull).toBe(true);
  });

  it('memoizes selector results when state slice does not change', () => {
    const { result, rerender } = renderHook(() => useTankAlertsState(), { wrapper });

    const first = result.current;
    rerender();
    const second = result.current;

    expect(second).toBe(first);
  });
});
