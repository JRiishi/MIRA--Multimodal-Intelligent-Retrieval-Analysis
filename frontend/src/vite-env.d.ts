/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** FastAPI backend origin, e.g. `http://127.0.0.1:8000`. */
  readonly VITE_API_URL?: string;
  /**
   * Opt-in to the local Mock Service Worker. Honoured only when
   * `import.meta.env.DEV` is true, so production builds always ignore it.
   */
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
