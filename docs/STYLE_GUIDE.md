# Prophezeiung Style Guide

A comprehensive design system documentation for the Prophezeiung application.

---

## 1. Overview

### Design Philosophy
The Prophezeiung app employs a **dark, mystical aesthetic** inspired by fortune-telling and prophecy themes. The design features:

- **Deep dark backgrounds** with subtle blue undertones
- **Cyan/teal accent colors** that create an ethereal, glowing effect
- **Glassmorphism** elements with backdrop blur and transparency
- **Animated fog effects** for atmospheric depth
- **Subtle glow effects** on interactive elements

### Tech Stack
- **Tailwind CSS v4** - Utility-first CSS framework
- **Mantine UI v7** - React component library (with custom dark theme overrides)
- **CSS Custom Properties** - For theme variables and consistency

### File Structure
```
src/app/globals.css    # All custom styles and CSS variables
```

---

## 2. Color Palette

### Dark Theme Base Colors
| Variable | Hex | RGB | Usage |
|----------|-----|-----|-------|
| `--color-dark-950` | `#0a0f1a` | `10, 15, 26` | Primary background |
| `--color-dark-900` | `#102a43` | `16, 42, 67` | Card backgrounds, elevated surfaces |
| `--color-dark-800` | `#243b53` | `36, 59, 83` | Dropdowns, tooltips, secondary surfaces |
| `--color-dark-700` | `#334e68` | `51, 78, 104` | Borders, dividers |
| `--color-dark-600` | `#486581` | `72, 101, 129` | Subtle borders |

### Accent Colors
| Variable | Hex | RGB | Usage |
|----------|-----|-----|-------|
| `--color-cyan-500` | `#06b6d4` | `6, 182, 212` | Primary accent, focus states |
| `--color-cyan-400` | `#22d3ee` | `34, 211, 238` | Highlighted text, hover states |
| `--color-teal-500` | `#14b8a6` | `20, 184, 166` | Secondary accent, gradients |
| `--color-emerald-500` | `#10b981` | `16, 185, 129` | Tertiary accent, success states |

### Text Colors
| Variable | Hex | Usage |
|----------|-----|-------|
| `--text-primary` | `#f0f4f8` | Main body text, headings |
| `--text-secondary` | `#9fb3c8` | Descriptions, secondary information |
| `--text-muted` | `#627d98` | Hints, placeholders, meta info |

### Glow Effect Colors
| Variable | RGBA | Usage |
|----------|------|-------|
| `--glow-cyan` | `rgba(6, 182, 212, 0.4)` | Standard glow |
| `--glow-cyan-strong` | `rgba(6, 182, 212, 0.6)` | Intense glow (hover) |
| `--glow-cyan-subtle` | `rgba(6, 182, 212, 0.2)` | Subtle ambient glow |

### Rating Slider Gradient
A multi-color gradient for the -10 to +10 rating scale:
```css
linear-gradient(90deg, #ef4444, #eab308 40%, #22d3ee 60%, #14b8a6)
```
- **Red** (`#ef4444`): Negative values (-10 to -5)
- **Orange** (`#f97316`): Slightly negative (-5 to 0)
- **Yellow** (`#eab308`): Neutral (0)
- **Cyan** (`#22d3ee`): Slightly positive (0 to +5)
- **Teal** (`#14b8a6`): Positive values (+5 to +10)

### Tailwind Theme Integration
```css
@theme inline {
  --color-background: var(--color-dark-950);
  --color-foreground: var(--text-primary);
  --color-primary: var(--color-cyan-500);
  --color-accent: var(--color-teal-500);
}
```

---

## 3. Typography

### Font Stack
The application uses the system default font stack (inherited from Next.js/Tailwind).

### Text Sizes (Tailwind Classes)
| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Tags, badges, meta info |
| `text-sm` | 14px | Helper text, captions |
| `text-base` | 16px | Body text (default) |
| `text-lg` | 18px | Lead paragraphs, emphasized text |
| `text-xl` | 20px | Card titles, section headers |
| `text-2xl` | 24px | Page titles, important values |
| `text-4xl` | 36px | Hero headings (mobile) |
| `text-5xl` | 48px | Hero headings (desktop) |

