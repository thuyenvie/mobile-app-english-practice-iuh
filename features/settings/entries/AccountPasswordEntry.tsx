import { useEffect, useState } from "react";
import { useIsFocused } from "expo-router";

import { getSessionSnapshot } from "@/lib/auth/sessionStore";
import { useSession } from "@/lib/auth/useSession";
import { getAccountProfile } from "../api/accountSettingsApi";
import type { SettingsEntryProps } from "../types";
import { SET05Entry } from "./SET05Entry";

/** Password controls are available only when Identity confirms a local credential. */
export function AccountPasswordEntry(props: SettingsEntryProps) {
  const { authenticated } = props;
  const session = useSession();
  const focused = useIsFocused();
  const [capability, setCapability] = useState<{ generation: number; hasPassword: boolean } | null>(null);

  useEffect(() => {
    if (!focused || !authenticated || session.status !== "authenticated") return;
    let active = true;
    const generation = session.generation;
    void getAccountProfile(generation).then(profile => {
      if (active && getSessionSnapshot().generation === generation) {
        setCapability({ generation, hasPassword: profile.hasPassword === true });
      }
    }).catch(() => {
      // Keep controls hidden when capability is unknown; retry on the next focus.
      if (active && getSessionSnapshot().generation === generation) {
        setCapability({ generation, hasPassword: false });
      }
    });
    return () => { active = false; };
  }, [authenticated, focused, session.generation, session.status]);

  if (!authenticated || session.status !== "authenticated"
      || capability?.generation !== session.generation || !capability.hasPassword) return null;

  return <SET05Entry key={session.generation} {...props} />;
}
