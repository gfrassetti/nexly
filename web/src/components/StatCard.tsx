"use client";

import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  color?: "blue" | "teal" | "green" | "purple" | "gray" | "red";
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
}

const colorClasses = {
  blue: "bg-accent-blue/20 text-accent-blue",
  teal: "bg-accent-teal/20 text-accent-teal", 
  green: "bg-accent-green/20 text-accent-green",
  purple: "bg-purple-500/20 text-purple-400",
  gray: "bg-gray-500/20 text-gray-400",
  red: "bg-red-500/20 text-red-400"
};

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = "blue",
  trend 
}: StatCardProps) {
  return (
    <div className="bg-muted/50 border border-border rounded-lg p-4 hover:bg-muted/80 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-8 h-8 ${colorClasses[color]} rounded-md flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      
      {trend && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${
              trend.isPositive ? 'text-accent-green' : 'text-red-400'
            }`}>
              {trend.isPositive ? '+' : ''}{trend.value}
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}
