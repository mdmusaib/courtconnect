/* CourtConnect Firebase Cloud Messaging worker.
 *
 * The Firebase web config is public and is passed as query parameters by the
 * client after it registers this worker. Nothing secret belongs in this file.
 */

importScripts(
  "https://www.gstatic.com/firebasejs/13.1.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/13.1.0/firebase-messaging-compat.js",
);

const params = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: params.get("apiKey") || undefined,
  authDomain: params.get("authDomain") || undefined,
  projectId: params.get("projectId") || undefined,
  storageBucket: params.get("storageBucket") || undefined,
  messagingSenderId: params.get("messagingSenderId") || undefined,
  appId: params.get("appId") || undefined,
};

if (
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId
) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Notification payloads are displayed by the SDK automatically. This
    // handler only covers data-only messages.
    messaging.onBackgroundMessage((payload) => {
      if (payload.notification) {
        return;
      }

      const title =
        payload.data?.title || payload.data?.type || "CourtConnect";
      const body =
        payload.data?.body || "Open CourtConnect to view your latest update.";

      self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: payload.data?.bookingId
          ? `booking-${payload.data.bookingId}`
          : "courtconnect",
        data: payload.data || {},
      });
    });
  } catch (error) {
    console.warn("Firebase messaging worker initialization failed:", error);
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const fcmMessage = event.notification.data?.FCM_MSG;
  const link =
    fcmMessage?.fcmOptions?.link ||
    fcmMessage?.data?.url ||
    event.notification.data?.url ||
    "/my-bookings";

  event.waitUntil(
    (async () => {
      let target = link;

      try {
        target = new URL(link, self.location.origin).href;
      } catch {
        target = new URL("/my-bookings", self.location.origin).href;
      }

      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(target).catch(() => undefined);
          }
          return;
        }
      }

      await self.clients.openWindow(target);
    })(),
  );
});
