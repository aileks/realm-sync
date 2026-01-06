import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingModal } from '@/components/OnboardingModal';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

const mockCompleteOnboarding = vi.fn();
const mockSeedTutorialProject = vi.fn();
const mockUser = vi.fn();

vi.mock('convex/react', () => ({
  useQuery: () => mockUser(),
  useMutation: (mutationRef: string) => {
    if (mutationRef === 'users.completeOnboarding') return mockCompleteOnboarding;
    if (mutationRef === 'tutorial.seedTutorialProject') return mockSeedTutorialProject;
    return vi.fn();
  },
}));

vi.mock('../../convex/_generated/api', () => ({
  api: {
    users: {
      viewer: 'users.viewer',
      completeOnboarding: 'users.completeOnboarding',
    },
    tutorial: {
      seedTutorialProject: 'tutorial.seedTutorialProject',
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';

describe('OnboardingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.mockReturnValue({ onboardingCompleted: false });
    mockCompleteOnboarding.mockResolvedValue(undefined);
    mockSeedTutorialProject.mockResolvedValue({
      projectId: 'test-project-id',
      alreadyExists: false,
    });
  });

  describe('error handling', () => {
    it('shows error toast when completeOnboarding fails on last step', async () => {
      mockCompleteOnboarding.mockRejectedValueOnce(new Error('Network error'));
      mockUser.mockReturnValue({ onboardingCompleted: false });

      render(<OnboardingModal />);

      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByRole('button', { name: /next/i });
        fireEvent.click(nextButton);
      }

      const finishButton = screen.getByRole('button', { name: /let's begin/i });
      fireEvent.click(finishButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to complete onboarding',
          expect.objectContaining({ description: 'Network error' })
        );
      });
    });

    it('shows error toast when completeOnboarding fails on skip', async () => {
      mockCompleteOnboarding.mockRejectedValueOnce(new Error('Server error'));
      mockUser.mockReturnValue({ onboardingCompleted: false });

      render(<OnboardingModal />);

      const skipButton = screen.getByText('Skip introduction');
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to skip onboarding',
          expect.objectContaining({ description: 'Server error' })
        );
      });
    });

    it('shows generic error message for non-Error exceptions', async () => {
      mockCompleteOnboarding.mockRejectedValueOnce('Unknown error');
      mockUser.mockReturnValue({ onboardingCompleted: false });

      render(<OnboardingModal />);

      const skipButton = screen.getByText('Skip introduction');
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to skip onboarding',
          expect.objectContaining({ description: 'Please try again.' })
        );
      });
    });
  });

  describe('happy path', () => {
    it('does not show error when completeOnboarding succeeds', async () => {
      mockUser.mockReturnValue({ onboardingCompleted: false });

      render(<OnboardingModal />);

      const skipButton = screen.getByText('Skip introduction');
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(mockCompleteOnboarding).toHaveBeenCalled();
      });

      expect(toast.error).not.toHaveBeenCalled();
    });

    it('renders nothing when user has completed onboarding', () => {
      mockUser.mockReturnValue({ onboardingCompleted: true });

      const { container } = render(<OnboardingModal />);

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when user is not loaded', () => {
      mockUser.mockReturnValue(undefined);

      const { container } = render(<OnboardingModal />);

      expect(container.firstChild).toBeNull();
    });
  });
});
