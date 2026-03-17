export function sendNotification(title: string, body: string): void {
  if (typeof window === "undefined") return
  if (!("Notification" in window)) return
  if (Notification.permission !== "granted") return
  new Notification(title, {
    body,
    icon: "/icons/icon-192.png",
  })
}
