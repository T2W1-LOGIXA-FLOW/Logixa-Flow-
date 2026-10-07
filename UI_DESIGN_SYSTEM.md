# Logixa Flow — UI Design System

> Owner: Frontend
> Update when: UI tokens, reusable components, accessibility behavior, or responsive patterns change
> Last Updated: 2026-10-08
> Do NOT put here: speculative designs or components not evidenced in the frontend.

## Scope

Records patterns evidenced in current frontend code. The legacy LAYER_INSIGHTS.md description is not treated as proof that UnifiedBackground2.tsx is active.

## Brand and color

Admin theme tokens: background #020617; surface #0a0f1e; raised surface #101728; border #1e293b; text #f8fafc; muted #94a3b8; cyan #22d3ee; blue #2563eb; orange #f59e0b; violet #8b5cf6; success #10b981; danger #ef4444. Public pages also use slate/cyan Tailwind classes.

## Typography

Strong heading and metric hierarchy, muted supporting text, and compact uppercase admin labels with increased letter spacing are established. No proprietary global font family is established by inspected styles.

## Spacing and radius

Admin shell uses px-4, sm:px-6, lg:px-8 and max-w-7xl. Controls commonly use px-3 py-2. Controls use rounded-lg; status badges and dots use rounded-full.

## Components

Cards use raised dark surfaces, subtle borders, rounded corners, and restrained shadows. Metric cards use compact padding, muted labels, and larger values. Actions use inline-flex, compact spacing, borders, rounded corners, and cyan focus/hover treatment. Form fields have labels and explicit error/helper patterns. Status badges use compact uppercase text and state dots. Error states use danger styling and alert semantics where appropriate.

Tabs, modals, progress, loading, and empty states do not have one global tokenized specification established by the inspected sources; treat new system-level rules as TBD.

## Layout and responsive behavior

PageBackground supplies a fixed, pointer-events-disabled background/overlay with content above it. AdminShell supplies sidebar, topbar, responsive main content, and a fixed bottom action area. Admin navigation uses an overlay/sidebar pattern on smaller screens and an expanded layout at the lg breakpoint.

## Accessibility

Current code provides keyboard navigation, focus trapping, screen-reader live regions, accessible focus states, form label/error/helper associations, skip-to-main behavior, reduced-motion support, and high-contrast detection. Admin CSS reduces animation and transitions when reduced motion is requested.

## Screens

Current surfaces include public content/search/legal pages, public agent when explicitly enabled, admin command and operations pages, admin agent chat, chat-session management, RAG pages, workflow pages, and other admin tools.

## TBD

Any visual rule not evidenced in current frontend code remains TBD.
