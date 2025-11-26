import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Lock, Home, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';

function ErrorPage({ type }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine error type from props or location state
  const errorType = type || location.state?.type || 'not-found';

  const errorConfigs = {
    'not-found': {
      icon: AlertTriangle,
      title: 'Page Not Found',
      message: 'The page you are looking for does not exist or has been moved.',
      subMessage: 'Please check the URL or navigate back to a safe area.',
      color: 'amber',
      showBackButton: true,
      showHomeButton: true
    },
    'access-denied': {
      icon: Lock,
      title: 'Access Denied',
      message: 'You do not have permission to access this resource.',
      subMessage: 'This area is restricted to administrators only. Please contact your system administrator if you believe this is an error.',
      color: 'red',
      showBackButton: true,
      showHomeButton: true
    },
    'server-error': {
      icon: AlertTriangle,
      title: 'Server Error',
      message: 'An unexpected error occurred on our servers.',
      subMessage: 'Please try again later or contact support if the problem persists.',
      color: 'red',
      showBackButton: true,
      showHomeButton: true
    },
    'maintenance': {
      icon: AlertTriangle,
      title: 'Under Maintenance',
      message: 'The system is currently undergoing maintenance.',
      subMessage: 'We apologize for the inconvenience. Please check back later.',
      color: 'blue',
      showBackButton: false,
      showHomeButton: false
    }
  };

  const config = errorConfigs[errorType] || errorConfigs['not-found'];
  const Icon = config.icon;

  const getColorClasses = (color) => {
    const colors = {
      amber: {
        bg: 'from-amber-50 to-amber-100',
        border: 'border-amber-200',
        icon: 'bg-amber-600',
        text: 'text-amber-900'
      },
      red: {
        bg: 'from-red-50 to-red-100',
        border: 'border-red-200',
        icon: 'bg-red-600',
        text: 'text-red-900'
      },
      blue: {
        bg: 'from-blue-50 to-blue-100',
        border: 'border-blue-200',
        icon: 'bg-blue-600',
        text: 'text-blue-900'
      }
    };
    return colors[color];
  };

  const colorClasses = getColorClasses(config.color);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className={`text-center bg-gradient-to-r ${colorClasses.bg} ${colorClasses.border}`}>
          <div className="mb-6">
            <div className={`inline-flex p-4 ${colorClasses.icon} rounded-2xl mb-6`}>
              <Icon className="h-12 w-12 text-white" />
            </div>
            
            <h1 className={`text-3xl font-bold ${colorClasses.text} mb-4`}>
              {config.title}
            </h1>
            
            <p className="text-slate-700 text-lg mb-4">
              {config.message}
            </p>
            
            <p className="text-slate-600 text-sm">
              {config.subMessage}
            </p>
          </div>

          {(config.showBackButton || config.showHomeButton) && (
            <div className="space-y-4">
              {config.showBackButton && (
                <Button
                  onClick={handleGoBack}
                  className="w-full flex items-center justify-center space-x-2"
                  variant="primary"
                >
                  <ArrowLeft size={18} />
                  <span>Go Back</span>
                </Button>
              )}
              
              {config.showHomeButton && (
                <Button
                  onClick={handleGoHome}
                  variant="secondary"
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <Home size={18} />
                  <span>Go to Dashboard</span>
                </Button>
              )}
            </div>
          )}

          {errorType === 'not-found' && (
            <div className="mt-6 p-4 bg-slate-100 rounded-lg">
              <p className="text-sm text-slate-600">
                <strong>Error Code:</strong> 404<br />
                <strong>Requested URL:</strong> {location.pathname}
              </p>
            </div>
          )}

          {errorType === 'access-denied' && (
            <div className="mt-6 p-4 bg-slate-100 rounded-lg">
              <p className="text-sm text-slate-600">
                <strong>Error Code:</strong> 403<br />
                <strong>Required Role:</strong> Administrator
              </p>
            </div>
          )}
        </Card>

        {/* Additional Help Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 mb-2">
            Need help? Contact our support team:
          </p>
          <div className="space-y-1 text-sm text-slate-600">
            <div>📧 support@securevault.com</div>
            <div>📞 1-800-VAULT-SEC</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorPage;