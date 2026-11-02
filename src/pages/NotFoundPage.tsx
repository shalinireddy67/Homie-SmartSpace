import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Compass, Home } from 'lucide-react';
import { APP_NAME } from '@/constants/branding';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 border border-border bg-surface shadow-xl">
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
            onClick={() => navigate('/')}
          >
            <Home className="h-4 w-4" />
            <span>Back to overview</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
export default NotFoundPage;

