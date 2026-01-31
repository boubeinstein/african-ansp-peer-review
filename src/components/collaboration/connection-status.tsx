"use client";

import { useConnectionStatus } from "@/hooks/use-connection-status";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  showLabel?: boolean;
  className?: string;
}

export function ConnectionStatus({
  showLabel = false,
  className,
}: ConnectionStatusProps) {
  const { state, hasFailed, reconnect } = useConnectionStatus();

  const getStatusConfig = () => {
    switch (state) {
      case "connected":
        return {
          icon: Wifi,
          label: "Connected",
          color: "text-green-600",
          bgColor: "bg-green-100",
          animate: false,
        };
      case "connecting":
        return {
          icon: RefreshCw,
          label: "Connecting...",
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          animate: true,
        };
      case "disconnected":
        return {
          icon: WifiOff,
          label: "Disconnected",
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          animate: false,
        };
      case "failed":
        return {
          icon: AlertTriangle,
          label: "Connection Failed",
          color: "text-red-600",
          bgColor: "bg-red-100",
          animate: false,
        };
      default:
        return {
          icon: WifiOff,
          label: "Unknown",
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          animate: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            <Badge
              variant="outline"
              className={cn("gap-1.5 px-2 py-1", config.bgColor, config.color)}
            >
              <Icon
                className={cn("h-3 w-3", config.animate && "animate-spin")}
              />
              {showLabel && <span className="text-xs">{config.label}</span>}
            </Badge>

            {hasFailed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reconnect}
                className="h-7 px-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
          {hasFailed && (
            <p className="text-xs text-muted-foreground">
              Click retry to reconnect
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
