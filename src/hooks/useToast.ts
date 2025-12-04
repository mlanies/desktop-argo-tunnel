import toast from 'react-hot-toast';

export const useToast = () => {
  return {
    success: (message: string) => {
      toast.success(message, {
        duration: 3000,
        position: 'top-right',
        style: {
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          backdropFilter: 'blur(10px)',
        },
      });
    },
    error: (message: string) => {
      toast.error(message, {
        duration: 4000,
        position: 'top-right',
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          backdropFilter: 'blur(10px)',
        },
      });
    },
    info: (message: string) => {
      toast(message, {
        duration: 3000,
        position: 'top-right',
        icon: 'ℹ️',
        style: {
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: '#3b82f6',
          backdropFilter: 'blur(10px)',
        },
      });
    },
  };
};
