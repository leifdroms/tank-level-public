import { Buffer } from 'buffer';

export const PIN_LENGTH = 6;
export const DEFAULT_PIN = '000000';

export const isValidPin = (value: string): boolean => /^\d{6}$/.test(value);

const toPinBytes = (pin: string): number[] => Array.from(pin).map((char) => char.charCodeAt(0));

export const encodePin = (pin: string): string => Buffer.from(toPinBytes(pin)).toString('base64');
