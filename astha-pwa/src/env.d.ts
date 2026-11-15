/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" in `npm run build:hub` (mode `hub`): enables the Sync Hub client on any host, e.g. http://localhost:8443. */
  readonly VITE_ASTHA_HUB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
