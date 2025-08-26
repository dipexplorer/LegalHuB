// 🚀 LegalHuB Footer JavaScript
// This script handles footer functionality and enhancements

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LegalHuB Footer JavaScript loaded successfully!');
    
    // Initialize scroll to top functionality
    initScrollToTop();
    
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
