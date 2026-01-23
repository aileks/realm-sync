import { Component, type ErrorInfo, type ReactNode } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/errors';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: unknown;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex w-full flex-1 items-center justify-center p-8">
          <EmptyState
            title="Something went wrong"
            description={getErrorMessage(this.state.error)}
            action={
              <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
                Reload page
              </Button>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}
