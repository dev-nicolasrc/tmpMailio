# TmpMail UI Redesign — Design Spec

**Date:** 2026-03-12
**Status:** Approved
**Scope:** Frontend only (`apps/frontend`)

---

## 1. Overview

Rediseño de la interfaz de TmpMail para mejorar la experiencia de usuario con un layout tipo cliente de correo real (split-view), tipografía tech, hero centrado, y eliminación total de los espacios publicitarios.

---

## 2. Typography

**Decision:** Use `JetBrains Mono` (already installed) for mono/tech role — same developer-tool aesthetic as Geist Mono, zero added risk. `Space Grotesk` replaces `Inter` for all text (body + headings). Drop `Inter` from the font load entirely.

| Role | Font | Tailwind class |
|------|------|----------------|
| All headings + UI labels + buttons + body | **Space Grotesk** 400/500/600/700 | `font-sans`, `font-heading` |
| Email address / timestamps / mono code | **JetBrains Mono** 400/500/700 | `font-mono` |

**Changes required:**

1. `app/[locale]/layout.tsx`:
   - Remove `Inter` import entirely
   - Keep `Space_Grotesk` and `JetBrains_Mono` (already imported)
   - Only two `variable` classes needed: `spaceGrotesk.variable` + `jetbrainsMono.variable`

2. `tailwind.config.ts`:
   - `fontFamily.sans` → `["var(--font-space)", "sans-serif"]` (replaces `var(--font-inter)`)
   - `fontFamily.heading` → `["var(--font-space)", "sans-serif"]` (unchanged)
   - `fontFamily.mono` → `["var(--font-mono)", "monospace"]` (unchanged)

3. `app/globals.css`:
   - Line: `font-family: "Inter", sans-serif;` on `body` → change to `font-family: var(--font-space), sans-serif;`

---

## 3. Page Layout

### 3.1 Header / Nav
Unchanged: `TmpMail` logo (left) + `ThemeToggle` (right).

### 3.2 Hero Section

Full-width centered column, `max-w-2xl mx-auto`, padding `py-12 px-4`. Subtle gradient background from top: `from-accent-primary/4 to-transparent`.

Elements top to bottom:
1. `<h1>` — "Tu correo temporal, listo al instante" — `font-heading font-bold text-2xl md:text-3xl text-center`
2. **Email display box** — `font-mono text-lg text-accent-secondary`, bordered card (`border border-accent-primary/40 bg-bg-secondary rounded-xl px-6 py-3 w-full max-w-sm mx-auto text-center shadow-[0_0_18px_rgba(108,99,255,0.12)]`)
3. **Action row** — `flex flex-wrap gap-2 justify-center`:
   - `⎘ Copiar correo` — `btn-primary` (purple filled) — uses `useClipboard`, icon flips to check for 2s
   - `↺ Nuevo aleatorio` — `btn-secondary` (purple outline) — calls `createMailbox()`
   - `⊞ Código QR` — `btn-cyan` (cyan outline) — opens `QRModal`
   - `✕ Eliminar` — `btn-danger` (red outline) — calls `deleteMailbox()` + `createMailbox()`, clears `selectedEmail`
4. **Timer chip** — `flex items-center gap-2 px-3 py-1 rounded-full border border-accent-primary/20 bg-accent-primary/5`:
   - Colored dot (6px, same color thresholds as current: purple > 40%, orange > 15%, red < 15%)
   - `font-mono text-xs` text: "Expira en MM:SS"
   - Same countdown logic as `ExpirationTimer`; only the shape changes

**Toolbar component is dissolved.** Its 4 buttons move into `page.tsx` hero section directly. `DomainDropdown` is removed from the action row (out of scope — simplification). `QRModal` state (`showQR`) moves to `page.tsx`.

### 3.3 Split-View Email Client

Replaces all of: `InboxPanel` + `EmailModal` + all `AdSlot` components.

**Desktop (`md:` ≥ 768px) — includes tablet:**
```
┌──────────────────────────────────────────────────────────────┐
│  EmailList (36% / min-w-[240px])  │  EmailViewer (flex:1)   │
│  border-r border-[var(--border)]  │                          │
│  overflow-y-auto                  │  overflow-y-auto          │
└──────────────────────────────────────────────────────────────┘
```
Container: `w-full max-w-5xl mx-auto flex`, `min-height: 400px`, within a section that fills remaining viewport height (`flex-1`).

