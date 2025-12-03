interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'gradient';
  className?: string;
}

export default function Logo({ size = 'md', variant = 'default', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const variantClasses = {
    default: 'logo-container',
    minimal: 'flex items-center gap-2',
    gradient: 'logo-container twogc-gradient',
  };

  return (
    <div className={`${variantClasses[variant]} ${className} user-select-none select-none`}>
      <div className="logo-text flex items-center gap-2">
        <span className={`logo-bold text-white font-bold tracking-wider ${sizeClasses[size]}`}> Desktop argo tunnel </span>
      </div>
    </div>
  );
}
