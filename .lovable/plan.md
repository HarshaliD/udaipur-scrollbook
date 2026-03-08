

# My Udaipur Memory Journey — Single-Page Scrolling Travel Website

## Overview
A beautiful, single-page vertical scroll travel memory website for a 2-day Udaipur trip, styled as an illustrated travel sketchbook with warm pastel colors, handwritten fonts, and interactive scroll animations.

## Visual Design
- **Aesthetic**: Travel sketchbook / scrapbook with paper texture grain background
- **Fonts**: Google Fonts — `Caveat` for headings, `Lora` for body text
- **Color palette**: Warm creams, dusty oranges, soft blues, sage greens, ink brown
- **Custom CSS variables** for the full palette (cream, warm-orange, dusty-rose, soft-blue, sage, ink, gold)

## Page Structure (Single Continuous Scroll)

### 1. Hero Header
- Large handwritten title: "My Udaipur Memory Journey"
- Subtitle: "A two-day trip through the City of Lakes"
- Traveler icon, warm parchment background

### 2. Vertical Journey Path
- SVG curved dashed path running the full page length
- Progressive path drawing via `IntersectionObserver` as user scrolls
- Small traveler dot/icon that moves along the path with scroll progress

### 3. Six Location Sections
Each location card includes:
- **Numbered circle node** on the journey path
- **SVG illustration** (using the 6 uploaded SVGs) — starts grayscale, transitions to full color on visit
- **Location name + Day badge** (Day 1 or Day 2)
- **"Mark as Visited" button** — triggers color transition, sparkle animation, path lighting
- **Memory card**: photo upload (polaroid display), text note (notepad style), date field
- Alternating left/right layout on desktop, stacked on mobile

**Locations in order:**
- Day 1: City Palace → Lake Pichola Boat Ride → Jagdish Temple
- Day 2: Sajjangarh Monsoon Palace → Fateh Sagar Lake → Old City Walk

### 4. Trip Completed Section
- Appears dimmed until all 6 locations visited
- Photo collage of uploaded images
- Final message quote
- CSS confetti animation on completion

## Interactions & Animations
- **Mark as Visited**: button becomes green stamp, illustration goes grayscale→color (1.2s), sparkle burst animation, path segment lights up (dashed gray → solid orange)
- **Scroll animations**: fade-up cards via IntersectionObserver, progressive path drawing, subtle parallax on illustrations (±15px)
- **Polaroid photos**: white border cards with random rotation (±3°), slight shadow, clustered layout

## Data Persistence
- `localStorage` for visited status, text notes, and dates per location
- Photo uploads stored as object URLs in state only (not persisted across sessions)
- All inputs auto-save on change, restored on reload

## Technical Approach
- Single Index page with minimal component extraction
- All 6 SVG illustrations copied to `src/assets/` and used as images
- Pure CSS animations + vanilla IntersectionObserver (no GSAP/Framer Motion)
- Mobile-first responsive design

