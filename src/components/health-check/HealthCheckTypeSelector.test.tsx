import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HealthCheckTypeSelector } from './HealthCheckTypeSelector';

describe('HealthCheckTypeSelector', () => {
  it('renders enabled health check type buttons', () => {
    render(<HealthCheckTypeSelector onSelect={vi.fn()} />);

    const buttons = screen.getAllByRole('button');

    expect(buttons).toHaveLength(3);
  });

  it('calls onSelect with the selected health check type', () => {
    const onSelect = vi.fn();
    render(<HealthCheckTypeSelector onSelect={onSelect} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(onSelect).toHaveBeenNthCalledWith(1, 'urine');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'tuberculosis');
  });
});
