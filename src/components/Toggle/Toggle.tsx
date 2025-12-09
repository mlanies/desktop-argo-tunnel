import classNames from "classnames";
import { motion } from "framer-motion";
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
    default: checked ? 'bg-emerald-500' : 'bg-gray-600',
    success: checked ? 'bg-emerald-400' : 'bg-gray-600',
    warning: checked ? 'bg-amber-500' : 'bg-gray-600',
    error: checked ? 'bg-red-500' : 'bg-gray-600',
  };

  const glowClasses = {
    default: checked ? 'shadow-[0_0_8px_rgba(16,185,129,0.4)]' : '',
    success: checked ? 'shadow-[0_0_8px_rgba(52,211,153,0.4)]' : '',
    warning: checked ? 'shadow-[0_0_8px_rgba(251,191,36,0.4)]' : '',
    error: checked ? 'shadow-[0_0_8px_rgba(239,68,68,0.4)]' : '',
  };

  const toggleClasses = classNames(
    'switch relative inline-flex items-center rounded-full transition-all duration-200',
    sizeClasses[size],
    variantClasses[variant],
    glowClasses[variant],
    {
      'opacity-50 cursor-not-allowed': disabled,
      'cursor-pointer': !disabled,
    },
    propsClassName,
  );

  const sliderSizes = {
    sm: { width: 12, height: 12 },
    md: { width: 20, height: 20 },
    lg: { width: 24, height: 24 },
  };

  const sliderPositions = {
    sm: { on: 18, off: 2 },
    md: { on: 22, off: 2 },
    lg: { on: 28, off: 2 },
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
        <motion.span 
          className="absolute rounded-full bg-white shadow-md"
          style={{
            width: sliderSizes[size].width,
            height: sliderSizes[size].height,
            top: '50%',
            y: '-50%'
          }}
          animate={{
            x: checked ? sliderPositions[size].on : sliderPositions[size].off
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
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