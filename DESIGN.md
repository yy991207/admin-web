# DESIGN.md — Vercel-Inspired Design System

## Color Tokens

```
/* Primary */
--geist-foreground: #171717
--geist-background: #ffffff
--geist-console-text-color-default: #000000

/* Workflow Accents */
--ship-text: #ff5b4f
--preview-text: #de1d8d
--develop-text: #0a72ef

/* Console/Code */
--geist-console-text-color-blue: #0070f3
--geist-console-text-color-purple: #7928ca
--geist-console-text-color-pink: #eb367f

/* Interactive */
--link-color: #0072f5
--ds-focus-color: hsla(212, 100%, 48%, 1)
--tw-ring-color: rgba(147, 197, 253, 0.5)

/* Neutral Scale */
--gray-900: #171717
--gray-600: #4d4d4d
--gray-500: #666666
--gray-400: #808080
--gray-100: #ebebeb
--gray-50: #fafafa

/* Surfaces */
--ds-overlay-backdrop-color: hsla(0, 0%, 98%, 1)
--geist-selection-text-color: hsla(0, 0%, 95%, 1)
--badge-blue-bg: #ebf5ff
--badge-blue-text: #0068d6
```

## Shadow System

```
/* Shadow-as-border (replaces CSS border) */
--shadow-border: rgba(0, 0, 0, 0.08) 0px 0px 0px 1px

/* Light ring for tabs/images */
--shadow-ring-light: rgb(235, 235, 235) 0px 0px 0px 1px

/* Subtle elevation */
--shadow-elevation: rgba(0, 0, 0, 0.04) 0px 2px 2px

/* Full card shadow stack */
--shadow-card: rgba(0,0,0,0.08) 0px 0px 0px 1px,
               rgba(0,0,0,0.04) 0px 2px 2px,
               rgba(0,0,0,0.04) 0px 8px 8px -8px,
               #fafafa 0px 0px 0px 1px
```

## Typography

```
/* Font Stack */
--font-sans: Geist, Arial, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol
--font-mono: Geist Mono, ui-monospace, SFMono-Regular, Roboto Mono, Menlo, Monaco, Liberation Mono, DejaVu Sans Mono, Courier New

/* OpenType */
font-feature-settings: "liga"  /* enabled globally */
```

### Type Scale

| Token | Size | Weight | Line-Height | Letter-Spacing |
|-------|------|--------|-------------|----------------|
| display-hero | 48px | 600 | 1.00–1.17 | -2.4px to -2.88px |
| section-heading | 40px | 600 | 1.20 | -2.4px |
| sub-heading-large | 32px | 600 | 1.25 | -1.28px |
| card-title | 24px | 600 | 1.33 | -0.96px |
| body-large | 20px | 400 | 1.80 | normal |
| body | 18px | 400 | 1.56 | normal |
| body-small | 16px | 400 | 1.50 | normal |
| button | 14px | 500 | 1.43 | normal |
| caption | 12px | 400–500 | 1.33 | normal |
| mono-body | 16px | 400 | 1.50 | normal |
| mono-caption | 13px | 500 | 1.54 | normal |

## Spacing Scale

```
1px, 2px, 3px, 4px, 5px, 6px, 8px, 10px, 12px, 14px, 16px, 32px, 36px, 40px
Base unit: 8px
```

## Border Radius

```
micro: 2px
subtle: 4px
standard: 6px
comfortable: 8px
image: 12px
large-pill: 64px
xl: 100px
full-pill: 9999px
circle: 50%
```

## Components

### Primary Dark Button
```
background: #171717
color: #ffffff
padding: 8px 16px
border-radius: 6px
```

### Primary White Button
```
background: #ffffff
color: #171717
padding: 0px 6px
border-radius: 6px
box-shadow: rgb(235, 235, 235) 0px 0px 0px 1px
```

### Pill Badge
```
background: #ebf5ff
color: #0068d6
padding: 0px 10px
border-radius: 9999px
font: 12px weight 500
```

### Card
```
background: #ffffff
border-radius: 8px (standard), 12px (featured)
box-shadow: rgba(0,0,0,0.08) 0px 0px 0px 1px,
            rgba(0,0,0,0.04) 0px 2px 2px,
            #fafafa 0px 0px 0px 1px
```

### Focus State
```
outline: 2px solid hsla(212, 100%, 48%, 1)
```

## Key Principles

1. **Shadow-as-border**: Use `box-shadow: 0px 0px 0px 1px rgba(0,0,0,0.08)` instead of CSS `border`
2. **Aggressive negative tracking**: Display text uses -2.4px to -2.88px letter-spacing
3. **Three weights only**: 400 (body), 500 (UI), 600 (headings)
4. **Workflow colors are functional**: Red/Pink/Blue mark pipeline stages, not decoration
5. **Inner ring creates glow**: The `#fafafa` inner shadow ring gives cards their characteristic depth
