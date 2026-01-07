import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useConvexAuth } from 'convex/react';
import { useEffect } from 'react';
import { Sparkles, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/LoadingState';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void navigate({ to: '/projects' });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return <LoadingState message="Loading..." />;
  }

  return (
    <div className="vignette min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <img src="/logo.png" alt="Realm Sync" className="mx-auto size-32 rounded-full" />

          <h1 className="font-serif text-5xl font-bold tracking-tight">Realm Sync</h1>

          <p className="text-muted-foreground mt-4 text-xl">
            Your world-building companion. Track canon, catch contradictions, and keep your
            fictional universe consistent.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" onClick={() => navigate({ to: '/sign-up' })}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate({ to: '/sign-in' })}>
              Sign In
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-24 grid max-w-4xl gap-8 md:grid-cols-3">
          <FeatureCard
            icon={Sparkles}
            title="Smart Extraction"
            description="Automatically identify characters, locations, and key facts from your documents."
          />
          <FeatureCard
            icon={Shield}
            title="Continuity Guard"
            description="Catch contradictions and timeline issues before they become plot holes."
          />
          <FeatureCard
            icon={Zap}
            title="Real-time Sync"
            description="Changes propagate instantly. Your canon is always up to date."
          />
        </div>

        <div className="mt-24 text-center">
          <p className="text-muted-foreground font-mono text-sm">
            Vellum, the Archivist Moth, guides the archive
          </p>
        </div>
      </div>
    </div>
  );
}

type FeatureCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
};

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-card ring-foreground/10 rounded-2xl p-6 text-center ring-1">
      <div className="bg-primary/10 mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
        <Icon className="text-primary size-6" />
      </div>
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2 text-sm">{description}</p>
    </div>
  );
}
