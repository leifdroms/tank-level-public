import React, { PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react-native';

import Alerts from '@/types/Alerts';
import TankData from '@/types/TankData';
import { TankProvider, useTankContext } from '../TankContext';

const renderUseTankContext = () => {
  const wrapper = ({ children }: PropsWithChildren) => <TankProvider>{children}</TankProvider>;
  return renderHook(() => useTankContext(), { wrapper });
};

describe('TankContext', () => {
  it('throws when used outside of provider', () => {
    const { result } = renderHook(() => {
      try {
        useTankContext();
        return null;
      } catch (error) {
        return error;
      }
    });

    expect(result.current).toBeInstanceOf(Error);
  });

  it('provides default state and allows dispatching actions', async () => {
    const { result } = renderUseTankContext();

    expect(result.current.state.connected).toBe(false);

    await act(async () => {
      result.current.dispatch({ type: 'SET_PIN', payload: '123456' });
      result.current.dispatch({ type: 'SET_SCANNING', payload: true });
    });

    expect(result.current.state.pin).toBe('123456');
    expect(result.current.state.scanning).toBe(true);
  });

  it('exposes helper actions for alerts and history', async () => {
    const { result } = renderUseTankContext();

    const alerts: Alerts = {
      grey13: true,
      grey23: false,
      greyFull: false,
      black13: true,
      black23: false,
      blackFull: false,
    };

    const entry: TankData = {
      greyLevel: 2,
      greyStable: true,
      greyEnabled: true,
      blackLevel: 1,
      blackStable: true,
      blackEnabled: true,
      timestamp: new Date('2024-01-01T00:00:00Z'),
    };

    await act(async () => {
      result.current.actions.setAlerts(alerts);
      result.current.actions.updateAlert('grey23', true);
      result.current.actions.setTankHistory([entry]);
      result.current.actions.addTankHistory({ ...entry, greyLevel: 3 });
      result.current.actions.setSensorFlags({ greyEnabled: false, blackEnabled: true });
    });

    expect(result.current.state.alerts.grey13).toBe(true);
    expect(result.current.state.alerts.grey23).toBe(true);
    expect(result.current.state.tankHistory).toHaveLength(2);
    expect(result.current.state.tankHistory[1].greyLevel).toBe(3);
    expect(result.current.state.tankData.greyEnabled).toBe(false);
    expect(result.current.state.tankData.blackEnabled).toBe(true);
  });
});
