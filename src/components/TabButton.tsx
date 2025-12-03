import { Link, LinkProps } from "@tanstack/react-router";
import classNames from "classnames";

interface TabButtonProps {
  label: string;
  to: LinkProps["to"];
  icon?: React.ReactNode;
  badge?: string | number;
}

export default function TabButton({
  label,
  to,
  icon,
  badge,
}: TabButtonProps) {
  return (
    <Link
      to={to}
      className="nav-tab relative flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200"
      inactiveProps={() => ({
        className: classNames(
          "nav-tab",
          "text-gray-400 hover:text-white hover:bg-gray-800/50",
          "border-b-2 border-transparent"
        ),
      })}
      activeProps={() => ({
        className: classNames(
          "nav-tab active",
          "text-blue-400 bg-blue-500/10",
          "border-b-2 border-blue-400"
        ),
      })}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      <span className="font-medium">{label}</span>
      {badge && (
        <span className="badge badge-primary text-xs px-2 py-1 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}
