import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import {
  BookOpen,
  FileText,
  Sparkles,
  Search,
  Shield,
  ArrowRight,
  X,
  Layers,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const PROJECT_MODES = [
  { id: 'ttrpg', label: 'TTRPG Campaigns', description: 'D&D, Pathfinder, etc.' },
  { id: 'original-fiction', label: 'Original Fiction', description: 'Novels, short stories' },
  { id: 'fanfiction', label: 'Fanfiction', description: 'Stories in existing universes' },
  { id: 'game-design', label: 'Game Design', description: 'Video games, board games' },
] as const;

type ProjectMode = (typeof PROJECT_MODES)[number]['id'];

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Your Archive',
    description:
      "I'm Vellum, the Archivist Moth. I'll help you track your world's canon and catch contradictions before they become plot holes.",
    icon: BookOpen,
  },
  {
    id: 'project-modes',
    title: 'What are you building?',
    description: 'Select all that apply - this helps us tailor your experience.',
    icon: Layers,
  },
  {
    id: 'documents',
    title: 'Add Your Documents',
    description:
      'Start by uploading your manuscripts, session notes, or worldbuilding documents. I can read text, markdown, and plain files.',
    icon: FileText,
  },
  {
    id: 'extraction',
    title: 'Extract Canon Facts',
    description:
      "I'll analyze your text and extract characters, locations, items, and key facts. You review and confirm what becomes official canon.",
    icon: Sparkles,
  },
  {
    id: 'browse',
    title: 'Browse Your Canon',
    description:
      "Search entities, view timelines, and explore connections between your world's elements. Everything is linked and searchable.",
    icon: Search,
  },
  {
    id: 'continuity',
    title: 'Guard Your Continuity',
    description:
      "When you add new content, I'll check it against established facts and alert you to any contradictions or timeline issues.",
    icon: Shield,
  },
];

export function OnboardingModal() {
  const navigate = useNavigate();
  const user = useQuery(api.users.viewer);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const seedTutorialProject = useMutation(api.tutorial.seedTutorialProject);
  const updateProjectModes = useMutation(api.users.updateProjectModes);

  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModes, setSelectedModes] = useState<ProjectMode[]>([]);

  const showOnboarding = user && !user.onboardingCompleted && isOpen;

  if (!showOnboarding) return null;

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  async function handleNext() {
    if (isLastStep) {
      setIsLoading(true);
      try {
        if (selectedModes.length > 0) {
          await updateProjectModes({ projectModes: selectedModes });
        }
        const { projectId } = await seedTutorialProject();
        await completeOnboarding();
        setIsOpen(false);
        void navigate({ to: '/projects/$projectId', params: { projectId } });
      } catch (error) {
        toast.error('Failed to complete onboarding', {
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }

  async function handleSkip() {
    setIsLoading(true);
    try {
      await completeOnboarding();
      setIsOpen(false);
      void navigate({ to: '/projects' });
    } catch (error) {
      toast.error('Failed to skip onboarding', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AlertDialog open>
      <AlertDialogContent className="max-w-md">
        <button
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
          aria-label="Skip onboarding"
        >
          <X className="size-4" />
        </button>

        <div className="flex justify-center gap-1.5 pb-2">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-1.5 w-8 rounded-full transition-colors',
                index === currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        <AlertDialogHeader className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
            <step.icon className="text-primary size-8" />
          </div>
          <AlertDialogTitle className="font-serif text-xl">{step.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base leading-relaxed">
            {step.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {step.id === 'project-modes' && (
          <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto py-2">
            {PROJECT_MODES.map((mode) => (
              <button
                type="button"
                key={mode.id}
                onClick={() => {
                  setSelectedModes((prev) =>
                    prev.includes(mode.id) ?
                      prev.filter((id) => id !== mode.id)
                    : [...prev, mode.id]
                  );
                }}
                className={cn(
                  'hover:bg-accent flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-all',
                  selectedModes.includes(mode.id) ? 'border-primary bg-primary/5' : 'border-border'
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
                    selectedModes.includes(mode.id) ?
                      'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/50'
                  )}
                >
                  {selectedModes.includes(mode.id) && (
                    <Check className="size-3.5" strokeWidth={3} />
                  )}
                </div>
                <div className="grid gap-0.5">
                  <span className="text-sm leading-none font-medium">{mode.label}</span>
                  <span className="text-muted-foreground text-xs">{mode.description}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleNext} className="w-full" disabled={isLoading}>
            {isLoading ?
              'Setting up...'
            : isLastStep ?
              "Let's Begin"
            : 'Next'}
            {!isLoading && <ArrowRight className="ml-2 size-4" />}
          </Button>
          {!isLastStep && (
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground text-sm disabled:opacity-50"
            >
              Skip introduction
            </button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
