import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { MetricTrend } from "@/types/champion";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: MetricTrend;
}

export function MetricCard({ title, value, icon: Icon, trend }: MetricCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-card-hover">
      <div className="flex items-start gap-4 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-0.5 text-2xl font-extrabold text-gray-900">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "mt-1 flex items-center gap-0.5 text-xs font-medium",
                trend.direction === "down"
                  ? "text-status-help"
                  : "text-status-great"
              )}
            >
              {trend.direction === "down" ? (
                <ArrowDownRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpRight className="h-3.5 w-3.5" />
              )}
              {trend.value}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
