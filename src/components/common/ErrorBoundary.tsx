import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { APP_NAME } from '@/constants/branding';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center space-y-6 border border-danger/30 rounded-3xl bg-surface shadow-soft">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/25 flex items-center justify-center text-danger">
                <AlertOctagon className="w-8 h-8" aria-hidden="true" />
              </div>
            </div>

            <div className="space-y-2">
              <Badge variant="danger" size="sm">
                System Error
              </Badge>
              <h2 className="text-xl font-bold tracking-tight text-text">Something went wrong</h2>
              <p className="text-xs text-text-muted leading-relaxed">
                An unexpected client error occurred in {APP_NAME}. Your simulated state remains safely stored in local memory.
              </p>
            </div>

            {this.state.error && (
              <pre className="p-3 bg-surface-subtle border border-border-subtle rounded-xl text-[11px] font-mono text-danger text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </pre>
            )}

            <div className="pt-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full"
                onClick={this.handleReload}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Reload application</span>
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;

