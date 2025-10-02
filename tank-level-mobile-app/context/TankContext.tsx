import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useRef,
  useMemo,
} from 'react';
import { Device } from 'react-native-ble-plx';
import Alerts from '@/types/Alerts';
import TankData from '@/types/TankData';
import { AuthenticationResult, ChangePinResult } from '@/types/Auth';
import { TankState, TankAction, TankContextType } from '@/types/TankContext';
import { useTankPersistence } from '../hooks/useTankPersistence';

// Initial state
const initialState: TankState = {
  scanning: false,
  devices: [],
  connected: false,
  connectedDevice: null,
  authenticated: false,
  pin: '',
  tankData: {
    greyLevel: 0,
    greyStable: false,
    greyEnabled: true,
    blackLevel: 0,
    blackStable: false,
    blackEnabled: true,
    timestamp: new Date(),
  },
  tankHistory: [],
  alerts: {
    grey13: false,
    grey23: false,
    greyFull: false,
    black13: false,
    black23: false,
    blackFull: false,
  },
  lastNotification: {
    greyLevel: -1,
    blackLevel: -1,
    greyAlerted: false,
    blackAlerted: false,
    greyAlertLevel: -1,
    blackAlertLevel: -1,
  },
};

// Reducer function
function tankReducer(state: TankState, action: TankAction): TankState {
  switch (action.type) {
    case 'SET_SCANNING':
      return { ...state, scanning: action.payload };

    case 'SET_DEVICES':
      return { ...state, devices: action.payload };

    case 'ADD_DEVICE':
      return {
        ...state,
        devices: [...state.devices, action.payload]
      };

    case 'UPDATE_DEVICE':
      // Check if device exists by name (since name is what we use for display)
      const existingIndex = state.devices.findIndex(d =>
        d.name === action.payload.name || d.id === action.payload.id
      );

      if (existingIndex >= 0) {
        // Update existing device
        return {
          ...state,
          devices: state.devices.map((d, index) =>
            index === existingIndex ? action.payload : d
          ),
        };
      } else {
        // Add new device
        return {
          ...state,
          devices: [...state.devices, action.payload]
        };
      }

    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };

    case 'SET_CONNECTED_DEVICE':
      return { ...state, connectedDevice: action.payload };

    case 'SET_AUTHENTICATED':
      return { ...state, authenticated: action.payload };

    case 'SET_PIN':
      return { ...state, pin: action.payload };

    case 'SET_TANK_DATA':
      return { ...state, tankData: action.payload };

    case 'SET_SENSOR_FLAGS':
      return {
        ...state,
        tankData: {
          ...state.tankData,
          greyEnabled: action.payload.greyEnabled,
          blackEnabled: action.payload.blackEnabled,
        },
      };

    case 'SET_TANK_HISTORY':
      return { ...state, tankHistory: action.payload };

    case 'ADD_TANK_HISTORY':
      return {
        ...state,
        tankHistory: [...state.tankHistory, action.payload].slice(-100) // Keep last 100
      };

    case 'SET_ALERTS':
      return { ...state, alerts: action.payload };

    case 'UPDATE_ALERT':
      return {
        ...state,
        alerts: {
          ...state.alerts,
          [action.payload.key]: action.payload.value
        }
      };

    case 'SET_LAST_NOTIFICATION':
      return { ...state, lastNotification: action.payload };

    case 'UPDATE_LAST_NOTIFICATION':
      return {
        ...state,
        lastNotification: {
          ...state.lastNotification,
          ...action.payload
        }
      };

    case 'RESET_CONNECTION':
      return {
        ...state,
        connected: false,
        connectedDevice: null,
        authenticated: false,
      };

    case 'RESET_AUTH':
      return {
        ...state,
        authenticated: false,
      };

    default:
      return state;
  }
}

// Create context
const TankContext = createContext<TankContextType | undefined>(undefined);

// Provider component
export function TankProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tankReducer, initialState);

  const alertsSent = useRef({ greyLevel: -1, blackLevel: -1 });
  const hardwareApi = useRef<{
    updateSensorConfig?: (flags: { greyEnabled: boolean; blackEnabled: boolean }) => Promise<void>;
    authenticateWithPin?: (device: Device, pin: string) => Promise<AuthenticationResult>;
    changePinOnDevice?: (pin: string) => Promise<ChangePinResult>;
  }>({});

  useTankPersistence(state, dispatch);

  // Memoize the refs object to prevent unnecessary re-renders
  const refs = useMemo(
    () => ({
      alertsSent,
      hardwareApi,
    }),
    []
  ); // Empty deps array since refs never change

  const actions = useMemo(
    () => ({
      updateAlert: (key: keyof Alerts, value: boolean) =>
        dispatch({ type: 'UPDATE_ALERT', payload: { key, value } }),
      setAlerts: (alerts: Alerts) => dispatch({ type: 'SET_ALERTS', payload: alerts }),
      setPin: (pin: string) => dispatch({ type: 'SET_PIN', payload: pin }),
      addTankHistory: (entry: TankData) =>
        dispatch({ type: 'ADD_TANK_HISTORY', payload: entry }),
      setTankHistory: (history: TankData[]) =>
        dispatch({ type: 'SET_TANK_HISTORY', payload: history }),
      setSensorFlags: (flags: { greyEnabled: boolean; blackEnabled: boolean }) =>
        dispatch({ type: 'SET_SENSOR_FLAGS', payload: flags }),
    }),
    []
  );

  return (
    <TankContext.Provider value={{ state, dispatch, refs, actions }}>
      {children}
    </TankContext.Provider>
  );
}

// Custom hook to use the context
export function useTankContext() {
  const context = useContext(TankContext);
  if (context === undefined) {
    throw new Error('useTankContext must be used within a TankProvider');
  }
  return context;
}
