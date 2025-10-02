import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { Device } from 'react-native-ble-plx';

import { TankProvider, useTankContext } from '@/context/TankContext';
import { useBleTankDevice } from '@/hooks/useBleTankDevice';

type MockDevice = Device & { [key: string]: any };

const mockStartScan = jest.fn();
const mockStopScan = jest.fn();
const mockRequestPermissions = jest.fn();
const mockCurrentState = jest.fn(async () => 'PoweredOn');
const mockOnStateChange = jest.fn(() => ({ remove: jest.fn() }));
const mockConnect = jest.fn();
const mockStartPolling = jest.fn();
const mockStopPolling = jest.fn();
const mockAuthenticate = jest.fn(async () => true);
const mockDisconnect = jest.fn();
const mockWriteCommand = jest.fn();
const mockEnsureDisconnected = jest.fn(async () => {});

jest.mock('@/lib/tankBleClient', () => {
  return {
    TankBleClient: jest.fn().mockImplementation(() => ({
      startScan: mockStartScan,
      stopScan: mockStopScan,
      requestPermissions: mockRequestPermissions,
      currentState: mockCurrentState,
      onStateChange: mockOnStateChange,
      connect: mockConnect,
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
      authenticate: mockAuthenticate,
      disconnect: mockDisconnect,
      writeCommand: mockWriteCommand,
      ensureDisconnected: mockEnsureDisconnected,
      onDisconnected: jest.fn(() => ({ remove: jest.fn() })),
      isPolling: jest.fn(() => false),
      cleanup: jest.fn(),
      stopScan: mockStopScan,
    })),
  };
});

describe('useBleTankDevice', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <TankProvider>{children}</TankProvider>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const setup = () => {
    const result = renderHook(() => {
      const api = useBleTankDevice({
        notifications: { sendNotification: jest.fn(), clearBadge: jest.fn() },
      });
      const context = useTankContext();
      return { api, context };
    }, { wrapper });

    return result;
  };

  it('requests permissions during initialization', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.api.initializeBluetooth();
    });

    expect(mockRequestPermissions).toHaveBeenCalled();
    expect(mockOnStateChange).toHaveBeenCalled();
  });

  it('scans for devices and updates context state', async () => {
    const device: MockDevice = { id: 'device-1', name: 'RV Tanks 1111' } as any;
    let onDevice: ((device: MockDevice) => void) | undefined;
    let onStop: (() => void) | undefined;

    mockStartScan.mockImplementation(({ onDevice: onDeviceCb, onStop: onStopCb }) => {
      onDevice = onDeviceCb;
      onStop = onStopCb;
    });

    const { result } = setup();

    await act(async () => {
      await result.current.api.scanForDevices();
    });

    expect(result.current.context.state.scanning).toBe(true);

    await act(async () => {
      onDevice?.(device);
    });

    await act(async () => {
      onStop?.();
    });

    expect(result.current.context.state.devices).toContainEqual(device);
    expect(result.current.context.state.scanning).toBe(false);
  });

  it('connects to device and starts polling', async () => {
    const device: MockDevice = {
      id: 'device-1',
      name: 'RV Tanks 1111',
      readCharacteristicForService: jest.fn().mockResolvedValue({ value: null }),
    } as any;
    mockConnect.mockResolvedValue({
      device,
      serviceUUID: 'ff00',
      dataCharacteristicUUID: 'ff01',
    });

    const { result } = setup();

    await act(async () => {
      await result.current.api.connectToDevice(device);
    });

    expect(result.current.context.state.connected).toBe(true);
    expect(result.current.context.state.connectedDevice).toEqual(device);
    expect(mockStartPolling).toHaveBeenCalled();
  });

  it('disconnects and resets connection state', async () => {
    const device: MockDevice = {
      id: 'device-1',
      name: 'RV Tanks 1111',
      readCharacteristicForService: jest.fn().mockResolvedValue({ value: null }),
    } as any;
    mockConnect.mockResolvedValue({
      device,
      serviceUUID: 'ff00',
      dataCharacteristicUUID: 'ff01',
    });

    const { result } = setup();

    await act(async () => {
      await result.current.api.connectToDevice(device);
    });

    await act(async () => {
      await result.current.api.disconnect();
    });

    expect(mockDisconnect).toHaveBeenCalled();
    expect(result.current.context.state.connected).toBe(false);
    expect(result.current.context.state.connectedDevice).toBeNull();
  });
});
