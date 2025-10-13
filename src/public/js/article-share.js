// src/public/js/article-share.js
(() => {
  const ready = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  };

  ready(() => {
    const shareBtn = document.getElementById('shareBtn');
    const dialog = document.getElementById('shareDialog');
    const closeBtn = document.getElementById('shareCloseBtn');
    const copyBtn = document.getElementById('copyLinkBtn');
    const whatsapp = document.getElementById('whatsappShare');
    const nativeBtn = document.querySelector('[data-action="native"]');
    const articleContainer = document.querySelector('.article_container');

    if (!shareBtn || !dialog) return;

    const pageUrl = window.location.href;
    const title =
      document.title ||
      (document.querySelector('h1') && document.querySelector('h1').innerText) ||
      '';

    // Safe set WhatsApp href
    if (whatsapp) {
      whatsapp.href = `https://wa.me/?text=${encodeURIComponent(title + ' ' + pageUrl)}`;
    }

    let lastFocused = null;

    function openDialog() {
      lastFocused = document.activeElement;
      dialog.removeAttribute('hidden');
      // mark background as hidden for assistive tech
      if (articleContainer) articleContainer.setAttribute('aria-hidden', 'true');

      const panel = dialog.querySelector('.share-dialog-panel');
      const focusable = getFocusable(panel);
      if (focusable.length) focusable[0].focus();
      else if (panel) panel.focus();

      document.body.style.overflow = 'hidden';
      document.addEventListener('focus', enforceFocus, true);
    }

    function closeDialog() {
      dialog.setAttribute('hidden', '');
      if (articleContainer) articleContainer.removeAttribute('aria-hidden');
      document.body.style.overflow = '';
      document.removeEventListener('focus', enforceFocus, true);
      if (lastFocused && typeof lastFocused.focus === 'function') {
        try { lastFocused.focus({ preventScroll: true }); } catch { lastFocused.focus(); }
      }
    }

    // Keep focus inside dialog (simple trap)
    function enforceFocus(e) {
      if (!dialog.hasAttribute('hidden') && !dialog.contains(e.target)) {
        e.stopPropagation();
        const panel = dialog.querySelector('.share-dialog-panel');
        const focusable = getFocusable(panel);
        if (focusable.length) focusable[0].focus();
        else if (panel) panel.focus();
      }
    }

    // Get focusable elements inside container
    function getFocusable(container) {
      if (!container) return [];
      return Array.from(
        container.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    }

    // Events
    shareBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openDialog();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeDialog);

    // Backdrop click closes
    dialog.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('share-dialog-backdrop')) {
        closeDialog();
      }
    });

    // Escape to close + handle Tab cycling
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDialog();
      } else if (e.key === 'Tab') {
        // manual tab trapping
        const panel = dialog.querySelector('.share-dialog-panel');
        const focusable = getFocusable(panel);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // Copy link
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(pageUrl);
            showToast('Link copied to clipboard');
          } else {
            fallbackCopyPrompt(pageUrl);
          }
        } catch (err) {
          fallbackCopyPrompt(pageUrl);
        }
      });
    }

    // Native Share API
    if (nativeBtn) {
      nativeBtn.addEventListener('click', async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title, url: pageUrl });
            closeDialog();
          } catch (err) {
            // user cancelled or error
            showToast('Share was cancelled or failed');
          }
        } else {
          showToast('Native share not supported on this device');
        }
      });
    }

    // Minimal toast (self-contained)
    function showToast(msg) {
      const t = document.createElement('div');
      t.className = 'quick-toast';
      t.textContent = msg;
      document.body.appendChild(t);
      requestAnimationFrame(() => t.classList.add('visible'));
      setTimeout(() => {
        t.classList.remove('visible');
        setTimeout(() => t.remove(), 300);
      }, 2800);
    }

    function fallbackCopyPrompt(text) {
      // Prompt fallback
      try {
        const result = window.prompt('Copy this link', text);
        if (result !== null) {
          showToast('Link copied (manual)');
        }
      } catch {
        showToast('Unable to copy link');
      }
    }
  });
})();
