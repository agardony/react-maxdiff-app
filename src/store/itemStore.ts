import { create } from 'zustand';
import type { MaxDiffItem } from '../types';
const MAX_ITEMS = 40;

// Custom event for clearing feedback messages
export const CLEAR_FEEDBACK_EVENT = 'maxdiff-clear-feedback';

// Helper for generating unique IDs
const generateId = (): string => {
  if (self.crypto && self.crypto.randomUUID) {
    return self.crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

interface ItemState {
  items: MaxDiffItem[];
}

interface ItemActions {
  addTextItems: (textList: string[]) => { countAdded: number; countSkipped: number };
  addMediaItems: (fileList: File[]) => { countAdded: number; countSkipped: number };
  clearAllItems: () => void;
  removeItem: (itemId: string) => void;
  // Helper to get current item count, useful for components
  getItemCount: () => number; 
}

export const useItemStore = create<ItemState & ItemActions>((set, get) => ({
  items: [],

  getItemCount: () => get().items.length,

  addTextItems: (textList) => {
    const currentItems = get().items;
    const availableSlots = MAX_ITEMS - currentItems.length;
    let countAdded = 0;
    let countSkipped = 0;

    if (availableSlots <= 0) {
      console.warn(`Item store: Max limit of ${MAX_ITEMS} items reached. No text items were added.`);
      countSkipped = textList.length;
      return { countAdded, countSkipped };
    }

    const itemsToAdd = textList.slice(0, availableSlots);
    countAdded = itemsToAdd.length;
    countSkipped = textList.length - countAdded;

    const newMaxDiffItems: MaxDiffItem[] = itemsToAdd.map((text) => ({
      id: generateId(),
      type: 'text',
      name: text,
      textContent: text,
    }));

    set((state) => ({
      items: [...state.items, ...newMaxDiffItems],
    }));

    if (countSkipped > 0) {
      console.warn(`Item store: ${countSkipped} text items were not added due to the ${MAX_ITEMS} item limit.`);
    }
    console.log(`Item store: Added ${countAdded} text items.`);
    return { countAdded, countSkipped };
  },

  addMediaItems: (fileList) => {
    const currentItems = get().items;
    const availableSlots = MAX_ITEMS - currentItems.length;
    let countAdded = 0;
    let countSkipped = 0;

    if (availableSlots <= 0) {
      console.warn(`Item store: Max limit of ${MAX_ITEMS} items reached. No media items were added.`);
      countSkipped = fileList.length;
      return { countAdded, countSkipped };
    }

    const filesToProcess = fileList.slice(0, availableSlots);
    countAdded = filesToProcess.length;
    countSkipped = fileList.length - countAdded;

    const newMaxDiffItems: MaxDiffItem[] = filesToProcess.map((file) => {
      let itemType: 'image' | 'video' | 'audio' = 'image'; // Default, will be refined
      if (file.type.startsWith('image/')) itemType = 'image';
      else if (file.type.startsWith('video/')) itemType = 'video';
      else if (file.type.startsWith('audio/')) itemType = 'audio';
      // else keep default or handle as an unknown media type / skip

      let previewUrl: string | undefined = undefined;
      if (itemType === 'image' || itemType === 'video') {
        previewUrl = URL.createObjectURL(file);
      }

      return {
        id: generateId(),
        type: itemType,
        name: file.name,
        file: file,
        previewUrl: previewUrl,
      };
    });

    set((state) => ({
      items: [...state.items, ...newMaxDiffItems],
    }));
    
    if (countSkipped > 0) {
      console.warn(`Item store: ${countSkipped} media items were not added due to the ${MAX_ITEMS} item limit.`);
    }
    console.log(`Item store: Added ${countAdded} media items.`);
    return { countAdded, countSkipped };
  },

  clearAllItems: () => {
    const currentItems = get().items;
    currentItems.forEach(item => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    set({ items: [] });
    console.log('Item store: All items cleared.');
    
    // Dispatch a custom event to clear feedback
    window.dispatchEvent(new CustomEvent(CLEAR_FEEDBACK_EVENT));
  },

  removeItem: (itemId: string) => {
    const itemToRemove = get().items.find(item => item.id === itemId);
    if (itemToRemove && itemToRemove.previewUrl) {
      URL.revokeObjectURL(itemToRemove.previewUrl);
    }
    set((state) => ({
      items: state.items.filter(item => item.id !== itemId),
    }));
    console.log(`Item store: Removed item with ID ${itemId}.`);
  },
}));