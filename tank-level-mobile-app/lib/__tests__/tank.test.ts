import { buildTankData, computeTankLevel, decodeTankPayload, resolveAlertMessage } from '../tank';

const alerts = {
  grey13: true,
  grey23: true,
  greyFull: true,
  black13: true,
  black23: true,
  blackFull: true,
};

describe('tank helpers', () => {
  describe('computeTankLevel', () => {
    it('returns 3 when full sensor active', () => {
      expect(computeTankLevel(0, 0, 1)).toBe(3);
    });

    it('returns 2 when 2/3 sensor active', () => {
      expect(computeTankLevel(0, 1, 0)).toBe(2);
    });

    it('returns 1 when 1/3 sensor active', () => {
      expect(computeTankLevel(1, 0, 0)).toBe(1);
    });

    it('returns 0 when no sensors active', () => {
      expect(computeTankLevel(0, 0, 0)).toBe(0);
    });
  });

  describe('decodeTankPayload', () => {
    it('decodes base64 payload into sensor data and levels', () => {
      const payload = decodeTankPayload('AQAAAAEAAAAB');
      expect(payload.greySensors).toEqual([1, 0, 0]);
      expect(payload.blackSensors).toEqual([0, 1, 0]);
      expect(payload.greyLevel).toBe(1);
      expect(payload.blackLevel).toBe(2);
      expect(payload.systemStable).toBe(true);
      expect(payload.greyEnabled).toBe(false);
      expect(payload.blackEnabled).toBe(false);
      expect(payload.raw).toHaveLength(9);
    });
  });

  describe('buildTankData', () => {
    it('converts decoded payload into TankData', () => {
      const payload = decodeTankPayload('AQAAAAEAAAAB');
      const data = buildTankData(payload);
      expect(data.greyLevel).toBe(payload.greyLevel);
      expect(data.greyStable).toBe(payload.systemStable);
      expect(data.greyEnabled).toBe(payload.greyEnabled);
      expect(data.blackLevel).toBe(payload.blackLevel);
      expect(data.blackStable).toBe(payload.systemStable);
      expect(data.blackEnabled).toBe(payload.blackEnabled);
      expect(data.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('resolveAlertMessage', () => {
    it('returns configured alert message for matching level', () => {
      expect(resolveAlertMessage('grey', 3, alerts)).toContain('grey water tank is full');
    });

    it('returns null when alert disabled', () => {
      expect(
        resolveAlertMessage('grey', 3, { ...alerts, greyFull: false })
      ).toBeNull();
    });

    it('returns null for unknown level', () => {
      expect(resolveAlertMessage('grey', 4, alerts)).toBeNull();
    });
  });
});
