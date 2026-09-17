import { describe, it, expect } from 'vitest';
import { getDeviceStatusColor, getDeviceStatusLabel, paginate } from '@/utils/helpers';

describe('helpers', () => {
  it('returns correct device status colors', () => {
    expect(getDeviceStatusColor('normal')).toBe('success');
    expect(getDeviceStatusColor('violation')).toBe('error');
    expect(getDeviceStatusColor('offline')).toBe('default');
  });

  it('returns device status labels', () => {
    expect(getDeviceStatusLabel('warning')).toBe('Warning');
  });

  it('paginates data', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
    const result = paginate(items, { page: 2, pageSize: 10 });
    expect(result.data).toHaveLength(10);
    expect(result.total).toBe(25);
    expect(result.data[0].id).toBe(11);
  });
});
