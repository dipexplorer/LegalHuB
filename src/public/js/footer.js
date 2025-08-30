// 🚀 LegalHuB Footer JavaScript
// This script handles footer functionality and enhancements

// Feature flags
const ENABLE_SCROLL_TO_TOP = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LegalHuB Footer JavaScript loaded successfully!');
    
    // Initialize scroll to top functionality (disabled via flag)
    if (ENABLE_SCROLL_TO_TOP) {
        initScrollToTop();
    }
    
    // Initialize other footer features
    initFooterFeatures();
});

// 🔝 Scroll to top functionality
function initScrollToTop() {
    // Create scroll to top button
    const scrollBtn = document.createElement('button');
    scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    scrollBtn.className = 'scroll-to-top';
    scrollBtn.title = 'Scroll to Top';
    scrollBtn.setAttribute('aria-label', 'Scroll to top of page');

    // Use CSS for all visuals (no inline styles)
    document.body.appendChild(scrollBtn);

    // Install safe-zone logic to avoid overlapping chat widgets
    setupScrollToTopSafeZone(scrollBtn);

    // Show/hide button based on scroll position
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollBtn.classList.add('is-visible');
        } else {
            scrollBtn.classList.remove('is-visible');
        }
    });

    // Scroll to top on click + quick feedback
    scrollBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.style.transform = 'scale(0.92)';
        setTimeout(() => { this.style.transform = ''; }, 150);
    });

    // Keyboard support
    scrollBtn.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    });

    console.log('✅ Scroll to top button initialized');
}

// Detect common chat/help widgets and lift or reposition the button
function setupScrollToTopSafeZone(btn) {
    const chatSelectors = [
        '#crisp-chatbox, .crisp-client',
        '#tidio-chat, .tidio-chat',
        '.intercom-lightweight-app, #intercom-container',
        '#chat-widget-container, .chat-widget, .help-chat, [data-help-chat]',
        '#tawkchat-container, #tawkchat, .tawk-button, .tawk-min-container',
        '#hubspot-messages-iframe-container, .hs-beacon',
        '.zsiq_floatmain, .zsiq_flt_rel',
        '.drift-open-chat, .drift-widget',
        '.fc_widget, .freshwidget-button, #freshworks-frame',
        '.bp-widget, .botpress-webchat',
        '.support-bubble, .help-bubble, .chat-bubble'
    ];

    const findChatEl = () => {
        for (const sel of chatSelectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    };

    const applySafeZone = () => {
        const chatEl = findChatEl();
        const hasChat = !!chatEl;
        if (hasChat) {
            btn.classList.add('safe-zone');
            // Try to estimate height and set a CSS variable for bottom offset
            let safeBottom = 96; // default
            try {
                const rect = chatEl.getBoundingClientRect();
                if (rect && rect.height) {
                    // add a small gap above the chat widget
                    safeBottom = Math.min(Math.max(Math.round(rect.height) + 24, 80), 200);
                }
            } catch (_) {}
            document.documentElement.style.setProperty('--scroll-to-top-safe-bottom', safeBottom + 'px');

            // On very small screens, prefer left docking to avoid crowding
            if (window.innerWidth <= 420) {
                btn.classList.add('left-docked');
            } else {
                btn.classList.remove('left-docked');
            }
        } else {
            btn.classList.remove('safe-zone');
            btn.classList.remove('left-docked');
            // reset to defaults if previously set
            document.documentElement.style.removeProperty('--scroll-to-top-safe-bottom');
        }
    };

    // Run immediately
    applySafeZone();
    // Re-evaluate on resize (chat bubbles can resize or move)
    window.addEventListener('resize', applySafeZone);
    // Observe DOM changes (many chat widgets inject late)
    const mo = new MutationObserver(() => applySafeZone());
    mo.observe(document.body, { childList: true, subtree: true });
}

// 🎯 Additional footer features
function initFooterFeatures() {
    // Dynamic copyright year update
    updateCopyrightYear();
    
    // Smooth scroll for footer links
    addSmoothScrollToFooterLinks();
    
    // Footer link tracking
    addFooterLinkTracking();
}

// 📅 Update copyright year dynamically
function updateCopyrightYear() {
    const copyrightElement = document.querySelector('.copyright p');
    if (copyrightElement) {
        const currentYear = new Date().getFullYear();
        copyrightElement.innerHTML = `© ${currentYear} LegalHub. All rights reserved.`;
    }
}

// 🔗 Smooth scroll for footer links
function addSmoothScrollToFooterLinks() {
    const footerLinks = document.querySelectorAll('.footer-middle a[href^="#"]');
    
    footerLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// 📊 Footer link click tracking
function addFooterLinkTracking() {
    const footerLinks = document.querySelectorAll('.footer-middle a, .contact-info a');
    
    footerLinks.forEach(link => {
        link.addEventListener('click', function() {
            const linkText = this.textContent.trim();
            const linkHref = this.getAttribute('href');
            
            console.log(`📊 Footer link clicked: ${linkText} (${linkHref})`);
            
            // Add visual feedback
            this.style.color = '#e040fb';
            setTimeout(() => {
                this.style.color = '';
            }, 200);
        });
    });
}

// 📱 Touch gesture support for mobile
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener('touchend', function(e) {
    touchEndY = e.changedTouches[0].screenY;
    handleFooterSwipe();
});

function handleFooterSwipe() {
    const swipeThreshold = 50;
    const swipeDistance = touchStartY - touchEndY;
    
    // Swipe up to show scroll-to-top button
    if (swipeDistance > swipeThreshold) {
        const scrollBtn = document.querySelector('.scroll-to-top');
        if (scrollBtn && window.pageYOffset > 300) {
            scrollBtn.style.transform = 'scale(1.2)';
            setTimeout(() => {
                scrollBtn.style.transform = 'scale(1)';
            }, 300);
        }
    }
}

console.log('🌟 LegalHuB footer functionality loaded!');
