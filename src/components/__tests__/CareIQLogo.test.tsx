import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import CareIQLogo from '../CareIQLogo';

describe('CareIQLogo', () => {
  it('should render the logo', () => {
    render(<CareIQLogo />);
    
    expect(screen.getByText('CIQ')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<CareIQLogo className=\"custom-class\" />);
    
    const logo = screen.getByText('CIQ').parentElement;
    expect(logo).toHaveClass('custom-class');
  });

  it('should have correct styling classes', () => {
    render(<CareIQLogo />);
    
    const logo = screen.getByText('CIQ').parentElement;
    expect(logo).toHaveClass('bg-gradient-to-br');
    expect(logo).toHaveClass('from-blue-600');
    expect(logo).toHaveClass('to-blue-700');
    expect(logo).toHaveClass('rounded-lg');
  });
});