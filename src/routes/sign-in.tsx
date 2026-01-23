import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth } from 'convex/react';
import { useState, useEffect } from 'react';
import { Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signInSchema, classifyAuthError, getAuthErrorMessage } from '@/lib/auth';
import { DEMO_EMAIL } from '@/lib/demo';

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signIn } = useAuthActions();

  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = async () => {
    setError(null);
    setIsDemoLoading(true);

    try {
      const formData = new FormData();
      formData.set('email', DEMO_EMAIL);
      formData.set('password', 'khn_tfz2fxk4KAZ-dfa');
      formData.set('flow', 'signIn');

      await signIn('password', formData);
    } catch (err) {
      setError(getAuthErrorMessage(classifyAuthError(err), 'signin'));
    } finally {
      setIsDemoLoading(false);
    }
  };

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setIsLoading(true);

      try {
        const result = signInSchema.safeParse(value);

        if (!result.success) {
          setError(result.error.issues[0].message);
          setIsLoading(false);
          return;
        }

        const formData = new FormData();
        formData.set('email', value.email);
        formData.set('password', value.password);
        formData.set('flow', 'signIn');

        await signIn('password', formData);
      } catch (err) {
        setError(getAuthErrorMessage(classifyAuthError(err), 'signin'));
      } finally {
        setIsLoading(false);
      }
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      void navigate({ to: '/projects' });
    }
  }, [isAuthenticated, navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
            <BookOpen className="text-primary size-6" />
          </div>
          <CardTitle className="font-serif text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to continue to Realm Sync</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field name="email">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={isLoading}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={isLoading}
                  />
                </div>
              )}
            </form.Field>

            <Button type="submit" className="w-full" disabled={isLoading || isDemoLoading}>
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card text-muted-foreground px-2">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isLoading || isDemoLoading}
            onClick={handleDemoLogin}
          >
            {isDemoLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Try Demo Account
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to={'/sign-up' as string} className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
