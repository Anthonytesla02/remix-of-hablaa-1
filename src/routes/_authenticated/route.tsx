import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { syncFromCloud, scheduleCloudSave } from "@/lib/cloud-sync";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init(session: { user: { id: string } } | null) {
      if (!session) {
        void navigate({ to: "/auth" });
        return;
      }
      // Load state from cloud
      await syncFromCloud(session.user.id);
      if (cancelled) return;
      setReady(true);

      // Subscribe to store changes → debounced cloud save
      const unsub = useAppSubscribe(session.user.id);

      // Listen for sign-out
      const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          unsub();
          void navigate({ to: "/auth" });
        }
      });

      return () => {
        unsub();
        authListener.subscription.unsubscribe();
      };
    }

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const cleanup = await init(data.session as any);
      if (cancelled) {
        cleanup?.();
      }
      return cleanup;
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="topo flex min-h-[100dvh] items-center justify-center">
        <p className="hud animate-pulse text-xs text-muted-foreground">
          ESTABLISHING SECURE LINK…
        </p>
      </div>
    );
  }

  return <Outlet />;
}

/** Subscribe to Zustand store changes and trigger debounced cloud saves. */
function useAppSubscribe(userId: string): () => void {
  // Dynamic import to avoid circular dependency
  let unsub: (() => void) | undefined;
  import("@/lib/store").then(({ useApp }) => {
    unsub = useApp.subscribe(() => scheduleCloudSave(userId));
  });
  return () => unsub?.();
}