**Mobile (< `md` / < 768px):**
- Default: `EmailList` full width
- When `selectedEmail !== null`: `EmailViewer` full width + back button (`← Bandeja`) top-left of viewer header
- Back button calls `clearSelectedEmail()` from store
- Escape key also clears selection (event listener in `EmailViewer`)
- No animation needed (simple conditional render)

**Deleted mailbox:** `handleDelete` already calls `clearSelectedEmail()` via `deleteMailbox()` → confirm this in the store, or call it explicitly after delete.

### 3.4 FAQ + Footer
Preserved below the split-view, unchanged.

---

## 4. Component Specification

### 4.1 Delete: `AdSlot`
- Delete `components/AdSlot/AdSlot.tsx`
- Remove all 4 `<AdSlot>` usages from `page.tsx`:
  - `hidden md:flex` desktop 728x90
  - `flex md:hidden` mobile 320x100
  - `hidden md:block` sidebar 300x250
  - `md:hidden fixed bottom-0` sticky footer 320x50 — remove the entire wrapper `<div>`

### 4.2 Modify: `app/[locale]/page.tsx`

New structure:
```
<div className="min-h-screen flex flex-col bg-bg-primary">
  <header> ... logo + ThemeToggle </header>
  <main className="flex-1 flex flex-col">
    <section className="hero"> ... title + email + actions + timer </section>
    <section className="flex-1 flex flex-col">
      <div className="split-view"> EmailList | EmailViewer </div>
    </section>
    <FAQAccordion />
  </main>
  <Footer />
  <QRModal /> {/* conditional */}
  <script type="application/ld+json" ... />
</div>
```

State managed in `page.tsx`:
- `showQR: boolean` (was in Toolbar)
- All mailbox state from `useMailbox()`

### 4.3 Modify: `InboxPanel.tsx` → redesign in place

New props interface:
```ts
interface EmailListProps {
  emails: EmailHeader[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading: boolean
}
```

Row layout (each `EmailHeader`):
```
[ unread-dot? ] [ From bold/normal ]  [ time font-mono ]
               [ Subject ]
               [ Preview snippet — first 80 chars of preview if available, else empty ]
```

- Unread dot: 6px green circle with `box-shadow: 0 0 4px var(--success)` — shown for all emails (since `EmailHeader` type does not include a read/unread flag from the backend). All new incoming emails are treated as unread visually; dot is removed once the email is opened (selected). Implement via local Set in component: `const [readIds, setReadIds] = useState<Set<string>>(new Set())` — add id to set when `onSelect` is called.
- Selected row: `border-l-2 border-accent-primary bg-accent-primary/[0.08] pl-[10px]`
- Hover: `hover:bg-bg-secondary cursor-pointer`
- Notification bell button stays in list header (right side of header bar)

**List header:**
```
[ BANDEJA  badge:count ]           [ bell icon ]
```

**Bottom of list (always visible, after all rows):**
```
[ 10px spinner ] Esperando correos...
```
Spinner: 12px circle, `border-t-accent-primary`, `animate-spin`. Text: `text-xs text-text-secondary/40`. This is always rendered, not conditional on `isLoading`.

**Initial load state** (when `emails.length === 0 && isLoading`): show `SkeletonLoader` instead of empty list + spinner row.

### 4.4 Modify: `EmailModal.tsx` → `EmailViewer` (rename file and component)

New: `components/EmailViewer/EmailViewer.tsx`

Props:
```ts
interface EmailViewerProps {
  email: Email | null
  isMobile: boolean   // drives back-button visibility
  onBack: () => void  // mobile only: calls clearSelectedEmail
}
```

**Layout:** `flex flex-col h-full overflow-hidden` — fills its grid cell completely.

When `email === null`:
```
[ flex-1, centered vertically + horizontally ]
[ ✉ icon (opacity-20, text-4xl) ]
[ "Selecciona un correo para leerlo" text-sm text-text-secondary/40 ]
```

