import { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Button } from '@/components/ui/button';
import { ChartLineIcon } from 'lucide-react';
import { useLocation } from 'wouter';

type AuthMode = 'login' | 'register';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [, setLocation] = useLocation();

  const handleAuthSuccess = () => {
    // Redirect to home page after successful authentication
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <ChartLineIcon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">ScaleMap</h1>
              <p className="text-sm text-muted-foreground">Growth Bottleneck Intelligence</p>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        {mode === 'login' ? (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={() => setMode('register')}
          />
        ) : (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        )}

        {/* Back to landing */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            className="text-sm text-muted-foreground"
          >
            ← Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}