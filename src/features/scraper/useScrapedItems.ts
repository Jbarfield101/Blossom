import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';
import { listen } from '@tauri-apps/api/event';

export interface ScrapedItem {
  id: string;
  title: string;
  url?: string;
}

interface ScrapedState {
  items: ScrapedItem[];
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  addItems: (items: ScrapedItem[]) => Promise<void>;
}

export const useScrapedItems = create<ScrapedState>()(
  persist(
    (set, get) => ({
      items: [],
      notificationsEnabled: true,
      async setNotificationsEnabled(enabled) {
        set({ notificationsEnabled: enabled });
        if (enabled) {
          let granted = await isPermissionGranted();
          if (!granted) {
            granted = (await requestPermission()) === 'granted';
          }
        }
      },
      async addItems(items) {
        set((state) => ({ items: [...items, ...state.items] }));
        if (get().notificationsEnabled) {
          let granted = await isPermissionGranted();
          if (!granted) {
            granted = (await requestPermission()) === 'granted';
          }
          if (granted) {
            const body = items.length === 1
              ? items[0].title
              : `${items.length} new items available`;
            sendNotification({ title: 'Blossom', body });
          }
        }
      }
    }),
    { name: 'scraped-items-store' }
  )
);

// Listen for backend events announcing new scraped items.
if (typeof window !== 'undefined') {
  listen<ScrapedItem[]>('scraper:new-items', (event) => {
    useScrapedItems.getState().addItems(event.payload);
  }).catch(() => {
    // ignore if tauri event system isn't available (e.g. tests)
  });
}

