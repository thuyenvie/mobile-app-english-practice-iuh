import { Fragment, useEffect, type PropsWithChildren } from "react";
import { BrandedPageState } from "@/components/ui/BrandedPageState";
import { useSession } from "@/lib/auth/useSession";
import { restoreSession } from "@/lib/auth/restoreSession";

export function SessionProvider({ children }: PropsWithChildren) {
  const session = useSession();
  useEffect(() => { void restoreSession(); }, []);
  if (session.status === "loading") {
    return <BrandedPageState
      loading={!session.error}
      message={session.error || "Đang kiểm tra phiên..."}
      onRetry={() => {
        void restoreSession();
      }}
    />;
  }
  // All account-bound screen state is discarded together when identity changes.
  return <Fragment key={session.generation}>{children}</Fragment>;
}
