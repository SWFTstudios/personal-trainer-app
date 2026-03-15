# Project Instructions

## Project Summary
This project is a native iOS app built in SwiftUI for a premium, luxury-feeling fitness concierge experience.

The product is aimed at affluent users and premium personal trainers. The app should feel worth a high-ticket monthly subscription. It is not a generic fitness tracker. It should feel exclusive, polished, modern, and effortless.

This app may eventually support a multi-tenant model where different trainers can configure their own branding, logo, colors, and identity while sharing the same underlying platform.

---

## Product Goals

- Deliver a premium fitness concierge experience
- Feel luxurious, calm, futuristic, and highly curated
- Support both trainer-facing and client-facing flows
- Make premium coaching feel personal and high-touch
- Build with scale in mind using shared infrastructure and reusable components
- Keep the UX simple, clear, and elevated

---

## UX / UI Direction

The app should feel like a blend of:
- elite wellness club
- luxury hospitality
- premium fintech dashboard
- high-end concierge service
- modern performance coaching platform

### UX principles
- Spacious layout
- Strong hierarchy
- Refined information density
- Frictionless key flows
- Personalized feel
- Calm confidence
- No clutter
- No cheap "fitness app" energy

### Visual principles
- Generous spacing
- Structured grid system
- Elegant typography
- Premium cards and sections
- Subtle depth
- Clean color usage
- High readability
- Intentional alignment

### Avoid
- Busy dashboards
- Overly saturated colors
- Cramped rows
- Template-looking components
- Aggressive gradients
- Visually noisy screens
- Generic fitness UI patterns

---

## Theming and Branding

The app should be designed for dynamic branding support.

Each trainer/business may eventually have:
- custom brand name
- custom logo
- custom accent color
- custom imagery
- custom invite link/code

Therefore:
- use semantic color tokens
- avoid hardcoding branding directly into screens
- structure theming so trainer-specific styling can be injected
- separate global design system tokens from tenant branding tokens

### Theme architecture guidance
Use concepts like:
- AppTheme
- BrandTheme
- SemanticColor roles
- Typography tokens
- Spacing tokens
- Corner radius tokens
- Elevation/shadow tokens

Trainer branding should customize the app tastefully without breaking the premium base design system.

---

## Engineering Preferences

### Language / Framework
- Swift
- SwiftUI
- Swift Concurrency
- Modern Apple platform patterns

### Architecture preferences
- Feature-first folder organization
- Reusable design system
- Small, focused files
- Dependency injection where useful
- Testable services
- Lightweight views
- Observable presentation state scoped to each feature

### Coding style
- Clear names
- Minimal comments unless useful
- No unnecessary abstractions
- No giant files
- Prefer clarity over cleverness
- Avoid duplicated logic

---

## Folder Structure Preference

```text
App/
Core/
  DesignSystem/
  Theme/
  Networking/
  Storage/
  Services/
  Utilities/
  Extensions/
Features/
  Authentication/
  Onboarding/
  Dashboard/
  Trainer/
  Client/
  Workouts/
  Nutrition/
  Messages/
  Progress/
  Settings/
Resources/
Tests/
```
