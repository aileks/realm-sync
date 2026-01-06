import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import { UserPlus, Trash2, Mail, Users, Check, Clock, Loader2 } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

type ShareProjectDialogProps = {
  projectId: Id<'projects'>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ShareProjectDialog({
  projectId,
  trigger,
  open,
  onOpenChange,
}: ShareProjectDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [revokingId, setRevokingId] = useState<Id<'projectShares'> | null>(null);

  const shares = useQuery(api.projectShares.listByProject, { projectId });
  const invite = useMutation(api.projectShares.invite);
  const revoke = useMutation(api.projectShares.revoke);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsInviting(true);
    try {
      await invite({ projectId, email, role });
      toast.success(`Invited ${email} as ${role}`);
      setEmail('');
      setRole('viewer');
    } catch (error) {
      toast.error('Failed to invite user', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async (shareId: Id<'projectShares'>) => {
    setRevokingId(shareId);
    try {
      await revoke({ shareId });
      toast.success('Access revoked');
    } catch (error) {
      toast.error('Failed to revoke access', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>Invite others to collaborate on this project.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <div className="flex items-end gap-2">
              <Field className="flex-1">
                <FieldLabel>Email address</FieldLabel>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </Field>

              <Field className="w-[110px]">
                <FieldLabel>Role</FieldLabel>
                <Select value={role} onValueChange={(val) => setRole(val as 'editor' | 'viewer')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Button type="submit" disabled={isInviting || !email}>
              {isInviting ?
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Inviting...
                </>
              : <>
                  <UserPlus className="mr-2 size-4" />
                  Send Invite
                </>
              }
            </Button>
          </form>

          <div className="bg-border h-px w-full" />

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-4" />
              <h4 className="text-sm font-medium">People with access</h4>
            </div>

            {!shares ?
              <div className="text-muted-foreground flex items-center justify-center py-4 text-sm">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading shares...
              </div>
            : shares.length === 0 ?
              <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                No one else has access to this project yet.
              </div>
            : <ul className="flex flex-col gap-3">
                {shares.map((share) => (
                  <li
                    key={share._id}
                    className="flex items-center justify-between rounded-lg border p-3 shadow-sm"
                  >
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {share.sharedWithEmail}
                        </span>
                        {share.acceptedAt ?
                          <Badge
                            variant="outline"
                            className="gap-1 border-green-200 bg-green-50 px-1.5 py-0 text-[10px] text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                          >
                            <Check className="size-3" />
                            Accepted
                          </Badge>
                        : <Badge
                            variant="outline"
                            className="gap-1 border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                          >
                            <Clock className="size-3" />
                            Pending
                          </Badge>
                        }
                      </div>
                      <span className="text-muted-foreground text-xs capitalize">{share.role}</span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleRevoke(share._id)}
                      disabled={revokingId === share._id}
                      aria-label="Revoke access"
                    >
                      {revokingId === share._id ?
                        <Loader2 className="size-4 animate-spin" />
                      : <Trash2 className="size-4" />}
                    </Button>
                  </li>
                ))}
              </ul>
            }
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