When `email !== null`:
- **Header:** `flex-shrink-0 p-3 border-b`. Subject (bold font-heading) + meta line (`De: X · Para: Y · date` in `font-mono text-xs text-text-secondary`). Mobile back button (`← Bandeja`, `aria-label="Volver a bandeja"`) top-left, only when `isMobile` prop is true. Back button text uses `useTranslations("inbox")` key `"back"` (add key to i18n files).
- **Tab bar:** `flex-shrink-0`, `[HTML] [Texto plano]` — local `useState` for active tab
- **Body:** `flex-1 overflow-y-auto p-3`
  - **HTML view:** DOMPurify sanitized iframe with `srcdoc`. Iframe base styles injected: `background: #12121A; color: #F0F0FF; font-family: sans-serif; padding: 16px; line-height: 1.6;` — dark theme to match app
  - **Plain text view:** `<pre className="font-mono text-xs whitespace-pre-wrap text-text-secondary">`
- **Attachments:** `flex-shrink-0 border-t p-3` — same as current `EmailModal` attachments section, only shown when `email.attachments?.length > 0`
- **Escape key handler:** `useEffect` adds `keydown` listener, calls `onBack` on Escape. Cleanup on unmount.
- No backdrop, no framer-motion scale — it's an inline panel

Delete `components/EmailViewer/EmailModal.tsx` after extracting to `EmailViewer.tsx`.

### 4.5 Modify: `ExpirationTimer.tsx`

Replace SVG circle with pill chip. Keep all countdown logic unchanged.

New render output (replace the return statement):
```tsx
return (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono text-xs"
       style={{ borderColor: `${color}33`, color }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color,
                   boxShadow: `0 0 5px ${color}`, display: 'inline-block', flexShrink: 0 }} />
    {remaining > 0
      ? `Expira en ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : t('expiresIn')}
  </div>
)
```

### 4.6 Keep Unchanged
- `ThemeToggle`
- `QRModal`
- `DomainDropdown` (kept but removed from hero action row — keep file, just not used in new layout)
- `FAQAccordion`
- `Footer`
- `EmailDisplay` — can keep or inline into `page.tsx` hero; preference is to inline for simplicity
- `CopyButton` — reuse logic but render inline in hero action row
- All hooks: `useMailbox`, `useSocket`, `useClipboard`
- Zustand store (`mailboxStore`) — confirm `clearSelectedEmail` is called on `deleteMailbox`

---

## 5. Mobile State Management

No new state needed. `selectedEmail` from the store drives mobile view:
- `selectedEmail === null` → render `EmailList` full width on mobile
- `selectedEmail !== null` → render `EmailViewer` full width on mobile

Detect mobile with a hook:
```ts
// in page.tsx
const [isMobile, setIsMobile] = useState(false)
useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 768)
  check()
  window.addEventListener('resize', check)
  return () => window.removeEventListener('resize', check)
}, [])
```

On resize from mobile→desktop with email selected: both panels render side by side (no special handling needed — CSS handles it).

---

## 6. Files to Create / Modify / Delete

| Action | File |
|--------|------|
| Modify | `apps/frontend/app/[locale]/layout.tsx` |
| Modify | `apps/frontend/app/[locale]/page.tsx` |
| Modify | `apps/frontend/app/globals.css` |
| Modify | `apps/frontend/tailwind.config.ts` |
| Modify | `apps/frontend/components/Inbox/InboxPanel.tsx` |
| Create | `apps/frontend/components/EmailViewer/EmailViewer.tsx` |
| Delete | `apps/frontend/components/EmailViewer/EmailModal.tsx` |
| Modify | `apps/frontend/components/Timer/ExpirationTimer.tsx` |
| Delete | `apps/frontend/components/AdSlot/AdSlot.tsx` |
| Delete | `apps/frontend/components/Hero/Toolbar.tsx` (dissolved) |

---

## 7. Out of Scope

- Backend changes
- `DomainSelector` feature (domain switching removed from UI for now; `DomainDropdown.tsx` file kept but unused)
- i18n: add minimal new keys: `inbox.back` ("← Bandeja" / "← Inbox"), `inbox.waiting` ("Esperando correos..." / "Waiting for emails..."), `viewer.empty` ("Selecciona un correo para leerlo" / "Select an email to read it")
- SEO / metadata
- PWA / manifest
- New color tokens
- Animations / transitions (keep existing where they apply naturally)
