/**
 * Unit tests for ProfileForm component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, createTestUser } from "@ioc/testing/test-utils";
import ProfileForm from '../../../app/profile/ProfileForm';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  })
}));

// Mock fetch
global.fetch = jest.fn();

describe('ProfileForm', () => {
  const mockUser = createTestUser({
    id: '123',
    email: 'test@example.com',
    metadata: {
      full_name: 'Test User',
      company: 'Test Company'
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  it('renders profile form with user data', () => {
    renderWithProviders(<ProfileForm user={mockUser} />);

    expect(screen.getByLabelText(/email/i)).toHaveValue(mockUser.email);
    expect(screen.getByLabelText(/full name/i)).toHaveValue(mockUser.metadata.full_name);
    expect(screen.getByLabelText(/company/i)).toHaveValue(mockUser.metadata.company);
  });

  it('submits form with updated data', async () => {
    renderWithProviders(<ProfileForm user={mockUser} />);

    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('Updated Name')
        })
      );
    });
  });

  it('shows error message on submission failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Update failed' })
    });

    renderWithProviders(<ProfileForm user={mockUser} />);

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/update failed/i)).toBeInTheDocument();
    });
  });

  it('disables form during submission', async () => {
    renderWithProviders(<ProfileForm user={mockUser} />);

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/saving/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});