// public/js/notifications.js

// --- Push helpers (existing) ---
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

// expose for other modules
window.subscribeToPush = subscribeToPush;

// --- Toast utility (NEW) ---
// Reusable site toast that other scripts can call: window.showToast(msg, durationMs)
(function () {
    // Avoid redefining if already present
    if (window.showToast && typeof window.showToast === "function") return;

    window.showToast = function showToast(message = "", duration = 2800) {
        try {
            // Reuse existing toast container if present
            let toast = document.querySelector(".quick-toast");
            if (!toast) {
                toast = document.createElement("div");
                toast.className = "quick-toast";
                // Small accessibility: role and aria-live
                toast.setAttribute("role", "status");
                toast.setAttribute("aria-live", "polite");
                document.body.appendChild(toast);
            }

            // If another toast is visible, replace its text and reset timer
            toast.textContent = message;

            // Force reflow then show
            toast.classList.add("visible");

            // Clear any previous hide timer
            if (toast._hideTimer) clearTimeout(toast._hideTimer);

            toast._hideTimer = setTimeout(() => {
                toast.classList.remove("visible");
                // remove element after transition to keep DOM clean
                toast._removeTimer = setTimeout(() => {
                    try {
                        toast.remove();
                    } catch (e) {
                        /* ignore */
                    }
                }, 300);
            }, duration);
        } catch (err) {
            // Fallback to alert if DOM operations fail
            console.warn("showToast fallback:", err);
            try {
                alert(message);
            } catch (e) {
                /* noop */
            }
        }
    };
})();
