import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Button } from '../ui/Button';

describe('Button', () => {
  afterEach(cleanup);

  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDefined();
  });

  it('shows loading spinner and sets aria-busy when isLoading is true', () => {
    render(<Button isLoading>Click me</Button>);

    // Check for aria-busy
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-busy')).toBe('true');

    // The spinner icon has aria-hidden="true" but we can check if it exists in the DOM
    // CircleNotch usually renders as an svg
    const svg = button.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg?.classList.contains('animate-spin')).toBe(true);
  });

  it('is disabled when isLoading is true', () => {
    render(<Button isLoading>Click me</Button>);
    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
