import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import HomeScreen from '../(tabs)/index';
import { TankProvider, useTankContext } from '@/context/TankContext';

const mockScanForDevices = jest.fn();
const mockConnectToDevice = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('@/hooks/useBleTankDevice', () => ({
  useBleTankDevice: () => ({
    initializeBluetooth: jest.fn(),
    scanForDevices: mockScanForDevices,
    connectToDevice: mockConnectToDevice,
    disconnect: mockDisconnect,
    authenticateWithPin: jest.fn(),
    changePinOnDevice: jest.fn(),
  }),
}));

const mockClearBadge = jest.fn();

jest.mock('@/hooks/useTankNotifications', () => ({
  useTankNotifications: () => ({
    sendNotification: jest.fn(),
    clearBadge: mockClearBadge,
  }),
}));

const mockAck = {
  shouldShowGreyAck: true,
  shouldShowBlackAck: false,
  handleAcknowledge: jest.fn(),
};

jest.mock('@/hooks/useTankAlertAcknowledgement', () => ({
  useTankAlertAcknowledgement: () => mockAck,
}));

const ContextBridge = ({ onReady }: { onReady: (context: ReturnType<typeof useTankContext>) => void }) => {
  const context = useTankContext();
  useEffect(() => {
    onReady(context);
  }, [context, onReady]);
  return null;
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockScanForDevices.mockClear();
    mockConnectToDevice.mockClear();
    mockDisconnect.mockClear();
    mockClearBadge.mockClear();
    mockAck.handleAcknowledge.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderWithProvider = async () => {
    let capturedContext: ReturnType<typeof useTankContext> | undefined;

    const utils = render(
      <TankProvider>
        <ContextBridge onReady={(ctx) => (capturedContext = ctx)} />
        <HomeScreen />
      </TankProvider>
    );

    await waitFor(() => expect(capturedContext).toBeDefined());

    return { ...utils, context: capturedContext! };
  };

  it('shows device list when disconnected and triggers scan', async () => {
    const { getByText } = await renderWithProvider();

    fireEvent.press(getByText('Scan for Devices'));

    expect(mockScanForDevices).toHaveBeenCalled();
  });

  it('displays tank data and admin badge when authenticated', async () => {
    const { getByText, context } = await renderWithProvider();

    await act(async () => {
      context.dispatch({ type: 'SET_CONNECTED', payload: true });
      context.dispatch({
        type: 'SET_CONNECTED_DEVICE',
        payload: { id: 'device-1', name: 'RV Tanks 1234' } as any,
      });
      context.dispatch({ type: 'SET_AUTHENTICATED', payload: true });
      context.dispatch({
        type: 'SET_TANK_DATA',
        payload: {
          greyLevel: 3,
          greyStable: true,
          greyEnabled: true,
          blackLevel: 2,
          blackStable: true,
          blackEnabled: true,
          timestamp: new Date('2024-01-01T00:00:00Z'),
        },
      });
      context.dispatch({
        type: 'SET_ALERTS',
        payload: {
          grey13: true,
          grey23: true,
          greyFull: true,
          black13: false,
          black23: false,
          blackFull: false,
        },
      });
    });

    expect(getByText('Connected Device')).toBeTruthy();
    expect(getByText('Grey Water Tank')).toBeTruthy();
    expect(getByText('ADMIN MODE')).toBeTruthy();

    fireEvent.press(getByText('Acknowledge Alert'));
    expect(mockAck.handleAcknowledge).toHaveBeenCalledWith('grey');
  });

  it('invokes disconnect handler', async () => {
    const { getByText, context } = await renderWithProvider();

    await act(async () => {
      context.dispatch({ type: 'SET_CONNECTED', payload: true });
    });

    fireEvent.press(getByText('Disconnect'));
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
