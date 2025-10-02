import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import Alerts from '@/types/Alerts';
import TankData from '@/types/TankData';
import { LastNotification } from '@/types/Notifications';
import { TankAction } from '@/types/TankContext';

interface UseTankAlertAcknowledgementArgs {
  tankData: TankData;
  alerts: Alerts;
  lastNotification: LastNotification;
  alertsSentRef: React.MutableRefObject<{ greyLevel: number; blackLevel: number }>;
  dispatch: React.Dispatch<TankAction>;
  clearBadge: () => void;
}

export const useTankAlertAcknowledgement = ({
  tankData,
  alerts,
  lastNotification,
  alertsSentRef,
  dispatch,
  clearBadge,
}: UseTankAlertAcknowledgementArgs) => {
  const handleAcknowledge = useCallback(
    (kind: 'grey' | 'black') => {
      if (kind === 'grey') {
        alertsSentRef.current.greyLevel = tankData.greyLevel;
        dispatch({
          type: 'UPDATE_LAST_NOTIFICATION',
          payload: {
            greyAlerted: true,
            greyAlertLevel: tankData.greyLevel,
            greyLevel: tankData.greyLevel,
          },
        });
        Alert.alert('Acknowledged', 'Grey tank alert acknowledged');
      } else {
        alertsSentRef.current.blackLevel = tankData.blackLevel;
        dispatch({
          type: 'UPDATE_LAST_NOTIFICATION',
          payload: {
            blackAlerted: true,
            blackAlertLevel: tankData.blackLevel,
            blackLevel: tankData.blackLevel,
          },
        });
        Alert.alert('Acknowledged', 'Black tank alert acknowledged');
      }

      clearBadge();
    },
    [alertsSentRef, clearBadge, dispatch, tankData.blackLevel, tankData.greyLevel]
  );

  const shouldShowGreyAck = useMemo(() => {
    if (!tankData.greyEnabled || !tankData.greyStable || lastNotification.greyAlerted) return false;

    return (
      (tankData.greyLevel === 3 && alerts.greyFull) ||
      (tankData.greyLevel === 2 && alerts.grey23) ||
      (tankData.greyLevel === 1 && alerts.grey13)
    );
  }, [alerts.grey13, alerts.grey23, alerts.greyFull, lastNotification.greyAlerted, tankData.greyLevel, tankData.greyStable]);

  const shouldShowBlackAck = useMemo(() => {
    if (!tankData.blackEnabled || !tankData.blackStable || lastNotification.blackAlerted) return false;

    return (
      (tankData.blackLevel === 3 && alerts.blackFull) ||
      (tankData.blackLevel === 2 && alerts.black23) ||
      (tankData.blackLevel === 1 && alerts.black13)
    );
  }, [alerts.black13, alerts.black23, alerts.blackFull, lastNotification.blackAlerted, tankData.blackLevel, tankData.blackStable]);

  return {
    shouldShowGreyAck,
    shouldShowBlackAck,
    handleAcknowledge,
  };
};
