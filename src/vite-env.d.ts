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
