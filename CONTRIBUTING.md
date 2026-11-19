# Contributing to Forjix

Thank you for helping make **Forjix** a fun, safe, and inspiring creative forge for young builders!

## Core Principles

1. **100% Offline & Privacy-First**: Never introduce external runtime network requests, CDN fonts/scripts, analytics, or account gates. All assets, icons, textures, and synthesized audio must run locally offline.
2. **Kid-Friendly UX (Ages 6–12)**: Keep controls high-contrast, tactile, forgiving (50-step Undo/Redo, safe clamped sliders), and visually clear.
3. **Bilingual Parity (`RO` & `EN`)**: Every user-visible string belongs in `src/i18n/translations.ts` with natural Romanian (including proper diacritics `ă, â, î, ș, ț`) and English translations.
4. **Strict Types & Clean Rust**: All TypeScript code compiles with strict flags (`npm run typecheck`), and all Rust code passes `cargo fmt --check` and `cargo clippy -- -D warnings`.

## Local Development Workflow

```bash
# 1. Install frontend packages
npm install

# 2. Run the full Tauri v2 desktop app in development mode
npm run tauri dev

# 3. Run frontend checks & unit tests
npm run typecheck
npm test
npm run build

# 4. Run Rust formatting, lints, and export unit tests
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

## Adding Starter Templates or 3D Voxel Presets

- **2D Pixel Templates**: Add a 16×16 ASCII palette grid entry to `src/data/templates.ts` and register its `StarterTemplateId` in `src/types/project.ts` and `src/i18n/translations.ts`.
- **3D Voxel Presets (`16×16×16`)**: Add a procedural builder in `src/data/voxelPresets.ts` using `VoxelBuilder` (`0..15` bounds) and register its `VoxelPresetId`.

## License

By contributing to Forjix, you agree that your contributions will be licensed under the **GNU General Public License v3.0 or later** (`GPL-3.0-or-later`).
