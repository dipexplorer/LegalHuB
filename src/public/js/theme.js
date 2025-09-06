/**
 * Theme Toggle System
 * Handles dark/light theme switching with localStorage persistence and system preference detection
 */

class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeIcon = this.themeToggle?.querySelector('.theme-icon');
        this.html = document.documentElement;
        this.storageKey = 'legalhub-theme';
        this.currentTheme = this.getInitialTheme();
        
        this.init();
    }

    /**
     * Initialize the theme system
     */
    init() {
        if (!this.themeToggle) {
            console.warn('Theme toggle button not found');
            return;
        }

        // Set initial theme
        this.setTheme(this.currentTheme);
        
        // Add event listener
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't set a preference
                if (!localStorage.getItem(this.storageKey)) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }

        // Add keyboard support
        this.themeToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        console.log('Theme system initialized with theme:', this.currentTheme);
    }

    /**
     * Get the initial theme preference
     * Priority: localStorage > system preference > default (dark)
     */
    getInitialTheme() {
        // Check localStorage first
        const storedTheme = localStorage.getItem(this.storageKey);
        if (storedTheme && ['light', 'dark'].includes(storedTheme)) {
            return storedTheme;
        }

        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        // Default to dark theme (your current design)
        return 'dark';
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        
        // Announce theme change to screen readers
        this.announceThemeChange(newTheme);
    }

    /**
     * Set the theme and update UI
     */
    setTheme(theme) {
        if (!['light', 'dark'].includes(theme)) {
            console.error('Invalid theme:', theme);
            return;
        }

        this.currentTheme = theme;
        
        // Update HTML data attribute
        this.html.setAttribute('data-theme', theme);
        
        // Update button state
        this.updateToggleButton(theme);
        
        // Save to localStorage
        localStorage.setItem(this.storageKey, theme);
        
        // Update button aria-label for accessibility
        this.themeToggle.setAttribute('aria-label', 
            `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
        
        console.log('Theme changed to:', theme);
    }

    /**
     * Update the toggle button appearance
     */
    updateToggleButton(theme) {
        if (!this.themeIcon) return;

        // Update icon
        this.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        
        // Update button data attribute for CSS styling
        this.themeToggle.setAttribute('data-theme', theme);
        
        // Add visual feedback
        this.themeToggle.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.themeToggle.style.transform = '';
        }, 150);
    }

    /**
     * Announce theme change to screen readers
     */
    announceThemeChange(theme) {
        // Create a temporary element for screen reader announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        
        announcement.textContent = `Theme changed to ${theme} mode`;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Reset theme to system preference
     */
    resetToSystemPreference() {
        localStorage.removeItem(this.storageKey);
        const systemTheme = window.matchMedia && 
            window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        this.setTheme(systemTheme);
    }
}

// Initialize theme system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
