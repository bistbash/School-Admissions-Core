import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '../../shared/ui/Button';

export function Error500Page() {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
              <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <h1 className="text-6xl font-bold text-gray-200 dark:text-gray-800 mb-4">500</h1>
          <h2 className="text-3xl font-semibold text-black dark:text-white mb-3">
            שגיאת שרת
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            אירעה שגיאה בשרת. אנא נסה שוב מאוחר יותר או פנה לתמיכה.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            רענון הדף
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            חזרה לדף הבית
          </Button>
        </div>
      </div>
    </div>
  );
}
