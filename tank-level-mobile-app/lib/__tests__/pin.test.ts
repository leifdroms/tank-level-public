import { DEFAULT_PIN, encodePin, isValidPin } from '../pin';

describe('pin utilities', () => {
  describe('isValidPin', () => {
    it('accepts exactly six digits', () => {
      expect(isValidPin('123456')).toBe(true);
      expect(isValidPin(DEFAULT_PIN)).toBe(true);
    });

    it('rejects values that are not six digits', () => {
      expect(isValidPin('')).toBe(false);
      expect(isValidPin('12345')).toBe(false);
      expect(isValidPin('abcdef')).toBe(false);
      expect(isValidPin('1234567')).toBe(false);
    });
  });

  describe('encodePin', () => {
    it('encodes digits to base64', () => {
      expect(encodePin('123456')).toBe('MTIzNDU2');
    });
  });
});
