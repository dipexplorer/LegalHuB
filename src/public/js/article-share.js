// src/public/js/article-share.js - Improved popover share functionality
(() => {
    const ready = (fn) => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn);
        } else {
            fn();
        }
    };

    ready(() => {
        const shareBtn = document.getElementById("shareBtn");
        const popover = document.getElementById("sharePopover");
        const closeBtn = document.getElementById("shareCloseBtn");
        const copyBtn = document.getElementById("copyLinkBtn");
        const whatsapp = document.getElementById("whatsappShare");
        const nativeShareBtn = document.getElementById("nativeShareBtn");

        if (!shareBtn || !popover) return;

        const pageUrl = window.location.href;
        const title =
            document.title ||
            (document.querySelector("h1") && document.querySelector("h1").innerText) ||
            "";

        // Check if Web Share API is available and show native share button
        if (navigator.share && nativeShareBtn) {
            nativeShareBtn.style.display = "flex";
        }

        // Set WhatsApp href
        if (whatsapp) {
            whatsapp.href = `https://wa.me/?text=${encodeURIComponent(title + " " + pageUrl)}`;
        }

        let isOpen = false;

        // Position popover relative to Share button
        function positionPopover() {
            const btnRect = shareBtn.getBoundingClientRect();
            const panel = popover.querySelector(".share-popover-panel");

            if (!panel) return;

            // Position below the button with a small gap
            const gap = 8;
            const top = btnRect.bottom + gap;
            const left = btnRect.left;

            popover.style.position = "fixed";
            popover.style.top = `${top}px`;
            popover.style.left = `${left}px`;

            // Ensure popover doesn't go off-screen
            const popoverRect = panel.getBoundingClientRect();
            const viewportWidth = window.innerWidth;

            if (popoverRect.right > viewportWidth - 16) {
                // Adjust to align with right edge of button
                popover.style.left = "auto";
                popover.style.right = `${viewportWidth - btnRect.right}px`;
            }
        }

        function openPopover() {
            isOpen = true;
            popover.removeAttribute("hidden");
            shareBtn.setAttribute("aria-expanded", "true");
            positionPopover();

            // Focus first interactive element
            setTimeout(() => {
                const firstFocusable = popover.querySelector("button, a");
                if (firstFocusable) firstFocusable.focus();
            }, 100);

            // Add click-outside listener
            setTimeout(() => {
                document.addEventListener("click", handleClickOutside);
            }, 0);
        }

        function closePopover() {
            if (!isOpen) return;
            isOpen = false;
            popover.setAttribute("hidden", "");
            shareBtn.setAttribute("aria-expanded", "false");
            document.removeEventListener("click", handleClickOutside);
            shareBtn.focus();
        }

        function handleClickOutside(e) {
            if (!popover.contains(e.target) && !shareBtn.contains(e.target)) {
                closePopover();
            }
        }

        // Toggle popover on Share button click
        shareBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isOpen) {
                closePopover();
            } else {
                openPopover();
            }
        });

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener("click", (e) => {
                e.preventDefault();
                closePopover();
            });
        }

        // Escape key to close
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && isOpen) {
                closePopover();
            }
        });

        // Reposition on window resize
        window.addEventListener("resize", () => {
            if (isOpen) {
                positionPopover();
            }
        });

        // Copy link functionality
        if (copyBtn) {
            copyBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(pageUrl);
                        showCopyFeedback(copyBtn);
                        showToast("✓ Link copied to clipboard");
                    } else {
                        fallbackCopyPrompt(pageUrl);
                    }
                } catch (err) {
                    fallbackCopyPrompt(pageUrl);
                }
            });
        }

        // Native share functionality (Web Share API)
        if (nativeShareBtn) {
            nativeShareBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                try {
                    await navigator.share({
                        title: title,
                        text: `Check out this article: ${title}`,
                        url: pageUrl,
                    });
                    showToast("✓ Shared successfully");
                    closePopover();
                } catch (err) {
                    // User cancelled or share failed
                    if (err.name !== "AbortError") {
                        console.error("Share failed:", err);
                        showToast("❌ Share failed");
                    }
                }
            });
        }

        // Visual feedback for copy button
        function showCopyFeedback(button) {
            const originalText = button.innerHTML;
            button.innerHTML = `
        <svg class="share-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied!
      `;
            button.style.borderColor = "#10b981";
            button.style.color = "#10b981";

            setTimeout(() => {
                button.innerHTML = originalText;
                button.style.borderColor = "";
                button.style.color = "";
            }, 2000);
        }

        // Fallback copy method
        function fallbackCopyPrompt(text) {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand("copy");
                showToast(" Link copied to clipboard");
            } catch (err) {
                prompt("Copy this link:", text);
            }
            document.body.removeChild(textarea);
        }

        // Toast notification
        function showToast(message) {
            const existingToast = document.querySelector(".quick-toast");
            if (existingToast) existingToast.remove();

            const toast = document.createElement("div");
            toast.className = "quick-toast";
            toast.textContent = message;
            toast.style.cssText = `
        position: fixed;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.85);
        color: #fff;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 0.9rem;
        z-index: 9999;
        animation: toastSlideUp 0.3s ease-out;
      `;

            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = "toastSlideDown 0.3s ease-in forwards";
                setTimeout(() => toast.remove(), 300);
            }, 2500);
        }

        // Add animation styles
        if (!document.getElementById("toast-animations")) {
            const style = document.createElement("style");
            style.id = "toast-animations";
            style.textContent = `
        @keyframes toastSlideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes toastSlideDown {
          from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          to {
            opacity: 0;
            transform: translateX(-50%) translateY(12px);
          }
        }
      `;
            document.head.appendChild(style);
        }
    });
})();
