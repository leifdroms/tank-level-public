import { Buffer } from 'buffer';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { Device } from 'react-native-ble-plx';

import { useTankContext } from '../context/TankContext';
import { buildTankData, decodeTankPayload, resolveAlertMessage, TankKind } from '../lib/tank';
import { TankBleClient, TankConnection } from '../lib/tankBleClient';
import { encodePin, isValidPin } from '../lib/pin';
import { AuthenticationResult, ChangePinResult } from '@/types/Auth';
import { TankNotificationApi } from './useTankNotifications';

interface UseBleTankDeviceArgs {
  notifications: TankNotificationApi;
}

export const useBleTankDevice = ({ notifications }: UseBleTankDeviceArgs) => {
  const { state, dispatch, refs, actions } = useTankContext();
  const { alertsSent, hardwareApi } = refs;
  const { alerts, connected, connectedDevice, pin, scanning, authenticated } = state;

  const bleClientRef = useRef<TankBleClient | null>(null);
  if (!bleClientRef.current) {
    bleClientRef.current = new TankBleClient();
  }
  const bleClient = bleClientRef.current!;

  const connectedDeviceRef = useRef<Device | null>(connectedDevice);
  const connectionRef = useRef<TankConnection | null>(null);
  const tankDataHandlerRef = useRef<(value: string) => Promise<void>>(async () => {});

  useEffect(() => {
    connectedDeviceRef.current = connectedDevice;
  }, [connectedDevice]);

  const updateSensorConfig = useCallback(
    async (flags: { greyEnabled: boolean; blackEnabled: boolean }) => {
      if (!authenticated) {
        throw new Error('NOT_AUTHENTICATED');
      }

      const device = connectedDeviceRef.current;
      if (!device) {
        throw new Error('NOT_CONNECTED');
      }

      const payload = Buffer.from([flags.greyEnabled ? 1 : 0, flags.blackEnabled ? 1 : 0]).toString('base64');

      await bleClient.writeCommand(device, '00ff', 'ff03', payload);
    },
    [authenticated, bleClient]
  );


  const resetAlertTracking = useCallback(() => {
    alertsSent.current = { greyLevel: -1, blackLevel: -1 };
  }, [alertsSent]);

  const handleTankAlert = useCallback(
    async (kind: TankKind, level: number) => {
      const alertMessage = resolveAlertMessage(kind, level, alerts);
      const sentTracker = alertsSent.current;

      if (level === 0) {
        if (kind === 'grey') {
          sentTracker.greyLevel = 0;
          dispatch({
            type: 'UPDATE_LAST_NOTIFICATION',
            payload: {
              greyAlerted: false,
              greyAlertLevel: -1,
              greyLevel: 0,
            },
          });
        } else {
          sentTracker.blackLevel = 0;
          dispatch({
            type: 'UPDATE_LAST_NOTIFICATION',
            payload: {
              blackAlerted: false,
              blackAlertLevel: -1,
              blackLevel: 0,
            },
          });
        }
        return;
      }

      const alreadySent =
        kind === 'grey'
          ? sentTracker.greyLevel === level
          : sentTracker.blackLevel === level;

      if (!alertMessage || alreadySent) {
        return;
      }

      if (kind === 'grey') {
        sentTracker.greyLevel = level;
        dispatch({
          type: 'UPDATE_LAST_NOTIFICATION',
          payload: {
            greyAlerted: true,
            greyAlertLevel: level,
            greyLevel: level,
          },
        });
      } else {
        sentTracker.blackLevel = level;
        dispatch({
          type: 'UPDATE_LAST_NOTIFICATION',
          payload: {
            blackAlerted: true,
            blackAlertLevel: level,
            blackLevel: level,
          },
        });
      }

      await notifications.sendNotification(
        kind === 'grey' ? 'Grey Tank Alert' : 'Black Tank Alert',
        alertMessage
      );
    },
    [alerts, alertsSent, dispatch, notifications]
  );

  const handleTankData = useCallback(
    async (value: string) => {
      const payload = decodeTankPayload(value);
      const tankData = buildTankData(payload);

      dispatch({ type: 'SET_TANK_DATA', payload: tankData });

      if (!payload.systemStable) {
        return;
      }

      actions.addTankHistory(tankData);

      await handleTankAlert('grey', payload.greyEnabled ? payload.greyLevel : 0);
      await handleTankAlert('black', payload.blackEnabled ? payload.blackLevel : 0);
    },
    [actions, dispatch, handleTankAlert]
  );

  useEffect(() => {
    tankDataHandlerRef.current = handleTankData;
  }, [handleTankData]);

  const stopPolling = useCallback(() => {
    bleClient.stopPolling();
  }, [bleClient]);

  const startPolling = useCallback(() => {
    if (!connectionRef.current) return;
    bleClient.startPolling(connectionRef.current, async (value) => {
      await tankDataHandlerRef.current(value);
    });
  }, [bleClient]);

  const initializeBluetooth = useCallback(async () => {
    try {
      const initialState = await bleClient.currentState();
      console.log('Initial Bluetooth state:', initialState);

      bleClient.onStateChange((stateValue) => {
        if (stateValue === 'Unauthorized') {
          Alert.alert(
            'Bluetooth Permission Required',
            'Please grant Bluetooth permission in Settings > Privacy > Bluetooth'
          );
        } else if (stateValue === 'PoweredOff') {
          Alert.alert('Bluetooth is Off', 'Please turn on Bluetooth in Settings');
        }
      }, true);

      await bleClient.requestPermissions();
    } catch (error) {
      console.error('Bluetooth initialization error:', error);
      Alert.alert('Bluetooth Error', `Failed to initialize: ${error}`);
    }
  }, [bleClient]);

  const scanForDevices = useCallback(async () => {
    if (scanning) return;

    try {
      dispatch({ type: 'SET_DEVICES', payload: [] });
      dispatch({ type: 'SET_SCANNING', payload: true });

      const bluetoothState = await bleClient.currentState();
      if (bluetoothState !== 'PoweredOn') {
        Alert.alert(
          'Bluetooth Required',
          'Please enable Bluetooth to scan for devices. The app will automatically start scanning when Bluetooth is enabled.'
        );
        dispatch({ type: 'SET_SCANNING', payload: false });
        return;
      }

      let foundDevice = false;

      bleClient.startScan({
        onDevice: (device) => {
          foundDevice = true;
          dispatch({ type: 'UPDATE_DEVICE', payload: device });
        },
        onError: (error) => {
          console.error('Scan error:', error);
          dispatch({ type: 'SET_SCANNING', payload: false });
        },
        onStop: () => {
          dispatch({ type: 'SET_SCANNING', payload: false });

          if (!foundDevice && !connected) {
            Alert.alert(
              'No Devices Found',
              'Make sure your RV Tank Monitor is powered on and nearby.'
            );
          }
        },
      });
    } catch (error) {
      console.error('Scan error:', error);
      dispatch({ type: 'SET_SCANNING', payload: false });
    }
  }, [bleClient, connected, dispatch, scanning]);

  const authenticateWithPin = useCallback(
    async (device: Device, pin: string): Promise<AuthenticationResult> => {
      try {
        const encodedPin = encodePin(pin);
        const success = await bleClient.authenticate(device, [
          { service: '00ff', characteristic: 'ff02', value: encodedPin },
          {
            service: '0000ff00-0000-1000-8000-00805f9b34fb',
            characteristic: '0000ff02-0000-1000-8000-00805f9b34fb',
            value: encodedPin,
          },
        ]);

        if (!success) {
          return { status: 'invalid-pin' };
        }

        let authSucceeded = false;

        try {
          const characteristic = await device.readCharacteristicForService('00ff', 'ff01');
          if (characteristic?.value) {
            await handleTankData(characteristic.value);
            authSucceeded = true;
          }
        } catch (error) {
          console.error('Error reading initial tank data:', error);
        }

        if (!authSucceeded) {
          return { status: 'invalid-pin' };
        }

        dispatch({ type: 'SET_AUTHENTICATED', payload: true });

        return { status: 'success' };
      } catch (error) {
        console.error('Authentication error:', error);
        Alert.alert('Authentication Failed', 'Could not authenticate with the device.');
        return {
          status: 'error',
          message: error instanceof Error ? error.message : 'Authentication failed.',
        };
      }
    },
    [bleClient, dispatch, handleTankData]
  );

  const changePinOnDevice = useCallback(
    async (nextPin: string): Promise<ChangePinResult> => {
      if (!authenticated) {
        return { status: 'error', message: 'Authenticate with the device before changing the PIN.' };
      }

      if (!isValidPin(nextPin)) {
        return { status: 'error', message: 'PIN must be 6 digits.' };
      }

      const device = connectedDeviceRef.current;
      if (!device) {
        return { status: 'error', message: 'Not connected to a device.' };
      }

      try {
        const payload = Buffer.from(nextPin).toString('base64');
        await bleClient.writeCommand(device, '00ff', 'ff04', payload);
        dispatch({ type: 'SET_PIN', payload: nextPin });
        return { status: 'success', message: 'PIN updated on the device.' };
      } catch (error) {
        console.error('Error changing device PIN:', error);
        return {
          status: 'error',
          message: 'Failed to update PIN on the device.',
        };
      }
    },
    [authenticated, bleClient, dispatch]
  );

  const isConnectingRef = useRef(false);

  const connectToDevice = useCallback(
    async (device: Device) => {
      if (isConnectingRef.current) {
        return;
      }

      isConnectingRef.current = true;
      try {
        console.log('Connecting to device:', device.name || device.id);
        bleClient.stopScan();
        dispatch({ type: 'SET_SCANNING', payload: false });

        resetAlertTracking();

        await bleClient.ensureDisconnected(device.id);

        const connection = await bleClient.connect(device.id);
        connectedDeviceRef.current = connection.device;
        connectionRef.current = connection;

        dispatch({ type: 'SET_CONNECTED', payload: true });
        dispatch({ type: 'SET_CONNECTED_DEVICE', payload: connection.device });
 
        try {
          const initial = await connection.device.readCharacteristicForService(
            connection.serviceUUID,
            connection.dataCharacteristicUUID
          );

          if (initial?.value) {
            await handleTankData(initial.value);
          }
        } catch (error) {
          console.error('Initial read error:', error);
        }

        startPolling();

        bleClient.onDisconnected(connection.device.id, () => {
          dispatch({ type: 'SET_CONNECTED', payload: false });
          dispatch({ type: 'SET_CONNECTED_DEVICE', payload: null });
          dispatch({ type: 'SET_AUTHENTICATED', payload: false });
          stopPolling();
          resetAlertTracking();
          connectedDeviceRef.current = null;
          connectionRef.current = null;
          Alert.alert('Disconnected', 'Device disconnected');
        });

      } catch (error) {
        console.error('Connection error:', error);
        Alert.alert('Connection Failed', 'Unable to connect to the device');
      } finally {
        isConnectingRef.current = false;
      }
    },
    [
      bleClient,
      dispatch,
      handleTankData,
      resetAlertTracking,
      startPolling,
      stopPolling,
    ]
  );

  const disconnect = useCallback(async () => {
    const device = connectedDeviceRef.current;
    if (!device) return;

    try {
      resetAlertTracking();
      stopPolling();
      await bleClient.disconnect(device);
      dispatch({ type: 'RESET_CONNECTION' });
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      connectedDeviceRef.current = null;
      connectionRef.current = null;
    }
  }, [bleClient, dispatch, resetAlertTracking, stopPolling]);
  useEffect(() => {
    hardwareApi.current.updateSensorConfig = updateSensorConfig;
    hardwareApi.current.authenticateWithPin = authenticateWithPin;
    hardwareApi.current.changePinOnDevice = changePinOnDevice;

    return () => {
      hardwareApi.current.updateSensorConfig = undefined;
      hardwareApi.current.authenticateWithPin = undefined;
      hardwareApi.current.changePinOnDevice = undefined;
    };
  }, [
    authenticateWithPin,
    changePinOnDevice,
    hardwareApi,
    updateSensorConfig,
  ]);

  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        await notifications.clearBadge();

        if (connected && connectionRef.current && !bleClient.isPolling()) {
          startPolling();
        }
      }

      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [bleClient, connected, notifications, startPolling]);

  useEffect(() => {
    return () => {
      bleClient.stopScan();
      bleClient.cleanup();
    };
  }, [bleClient]);

  return {
    initializeBluetooth,
    scanForDevices,
    connectToDevice,
    disconnect,
    authenticateWithPin,
    changePinOnDevice,
  };
};
