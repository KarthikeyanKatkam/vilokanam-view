# Vilokanam Design System

## Overview

The Vilokanam Design System is a comprehensive set of guidelines, components, and styles that create a consistent and engaging user experience across our streaming platform. This system is built with a dark theme aesthetic that's common in gaming and streaming platforms, with vibrant accent colors for visual interest and clear hierarchy.

## Color Palette

### Primary Colors
Our primary color palette is based on purple, which conveys creativity, luxury, and innovation - perfect for a streaming platform.

- **Primary-500**: `#8b5cf6` (Main brand color)
- **Primary-600**: `#7c3aed` (Used for primary buttons and key elements)
- **Primary-700**: `#6d28d9` (Used for hover states and secondary accents)

### Secondary Colors
Secondary colors complement our primary palette and provide additional visual interest.

- **Secondary-500**: `#0ea5e9` (Used for secondary actions and highlights)
- **Secondary-600**: `#0284c7` (Used for hover states)

### Accent Colors
Accent colors are used for status indicators, alerts, and interactive elements.

- **Accent-Green**: `#10b981` (Success, online status)
- **Accent-Yellow**: `#f59e0b` (Warning, notifications)
- **Accent-Red**: `#ef4444` (Danger, live status, errors)
- **Accent-Pink**: `#ec4899` (Special accents, promotions)

### Neutral Colors
Neutral colors form the foundation of our UI, providing contrast and readability.

- **Neutral-800**: `#262626` (Card borders, dividers)
- **Neutral-900**: `#171717` (Card backgrounds)
- **Background-Dark**: `#0e0e10` (Main background)
- **Background-Card**: `#1f1f23` (Card backgrounds)

### Text Colors
Text colors ensure optimal readability across our dark theme.

- **Text-Primary**: `#ffffff` (Headings, primary text)
- **Text-Secondary**: `#adadb8` (Body text, labels)
- **Text-Muted**: `#71717a` (Hint text, disabled states)

## Typography

### Font Family
We use **Inter**, a modern sans-serif font designed for excellent readability on screens.

```css
font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
```

### Font Sizes
- **XS**: 12px (`0.75rem`)
- **SM**: 14px (`0.875rem`)
- **Base**: 16px (`1rem`)
- **LG**: 18px (`1.125rem`)
- **XL**: 20px (`1.25rem`)
- **2XL**: 24px (`1.5rem`)
- **3XL**: 30px (`1.875rem`)
- **4XL**: 36px (`2.25rem`)
- **5XL**: 48px (`3rem`)

### Font Weights
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

## Spacing System

Our spacing system uses an 8-point grid for consistent and harmonious layouts.

- **XS**: 4px (`0.25rem`)
- **SM**: 8px (`0.5rem`)
- **MD**: 16px (`1rem`)
- **LG**: 24px (`1.5rem`)
- **XL**: 32px (`2rem`)
- **2XL**: 48px (`3rem`)
- **3XL**: 64px (`4rem`)

## Border Radius

- **SM**: 4px (`0.25rem`)
- **MD**: 8px (`0.5rem`)
- **LG**: 12px (`0.75rem`)
- **XL**: 16px (`1rem`)
- **Full**: 9999px (Circular elements)

## Shadows

- **SM**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **MD**: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
- **LG**: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`
- **XL**: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`
- **2XL**: `0 25px 50px -12px rgba(0, 0, 0, 0.25)`

## Components

### Buttons

#### Variants
1. **Primary**: Used for primary actions like "Go Live" or "Start Streaming"
2. **Secondary**: Used for secondary actions
3. **Danger**: Used for destructive actions like "End Stream"
4. **Outline**: Used for less prominent actions
5. **Ghost**: Used for minimal emphasis actions

#### Sizes
- **SM**: Small buttons for compact spaces
- **MD**: Default button size
- **LG**: Large buttons for primary actions

### Cards

Cards are the primary container for content blocks with:
- Background: `#1f1f23`
- Border: `#262626`
- Border Radius: `0.5rem`
- Shadow: Medium elevation

### Forms

Form elements follow our dark theme with:
- Input Background: `#1f1f23`
- Input Border: `#262626`
- Focus Ring: `#8b5cf6` with 20% opacity

### Navigation

Navigation elements use our primary color for active states and hover effects, ensuring clear visual hierarchy and user guidance.

## Icons

Icons should use our primary or secondary colors for active states, with neutral colors for inactive states. All icons should be consistent in style and weight.

## Animations

### Live Indicators
Live indicators use a subtle pulsing animation to draw attention without being distracting:
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

### Hover Effects
Components have smooth transitions for hover states:
- **Duration**: 150ms
- **Timing Function**: Cubic bezier (0.4, 0, 0.2, 1)

## Responsive Design

Our design system follows mobile-first principles with breakpoints at:
- **SM**: 640px
- **MD**: 768px
- **LG**: 1024px
- **XL**: 1280px
- **2XL**: 1536px

## Accessibility

### Color Contrast
All text meets WCAG 2.1 AA standards for contrast:
- Text on dark backgrounds: Minimum 4.5:1 contrast ratio
- Large text on dark backgrounds: Minimum 3:1 contrast ratio

### Focus States
All interactive elements have visible focus states using our primary color:
```css
focus-visible {
  outline: 2px solid #8b5cf6;
  outline-offset: 2px;
}
```

### Semantic HTML
Components use semantic HTML elements where appropriate to ensure proper screen reader interpretation.

## Implementation Guidelines

### CSS Custom Properties
All design tokens are available as CSS custom properties for easy customization:
```css
:root {
  --primary-500: #8b5cf6;
  --background-dark: #0e0e10;
  --text-primary: #ffffff;
}
```

### Utility Classes
Tailwind CSS utility classes are used extensively, following our custom color palette and spacing system.

### Component Composition
Components are built to be composable and reusable, with clear prop interfaces and consistent styling.