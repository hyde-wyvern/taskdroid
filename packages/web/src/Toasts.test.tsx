// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToast } from './Toasts';

function Trigger() {
  const toast = useToast();
  return <button onClick={() => toast('Task saved')}>Save</button>;
}

describe('ToastProvider', () => {
  it('shows and dismisses successful action feedback', () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('status').textContent).toContain('Task saved');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
