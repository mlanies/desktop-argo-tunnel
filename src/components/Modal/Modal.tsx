import React, { useId } from 'react';
import classNames from 'classnames';
import { FocusTrap } from '../FocusTrap';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  className 
}: ModalProps) {
  const titleId = useId();
  
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <FocusTrap active={isOpen} onEscape={onClose}>
        <div 
          className={classNames(
            'bg-gray-800 rounded-lg shadow-xl mx-4',
            sizeClasses[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header только если есть title */}
          {title && (
            <div className="relative flex items-center justify-center p-4 border-b border-gray-700">
              <h3 id={titleId} className="text-lg font-bold text-white w-full text-center">{title}</h3>
              <button
                onClick={onClose}
                className="absolute top-2 right-2 text-gray-400 hover:text-white text-lg"
                aria-label="Закрыть модальное окно"
              >
                ×
              </button>
            </div>
          )}
          {/* Content */}
          <div className="p-4">
            {children}
          </div>
        </div>
      </FocusTrap>
    </div>
  );
} 