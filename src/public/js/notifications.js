// public/js/notifications.js
async function getVapidPublicKey() {
    const res = await fetch("/api/push/vapidPublicKey");
    if (!res.ok) throw new Error("Failed to fetch VAPID public key");
    const { publicKey } = await res.json();
    return publicKey;
}

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function subscribeToPush(authToken) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("⚠️ Push or Service Worker not supported in this browser");
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        console.warn("Notification permission not granted:", permission);
        return;
    }

    const reg = await navigator.serviceWorker.register("/sw.js");
    console.log("✅ Service Worker registered:", reg);

    const publicKey = await getVapidPublicKey();
    if (!publicKey) throw new Error("VAPID public key missing on server");

    // ✅ Check if already subscribed
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
        subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
    }

    console.log("📡 Subscription object:", subscription);

    await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(subscription),
    });

    console.log("🎉 Subscribed to push notifications successfully");
}

window.subscribeToPush = subscribeToPush;
