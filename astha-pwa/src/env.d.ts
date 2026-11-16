/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" in `npm run build:hub` (mode `hub`): enables the Sync Hub client on any host, e.g. http://localhost:8443. */
  readonly VITE_ASTHA_HUB?: string;
  /** Shared mission secret from which every device derives the same crew keys (ADR-020 stand-in). */
  readonly VITE_ASTHA_MISSION_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
