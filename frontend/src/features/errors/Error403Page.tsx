import { useNavigate } from 'react-router-dom';
import { Shield, Home, ArrowRight } from 'lucide-react';
import { Button } from '../../shared/ui/Button';

export function Error403Page() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-4">
              <Shield className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <h1 className="text-6xl font-bold text-gray-200 dark:text-gray-800 mb-4">403</h1>
          <h2 className="text-3xl font-semibold text-black dark:text-white mb-3">
            אין הרשאה
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            אין לך הרשאה לגשת לדף זה. אם אתה חושב שזה שגיאה, פנה למנהל המערכת.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            חזרה לדף הבית
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה אחורה
          </Button>
        </div>
      </div>
    </div>
  );
}
