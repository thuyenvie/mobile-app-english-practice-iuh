import { Redirect } from "expo-router";
import { useSession } from "@/lib/auth/useSession";
import Screen from "../../../features/auth/screens/LoginScreen";

export default function AuthRoute() {
  const session = useSession();
  return session.status === "authenticated" ? (
    <Redirect href="/(tabs)/home" />
  ) : (
    <Screen />
  );
}
