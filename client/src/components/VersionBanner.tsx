import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const POLL_INTERVAL = 60000;

export default function VersionBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const initialVersion = useRef<string | null>(null);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/version");
      if (!res.ok) return;
      const data = await res.json();
      if (!initialVersion.current) {
        initialVersion.current = data.version;
        return;
      }
      if (data.version !== initialVersion.current) {
        setUpdateAvailable(true);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    checkVersion();
    const interval = setInterval(checkVersion, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkVersion]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      className="flex-none bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800 px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-blue-800 dark:text-blue-200"
      data-testid="banner-update-available"
    >
      <Sparkles className="w-3.5 h-3.5 shrink-0" />
      <span>A new version of DocuAnnexure is available.</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-blue-800 dark:text-blue-200"
        onClick={() => window.location.reload()}
        data-testid="button-refresh-app"
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        Refresh
      </Button>
      <Link href="/changelog">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-blue-800 dark:text-blue-200"
          data-testid="button-view-changelog"
        >
          What's new
        </Button>
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="ml-1 p-0.5 rounded hover-elevate"
        aria-label="Dismiss"
        data-testid="button-dismiss-update"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
