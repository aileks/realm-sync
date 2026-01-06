import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type TourStep = {
  id: string;
  target: string;
  title: string;
  content: string;
};

const EMPTY_STEPS: string[] = [];

const TOUR_STEPS: TourStep[] = [
  {
    id: 'project-overview',
    target: '[data-tour="project-overview"]',
    title: 'Welcome to Your Project',
    content:
      'This is your project dashboard. Here you can see all your documents, entities, and alerts.',
  },
  {
    id: 'documents-list',
    target: '[data-tour="documents-list"]',
    title: 'Your Documents',
    content: 'Documents are the source material for your world. Add chapters, notes, or text.',
  },
  {
    id: 'entities-section',
    target: '[data-tour="entities-section"]',
    title: 'Canon Entities',
    content:
      'Entities are the characters, locations, items, and concepts. Vellum extracts these automatically.',
  },
  {
    id: 'vellum-mascot',
    target: '[data-tour="vellum-mascot"]',
    title: 'Meet Vellum',
    content: "I'm Vellum, your archive assistant. Ask me anything about your world!",
  },
];

const DESKTOP_QUERY = '(min-width: 1024px)';

function getNextStepIndex(steps: TourStep[], completedSteps: string[]) {
  return steps.findIndex((step) => !completedSteps.includes(step.id));
}

function getTooltipPosition(
  targetRect: DOMRect | null,
  tooltipRect: DOMRect,
  viewport: { width: number; height: number }
) {
  const margin = 16;

  if (!targetRect) {
    return {
      top: Math.max(margin, (viewport.height - tooltipRect.height) / 2),
      left: Math.max(margin, (viewport.width - tooltipRect.width) / 2),
    };
  }

  const targetCenter = targetRect.left + targetRect.width / 2;
  let left = targetCenter - tooltipRect.width / 2;
  left = Math.max(margin, Math.min(left, viewport.width - tooltipRect.width - margin));

  let top = targetRect.bottom + margin;
  if (top + tooltipRect.height > viewport.height - margin) {
    top = targetRect.top - tooltipRect.height - margin;
  }
  top = Math.max(margin, top);

  return { top, left };
}

type TutorialTourProps = {
  isTutorialProject: boolean;
};

export function TutorialTour({ isTutorialProject }: TutorialTourProps) {
  const user = useQuery(api.users.viewer);
  const startTutorialTour = useMutation(api.users.startTutorialTour);
  const recordTutorialStep = useMutation(api.users.recordTutorialStep);
  const completeTutorialTour = useMutation(api.users.completeTutorialTour);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const [localCompletedSteps, setLocalCompletedSteps] = useState<string[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);

  const completedSteps = user?.tutorialState?.completedSteps ?? EMPTY_STEPS;
  const hasSeenTour = user?.tutorialState?.hasSeenTour ?? false;

  const nextStepIndex = useMemo(
    () => getNextStepIndex(TOUR_STEPS, completedSteps),
    [completedSteps]
  );

  const shouldStart =
    !!user && isTutorialProject && !hasSeenTour && isDesktop && nextStepIndex !== -1;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(DESKTOP_QUERY);

    const update = () => setIsDesktop(media.matches);
    update();

    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!user || !isTutorialProject) return;
    if (!hasSeenTour && nextStepIndex === -1) {
      void completeTutorialTour({ completedSteps });
    }
  }, [completedSteps, completeTutorialTour, hasSeenTour, isTutorialProject, nextStepIndex, user]);

  useEffect(() => {
    if (!shouldStart || hasStartedRef.current) return;
    hasStartedRef.current = true;
    setLocalCompletedSteps(completedSteps);
    setStepIndex(Math.max(0, nextStepIndex));
    setIsOpen(true);
    void startTutorialTour();
  }, [completedSteps, nextStepIndex, shouldStart, startTutorialTour]);

  useEffect(() => {
    if (!shouldStart && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen, shouldStart]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const step = TOUR_STEPS[stepIndex];
    if (!step) return;

    const target = document.querySelector(step.target);
    if (!target) {
      setTargetRect(null);
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });

    const update = () => setTargetRect(target.getBoundingClientRect());
    update();

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen, stepIndex]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const tooltip = tooltipRef.current;
    if (!tooltip) return;

    const frame = window.requestAnimationFrame(() => {
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      setTooltipPosition(getTooltipPosition(targetRect, tooltipRect, viewport));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, stepIndex, targetRect]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[stepIndex];
  if (!step) return null;

  const isLastStep = stepIndex === TOUR_STEPS.length - 1;
  const isFirstStep = stepIndex === 0;
  const nextCompletedSteps =
    localCompletedSteps.includes(step.id) ? localCompletedSteps : [...localCompletedSteps, step.id];

  const highlightStyle =
    targetRect ?
      {
        top: targetRect.top - 8,
        left: targetRect.left - 8,
        width: targetRect.width + 16,
        height: targetRect.height + 16,
      }
    : undefined;

  const tooltipStyle = tooltipPosition ?? { top: 24, left: 24 };

  function handleBack() {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }

  function handleSkip() {
    void completeTutorialTour({ completedSteps: localCompletedSteps });
    setIsOpen(false);
  }

  function handleNext() {
    setLocalCompletedSteps(nextCompletedSteps);
    void recordTutorialStep({ stepId: step.id });

    if (isLastStep) {
      void completeTutorialTour({ completedSteps: nextCompletedSteps });
      setIsOpen(false);
      return;
    }

    setStepIndex((prev) => Math.min(TOUR_STEPS.length - 1, prev + 1));
  }

  return (
    <>
      <div className="fixed inset-0 z-40" aria-hidden />
      {highlightStyle && (
        <div
          className={cn(
            'ring-primary/70 fixed z-50 rounded-xl ring-2',
            'shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]'
          )}
          style={highlightStyle}
        />
      )}
      <div
        ref={tooltipRef}
        className="fixed z-[60] w-[min(92vw,360px)]"
        style={{ top: tooltipStyle.top, left: tooltipStyle.left }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`tour-title-${step.id}`}
      >
        <Card className="border-border/70 shadow-xl">
          <CardHeader className="pb-2">
            <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">
              Step {stepIndex + 1} of {TOUR_STEPS.length}
            </p>
            <CardTitle id={`tour-title-${step.id}`} className="font-serif text-lg">
              {step.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">{step.content}</p>
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip tour
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBack} disabled={isFirstStep}>
                  Back
                </Button>
                <Button size="sm" onClick={handleNext}>
                  {isLastStep ? 'Finish' : 'Next'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
