import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Alerts from '@/types/Alerts';
import TankData from '@/types/TankData';
import { TankAction, TankState } from '@/types/TankContext';

const ALERTS_KEY = 'alerts';
const PIN_KEY = 'userPin';
const HISTORY_KEY = 'tankHistory';

interface HydrationTracker {
  alerts: boolean;
  pin: boolean;
  history: boolean;
}

export const useTankPersistence = (
  state: TankState,
  dispatch: React.Dispatch<TankAction>
) => {
  const hydrationRef = useRef<HydrationTracker>({ alerts: false, pin: false, history: false });

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const [alertsValue, pinValue, historyValue] = await Promise.all([
          AsyncStorage.getItem(ALERTS_KEY),
          AsyncStorage.getItem(PIN_KEY),
          AsyncStorage.getItem(HISTORY_KEY),
        ]);

        if (!cancelled && alertsValue) {
          const parsedAlerts = JSON.parse(alertsValue) as Alerts;
          dispatch({ type: 'SET_ALERTS', payload: parsedAlerts });
        }

        if (!cancelled && pinValue) {
          dispatch({ type: 'SET_PIN', payload: pinValue });
        }

        if (!cancelled && historyValue) {
          const parsedHistory = JSON.parse(historyValue) as Array<
            TankData & { timestamp: string }
          >;

          const normalizedHistory: TankData[] = parsedHistory.map((entry) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
          }));

          dispatch({ type: 'SET_TANK_HISTORY', payload: normalizedHistory });
        }
      } catch (error) {
        console.error('Error hydrating tank data:', error);
      } finally {
        if (!cancelled) {
          hydrationRef.current = { alerts: true, pin: true, history: true };
        }
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!hydrationRef.current.alerts) return;

    AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(state.alerts)).catch((error) =>
      console.error('Error persisting alerts:', error)
    );
  }, [state.alerts]);

  useEffect(() => {
    if (!hydrationRef.current.pin) return;

    if (!state.pin) {
      AsyncStorage.removeItem(PIN_KEY).catch((error) =>
        console.error('Error clearing stored PIN:', error)
      );
      return;
    }

    AsyncStorage.setItem(PIN_KEY, state.pin).catch((error) =>
      console.error('Error persisting PIN:', error)
    );
  }, [state.pin]);

  useEffect(() => {
    if (!hydrationRef.current.history) return;

    const serializedHistory = state.tankHistory.map((entry) => ({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    }));

    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(serializedHistory)).catch((error) =>
      console.error('Error persisting tank history:', error)
    );
  }, [state.tankHistory]);
};
