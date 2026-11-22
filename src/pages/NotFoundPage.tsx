import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Compass, Home } from 'lucide-react';
import { APP_NAME } from '@/constants/branding';
import { hasActiveSession } from '@/services/session';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const hasSession = hasActiveSession();
  const targetRoute = hasSession ? '/app' : '/';
  const buttonLabel = hasSession ? 'Back to dashboard' : 'Back to overview';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 border border-border-subtle rounded-3xl bg-surface shadow-soft">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Compass className="w-8 h-8 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <Badge variant="outline" size="sm">
            404 Error
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-text">Page Not Found</h1>
          <p className="text-xs text-text-muted leading-relaxed">
            The view you requested does not exist in {APP_NAME} or may have moved.
          </p>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => navigate(targetRoute)}
          >
            <Home className="h-4 w-4" />
            <span>{buttonLabel}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
export default NotFoundPage;
