import { motion } from "framer-motion";
import classNames from "classnames";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <motion.div
      className={classNames(
        "bg-white/5 rounded-lg animate-pulse",
        className
      )}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function StatsCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      className="glass-card rounded-2xl p-5 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: "easeOut"
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
    </motion.div>
  );
}

export function ConnectionItemSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      className="flex items-center justify-between p-4 rounded-xl bg-white/5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="w-2 h-2 rounded-full" />
      </div>
    </motion.div>
  );
}