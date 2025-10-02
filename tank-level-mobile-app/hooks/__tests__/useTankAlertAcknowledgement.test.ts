import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';

import Alerts from '@/types/Alerts';
import { LastNotification } from '@/types/Notifications';
import TankData from '@/types/TankData';
import { TankAction } from '@/types/TankContext';
import { useTankAlertAcknowledgement } from '../useTankAlertAcknowledgement';

describe('useTankAlertAcknowledgement', () => {
  const baseAlerts: Alerts = {
    grey13: false,
    grey23: false,
    greyFull: true,
    black13: false,
    black23: false,
    blackFull: true,
  };

  const baseData: TankData = {
    greyLevel: 3,
    greyStable: true,
    greyEnabled: true,
    blackLevel: 3,
    blackStable: true,
    blackEnabled: true,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };

  const baseNotification: LastNotification = {
    greyLevel: -1,
    blackLevel: -1,
    greyAlerted: false,
    blackAlerted: false,
    greyAlertLevel: -1,
    blackAlertLevel: -1,
  };

  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('determines when acknowledgement buttons should be visible', () => {
    const alertsSentRef = { current: { greyLevel: -1, blackLevel: -1 } };
    const dispatch = jest.fn();
    const clearBadge = jest.fn();

    const { result, rerender } = renderHook(
      ({ tankData, alerts, lastNotification }) =>
        useTankAlertAcknowledgement({
          tankData,
          alerts,
          lastNotification,
          alertsSentRef,
          dispatch,
          clearBadge,
        }),
      {
        initialProps: {
          tankData: baseData,
          alerts: baseAlerts,
          lastNotification: baseNotification,
        },
      }
    );

    expect(result.current.shouldShowGreyAck).toBe(true);
    expect(result.current.shouldShowBlackAck).toBe(true);

    rerender({
      tankData: { ...baseData, greyStable: false },
      alerts: baseAlerts,
      lastNotification: baseNotification,
    });

    expect(result.current.shouldShowGreyAck).toBe(false);

    rerender({
      tankData: { ...baseData, greyEnabled: false },
      alerts: baseAlerts,
      lastNotification: baseNotification,
    });

    expect(result.current.shouldShowGreyAck).toBe(false);
  });

  it('acknowledges alerts and updates refs, state, and badge', async () => {
    const alertsSentRef = { current: { greyLevel: -1, blackLevel: -1 } };
    const dispatch = jest.fn();
    const clearBadge = jest.fn();

    const { result } = renderHook(() =>
      useTankAlertAcknowledgement({
        tankData: baseData,
        alerts: baseAlerts,
        lastNotification: baseNotification,
        alertsSentRef,
        dispatch,
        clearBadge,
      })
    );

    await act(async () => {
      result.current.handleAcknowledge('grey');
    });

    expect(alertsSentRef.current.greyLevel).toBe(baseData.greyLevel);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LAST_NOTIFICATION',
      payload: expect.objectContaining({ greyAlerted: true, greyAlertLevel: baseData.greyLevel }),
    } as TankAction);
    expect(clearBadge).toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Acknowledged', expect.stringContaining('Grey tank'));
  });
});
