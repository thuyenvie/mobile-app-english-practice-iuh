import { useEffect, type PropsWithChildren } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function PushNotificationRuntime({ children }: PropsWithChildren) {
  useEffect(() => {
    let openedResponseId: string | null = null;
    const openReminder = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (openedResponseId === id) return;
      openedResponseId = id;
      const data = response.notification.request.content.data;
      if (data?.type === "VOCABULARY_REVIEW" && Number.isSafeInteger(Number(data.taskId)) && Number(data.taskId) > 0) {
        router.push({ pathname: "/vocabulary/review/[taskId]", params: { taskId: String(data.taskId) } });
      }
      if (data?.type === "STUDY_REMINDER") {
        router.push("/study-plan/week");
      }
      void Notifications.clearLastNotificationResponseAsync();
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(
      openReminder,
    );

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openReminder(response);
    });

    return () => subscription.remove();
  }, []);

  return children;
}
