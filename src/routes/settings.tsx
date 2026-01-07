import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  MAX_AVATAR_SIZE,
  ALLOWED_AVATAR_TYPES,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from '../../convex/lib/constants';
import { CheckoutLink } from '@convex-dev/polar/react';
import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatError, cn } from '@/lib/utils';
import {
  Loader2,
  User,
  Upload,
  Trash2,
  Save,
  Mail,
  Shield,
  Check,
  Layers,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { useConvexAuth } from 'convex/react';
import { TierBadge } from '@/components/TierBadge';
import { CustomerPortalLink } from '@convex-dev/polar/react';

type SettingsTab = 'profile' | 'security' | 'subscription';

const PROJECT_MODES = [
  { id: 'ttrpg', label: 'TTRPG Campaigns', description: 'D&D, Pathfinder, etc.' },
  { id: 'original-fiction', label: 'Original Fiction', description: 'Novels, short stories' },
  { id: 'fanfiction', label: 'Fanfiction', description: 'Stories in existing universes' },
  { id: 'game-design', label: 'Game Design', description: 'Video games, board games' },
] as const;

type ProjectMode = (typeof PROJECT_MODES)[number]['id'];

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const navigate = useNavigate();
  const user = useQuery(api.users.viewerProfile);
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    return (tabParam as SettingsTab) || 'profile';
  });

  function handleTabChange(tab: SettingsTab) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  }

  if (isAuthLoading) {
    return null;
  }

  if (!isAuthenticated) {
    void navigate({ to: '/' });
    return null;
  }

  if (!user) {
    return null;
  }

  const tabs: {
    id: SettingsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
  ];

  return (
    <div className="animate-in fade-in container mx-auto space-y-8 p-6 duration-500">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id ?
                'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileTab user={user} />}
      {activeTab === 'security' && <SecurityTab user={user} />}
      {activeTab === 'subscription' && <SubscriptionTab />}
    </div>
  );
}

function ProfileTab({ user }: { user: NonNullable<typeof api.users.viewerProfile._returnType> }) {
  return (
    <div className="grid items-stretch gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your profile details and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <AvatarSection user={user} />
          <div className="border-border border-t pt-6">
            <ProfileFieldsSection user={user} />
          </div>
        </CardContent>
      </Card>
      <ProjectModesSection user={user} />
    </div>
  );
}

