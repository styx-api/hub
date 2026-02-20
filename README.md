# NiWrap Hub

An interactive web playground for browsing, configuring, and generating commands for neuroimaging tools from the [NiWrap/Styx](https://github.com/styx-api/niwrap) catalog. Users select packages, fill out dynamic forms built from JSON schemas, and get shareable command-line invocations.

**Live at: [niwrap.dev](https://niwrap.dev)**

## Tech Stack

- **Framework:** SvelteKit 2 (Svelte 5) with TypeScript
- **Build:** Vite, `@sveltejs/adapter-static` (static site)
- **UI:** shadcn-svelte (Bits UI), Tailwind CSS 4, Lucide icons
- **Testing:** Vitest (unit), Playwright (E2E)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

## Scripts

| Command              | Description                                 |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Local dev server                            |
| `npm run build`      | Production build                            |
| `npm run preview`    | Preview production build                    |
| `npm run check`      | Type-check (svelte-kit sync + svelte-check) |
| `npm run lint`       | Prettier + ESLint                           |
| `npm run format`     | Auto-format with Prettier                   |
| `npm run test`       | Unit tests (Vitest)                         |
| `npm run test:watch` | Unit tests (watch mode)                     |
| `npm run test:e2e`   | E2E tests (Playwright)                      |
| `npm run test:all`   | Unit + E2E tests                            |

## Project Structure

```
src/
├── routes/              # SvelteKit pages (+page.svelte, +layout.svelte)
├── lib/
│   ├── components/
│   │   ├── app-page/    # Main app UI (panels, terminal, code block)
│   │   ├── layout/      # Header, Footer
│   │   ├── package/     # Package selection gallery
│   │   ├── schema-form/ # Dynamic form generation from JSON schemas
│   │   ├── shared/      # QuickSelector and shared components
│   │   └── ui/          # shadcn-svelte primitives (Button, Input, Dialog…)
│   ├── services/
│   │   ├── catalog/     # Fetches package catalog from niwrap.dev
│   │   ├── execution/   # Command building, syntax highlighting (Shiki)
│   │   ├── schema/      # JSON schema utilities (defaults, reconciliation, validation)
│   │   └── urlState.ts  # Serialize/deserialize config to URL params
│   ├── utils/           # Compression, GitHub helpers, general utils
│   └── constants/       # URLs and external links
e2e/                     # Playwright E2E tests
static/                  # Static assets (robots.txt)
```

## Deployment

The site is deployed via CI/CD on push to `main`:

- **Cloudflare Pages** — primary hosting at [niwrap.dev](https://niwrap.dev)
- **GitHub Pages** — secondary mirror

CI runs lint, type-check, unit tests, and E2E tests before deploying.
