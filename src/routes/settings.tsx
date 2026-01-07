import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatError } from '@/lib/utils';
import { Loader2, User, Upload, Trash2, Save } from 'lucide-react';
import { useConvexAuth } from 'convex/react';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const navigate = useNavigate();
  const user = useQuery(api.users.viewerProfile);

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

  return (
    <div className="animate-in fade-in mx-auto max-w-2xl space-y-8 p-6 duration-500">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="space-y-6">
        <ProfileFieldsForm user={user} />
        <AvatarPicker user={user} />
        <PasswordChangeForm />
      </div>
    </div>
  );
}

function ProfileFieldsForm({
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
      await updateProfile({
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
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
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your public profile details.</CardDescription>
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
      </CardContent>
    </Card>
  );
}

function AvatarPicker({ user }: { user: NonNullable<typeof api.users.viewerProfile._returnType> }) {
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
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds 5MB limit.');
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
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
    <Card>
      <CardHeader>
        <CardTitle>Avatar</CardTitle>
        <CardDescription>Upload a profile picture or remove the current one.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 text-destructive mb-4 rounded-lg p-3 text-sm">
            {error}
          </div>
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
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
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
      </CardContent>
    </Card>
  );
}

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changePassword = useMutation(api.users.changePassword);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long.');
      }

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
        <CardTitle>Change Password</CardTitle>
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

          <div className="grid gap-4 md:grid-cols-2">
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
                minLength={8}
                maxLength={128}
                disabled={isLoading}
              />
            </div>
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
