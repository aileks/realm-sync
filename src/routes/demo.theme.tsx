import * as React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  User,
  MapPin,
  Package,
  Lightbulb,
  Calendar,
  Search,
  Sparkles,
  Shield,
  Pencil,
  Trash2,
} from 'lucide-react';

export const Route = createFileRoute('/demo/theme')({
  component: ThemeDemo,
});

type Theme = 'ashen-tome' | 'twilight-study' | 'amber-archive';

function ThemeDemo() {
  const [theme, setTheme] = React.useState<Theme>('ashen-tome');

  React.useEffect(() => {
    if (theme === 'ashen-tome') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return (
    <div className="bg-background text-foreground relative min-h-screen p-8 pb-20 transition-colors duration-500">
      <div className="vignette pointer-events-none fixed inset-0 z-0" />
      <div className="paper-grain pointer-events-none fixed inset-0 z-0 opacity-50" />

      <div className="relative z-10 mx-auto max-w-5xl space-y-12">
        <header className="border-border flex flex-col items-start justify-between gap-6 border-b pb-8 md:flex-row md:items-center">
          <div>
            <h1 className="text-foreground glow-text font-serif text-4xl font-bold tracking-tight">
              Realm Sync
            </h1>
            <p className="text-muted-foreground mt-2 font-serif text-lg italic">
              Design System Showcase
            </p>
          </div>

          <div className="bg-card border-border flex rounded-lg border p-1 shadow-sm">
            {(['ashen-tome', 'twilight-study', 'amber-archive'] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium capitalize transition-all duration-300',
                  theme === t ?
                    'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {t.replace('-', ' ')}
              </button>
            ))}
          </div>
        </header>

        <section className="grid grid-cols-1 items-center gap-8 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            <h2 className="border-primary border-l-4 pl-4 font-serif text-2xl font-semibold">
              Vellum, The Archivist
            </h2>
            <p className="text-muted-foreground max-w-prose text-lg leading-relaxed">
              Every story leaves traces in the dark. I collect them. Names whispered between pages,
              places that exist only in memory, artifacts lost to time. The archive never forgets.
              Neither do I.
            </p>
          </div>
          <div className="bg-card/50 border-primary/30 group relative flex h-40 items-center justify-center overflow-hidden rounded-xl border border-dashed">
            <div className="bg-primary/5 absolute inset-0 scale-50 rounded-full blur-3xl transition-transform duration-1000 group-hover:scale-75" />
            <div className="animate-pulse text-6xl drop-shadow-[0_0_15px_var(--color-primary)] filter">
              🦋
            </div>
            <div className="text-primary/70 absolute bottom-3 font-mono text-xs tracking-widest uppercase">
              Archivist Moth
            </div>
          </div>
        </section>

        <Separator className="bg-border/50" />

        <section className="space-y-6">
          <h3 className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
            Typography
          </h3>
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            <div className="space-y-4">
              <h1 className="font-serif text-4xl">Heading 1: The Quick Brown Fox</h1>
              <h2 className="font-serif text-3xl">Heading 2: Jumps Over The Lazy Dog</h2>
              <h3 className="font-serif text-2xl">Heading 3: A Cozy Nook In The Archive</h3>
              <h4 className="font-serif text-xl">Heading 4: Dusty Tomes & Ancient Scrolls</h4>
            </div>
            <div className="space-y-4">
              <p className="leading-7">
                <span className="text-foreground font-bold">Body Text (DM Sans):</span> The
                archivist moved silently through the rows of towering shelves. Dust motes danced in
                the shaft of amber light that pierced the gloom. Each book held a universe, waiting
                to be rediscovered.{' '}
                <span className="italic">This is a world of secrets and stories.</span>
              </p>
              <div className="bg-muted border-border rounded-md border p-4">
                <code className="text-primary block font-mono text-sm">
                  function summonVellum() {'{'}
                  <br />
                  &nbsp;&nbsp;return "🦋 Ready to assist";
                  <br />
                  {'}'}
                </code>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
            Color Palette
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <ColorSwatch
              name="Background"
              color="bg-background"
              text="text-foreground"
              hex="Base"
            />
            <ColorSwatch name="Card" color="bg-card" text="text-card-foreground" hex="Surface" />
            <ColorSwatch
              name="Primary"
              color="bg-primary"
              text="text-primary-foreground"
              hex="Brand"
            />
            <ColorSwatch
              name="Secondary"
              color="bg-secondary"
              text="text-secondary-foreground"
              hex="Brand"
            />
            <ColorSwatch
              name="Accent"
              color="bg-accent"
              text="text-accent-foreground"
              hex="Brand"
            />
            <ColorSwatch name="Muted" color="bg-muted" text="text-muted-foreground" hex="UI" />
            <ColorSwatch
              name="Destructive"
              color="bg-destructive"
              text="text-destructive-foreground"
              hex="Status"
            />
            <ColorSwatch name="Border" color="bg-border" text="text-muted-foreground" hex="UI" />
            <ColorSwatch name="Input" color="bg-input" text="text-muted-foreground" hex="UI" />
            <ColorSwatch name="Ring" color="bg-ring" text="text-white" hex="UI" />
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
            Entity Types
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
            <EntityCard
              icon={User}
              name="Character"
              color="bg-entity-character"
              border="border-entity-character"
            />
            <EntityCard
              icon={MapPin}
              name="Location"
              color="bg-entity-location"
              border="border-entity-location"
            />
            <EntityCard
              icon={Package}
              name="Item"
              color="bg-entity-item"
              border="border-entity-item"
            />
            <EntityCard
              icon={Lightbulb}
              name="Concept"
              color="bg-entity-concept"
              border="border-entity-concept"
            />
            <EntityCard
              icon={Calendar}
              name="Event"
              color="bg-entity-event"
              border="border-entity-event"
            />
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
            Component Library
          </h3>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-serif">Interactive Elements</CardTitle>
                <CardDescription>Buttons, inputs, and controls.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-4">
                  <Button variant="default">Primary Action</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" placeholder="archivist@realm.sync" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border group hover:border-primary/50 relative overflow-hidden transition-all hover:shadow-lg">
              <div className="bg-entity-item absolute top-0 left-0 h-full w-1" />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-entity-item text-foreground bg-entity-item/10 hover:bg-entity-item/20"
                      >
                        <Package className="mr-1 h-3 w-3" /> Item
                      </Badge>
                      <span className="text-muted-foreground font-mono text-xs">ID: A-942</span>
                    </div>
                    <CardTitle className="pt-2 font-serif text-2xl">Obsidian Quill</CardTitle>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-primary h-8 w-8"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  An ancient writing instrument that never runs out of ink. Found in the Shadow
                  Library.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    <span>Verified</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Search className="h-4 w-4" />
                    <span>3 References</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-border mt-auto border-t">
                <div className="text-muted-foreground flex w-full justify-between font-mono text-xs">
                  <span>Last edited: 2 days ago</span>
                  <span className="flex items-center gap-2">
                    <Pencil className="hover:text-foreground h-3 w-3 cursor-pointer" />
                    <Trash2 className="hover:text-destructive h-3 w-3 cursor-pointer" />
                  </span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

function ColorSwatch({
  name,
  color,
  text,
  hex,
}: {
  name: string;
  color: string;
  text: string;
  hex: string;
}) {
  return (
    <div
      className={cn(
        'border-border flex h-24 flex-col justify-between rounded-lg border p-4 shadow-sm',
        color,
        text
      )}
    >
      <span className="font-medium">{name}</span>
      <span className="font-mono text-xs opacity-80">{hex}</span>
    </div>
  );
}

function EntityCard({
  icon: Icon,
  name,
  color,
  border,
}: {
  icon: React.ElementType;
  name: string;
  color: string;
  border: string;
}) {
  return (
    <div
      className={cn(
        'bg-card/50 hover:bg-card flex items-center gap-3 rounded-lg border p-4 transition-colors',
        border
      )}
    >
      <div
        className={cn(
          'text-background flex h-10 w-10 items-center justify-center rounded-full',
          color
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-serif font-medium">{name}</span>
    </div>
  );
}
