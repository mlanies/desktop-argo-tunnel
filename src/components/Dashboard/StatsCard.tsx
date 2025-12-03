import { ReactNode } from "react";
import classNames from "classnames";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  gradient?: "primary" | "success" | "warning" | "info";
}

export default function StatsCard({
  title,
  value,
  icon,
  trend,
  className,
  gradient = "primary"
}: StatsCardProps) {
  const gradientClasses = {
    primary: "from-blue-500/20 to-purple-500/20 text-blue-400",
    success: "from-green-500/20 to-emerald-500/20 text-green-400",
    warning: "from-orange-500/20 to-red-500/20 text-orange-400",
    info: "from-cyan-500/20 to-blue-500/20 text-cyan-400"
  };

  return (
    <div className={classNames(
      "glass-card rounded-2xl p-5 relative overflow-hidden group",
      className
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className={classNames(
          "p-3 rounded-xl bg-gradient-to-br",
          gradientClasses[gradient]
        )}>
          {icon}
        </div>
        {trend && (
          <div className={classNames(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trend.isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          )}>
            <span>{trend.isPositive ? "+" : ""}{trend.value}%</span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      </div>

      {/* Background decoration */}
      <div className={classNames(
        "absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br",
        gradientClasses[gradient]
      )} />
    </div>
  );
}
