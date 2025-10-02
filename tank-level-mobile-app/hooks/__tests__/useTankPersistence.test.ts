import { renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Alerts from '@/types/Alerts';
import TankData from '@/types/TankData';
import { TankAction, TankState } from '@/types/TankContext';
import { useTankPersistence } from '../useTankPersistence';

type Props = {
  state: TankState;
  dispatch: React.Dispatch<TankAction>;
};

const createBaseState = (): TankState => ({
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
    timestamp: new Date('2024-01-01T00:00:00Z'),
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
});

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('useTankPersistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hydrates alerts, pin, and history on mount', async () => {
    const alerts: Alerts = {
      grey13: true,
      grey23: false,
      greyFull: false,
      black13: true,
      black23: false,
      blackFull: false,
    };
    const history: Array<TankData & { timestamp: string }> = [
      {
        greyLevel: 2,
        greyStable: true,
        greyEnabled: true,
        blackLevel: 1,
        blackStable: true,
        blackEnabled: true,
        timestamp: new Date('2024-02-01T00:00:00Z').toISOString(),
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'alerts') return Promise.resolve(JSON.stringify(alerts));
      if (key === 'userPin') return Promise.resolve('123456');
      if (key === 'tankHistory') return Promise.resolve(JSON.stringify(history));
      return Promise.resolve(null);
    });

    const dispatch = jest.fn();

    renderHook(({ state, dispatch: d }: Props) => useTankPersistence(state, d), {
      initialProps: { state: createBaseState(), dispatch },
    });

    await flushMicrotasks();

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ALERTS', payload: alerts });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PIN', payload: '123456' });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_TANK_HISTORY',
      payload: [
        expect.objectContaining({ timestamp: expect.any(Date), greyLevel: 2 }),
      ],
    });
  });

  it('persists state changes after hydration', async () => {
    const baseState = createBaseState();
    const dispatch = jest.fn();

    const { rerender } = renderHook(({ state, dispatch: d }: Props) => useTankPersistence(state, d), {
      initialProps: { state: baseState, dispatch },
    });

    await flushMicrotasks();
    (AsyncStorage.setItem as jest.Mock).mockClear();

    const updatedState: TankState = {
      ...baseState,
      alerts: { ...baseState.alerts, grey13: true },
      pin: '654321',
      tankHistory: [
        {
          greyLevel: 1,
          greyStable: true,
          greyEnabled: true,
          blackLevel: 0,
          blackStable: true,
          blackEnabled: true,
          timestamp: new Date('2024-03-01T00:00:00Z'),
        },
      ],
    };

    rerender({ state: updatedState, dispatch });

    await flushMicrotasks();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('alerts', JSON.stringify(updatedState.alerts));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('userPin', updatedState.pin);

    const historyCall = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]: [string]) => key === 'tankHistory'
    );

    expect(historyCall).toBeDefined();

    const serializedHistory = historyCall?.[1] as string;
    const parsedHistory = JSON.parse(serializedHistory);

    expect(parsedHistory).toEqual([
      expect.objectContaining({
        greyLevel: 1,
        blackLevel: 0,
        timestamp: updatedState.tankHistory[0].timestamp.toISOString(),
      }),
    ]);
  });
});
