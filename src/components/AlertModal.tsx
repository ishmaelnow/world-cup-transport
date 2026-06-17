import { Button } from './Button';
import { Card } from './Card';
import { AlertCircle } from 'lucide-react';

interface AlertModalProps {
  message: string;
  onClose: () => void;
  title?: string;
  variant?: 'error' | 'success' | 'warning' | 'info';
}

export function AlertModal({ message, onClose, title, variant = 'error' }: AlertModalProps) {
  const variantStyles = {
    error: {
      icon: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      titleColor: 'text-red-900',
    },
    success: {
      icon: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      titleColor: 'text-green-900',
    },
    warning: {
      icon: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      titleColor: 'text-yellow-900',
    },
    info: {
      icon: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      titleColor: 'text-blue-900',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className={`max-w-md w-full ${styles.bg} ${styles.border} border-2`}>
        <div className="flex items-start space-x-3">
          <AlertCircle className={`${styles.icon} mt-0.5 flex-shrink-0`} size={24} />
          <div className="flex-1">
            {title && (
              <h3 className={`text-lg font-semibold ${styles.titleColor} mb-2`}>
                {title}
              </h3>
            )}
            <p className="text-gray-700 mb-4">{message}</p>
            <Button onClick={onClose} variant="primary" fullWidth>
              OK
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

