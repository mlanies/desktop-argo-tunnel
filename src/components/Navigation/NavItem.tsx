import { ReactNode } from "react";
import classNames from "classnames";
import { Link } from "@tanstack/react-router";

interface NavItemProps {
  to?: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: number | string;
  onClick?: () => void;
  className?: string;
}

export default function NavItem({
  to,
  icon,
  label,
  active,
  badge,
  onClick,
  className,
}: NavItemProps) {
  const content = (
    <>
      <div className={classNames(
        "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
        active ? "text-white bg-white/10" : "text-gray-400 group-hover:text-white group-hover:bg-white/5"
      )}>
        {icon}
      </div>
      <span className={classNames(
        "flex-1 text-sm font-medium transition-colors",
        active ? "text-white" : "text-gray-400 group-hover:text-white"
      )}>
        {label}
      </span>
      {badge && (
        <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-blue-500 rounded-full">
          {badge}
        </span>
      )}
    </>
  );

  const baseClasses = classNames(
    "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group cursor-pointer select-none",
    active ? "bg-white/5 shadow-sm" : "hover:bg-white/5",
    className
  );

  if (to) {
    return (
      <Link to={to} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={baseClasses}>
      {content}
    </div>
  );
}
