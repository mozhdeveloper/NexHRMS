"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Check, X, Smartphone, AlertCircle } from "lucide-react";
import { usePushNotifications, type PushPermissionState } from "@/lib/hooks/use-push-notifications";
import { cn } from "@/lib/utils";

interface PushNotificationPromptProps {
  variant?: "banner" | "card" | "inline";
  className?: string;
  onDismiss?: () => void;
}

/**
 * Prompt component for enabling push notifications.
 * 
 * Variants:
 * - banner: Full-width banner at the top of the page
 * - card: Card-style prompt for settings pages
 * - inline: Compact inline button
 */
export function PushNotificationPrompt({
  variant = "card",
  className,
  onDismiss,
}: PushNotificationPromptProps) {
  const {
    permission: rawPermission,
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();
  
  // Explicitly type permission to include all possible values
  const permission = rawPermission as PushPermissionState;
  const isDenied = permission === "denied";
  
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
    // Remember dismissal in localStorage
    localStorage.setItem("push-prompt-dismissed", "true");
  };

  // Don't render if not supported or dismissed (but show denied state)
  if (!isSupported || dismissed) {
    return null;
  }

  if (variant === "inline") {
    if (isDenied) {
      return (
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2 cursor-not-allowed opacity-50", className)}
          disabled
        >
          <Bell className="h-4 w-4" />
          Blocked by Browser
        </Button>
      );
    }
    
    if (isSubscribed) {
      return (
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
          onClick={unsubscribe}
          disabled={isLoading}
        >
          <BellOff className="h-4 w-4" />
          Disable Notifications
        </Button>
      );
    }

    return (
      <Button
        variant={permission === "default" ? "default" : "outline"}
        size="sm"
        className={cn("gap-2", className)}
        onClick={subscribe}
        disabled={isLoading}
      >
        <Bell className="h-4 w-4" />
        {isLoading ? "Enabling..." : "Enable Notifications"}
      </Button>
    );
  }

  if (variant === "banner") {
    if (isSubscribed) return null;

    return (
      <div className={cn(
        "bg-primary/5 border-b border-primary/20 px-3 py-2 sm:px-4 sm:py-2.5",
        className
      )}>
        <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-screen-xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium truncate">Enable Push Notifications</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden xs:block">
                Get notified about leave approvals, payslips, and more
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              size="sm"
              onClick={subscribe}
              disabled={isLoading}
              className="h-7 px-2.5 text-xs sm:h-8 sm:px-3 sm:text-sm gap-1"
            >
              {isLoading ? "..." : "Enable"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground"
              onClick={handleDismiss}
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {isSubscribed ? (
              <Check className="h-6 w-6 text-primary" />
            ) : isDenied ? (
              <AlertCircle className="h-6 w-6 text-destructive" />
            ) : (
              <Smartphone className="h-6 w-6 text-primary" />
            )}
          </div>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Push Notifications</h3>
              {isSubscribed && (
                <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-700 dark:text-green-400">
                  Enabled
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isSubscribed
                ? "You'll receive notifications even when the app is closed."
                : isDenied
                ? "Notifications are blocked. Enable them in your browser settings."
                : "Get instant updates about approvals, payslips, tasks, and more — even when you're not in the app."}
            </p>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            {isSubscribed ? (
              <Button
                variant="outline"
                size="sm"
                onClick={unsubscribe}
                disabled={isLoading}
                className="gap-1.5"
              >
                <BellOff className="h-4 w-4" />
                Disable
              </Button>
            ) : !isDenied ? (
              <>
                <Button
                  size="sm"
                  onClick={subscribe}
                  disabled={isLoading}
                  className="gap-1.5"
                >
                  <Bell className="h-4 w-4" />
                  {isLoading ? "Enabling..." : "Enable"}
                </Button>
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="text-muted-foreground"
                  >
                    Later
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Open browser notification settings
                  if ('permissions' in navigator) {
                    // Try to open settings (not all browsers support this)
                    alert("Please enable notifications in your browser settings for this site.");
                  }
                }}
              >
                Open Settings
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Small notification bell button with status indicator.
 * Use in topbar or header for quick access.
 */
export function PushNotificationButton({ className }: { className?: string }) {
  const { permission: rawPerm, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();
  
  // Capture denied state before any early returns
  const isDenied = rawPerm === "denied";

  if (rawPerm === "unsupported") return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative", className)}
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading || isDenied}
      title={
        isDenied
          ? "Notifications blocked"
          : isSubscribed
          ? "Disable notifications"
          : "Enable notifications"
      }
    >
      {isSubscribed ? (
        <Bell className="h-5 w-5 text-primary" />
      ) : (
        <BellOff className="h-5 w-5 text-muted-foreground" />
      )}
      {/* Status indicator */}
      <span
        className={cn(
          "absolute right-1 top-1 h-2 w-2 rounded-full",
          isSubscribed
            ? "bg-green-500"
            : isDenied
            ? "bg-red-500"
            : "bg-amber-500"
        )}
      />
    </Button>
  );
}
