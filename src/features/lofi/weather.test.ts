import { describe, it, expect } from 'vitest';
import { mapWeatherCode } from './weather';

describe('mapWeatherCode', () => {
  it('detects rain codes', () => {
    expect(mapWeatherCode(61)).toBe('rain');
  });
  it('detects snow codes', () => {
    expect(mapWeatherCode(71)).toBe('snow');
  });
  it('defaults to sunny', () => {
    expect(mapWeatherCode(0)).toBe('sunny');
  });
});
