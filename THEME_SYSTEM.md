# Theme System Documentation

## Overview
The LegalHuB website now includes a comprehensive dark/light theme system with accessibility features and user preference storage.

## Features

### ✅ Theme Toggle Button
- **Location**: Top navigation bar (next to login/logout)
- **Icon**: Moon (🌙) for light mode, Sun (☀️) for dark mode
- **Accessibility**: 
  - ARIA labels for screen readers
  - Keyboard navigation support (Enter/Space)
  - Focus indicators with proper contrast
  - Screen reader announcements on theme change

### ✅ User Preference Storage
- **localStorage**: User's theme choice is saved as `legalhub-theme`
- **Persistence**: Theme preference persists across browser sessions
- **Priority**: User choice > System preference > Default (dark)

### ✅ System Theme Detection
- **Auto-detection**: Automatically detects user's system theme preference
- **Dynamic updates**: Responds to system theme changes in real-time
- **Fallback**: Defaults to dark theme if system preference unavailable

### ✅ Accessibility Features
- **WCAG Compliance**: Meets accessibility standards
- **High Contrast Support**: Enhanced borders in high contrast mode
- **Reduced Motion**: Respects `prefers-reduced-motion` setting
- **Screen Reader Support**: Proper ARIA labels and live regions
- **Keyboard Navigation**: Full keyboard accessibility

## CSS Variables

The theme system uses CSS custom properties for easy maintenance:

### Light Theme Variables
```css
:root {
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --bg-tertiary: #e9ecef;
    --text-primary: #212529;
    --text-secondary: #6c757d;
    --text-muted: #adb5bd;
    --accent-primary: #9c27b0;
    --accent-secondary: #e040fb;
    --accent-hover: #7b1fa2;
    --border-color: #dee2e6;
    --shadow-color: rgba(0, 0, 0, 0.1);
    --gradient-primary: linear-gradient(135deg, #ffffff, #f8f9fa);
    --gradient-secondary: linear-gradient(135deg, #f8f9fa, #e9ecef);
}
```

### Dark Theme Variables
```css
[data-theme="dark"] {
    --bg-primary: #1a1a2e;
    --bg-secondary: #16213e;
    --bg-tertiary: #0f1419;
    --text-primary: #f4f4f9;
    --text-secondary: #dbe3e9;
    --text-muted: #bdbdbd;
    --accent-primary: #9c27b0;
    --accent-secondary: #e040fb;
    --accent-hover: #7b1fa2;
    --border-color: #6a1b9a;
    --shadow-color: rgba(0, 0, 0, 0.3);
    --gradient-primary: linear-gradient(135deg, #1a1a2e, #16213e);
    --gradient-secondary: linear-gradient(135deg, #16213e, #0f1419);
}
```

## JavaScript API

### ThemeManager Class
The theme system is managed by the `ThemeManager` class:

```javascript
// Get current theme
const currentTheme = window.themeManager.getCurrentTheme();

// Manually set theme
window.themeManager.setTheme('light'); // or 'dark'

// Reset to system preference
window.themeManager.resetToSystemPreference();
```

### Events
The theme system listens for:
- `click` events on the toggle button
- `keydown` events (Enter/Space) for keyboard activation
- `change` events on system theme preference media query

## Usage Guidelines

### For Developers
1. **Use CSS Variables**: Always use CSS custom properties instead of hardcoded colors
2. **Test Both Themes**: Ensure all components work in both light and dark modes
3. **Accessibility**: Test with screen readers and keyboard navigation
4. **Performance**: Theme switching is optimized with CSS transitions

### For Content Creators
1. **Consistent Colors**: Use the defined color variables for consistency
2. **Contrast**: Ensure sufficient contrast ratios in both themes
3. **Images**: Consider how images look in both themes

## Browser Support
- **Modern Browsers**: Full support in Chrome, Firefox, Safari, Edge
- **CSS Variables**: IE11+ (with polyfill if needed)
- **localStorage**: IE8+ support
- **Media Queries**: IE9+ support

## Testing
To test the theme system:

1. **Manual Testing**:
   - Click the theme toggle button
   - Use keyboard navigation (Tab to focus, Enter/Space to activate)
   - Test with screen reader software
   - Change system theme preference

2. **Accessibility Testing**:
   - Use browser dev tools accessibility panel
   - Test with keyboard-only navigation
   - Verify ARIA labels and announcements

3. **Cross-browser Testing**:
   - Test in different browsers
   - Verify localStorage persistence
   - Check system theme detection

## Troubleshooting

### Theme Not Persisting
- Check if localStorage is enabled
- Verify browser supports localStorage
- Clear browser cache and try again

### System Theme Not Detecting
- Ensure browser supports `prefers-color-scheme`
- Check if user has set a system preference
- Fallback to default dark theme

### Accessibility Issues
- Verify ARIA labels are present
- Test keyboard navigation
- Check focus indicators visibility

## Future Enhancements
- **More Themes**: Additional color schemes (e.g., high contrast, sepia)
- **Custom Themes**: User-defined color preferences
- **Theme Scheduling**: Automatic theme switching based on time
- **Component-level Themes**: Different themes for different sections
