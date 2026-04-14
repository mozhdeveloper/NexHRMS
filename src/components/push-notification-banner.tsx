"use client";

import { useEffect, useState } from "react";
import { PushNotificationPrompt } from "@/components/push-notification-prompt";
import { usePushNotifications } from "@/lib/hooks/use-push-notifications";
import { useAppBadge } from "@/lib/hooks/use-app-badge";

/**
 * Service worker initializer + push notification banner + app badge sync.
 * Shows a banner prompting users to enable push notifications
 * after login, if they haven't enabled them yet.
 * Also keeps the PWA app badge in sync with unread notification count.
 */
export function PushNotificationBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const { permission, isSupported, isSubscribed } = usePushNotifications();
  
  // Initialize app badge sync (works on Android PWA and iOS 16.4+ PWA)
  useAppBadge();

  useEffect(() => {
    // Check if banner was dismissed
    const dismissed = localStorage.getItem("push-prompt-dismissed") === "true";
    
    // Show banner after a short delay if:
    // - Push is supported
    // - Permission not denied
    // - Not already subscribed
    // - Not previously dismissed
    const timeout = setTimeout(() => {
      if (isSupported && permission === "default" && !isSubscribed && !dismissed) {
        setShowBanner(true);
      }
    }, 2000); // Show after 2 seconds

    return () => clearTimeout(timeout);
  }, [isSupported, permission, isSubscribed]);

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <PushNotificationPrompt
        variant="banner"
        onDismiss={handleDismiss}
      />
    </div>
  );
}
