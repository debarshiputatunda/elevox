import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { HookThresholdControl } from '@/components/monitoring/HookThresholdControl';

afterEach(cleanup);

it('reflects external settings without saving them and protects a typed draft', () => {
  const onChange = vi.fn();
  const { rerender } = render(<HookThresholdControl label="Hook A" value={3870} onChange={onChange} />);
  const input = screen.getByRole('spinbutton', { name: 'Hook A threshold' });
  fireEvent.focus(input);
  rerender(<HookThresholdControl label="Hook A" value={0} onChange={onChange} />);
  expect(input).toHaveValue(0);
  fireEvent.change(input, { target: { value: '4321' } });
  rerender(<HookThresholdControl label="Hook A" value={5000} onChange={onChange} />);
  expect(input).toHaveValue(4321);
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.blur(input);
  expect(onChange).toHaveBeenCalledExactlyOnceWith(4321);
});

it('preserves zero and clamps typed values to the supported range', () => {
  const onChange = vi.fn();
  render(<HookThresholdControl label="Hook A" value={3870} onChange={onChange} />);
  const input = screen.getByRole('spinbutton', { name: 'Hook A threshold' });
  for (const [typed, saved] of [['0', 0], ['100001', 100000], ['-10', 0]] as const) {
    fireEvent.change(input, { target: { value: typed } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(saved);
  }
});

it('does not save an untouched value or turn an empty draft into zero', () => {
  const onChange = vi.fn();
  render(<HookThresholdControl label="Hook A" value={3870} onChange={onChange} />);
  const input = screen.getByRole('spinbutton', { name: 'Hook A threshold' });
  fireEvent.focus(input);
  fireEvent.blur(input);
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.blur(input);
  expect(input).toHaveValue(3870);
  expect(onChange).not.toHaveBeenCalled();
});
