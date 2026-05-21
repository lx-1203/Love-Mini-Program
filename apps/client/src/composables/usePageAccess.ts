import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useSessionStore } from "../stores/session";
import { resolveSessionAccess, type PageRequirements } from "../guards/session-guard";
import { replaceAppPath } from "../utils/navigation";

export function usePageAccess(requirements: PageRequirements) {
  const sessionStore = useSessionStore();
  const { userSession } = storeToRefs(sessionStore);

  onShow(() => {
    if (sessionStore.loading) {
      return;
    }

    const current = userSession.value;
    const decision = resolveSessionAccess(
      {
        isLoggedIn: Boolean(current?.loggedIn),
        profileCompleted: Boolean(current?.profileCompleted),
        campusCompleted: Boolean(current?.campusVerified),
        scheduleCompleted: Boolean(current?.scheduleCompleted),
        featureFlags: current?.featureFlags ?? {},
      },
      requirements
    );

    if (!decision.allowed && decision.redirectTo) {
      replaceAppPath(decision.redirectTo);
    }
  });
}
