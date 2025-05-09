// configStore.ts
import { create } from 'zustand';

const ITEMS_PER_SUBSET_MIN = 3;
const ITEMS_PER_SUBSET_MAX = 7;
const ITEMS_PER_SUBSET_DEFAULT = 4;

const DIMENSION_POSITIVE_LABEL_DEFAULT = "Best";
const DIMENSION_NEGATIVE_LABEL_DEFAULT = "Worst";

// Placeholder default, UI will calculate more accurately based on item count.
const TARGET_NUMBER_OF_TRIALS_DEFAULT = 20; 
// Remove this constant if not used elsewhere
// const TARGET_NUMBER_OF_TRIALS_MIN_ABSOLUTE = 1;

const INSTRUCTION_TEXT_DEFAULT = "Please choose the item you find BEST and the item you find WORST.";

interface ConfigState {
  itemsPerSubset: number;
  dimensionPositiveLabel: string;
  dimensionNegativeLabel: string;
  targetNumberOfTrials: number;
  instructionText: string;
  isConfigValid: boolean; // Added configuration validity state
}

interface ConfigActions {
  setItemsPerSubset: (value: number) => void;
  setDimensionPositiveLabel: (label: string) => void;
  setDimensionNegativeLabel: (label: string) => void;
  setTargetNumberOfTrials: (value: number) => void;
  setInstructionText: (text: string) => void;
  resetConfigToDefaults: () => void;
  setConfigValidity: (valid: boolean) => void; // Added method to set validity
}

const initialState: ConfigState = {
  itemsPerSubset: ITEMS_PER_SUBSET_DEFAULT,
  dimensionPositiveLabel: DIMENSION_POSITIVE_LABEL_DEFAULT,
  dimensionNegativeLabel: DIMENSION_NEGATIVE_LABEL_DEFAULT,
  targetNumberOfTrials: TARGET_NUMBER_OF_TRIALS_DEFAULT,
  instructionText: INSTRUCTION_TEXT_DEFAULT,
  isConfigValid: false, // Default to invalid until explicitly validated
};

export const useConfigStore = create<ConfigState & ConfigActions>((set) => ({
  ...initialState,

  setItemsPerSubset: (value) => {
    let validatedValue = Math.max(ITEMS_PER_SUBSET_MIN, value);
    validatedValue = Math.min(ITEMS_PER_SUBSET_MAX, validatedValue);
    set({ itemsPerSubset: validatedValue });
  },

  setDimensionPositiveLabel: (label) => set({ dimensionPositiveLabel: label }),
  setDimensionNegativeLabel: (label) => set({ dimensionNegativeLabel: label }),

  // CHANGE: Remove Math.max validation to allow any value
  setTargetNumberOfTrials: (value) => {
    // No validation/restriction here
    set({ targetNumberOfTrials: value });
  },

  setInstructionText: (text) => set({ instructionText: text }),

  resetConfigToDefaults: () => set(initialState),
  
  // New method to explicitly set the validity state
  setConfigValidity: (valid) => set({ isConfigValid: valid }),
}));