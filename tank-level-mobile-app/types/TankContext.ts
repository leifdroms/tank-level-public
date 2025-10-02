import { Device } from 'react-native-ble-plx';
import TankData from './TankData';
import Alerts from './Alerts';
import { LastNotification } from './Notifications';
import { AuthenticationResult, ChangePinResult } from './Auth';

export interface TankActions {
  updateAlert: (key: keyof Alerts, value: boolean) => void;
  setAlerts: (alerts: Alerts) => void;
  setPin: (pin: string) => void;
  addTankHistory: (entry: TankData) => void;
  setTankHistory: (history: TankData[]) => void;
  setSensorFlags: (flags: { greyEnabled: boolean; blackEnabled: boolean }) => void;
}

// State type definition for the Tank Context
export interface TankState {
  // Bluetooth connection state
  scanning: boolean;
  devices: Device[];
  connected: boolean;
  connectedDevice: Device | null;
  authenticated: boolean;
  pin: string;

  // Tank data
  tankData: TankData;
  tankHistory: TankData[];

  // Alert settings
  alerts: Alerts;
  lastNotification: LastNotification;
}

// Action types for the Tank Context reducer
export type TankAction =
  | { type: 'SET_SCANNING'; payload: boolean }
  | { type: 'SET_DEVICES'; payload: Device[] }
  | { type: 'ADD_DEVICE'; payload: Device }
  | { type: 'UPDATE_DEVICE'; payload: Device }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_CONNECTED_DEVICE'; payload: Device | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_PIN'; payload: string }
  | { type: 'SET_TANK_DATA'; payload: TankData }
  | { type: 'SET_TANK_HISTORY'; payload: TankData[] }
  | { type: 'ADD_TANK_HISTORY'; payload: TankData }
  | { type: 'SET_ALERTS'; payload: Alerts }
  | { type: 'UPDATE_ALERT'; payload: { key: keyof Alerts; value: boolean } }
  | { type: 'SET_LAST_NOTIFICATION'; payload: LastNotification }
  | { type: 'UPDATE_LAST_NOTIFICATION'; payload: Partial<LastNotification> }
  | { type: 'SET_SENSOR_FLAGS'; payload: { greyEnabled: boolean; blackEnabled: boolean } }
  | { type: 'RESET_CONNECTION' }
  | { type: 'RESET_AUTH' };

// Context type with refs for non-state values
export interface TankContextType {
  state: TankState;
  dispatch: React.Dispatch<TankAction>;
  refs: {
    alertsSent: React.MutableRefObject<{ greyLevel: number; blackLevel: number }>;
    hardwareApi: React.MutableRefObject<{
      updateSensorConfig?: (flags: { greyEnabled: boolean; blackEnabled: boolean }) => Promise<void>;
      authenticateWithPin?: (device: Device, pin: string) => Promise<AuthenticationResult>;
      changePinOnDevice?: (pin: string) => Promise<ChangePinResult>;
    }>;
  };
  actions: TankActions;
}
