// public/sw.js
self.addEventListener("push", function (event) {
    let data = { title: "Notification", body: "You have a new message", url: "/" };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            try {
                data.body = event.data.text();
            } catch (__) {}
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || "/pic/logo.png",
        badge: "/pic/logo.png",
        tag: data.tag || "notification",
        requireInteraction: data.requireInteraction || false,
        data: {
            url: data.data?.url || data.url || "/",
            ...data.data,
        },
    };

    // Add actions if provided
    if (data.actions && Array.isArray(data.actions)) {
        options.actions = data.actions;
    }

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    // Handle action buttons if they exist
    if (event.action) {
        // Here you could handle different actions
        console.log("Notification action clicked:", event.action);
        // You might want to send a message to the client or fetch an API
        return;
    }

    const target = event.notification.data?.url || "/";

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                // Check if there's already a client open with the target URL
                for (const client of clientList) {
                    try {
                        const clientUrl = new URL(client.url);
                        const targetUrl = new URL(target, self.location.origin);
                        if (clientUrl.href === targetUrl.href && "focus" in client) {
                            return client.focus();
                        }
                    } catch (e) {
                        // ignore URL parse issues
                    }
                }

                // If no client found, open a new window
                if (clients.openWindow) {
                    return clients.openWindow(new URL(target, self.location.origin).href);
                }
            })
            .catch((err) => {
                console.error("Error handling notification click:", err);
            })
    );
});

// Handle notification close
self.addEventListener("notificationclose", function (event) {
    // You could track analytics here if needed
    console.log("Notification was closed:", event.notification.tag);
});
