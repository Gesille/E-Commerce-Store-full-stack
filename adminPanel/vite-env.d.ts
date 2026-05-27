/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOP_NAME: string;
  readonly VITE_SHOP_TAGLINE: string;
  readonly VITE_SHOP_ADDRESS: string;
  readonly VITE_SHOP_PHONE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}