### Font Weights
| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-semibold` | 600 | Buttons, card titles |
| `font-bold` | 700 | Headings, important text |

### Special Text Effects

#### Gradient Text
```css
.gradient-text {
  background: linear-gradient(135deg, var(--color-cyan-400), var(--color-teal-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

#### Highlighted Text
```css
.text-highlight {
  color: var(--color-cyan-400);
  text-shadow: 0 0 20px var(--glow-cyan-subtle);
}
```

### Text Color Classes
- `text-foreground` - Primary text (`--text-primary`)
- `text-(--text-secondary)` - Secondary text
- `text-(--text-muted)` - Muted text
- `text-highlight` - Cyan with glow
- `gradient-text` - Cyan-teal gradient

---

## 4. Spacing System

### Tailwind Spacing Scale
The project uses Tailwind's default spacing scale:

| Class | Value | Pixels |
|-------|-------|--------|
| `p-2`, `m-2`, `gap-2` | 0.5rem | 8px |
| `p-3`, `m-3`, `gap-3` | 0.75rem | 12px |
| `p-4`, `m-4`, `gap-4` | 1rem | 16px |
| `p-6`, `m-6`, `gap-6` | 1.5rem | 24px |
| `p-8`, `m-8`, `gap-8` | 2rem | 32px |
| `p-12`, `m-12` | 3rem | 48px |
| `p-16`, `m-16` | 4rem | 64px |
| `p-20`, `m-20` | 5rem | 80px |

### Common Spacing Patterns

#### Page Layout (Gap-Based)
```jsx
<div className="min-h-screen p-8 md:p-12 max-w-7xl mx-auto flex flex-col gap-8">
```
- Mobile: `p-8` (32px padding)
- Desktop: `p-12` (48px padding)
- Max width: `max-w-7xl` (1280px)
- **Sections use `gap-8`** instead of margins

#### Section Spacing (Prefer Gaps over Margins)
Use `flex flex-col gap-*` for vertical spacing between sections:
- Main sections: `gap-8` (32px)
- Hero internal: `gap-6` (24px)
- Grid items: `gap-8` (32px)

#### Card Internal Spacing
- Standard cards: `p-6` (24px)
- Compact cards: `p-4` (16px)

#### Element Spacing
- Between form fields: `space-y-4` (16px)
- Between buttons: `gap-4` (16px)
- Between tags: `gap-3` (12px)
- Navigation links: `gap-8` (32px)
- Inline elements: `gap-3` (12px)

---

## 5. Shadows & Elevations

### Glow Shadows
The design uses glow-based shadows instead of traditional drop shadows.

#### Subtle Glow
```css
box-shadow: 0 0 15px var(--glow-cyan-subtle);
/* = 0 0 15px rgba(6, 182, 212, 0.2) */
```

#### Standard Glow
```css
box-shadow: 0 0 20px var(--glow-cyan);
/* = 0 0 20px rgba(6, 182, 212, 0.4) */
```

#### Strong Glow (Hover)
```css
box-shadow: 0 0 25px var(--glow-cyan),
            0 0 50px var(--glow-cyan-subtle);
```

### Component-Specific Shadows

#### Cards
```css
/* Default */
box-shadow: 0 0 15px var(--glow-cyan-subtle),
            inset 0 1px 0 rgba(6, 182, 212, 0.1);

/* Hover */
box-shadow: 0 0 25px var(--glow-cyan),
            0 0 50px var(--glow-cyan-subtle),
            inset 0 1px 0 rgba(6, 182, 212, 0.15);
```

#### Buttons (Primary)
```css
/* Hover */
box-shadow: 0 0 25px var(--glow-cyan),
            0 10px 30px rgba(0, 0, 0, 0.3);
```

#### Input Focus
```css
box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15),
            0 0 20px rgba(6, 182, 212, 0.1);
```

#### Tooltips
```css
box-shadow: 0 0 20px rgba(6, 182, 212, 0.15),
            0 10px 30px rgba(0, 0, 0, 0.4);
```

#### Dropdowns
```css
box-shadow: 0 0 20px rgba(6, 182, 212, 0.15),
            0 10px 30px rgba(0, 0, 0, 0.4);
```

---

## 6. Animations & Transitions

### Transition Defaults

#### Standard Transition
```css
transition: all 0.3s ease;
```

#### Smooth Easing (Cards, Badges)
```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

#### Fast Transition (Sliders)
```css
transition: all 0.2s ease;
```

### Keyframe Animations

#### Pulse Glow
```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px var(--glow-cyan-subtle); }
  50% { box-shadow: 0 0 40px var(--glow-cyan); }
}
.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

#### Floating Particles
```css
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
  50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
}
.particle {
  animation: float 3s ease-in-out infinite;
}
```

#### Fog Drift Animations
5 unique fog animations with chaotic multi-point keyframes:
- `fog-drift-1`: 8s duration, 4 waypoints
- `fog-drift-2`: 11s duration, 4 waypoints (irregular timing: 0%, 20%, 45%, 70%, 100%)
- `fog-drift-3`: 13s duration, 4 waypoints (0%, 30%, 55%, 80%, 100%)
- `fog-drift-4`: 7s duration, 4 waypoints (0%, 35%, 60%, 85%, 100%)
- `fog-drift-5`: 9s duration, 4 waypoints (0%, 22%, 48%, 73%, 100%)

Each includes:
- `translateX` and `translateY` for position
- `scale` for size variation (0.9 - 1.1)

#### Fog Opacity Animations
3 opacity animations with irregular timing:
- `fog-opacity-1`: 0.5 - 0.9 opacity
- `fog-opacity-2`: 0.5 - 1.0 opacity
- `fog-opacity-3`: 0.55 - 0.95 opacity

### Hover Transforms

#### Lift Effect
```css
transform: translateY(-2px);
```
Used on: Cards, Primary buttons

#### Scale Effects
```css
/* Slider thumb hover */
transform: scale(1.1);

/* Slider thumb focus */
transform: scale(1.15);

/* Button active */
transform: translateY(0);
```

### Link Underline Animation
```css
.link-underline::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--color-cyan-500), var(--color-teal-500));
  transition: width 0.3s ease;
}

.link-underline:hover::after {
  width: 100%;
}
```

---

## 7. Borders

### Border Radius

| Usage | Value | Class |
|-------|-------|-------|
| Buttons, Inputs | 8px | `rounded-lg` |
| Cards | 16px | `rounded-2xl` (custom: `border-radius: 16px`) |
| Tags/Badges | 9999px | `rounded-full` |
| Dropdown options | 4px | `rounded` |
| Slider track | 4px | Custom |
| Scrollbar thumb | 3px | Custom |

### Border Colors

#### Default State
```css
border: 1px solid rgba(98, 125, 152, 0.3);  /* Inputs */
border: 1px solid rgba(6, 182, 212, 0.25);  /* Cards */
border: 1px solid rgba(6, 182, 212, 0.3);   /* Badges, Tooltips */
```

#### Hover State
```css
border-color: rgba(98, 125, 152, 0.5);      /* Inputs */
border-color: rgba(6, 182, 212, 0.4);       /* Cards */
border-color: rgba(6, 182, 212, 0.6);       /* Badges */
```

#### Focus State
```css
border-color: var(--color-cyan-500);        /* Inputs - solid cyan */
```

### Border Styles
All borders are `solid` with `1px` width.

---

## 8. Opacity & Transparency

### Background Opacity Levels

| Opacity | RGBA | Usage |
|---------|------|-------|
| 80% | `rgba(16, 42, 67, 0.8)` | Card backgrounds (primary) |
| 60% | `rgba(16, 42, 67, 0.6)` | Card backgrounds (secondary) |
| 50% | `rgba(16, 42, 67, 0.5)` | Input backgrounds |
| 30% | `rgba(6, 182, 212, 0.3)` | Text selection |
| 20% | `rgba(6, 182, 212, 0.2)` | Badge hover, selected options |
| 15% | `rgba(6, 182, 212, 0.15)` | Focus rings, hovered options |
| 10% | `rgba(6, 182, 212, 0.1)` | Badge default, subtle glows |

### Glow Opacity Levels
- Subtle: 20% (`--glow-cyan-subtle`)
- Standard: 40% (`--glow-cyan`)
- Strong: 60% (`--glow-cyan-strong`)

### Fog Layer Opacity
- Base range: 0.25 - 0.5
- Animation range: 0.5 - 1.0

### Glassmorphism
```css
.glow-card {
  background: rgba(16, 42, 67, 0.6);
  backdrop-filter: blur(10px);
}
```

### Scrollbar
```css
scrollbar-color: rgba(255, 255, 255, 0.15) var(--color-dark-950);

/* Hover */
background: rgba(255, 255, 255, 0.25);
```

---

## 9. Tailwind Usage

### Configuration
The project uses **Tailwind CSS v4** with the new import syntax:
```css
@import "tailwindcss";
```

### Theme Extension
Custom theme values are defined via `@theme inline`:
```css
@theme inline {
  --color-background: var(--color-dark-950);
  --color-foreground: var(--text-primary);
  --color-primary: var(--color-cyan-500);
  --color-accent: var(--color-teal-500);
}
```

### Common Utility Patterns

#### Layout (Gap-Based)
```jsx
// Page container with gap-based spacing
<div className="min-h-screen p-8 md:p-12 max-w-7xl mx-auto relative z-10 flex flex-col gap-8">

// Grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 gap-8">

// Centering
<div className="text-center">
<div className="mx-auto max-w-2xl">

// Full-width items in grid
<div className="md:col-span-2 max-w-md mx-auto w-full">
```

#### Flexbox
```jsx
// Navigation
<nav className="flex gap-8">

// Button groups
<div className="flex flex-wrap gap-4">

// Alignment
<div className="flex justify-between items-center">
```

#### Responsive Design
```jsx
// Mobile-first padding
className="p-8 md:p-12"

// Responsive text
className="text-4xl md:text-5xl"

// Responsive columns
className="grid-cols-1 md:grid-cols-2"

// Full-width span
className="md:col-span-2"
```

#### Typography
```jsx
// Headings
className="text-2xl font-bold"
className="text-xl font-semibold"

// Body text
className="text-(--text-secondary) text-lg"
className="text-(--text-muted) text-sm"
```

#### Spacing (Prefer Gaps)
```jsx
// Use gaps for section spacing (NOT margins)
className="flex flex-col gap-8"  // Page sections
className="gap-6"                // Hero internal elements
className="gap-4"                // Medium spacing
className="gap-3"                // Inline elements, tags

// Padding (for internal card spacing)
className="p-6"        // Standard card padding
className="p-4"        // Compact card padding
className="px-4 py-2"  // Badge padding
className="px-3 py-1"  // Small badge padding

// Only use margins for small internal spacing
className="mb-4"  // Title to content gap within cards
className="mb-3"  // Label to input gap
```

### CSS Variable Usage in Tailwind
```jsx
// Text colors using CSS variables
className="text-(--text-secondary)"
className="text-(--text-muted)"

// Background colors
className="bg-cyan-400"  // Tailwind default
```

### Custom CSS Classes (Not Tailwind)
These classes are defined in `globals.css` and should be used as-is:

| Class | Purpose |
|-------|---------|
| `.card-dark` | Dark glassmorphism card |
| `.glow-card` | Alternative glow card |
| `.glow-badge` | Glowing badge/tag |
| `.glow-button` | Glowing button |
| `.btn-primary` | Primary gradient button |
| `.btn-outline` | Outline button |
| `.input-dark` | Dark input styling |
| `.link-underline` | Animated underline link |
| `.text-highlight` | Cyan text with glow |
| `.gradient-text` | Gradient text effect |
| `.ghost-glow` | Hover glow effect |
| `.tooltip-dark` | Dark tooltip styling |
| `.rating-slider` | Custom range slider |
| `.fog-container` | Fog background container |
| `.fog-layer` | Individual fog layer |
| `.animate-pulse-glow` | Pulsing glow animation |
| `.particle` | Floating particle |

---

## 10. Component Reference

### Card
Wiederverwendbare Card-Komponente mit Glasmorphismus-Optik.

```jsx
import { Card } from "@/components/Card";

// Basis-Verwendung
<Card>
  <Card.Title>Titel</Card.Title>
  <p className="text-(--text-secondary)">Inhalt</p>
</Card>

// Mit Grid-Span
<Card colSpan={2}>
  <Card.Title>Volle Breite</Card.Title>
  <p>Spannt 2 Spalten im md:grid-cols-2 Layout</p>
</Card>

// Custom Padding
<Card padding="p-4">
  <p>Kompaktere Card</p>
</Card>

// Mit zusätzlichen Klassen
<Card className="max-w-md mx-auto">
  <Card.Title>Zentriert</Card.Title>
</Card>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | - | Card-Inhalt |
| `padding` | string | "p-6" | Tailwind Padding-Klasse |
| `colSpan` | 1 \| 2 | - | Grid Column-Span (md breakpoint) |
| `className` | string | "" | Zusätzliche CSS-Klassen |

**Card.Title:**
Vordefinierter Titel mit korrektem Styling (`text-xl font-semibold mb-4 text-highlight`).

**CSS-Klasse (Legacy):**
```jsx
// Direkte CSS-Klasse (für Fälle ohne React-Komponente)
<div className="card-dark p-6">
  <h3 className="text-xl font-semibold mb-4 text-highlight">Title</h3>
  <p className="text-(--text-secondary) mb-4">Description</p>
</div>
```

### Button
Standard-Buttons mit Glow-Effekt.

```jsx
import { Button } from "@/components/Button";

// Primary (default)
<Button>Primary Button</Button>

// Outline
<Button variant="outline">Outline Button</Button>

// Disabled
<Button disabled>Disabled</Button>

// Mit onClick
<Button onClick={handleClick}>Klick mich</Button>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | - | Button-Text |
| `variant` | "primary" \| "outline" | "primary" | Button-Stil |
| `disabled` | boolean | false | Deaktiviert |
| `className` | string | "" | Zusätzliche CSS-Klassen |
| `...props` | ButtonHTMLAttributes | - | Alle nativen Button-Props |

**Animationen:**
- Hover: `scale(1.05)`
- Active/Click: `scale(0.95)`
- Disabled: Keine Animation, `opacity: 0.5`

**CSS-Klassen (Legacy):**
```jsx
<button className="btn-primary"><span>Text</span></button>
<button className="btn-outline"><span>Text</span></button>
```

### AI Button
Button mit fließendem Gradient-Rand für KI-Aktionen.

```jsx
import { AiButton } from "@/components/AiButton";

<AiButton>KI Vorschlag</AiButton>
<AiButton onClick={handleClick}>Analysieren</AiButton>
<AiButton disabled>Deaktiviert</AiButton>
```

**Features:**
- Animierter Gradient-Rand (cyan → teal → violet → purple)
- Subtiler Inner-Glow bei Hover
- Gleiche Scale-Animation wie andere Buttons
- Erweitert `ButtonHTMLAttributes` für volle Button-API

### Inputs (Mantine)
```jsx
<TextInput placeholder="Enter text..." />
<Textarea placeholder="Long text..." rows={3} />
<Select
  placeholder="Select..."
  data={[{ value: "1", label: "Option 1" }]}
/>
```

### GlowBadge
Leuchtende Badges für Tags, Status-Anzeigen und Hinweise.

```jsx
import { GlowBadge } from "@/components/GlowBadge";

// Standard (klein)
<GlowBadge>Tag 1</GlowBadge>

// Mit Dot-Indikator
<GlowBadge withDot>Live</GlowBadge>

// Größer
<GlowBadge size="md">Status</GlowBadge>

// Kombiniert
<GlowBadge size="md" withDot className="self-center">
  Design Demo
</GlowBadge>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | - | Badge-Inhalt |
| `size` | "sm" \| "md" | "sm" | Größe (sm: text-xs, md: text-sm) |
| `withDot` | boolean | false | Pulsierender Dot-Indikator |
| `className` | string | "" | Zusätzliche CSS-Klassen |

**CSS-Klasse (Legacy):**
```jsx
<span className="glow-badge px-3 py-1 rounded-full text-xs">Tag</span>
```

### Links
```jsx
<a href="#" className="link-underline">Link Text</a>
```

### Rating Slider
Bewertungsslider mit Farbcodierung (-10 bis +10).

```jsx
import { RatingSlider } from "@/components/RatingSlider";

// Controlled
<RatingSlider
  value={sliderValue}
  onChange={setSliderValue}
  label="Bewertung"
/>

// Uncontrolled
<RatingSlider label="Deine Einschätzung" />

// Disabled
<RatingSlider value={5} disabled />
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | number | - | Controlled value |
| `onChange` | (value: number) => void | - | Change handler |
| `min` | number | -10 | Minimum value |
| `max` | number | 10 | Maximum value |
| `label` | string | - | Optional label |
| `disabled` | boolean | false | Disable input |

**Color Mapping:**
- Red (`#ef4444`): -10 to -5
- Orange (`#f97316`): -5 to 0
- Yellow (`#eab308`): 0
- Cyan (`#22d3ee`): 0 to +5
- Teal (`#14b8a6`): +5 to +10

### Fog Background
Animierter Nebel-Hintergrund mit 5 Schichten.

```jsx
import { FogBackground } from "@/components/FogBackground";

<FogBackground />
```

Platziere die Komponente am Anfang deiner Seite. Der Inhalt benötigt `relative z-10` um über dem Nebel zu erscheinen.

### Particle Burst Effect
Interactive particle effect that creates energy bursts at cursor/touch position.

```jsx
import { ParticleBurst } from "@/components/ParticleBurst";

<ParticleBurst
  particleCount={8}           // Particles per burst
  desktopMinInterval={30000}  // Desktop: 30-45 sec random interval
  desktopMaxInterval={45000}
  mobileMinInterval={200}     // Mobile: 200-400ms while touching
  mobileMaxInterval={400}
  speed={3}                   // Flight speed (px/frame)
  fadeDuration={1000}         // Fade-out duration (ms)
  minSize={2}                 // Particle size range (px)
  maxSize={6}
/>
```

**Features:**
- Chaotic wobble movement (particles drift randomly)
- Multi-color palette (cyan, teal, emerald, violet, purple, indigo)
- Layered glow effect per particle
- Desktop: Periodic bursts at mouse position
- Mobile: Rapid bursts only while touching screen

**Default Colors:**
```javascript
["#22d3ee", "#14b8a6", "#06b6d4", "#10b981", "#8b5cf6", "#a855f7", "#6366f1"]
```

### Glass Progress Bar
Display-only progress bar styled as a glass tube filled with animated fog.

```jsx
import { GlassProgressBar } from "@/components/GlassProgressBar";

// Horizontal (default)
<GlassProgressBar value={75} />
<GlassProgressBar value={45} color="#14b8a6" />
<GlassProgressBar value={25} color="#8b5cf6" thickness={16} />

// Vertical
<GlassProgressBar
  value={80}
  orientation="vertical"
  length={120}
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | number | - | Progress value (0-100) |
| `orientation` | "horizontal" \| "vertical" | "horizontal" | Bar direction |
| `thickness` | number | 24 | Height (horizontal) or width (vertical) in px |
| `length` | number \| string | "100%" | Width (horizontal) or height (vertical) |
| `color` | string | "#22d3ee" | Fill color (hex) |

**Visual Features:**
- Glass tube effect with inner highlight
- Multi-layer animated fog fill
- Soft glow at fill edge
- Smooth value transitions (500ms)

---

## 11. Scrollbar Styling

Custom scrollbar with theme-matching colors:

```css
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(6, 182, 212, 0.3) var(--color-dark-950);
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-dark-950);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(6, 182, 212, 0.4) 0%, rgba(20, 184, 166, 0.3) 100%);
  border-radius: 4px;
  border: 1px solid rgba(6, 182, 212, 0.2);
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(6, 182, 212, 0.6) 0%, rgba(20, 184, 166, 0.5) 100%);
  box-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
}
```

---

## 12. Z-Index Layers

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Fog background | 0 | `.fog-container` |
| Main content | 10 | Page content wrapper |
| Particle bursts | 50 | `ParticleBurst` component |
| Tooltips | auto | Mantine handles |
| Dropdowns | auto | Mantine handles |
| Modals | auto | Mantine handles |

---

## 13. Accessibility Notes

### Focus States
All interactive elements have visible focus indicators:
- **Inputs**: Cyan border + glow ring (`box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15)`)
- **Buttons**: Enhanced glow effect
- **Slider**: Cyan outline (`outline: 2px solid var(--color-cyan-500); outline-offset: 4px`)
- **Links**: Color change + underline

### Color Contrast
- Primary text on dark: `#f0f4f8` on `#0a0f1a` (high contrast)
- Secondary text: `#9fb3c8` (adequate contrast)
- Muted text: `#627d98` (use sparingly, for non-critical info)

### Motion Considerations
- Fog animations run continuously (consider `prefers-reduced-motion`)
- All transitions use reasonable durations (0.2s - 0.3s)

---

## 14. Best Practices

1. **Use CSS variables** for colors to maintain consistency
2. **Prefer custom classes** (`.card-dark`, `.btn-primary`) over inline Tailwind for complex components
3. **Use Tailwind** for layout, spacing, and simple utilities
4. **Wrap button text in `<span>`** for proper z-index layering with pseudo-element overlays
5. **Always add `relative z-10`** to content containers when using the fog background
6. **Use `glow-badge`** for interactive tags, not plain spans
7. **Test focus states** for keyboard navigation
8. **Prefer gaps over margins** for section spacing - use `flex flex-col gap-8` instead of margin-based spacing
9. **Use outline for focus indicators** on custom controls like sliders - outline works more reliably than box-shadow