function AvatarSection({
  user,
}: {
  user: NonNullable<typeof api.users.viewerProfile._returnType>;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const updateAvatar = useMutation(api.users.updateAvatar);
  const removeAvatar = useMutation(api.users.removeAvatar);

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsLoading(true);

    try {
      if (file.size > MAX_AVATAR_SIZE) {
        throw new Error('File size exceeds 5MB limit.');
      }

      if (!ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number])) {
        throw new Error('Invalid file type. Please use JPG, PNG, or WebP.');
      }

      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error('Failed to upload image.');
      }

      const { storageId } = await result.json();

      await updateAvatar({ storageId });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!user.avatarStorageId) return;

    setError(null);
    setIsLoading(true);

    try {
      await removeAvatar();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Label>Avatar</Label>
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
      )}

      <div className="flex items-center gap-6">
        <div className="border-border bg-muted relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border">
          {user.avatarUrl ?
            <img
              src={user.avatarUrl}
              alt={user.name ?? 'User'}
              className="aspect-square h-full w-full object-cover"
            />
          : user.name ?
            <div className="text-muted-foreground flex h-full w-full items-center justify-center text-3xl font-medium">
              {user.name
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .filter((c) => /[a-zA-Z]/.test(c))
                .join('')
                .slice(0, 2)
                .toUpperCase() || '?'}
            </div>
          : <User className="text-muted-foreground size-12" />}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              {isLoading ?
                <Loader2 className="mr-2 size-4 animate-spin" />
              : <Upload className="mr-2 size-4" />}
              Upload New
            </Button>
            <Input
              type="file"
              className="hidden"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              disabled={isLoading}
            />

            {user.avatarStorageId && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={isLoading}
              >
                <Trash2 className="mr-2 size-4" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            Recommended: Square JPG, PNG, or WebP, at least 400x400px. Max 5MB.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileFieldsSection({
  user,
}: {
  user: NonNullable<typeof api.users.viewerProfile._returnType>;
}) {
  const [name, setName] = useState(user.name ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateProfile = useMutation(api.users.updateProfile);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      const trimmedName = name.trim();
      const trimmedBio = bio.trim();
      const originalName = user.name ?? '';
      const originalBio = user.bio ?? '';

      const hasNameChange = trimmedName !== originalName;
      const hasBioChange = trimmedBio !== originalBio;

      if (!hasNameChange && !hasBioChange) {
        setIsLoading(false);
        return;
      }

      await updateProfile({
        name: hasNameChange ? trimmedName : undefined,
        bio: hasBioChange ? trimmedBio : undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg p-3 text-sm">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
          <span className="font-bold">Success:</span> Profile updated successfully.
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Display Name</Label>
        <Input
          id="name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={1}
          maxLength={80}
          disabled={isLoading}
        />
        <div className="text-muted-foreground text-right text-xs">{name.length}/80</div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Tell us a little about yourself"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          className="min-h-[100px] resize-none"
          disabled={isLoading}
        />
        <div className="text-muted-foreground text-right text-xs">{bio.length}/500</div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ?
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          : <>
              <Save className="mr-2 size-4" />
              Save Changes
            </>
          }
        </Button>
      </div>
    </form>
  );
}

function SecurityTab({ user }: { user: NonNullable<typeof api.users.viewerProfile._returnType> }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <EmailChangeCard user={user} />
      <PasswordChangeCard />
    </div>
  );
}

function ProjectModesSection({
  user,
}: {
  user: NonNullable<typeof api.users.viewerProfile._returnType>;
}) {
  const currentModes = user.settings?.projectModes ?? [];
  const [selectedModes, setSelectedModes] = useState<ProjectMode[]>(currentModes);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateProjectModes = useMutation(api.users.updateProjectModes);

  const hasChanges =
    selectedModes.length !== currentModes.length ||
    selectedModes.some((m) => !currentModes.includes(m));

  async function handleSave() {
    setIsLoading(true);
    try {
      await updateProjectModes({ projectModes: selectedModes });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="size-4" />
          Project Categories
        </CardTitle>
        <CardDescription>What types of projects are you working on?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-2 text-sm text-green-600">
            Preferences saved.
          </div>
        )}

        <div className="grid gap-2">
          {PROJECT_MODES.map((mode) => (
            <button
              type="button"
              key={mode.id}
              onClick={() => {
                setSelectedModes((prev) =>
                  prev.includes(mode.id) ? prev.filter((id) => id !== mode.id) : [...prev, mode.id]
                );
              }}
              className={cn(
                'hover:bg-predicate/20 flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-all',
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
                {selectedModes.includes(mode.id) && <Check className="size-3.5" strokeWidth={3} />}
              </div>
              <div className="grid gap-0.5">
                <span className="text-sm leading-none font-medium">{mode.label}</span>
                <span className="text-muted-foreground text-xs">{mode.description}</span>
              </div>
            </button>
          ))}
        </div>

        {hasChanges && (
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={isLoading}>
              {isLoading ?
                <Loader2 className="mr-2 size-4 animate-spin" />
              : <Save className="mr-2 size-4" />}
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmailChangeCard({
  user,
}: {
  user: NonNullable<typeof api.users.viewerProfile._returnType>;
}) {
  const [newEmail, setNewEmail] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateEmail = useAction(api.users.updateEmail);

  function handleRequestChange(e: FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setShowConfirmDialog(true);
  }

  async function handleConfirm() {
    setError(null);
    setSuccess(false);
    setIsLoading(true);
    setShowConfirmDialog(false);

    try {
      await updateEmail({ newEmail: newEmail.trim() });
      setSuccess(true);
      setNewEmail('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5" />
            Email Address
          </CardTitle>
          <CardDescription>Change the email address associated with your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestChange} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg p-3 text-sm">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
                <span className="font-bold">Success:</span> Email updated successfully.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentEmail">Current Email</Label>
              <Input
                id="currentEmail"
                type="email"
                value={user.email ?? ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="new@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || !newEmail.trim()}>
                {isLoading ?
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Requesting...
                  </>
                : 'Request Change'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Email Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update your email to{' '}
              <strong className="text-foreground">{newEmail}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PasswordChangeCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changePassword = useAction(api.users.changePassword);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      await changePassword({
        currentPassword,
        newPassword,
      });

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5" />
          Password
        </CardTitle>
        <CardDescription>Ensure your account is secure with a strong password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg p-3 text-sm">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
              <span className="font-bold">Success:</span> Password changed successfully.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={MAX_PASSWORD_LENGTH}
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || !currentPassword || !newPassword}>
              {isLoading ?
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Updating...
                </>
              : 'Update Password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SubscriptionTab() {
  const subscription = useQuery(api.users.getSubscription);
  const startTrial = useMutation(api.users.startTrial);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (subscription === undefined) {
    return (
      <div className="text-muted-foreground p-8 text-center">Loading subscription details...</div>
    );
  }

  if (subscription === null) {
    return (
      <div className="text-muted-foreground p-8 text-center">
        Please sign in to view subscription details.
      </div>
    );
  }

  async function handleStartTrial() {
    setIsLoading(true);
    setError(null);
    try {
      await startTrial();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  }

  const isFree = subscription.tier === 'free';
  const isUnlimited = subscription.tier === 'unlimited';
  const isTrial = subscription.status === 'trialing';

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="size-5" />
                  Subscription
                </CardTitle>
                <CardDescription>Manage your plan and billing.</CardDescription>
              </div>
              <TierBadge tier={subscription.tier} className="px-3 py-1 text-sm" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isTrial && (
              <div className="bg-primary/10 text-primary border-primary/20 rounded-lg border p-4">
                <div className="flex items-center gap-2 font-medium">
                  <Sparkles className="size-4" />
                  Free Trial Active
                </div>
                <p className="mt-1 text-sm opacity-90">
                  Your trial ends on {new Date(subscription.trialEndsAt!).toLocaleDateString()}.
                  Upgrade now to keep access to premium features.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-muted-foreground text-sm font-medium">Usage this month</h3>
                <span className="text-muted-foreground text-xs">
                  Resets {new Date(subscription.usage.resetAt).toLocaleDateString()}
                </span>
              </div>

              <UsageBar
                label="Projects"
                current={subscription.usage.projects.current}
                limit={subscription.usage.projects.limit}
              />
              <UsageBar
                label="AI Extractions"
                current={subscription.usage.llmExtractions.current}
                limit={subscription.usage.llmExtractions.limit}
              />
              <UsageBar
                label="Chat Messages"
                current={subscription.usage.chatMessages.current}
                limit={subscription.usage.chatMessages.limit}
              />
            </div>

            <div className="border-border flex flex-col gap-3 border-t pt-4">
              {isFree && !subscription.trialExpired && !subscription.trialActive && (
                <Button
                  onClick={handleStartTrial}
                  disabled={isLoading}
                  size="lg"
                  className="w-full"
                >
                  {isLoading ?
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  : <Sparkles className="mr-2 size-4" />}
                  Start 7-Day Free Trial
                </Button>
              )}

              {isFree && (
                <CheckoutLink
                  polarApi={{
                    generateCheckoutLink: api.polar.generateCheckoutLink,
                  }}
                  productIds={['realmUnlimited']}
                  embed={false}
                  className={cn(
                    buttonVariants({
                      variant: subscription.trialExpired ? 'default' : 'outline',
                      size: 'lg',
                    }),
                    'w-full'
                  )}
                >
                  {subscription.trialExpired ? 'Upgrade to Realm Unlimited' : 'Upgrade Plan'}
                </CheckoutLink>
              )}

              {isTrial && (
                <>
                  <CheckoutLink
                    polarApi={{
                      generateCheckoutLink: api.polar.generateCheckoutLink,
                    }}
                    productIds={['realmUnlimited']}
                    embed={false}
                    className={cn(
                      buttonVariants({
                        variant: 'default',
                        size: 'lg',
                      }),
                      'w-full'
                    )}
                  >
                    Upgrade to Full Access
                  </CheckoutLink>

                  <CustomerPortalLink
                    polarApi={{
                      generateCustomerPortalUrl: api.polar.generateCustomerPortalUrl,
                    }}
                    className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
                  >
                    Manage Subscription
                  </CustomerPortalLink>
                </>
              )}

              {isUnlimited && !isTrial && (
                <CustomerPortalLink
                  polarApi={{
                    generateCustomerPortalUrl: api.polar.generateCustomerPortalUrl,
                  }}
                  className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
                >
                  Manage Subscription
                </CustomerPortalLink>
              )}
            </div>

            {error && <div className="text-destructive text-center text-sm">{error}</div>}
          </CardContent>
        </Card>
      </div>

      {isFree && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-primary size-5" />
              Why Upgrade?
            </CardTitle>
            <CardDescription>Unlock the full potential of your creative process.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {[
                'Unlimited projects & documents',
                'Unlimited AI extractions',
                'Unlimited chat messages',
                'Priority support',
                'Early access to new features',
              ].map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-sm">
                  <div className="bg-primary/10 text-primary mt-0.5 rounded-full p-0.5">
                    <Check className="size-3" />
                  </div>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number }) {
  const percentage = Math.min(100, Math.max(0, (current / limit) * 100));
  const isUnlimited = limit === Infinity;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground font-mono text-xs">
          {current} / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn(
            'bg-primary h-full transition-all duration-500',
            !isUnlimited && current >= limit && 'bg-destructive'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
