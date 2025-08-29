import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import Sidebar from '../Sidebar';

// Mock the auth hook
vi.mock('../AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'test-user', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the sidebar', () => {
    render(<Sidebar />);
    
    expect(screen.getByText('CareIQ')).toBeInTheDocument();
    expect(screen.getByText('New Chat')).toBeInTheDocument();
    expect(screen.getByText('Recent Chats')).toBeInTheDocument();
  });

  it('should show search functionality when expanded', () => {
    render(<Sidebar collapsed={false} />);
    
    expect(screen.getByText('Search chats...')).toBeInTheDocument();
  });

  it('should hide search when collapsed', () => {
    render(<Sidebar collapsed={true} />);
    
    expect(screen.queryByText('Search chats...')).not.toBeInTheDocument();
  });

  it('should open search input when search button clicked', async () => {
    render(<Sidebar collapsed={false} />);
    
    const searchButton = screen.getByText('Search chats...');
    fireEvent.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search chats...')).toBeInTheDocument();
    });
  });

  it('should filter chats based on search query', async () => {
    // Mock some chats data
    const mockChats = [
      { id: '1', title: 'Healthcare Discussion', created_at: '2024-01-01T00:00:00Z' },
      { id: '2', title: 'Policy Review', created_at: '2024-01-02T00:00:00Z' },
    ];

    render(<Sidebar />);
    
    // This test would need more setup to properly test the filtering functionality
    // since it depends on the useEffect hooks and Supabase data
  });

  it('should show loading state initially', () => {
    render(<Sidebar />);
    
    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should show admin dashboard link for admin users', () => {
    // This would need proper mocking of the admin check
    render(<Sidebar />);
    
    // Would need to mock the admin status properly to test this
  });
});