interface ImportMetaEnv {
  readonly VITE_TELLER_APP_ID: string;
  readonly VITE_TELLER_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
