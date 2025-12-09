import { ReactNode } from "react";
import classNames from "classnames";
import { motion } from "framer-motion";

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
  onClick?: () => void;
  index?: number;
}

export default function StatsCard({
  title,
  value,
  icon,
  trend,
  className,
  gradient = "primary",
  onClick,
  index = 0
}: StatsCardProps) {
  const gradientClasses = {
    primary: "from-emerald-500/20 to-teal-500/20 text-emerald-400",
    success: "from-emerald-400/20 to-lime-500/20 text-emerald-300",
    warning: "from-amber-500/20 to-orange-500/20 text-amber-400",
    info: "from-cyan-500/20 to-teal-500/20 text-cyan-400"
  };

  const CardWrapper = onClick ? motion.button : motion.div;

  return (
    <CardWrapper 
      className={classNames(
        "glass-card rounded-2xl p-5 relative overflow-hidden group w-full text-left",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      type={onClick ? "button" : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: "easeOut"
      }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex justify-between items-start mb-4">
        <motion.div 
          className={classNames(
            "p-3 rounded-xl bg-gradient-to-br",
            gradientClasses[gradient]
          )}
          whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.4 } }}
        >
          {icon}
        </motion.div>
        {trend && (
          <div className={classNames(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trend.isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          )}>
            <span>{trend.isPositive ? "+" : ""}{trend.value}%</span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
        <motion.div 
          className="text-2xl font-bold text-white tracking-tight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.2 }}
        >
          {value}
        </motion.div>
      </div>

      {/* Background decoration */}
      <div className={classNames(
        "absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br",
        gradientClasses[gradient]
      )} />
    </CardWrapper>
  );
}