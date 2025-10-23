
// Stats section horizontal scroll functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a small screen
    const isSmallScreen = window.innerWidth <= 640;

    if (!isSmallScreen) return; // Only run on small screens

    const scrollContainer = document.querySelector('.stats-scroll-container');
    const statsGrid = document.querySelector('.stats-grid');
    const leftArrow = document.querySelector('.scroll-arrow.left');
    const rightArrow = document.querySelector('.scroll-arrow.right');
    const scrollDots = document.querySelectorAll('.scroll-dot');

    // Only run on small screens where scroll container exists
    if (!scrollContainer) return;

    // Function to update active scroll dot
    function updateScrollDots() {
        if (!scrollDots.length) return;

        // Calculate which card is most visible in center
        const containerRect = scrollContainer.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;

        const cards = document.querySelectorAll('.stat-card');
        let closestIndex = 0;
        let closestDistance = Infinity;

        cards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const cardCenter = cardRect.left + cardRect.width / 2;
            const distance = Math.abs(containerCenter - cardCenter);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        // Update active dot
        scrollDots.forEach((dot, index) => {
            if (index === closestIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // Manual scroll with arrows
    function scrollLeft() {
        if (statsGrid) {
            statsGrid.scrollBy({
                left: -300,
                behavior: 'smooth'
            });
            setTimeout(updateScrollDots, 300); // Update after scroll animation
        }
    }

    function scrollRight() {
        if (statsGrid) {
            statsGrid.scrollBy({
                left: 300,
                behavior: 'smooth'
            });
            setTimeout(updateScrollDots, 300); // Update after scroll animation
        }
    }

    // Auto-scroll functionality
    let autoScrollInterval;
    let isAutoScrolling = false;
    let scrollAmount = 0;

    function startAutoScroll() {
        if (isAutoScrolling) return;

        isAutoScrolling = true;
        scrollAmount = statsGrid ? statsGrid.scrollLeft : 0;

        autoScrollInterval = setInterval(() => {
            if (statsGrid) {
                // Increment scroll amount
                scrollAmount += 1;

                // Check if we've reached the end
                if (scrollAmount >= statsGrid.scrollWidth - statsGrid.clientWidth) {
                    // Reset to beginning
                    scrollAmount = 0;
                    statsGrid.scrollTo({
                        left: 0,
                        behavior: 'auto' // Use auto for instant reset
                    });
                } else {
                    // Normal scroll
                    statsGrid.scrollTo({
                        left: scrollAmount,
                        behavior: 'auto' // Use auto for smoother continuous scroll
                    });
                }
                updateScrollDots();
            }
        }, 30); // Scroll speed
    }

    function stopAutoScroll() {
        isAutoScrolling = false;
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
        }
        // Update current scroll position when stopping
        if (statsGrid) {
            scrollAmount = statsGrid.scrollLeft;
        }
    }

    // Event listeners for arrow buttons
    if (leftArrow) {
        leftArrow.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            scrollLeft();
        });
    }

    if (rightArrow) {
        rightArrow.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            scrollRight();
        });
    }

    // Touch events for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    if (statsGrid) {
        statsGrid.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
            stopAutoScroll();
        });

        statsGrid.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });
    }

    function handleSwipe() {
        if (touchEndX < touchStartX - 50) {
            // Swiped left
            scrollRight();
        }
        if (touchEndX > touchStartX + 50) {
            // Swiped right
            scrollLeft();
        }

        // Resume auto-scroll after 3 seconds of inactivity
        setTimeout(() => {
            if (!isAutoScrolling) {
                startAutoScroll();
            }
        }, 3000);
    }

    // Start auto-scroll on page load
    setTimeout(() => {
        startAutoScroll();
        updateScrollDots();
    }, 1000);

    // Stop auto-scroll on user interaction
    [scrollContainer, statsGrid].forEach(element => {
        if (element) {
            element.addEventListener('mouseenter', stopAutoScroll);
            element.addEventListener('mousedown', stopAutoScroll);
        }
    });

    // Resume auto-scroll when user stops interacting
    [scrollContainer, statsGrid].forEach(element => {
        if (element) {
            element.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (!isAutoScrolling) {
                        startAutoScroll();
                    }
                }, 3000); // Resume after 3 seconds of inactivity
            });
        }
    });

    // Update dots on scroll
    if (statsGrid) {
        statsGrid.addEventListener('scroll', updateScrollDots);
    }

    // Handle window resize
    window.addEventListener('resize', function() {
        // Stop auto-scroll on resize
        stopAutoScroll();

        // Restart after resize is complete
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(function() {
            if (window.innerWidth <= 640) {
                startAutoScroll();
                updateScrollDots();
            }
        }, 250);
    });
});
