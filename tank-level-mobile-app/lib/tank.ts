import { Buffer } from 'buffer';

import Alerts from '@/types/Alerts';
import TankData from '@/types/TankData';

export interface DecodedTankPayload {
  greySensors: [number, number, number];
  blackSensors: [number, number, number];
  systemStable: boolean;
  greyLevel: number;
  blackLevel: number;
  greyEnabled: boolean;
  blackEnabled: boolean;
  raw: number[];
}

export type TankKind = 'grey' | 'black';

export const computeTankLevel = (
  sensor13: number,
  sensor23: number,
  sensorFull: number
): number => {
  if (sensorFull === 1) return 3;
  if (sensor23 === 1) return 2;
  if (sensor13 === 1) return 1;
  return 0;
};

export const decodeTankPayload = (value: string): DecodedTankPayload => {
  const data = Buffer.from(value, 'base64');

  const greyLevel = computeTankLevel(data[0], data[1], data[2]);
  const blackLevel = computeTankLevel(data[3], data[4], data[5]);
  const systemStable = data[8] === 1;
  const greyEnabled = data[6] === 1;
  const blackEnabled = data[7] === 1;

  return {
    greySensors: [data[0], data[1], data[2]],
    blackSensors: [data[3], data[4], data[5]],
    systemStable,
    greyLevel,
    blackLevel,
    greyEnabled,
    blackEnabled,
    raw: Array.from(data),
  };
};

export const buildTankData = (payload: DecodedTankPayload): TankData => ({
  greyLevel: payload.greyLevel,
  greyStable: payload.systemStable,
  greyEnabled: payload.greyEnabled,
  blackLevel: payload.blackLevel,
  blackStable: payload.systemStable,
  blackEnabled: payload.blackEnabled,
  timestamp: new Date(),
});

export const resolveAlertMessage = (
  kind: TankKind,
  level: number,
  alerts: Alerts
): string | null => {
  const mapping: Record<TankKind, { [key: number]: { enabled: boolean; message: string } | undefined }> = {
    grey: {
      1: alerts.grey13 ? { enabled: true, message: 'Your grey water tank is 1/3 full' } : undefined,
      2: alerts.grey23 ? { enabled: true, message: 'Your grey water tank is 2/3 full' } : undefined,
      3: alerts.greyFull ? { enabled: true, message: 'Your grey water tank is full!' } : undefined,
    },
    black: {
      1: alerts.black13 ? { enabled: true, message: 'Your black water tank is 1/3 full' } : undefined,
      2: alerts.black23 ? { enabled: true, message: 'Your black water tank is 2/3 full' } : undefined,
      3: alerts.blackFull ? { enabled: true, message: 'Your black water tank is full!' } : undefined,
    },
  };

  const config = mapping[kind][level];
  if (!config || !config.enabled) return null;
  return config.message;
};
