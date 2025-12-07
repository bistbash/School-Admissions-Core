import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { apiClient } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/login', { email, password });
      login(response.data.token, response.data.user);
      
      if (response.data.user.needsProfileCompletion) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בהתחברות');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#171717] px-4 py-12">
      <div className="w-full max-w-md space-y-8 animate-in">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-black dark:bg-[#FAFAFA] mb-4">
            <Sparkles className="h-6 w-6 text-white dark:text-[#171717]" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-black dark:text-white">
            מערכת בית ספר
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            התחבר לחשבון שלך כדי להמשיך
          </p>
        </div>

        <Card variant="default" className="animate-slide-up">
          <CardHeader className="space-y-1">
            <CardTitle>התחברות</CardTitle>
            <CardDescription>
              הכנס את פרטי ההתחברות שלך
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-in">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <Input
                type="email"
                label="כתובת אימייל"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                autoComplete="email"
                className="transition-all duration-200"
              />

              <Input
                type="password"
                label="סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="current-password"
                className="transition-all duration-200"
              />

              <Button
                type="submit"
                className="w-full mt-6"
                isLoading={isLoading}
                disabled={isLoading}
              >
                <LogIn className="h-4 w-4" />
                התחבר
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          מערכת ניהול בית ספר © 2024
        </p>
      </div>
    </div>
  );
}
