import { useMemo } from 'react';

import { useTankContext } from '../context/TankContext';
import { TankState } from '@/types/TankContext';

const selectConnection = (state: TankState) => ({
  scanning: state.scanning,
  devices: state.devices,
  connected: state.connected,
  connectedDevice: state.connectedDevice,
});

const selectAuthentication = (state: TankState) => ({
  authenticated: state.authenticated,
  pin: state.pin,
});

const selectTank = (state: TankState) => ({
  tankData: state.tankData,
  tankHistory: state.tankHistory,
});

const selectAlerts = (state: TankState) => state.alerts;

const selectLastNotification = (state: TankState) => state.lastNotification;

export const useTankStateSlice = <T>(selector: (state: TankState) => T): T => {
  const { state } = useTankContext();
  return useMemo(() => selector(state), [selector, state]);
};

export const useTankConnectionState = () => useTankStateSlice(selectConnection);

export const useTankAuthenticationState = () => useTankStateSlice(selectAuthentication);

export const useTankDataState = () => useTankStateSlice(selectTank);

export const useTankAlertsState = () => useTankStateSlice(selectAlerts);

export const useTankLastNotificationState = () => useTankStateSlice(selectLastNotification);
