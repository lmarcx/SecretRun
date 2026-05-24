---
name: project-design-system
description: Secret Run design system tokens — bg, accent, font
metadata:
  type: project
---

Design system canon values for Secret Run:
- Dark background: `#0A0A0F` (updated in `apps/mobile/theme/tokens.ts`)
- Accent violet: `#8250FF` (updated in tokens.ts — was #8B5CF6)
- Title font: **Syne** — not yet installed. To enable: `npx expo install @expo-google-fonts/syne expo-font`, then load it in `_layout.tsx` and uncomment `fontFamily: 'Syne_700Bold'` in PodiumTop3, MyRankCard, RunnerRow.

**Why:** User specified these as the authoritative brand values.
**How to apply:** Use `colors.accent` and `colors.background` from tokens — they reflect these values. For Syne, search `fontFamily: 'Syne_700Bold'` comments in the new components.
