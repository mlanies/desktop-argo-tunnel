import classNames from "classnames";
import "./Toggle.css";

interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  label?: string;
  description?: string;
}

export default function Toggle({
  className: propsClassName,
  checked,
  onChange,
  disabled = false,
  size = 'md',
  variant = 'default',
  label,
  description,
  ...props
}: ToggleProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(event.target.checked);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-11 h-6',
    lg: 'w-14 h-7',
  };

  const variantClasses = {
    default: checked ? 'bg-blue-500' : 'bg-gray-300',
    success: checked ? 'bg-green-500' : 'bg-gray-300',
    warning: checked ? 'bg-yellow-500' : 'bg-gray-300',
    error: checked ? 'bg-red-500' : 'bg-gray-300',
  };

  const toggleClasses = classNames(
    'switch relative inline-flex items-center rounded-full transition-all duration-200',
    sizeClasses[size],
    variantClasses[variant],
    {
      'opacity-50 cursor-not-allowed': disabled,
      'cursor-pointer': !disabled,
    },
    propsClassName,
  );

  const getSliderClasses = () => {
    const baseClasses = 'slider absolute rounded-full transition-all duration-200 bg-white shadow-sm';
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };
    const positionClasses = {
      sm: checked ? 'translate-x-4' : 'translate-x-0.5',
      md: checked ? 'translate-x-5' : 'translate-x-0.5',
      lg: checked ? 'translate-x-7' : 'translate-x-0.5',
    };
    
    return classNames(
      baseClasses,
      sizeClasses[size],
      positionClasses[size]
    );
  };

  return (
    <div className="flex items-center gap-3">
      <label className={toggleClasses}>
        <input
          {...props}
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
        />
        <span className={getSliderClasses()} />
      </label>
      
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-medium text-white">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-gray-400">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
