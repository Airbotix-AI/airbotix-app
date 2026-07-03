/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_URL?: string;
  /** Marketing site base (airbotix.ai). Overrides the prod/dev default. */
  readonly VITE_MARKETING_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Resolved `/vendor/…` URLs of the CONTENT-HASHED vendored game engines, provided
// by the `vendor-engines` plugin (vite.config.ts). Hashing lets the files be
// served `immutable` without a stale cache ever masking an engine change.
declare module 'virtual:engine-vendors' {
  /** Content-hashed `/vendor/…` URL of the three.js `window.THREE` global build. */
  export const THREE_VENDOR_URL: string;
  /** Content-hashed `/vendor/…` URL of the Phaser UMD global build. */
  export const PHASER_VENDOR_URL: string;
  /** Content-hashed `/vendor/…` URL of the Phaser `.d.ts` (Monaco IntelliSense). */
  export const PHASER_DTS_URL: string;
}
