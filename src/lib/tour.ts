import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="sidebar-nav"]',
    popover: {
      title: 'Navigation',
      description:
        'Browse your projects and navigate to different sections. Recent projects appear here for quick access.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="project-overview"]',
    popover: {
      title: 'Project Dashboard',
      description:
        "This is your project's home. See stats, recent activity, and access all project tools from here.",
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="documents"]',
    popover: {
      title: 'Documents',
      description:
        'Add your manuscripts, notes, and worldbuilding documents here. Vellum will extract canon facts from them.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="entities"]',
    popover: {
      title: 'Entities',
      description:
        'All characters, locations, items, and concepts extracted from your documents. Review and confirm them to build your canon.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="alerts"]',
    popover: {
      title: 'Continuity Alerts',
      description:
        "When Vellum detects contradictions or timeline issues, they'll appear here. Keep your world consistent!",
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="vellum"]',
    popover: {
      title: 'Meet Vellum',
      description:
        "Your AI archive assistant. Ask questions about your world, get writing suggestions, and explore your canon. I'm always here to help!",
      side: 'top',
      align: 'start',
    },
  },
];

export type TourCallbacks = {
  onStepChange?: (stepIndex: number) => void;
  onComplete?: () => void;
  onSkip?: () => void;
};

export function createTourDriver(callbacks: TourCallbacks = {}): Driver {
  let didComplete = false;

  return driver({
    showProgress: true,
    steps: TOUR_STEPS,
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Get Started!',
    progressText: '{{current}} of {{total}}',
    onHighlightStarted: (_element, _step, options) => {
      const activeIndex = options.state.activeIndex;
      if (activeIndex !== undefined) {
        callbacks.onStepChange?.(activeIndex);
      }
    },
    onDestroyStarted: (_element, _step, options) => {
      const activeIndex = options.state.activeIndex ?? 0;
      didComplete = activeIndex >= TOUR_STEPS.length - 1;
    },
    onDestroyed: () => {
      if (didComplete) {
        callbacks.onComplete?.();
      } else {
        callbacks.onSkip?.();
      }
    },
  });
}

export function startTour(callbacks: TourCallbacks = {}): Driver {
  const driverObj = createTourDriver(callbacks);
  driverObj.drive();
  return driverObj;
}

export function useTour() {
  const user = useQuery(api.users.viewer);
  const startTourMutation = useMutation(api.users.startTour);
  const updateProgress = useMutation(api.users.updateTourProgress);
  const completeTourMutation = useMutation(api.users.completeTour);
  const skipTourMutation = useMutation(api.users.skipTour);

  const driverRef = useRef<Driver | null>(null);
  const hasStartedRef = useRef(false);
  const callbacksRef = useRef({
    startTour: startTourMutation,
    updateProgress,
    completeTour: completeTourMutation,
    skipTour: skipTourMutation,
  });
  callbacksRef.current = {
    startTour: startTourMutation,
    updateProgress,
    completeTour: completeTourMutation,
    skipTour: skipTourMutation,
  };

  const userId = user?._id;
  const shouldStartTour =
    user !== undefined &&
    user !== null &&
    (!user.tourState || (!user.tourState.completed && user.tourState.currentStepIndex === 0));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!userId) return;
    if (hasStartedRef.current) return;
    if (!shouldStartTour) return;

    hasStartedRef.current = true;

    const timer = window.setTimeout(() => {
      void callbacksRef.current.startTour();

      if (driverRef.current?.isActive()) return;

      driverRef.current = createTourDriver({
        onStepChange: (stepIndex) => {
          void callbacksRef.current.updateProgress({ stepIndex });
        },
        onComplete: () => {
          void callbacksRef.current.completeTour();
        },
        onSkip: () => {
          void callbacksRef.current.skipTour();
        },
      });

      driverRef.current.drive();
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [userId, shouldStartTour]);

  useEffect(() => {
    return () => {
      if (driverRef.current?.isActive()) {
        driverRef.current.destroy();
      }
      driverRef.current = null;
    };
  }, []);

  return {
    isActive: driverRef.current?.isActive() ?? false,
    destroy: () => driverRef.current?.destroy(),
  };
}
