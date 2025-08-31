// Global ambient declarations for Blossom

declare global {
  interface Window {
    __TAURI__?: any;
  }
}

declare module '@tonejs/midi' {
  export const Midi: any;
  export default Midi;
}

export {};

