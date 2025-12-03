import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon/Icon';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  hideNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000,
    };

    setNotifications(prev => [...prev, newNotification]);

    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-green-500 font-bold">OK</div>;
      case 'error':
        return <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-red-500 font-bold">X</div>;
      case 'warning':
        return <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-yellow-500 font-bold">!</div>;
      case 'info':
        return <Icon name="notification" className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getTypeStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 border-green-400 text-white';
      case 'error':
        return 'bg-red-500 border-red-400 text-white';
      case 'warning':
        return 'bg-yellow-500 border-yellow-400 text-white';
      case 'info':
        return 'bg-blue-500 border-blue-400 text-white';
      default:
        return 'bg-gray-500 border-gray-400 text-white';
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, addNotification: showNotification, hideNotification }}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification ${getTypeStyles(notification.type)} p-4 rounded-lg border shadow-lg transform transition-all duration-300 ease-in-out`}
              style={{
                animation: 'slideInRight 0.3s ease-out',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1">
                    {notification.title}
                  </h4>
                  {notification.message && (
                    <p className="text-sm opacity-90">
                      {notification.message}
                    </p>
                  )}
                  {notification.action && (
                    <button
                      onClick={notification.action.onClick}
                      className="mt-2 text-sm underline hover:no-underline transition-all"
                    >
                      {notification.action.label}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => hideNotification(notification.id)}
                  className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-xs">✕</div>
                </button>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </NotificationContext.Provider>
  );
};

export default function NotificationSystem() {
  // Можно реализовать иконку уведомлений или кнопку, если нужно
  return null;
} 