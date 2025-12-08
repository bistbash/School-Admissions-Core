import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Error500Page } from './Error500Page';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error handler component that catches errors and shows error pages
 * This replaces ErrorBoundary and provides better error handling
 */
export class ErrorHandler extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorHandler caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Show error page instead of blank screen
      return <Error500Page />;
    }

    return this.props.children;
  }
}

/**
 * Hook-based error handler for functional components
 * Wraps async operations and redirects to error pages on failure
 */
export function useErrorHandler() {
  const navigate = useNavigate();

  const handleError = (error: any) => {
    console.error('Error caught:', error);
    
    // Check for specific error types
    if (error?.response?.status === 403) {
      navigate('/error/403');
    } else if (error?.response?.status === 404) {
      navigate('/error/404');
    } else if (error?.response?.status >= 500) {
      navigate('/error/500');
    } else {
      // Generic error - show 500 page
      navigate('/error/500');
    }
  };

  return { handleError };
}
