# Shipflow

**Visual editing for React apps, powered by Cursor Agent.**

Shipflow lets you select any component in your running app and edit it with AI — bridging the gap between design and code.

---

## What is Shipflow?

Shipflow combines [React Grab](https://github.com/nicholasgriffintn/react-grab) with [Cursor Agent](https://docs.cursor.com/agent) to create a seamless visual editing experience:

1. **Select** — Click any element in your app to highlight it
2. **Describe** — Type what you want to change
3. **Apply** — Cursor Agent edits the source code directly

No context switching. No copy-pasting file paths. Just point and describe.

## Packages

| Package | Description |
|---------|-------------|
| [`@shipflow/overlay`](./packages/overlay) | Drop-in React overlay for Next.js projects |

## About This Repo

This repository serves as an **R&D sandbox** for Shipflow development. It includes:

- **`/packages/overlay`** — The core `@shipflow/overlay` npm package
- **`/app`** — A [shadcn/ui dashboard](https://ui.shadcn.com/) for testing the overlay in a real-world context
- **`/components`** — UI components used for integration testing

The dashboard provides a rich, production-like environment to validate the editing experience across various component patterns.

## Quick Start

```bash
npm install -D @shipflow/overlay
```

See the [@shipflow/overlay README](./packages/overlay/README.md) for full setup instructions.

## Requirements

- Next.js 14+ or 15+
- React 18+ or 19
- [Cursor Agent CLI](https://docs.cursor.com/agent) installed and available in PATH

## License

MIT © Shipflow
