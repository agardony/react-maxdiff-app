import { create } from 'zustand';
import type { MaxDiffItem } from '../types';
import { MaxDiffEngine } from '../core/maxDiffEngine';
import type { EngineConfig, RecordedChoice } from '../core/maxDiffEngine';
type TaskStatus = 'idle' | 'in_progress' | 'completed';

interface TaskSessionState {
  engine: MaxDiffEngine | null;
  currentTrialSet: MaxDiffItem[] | null;
  taskStatus: TaskStatus;
  error: string | null;
}

interface TaskSessionActions {
  startNewTaskSession: (items: MaxDiffItem[], config: EngineConfig) => boolean;
  submitChoiceAndProceed: (bestItem: MaxDiffItem, worstItem: MaxDiffItem) => void;
  getRecordedChoices: () => Readonly<RecordedChoice[]>; // Ensure Readonly as engine returns it
  getProgress: () => { conducted: number; target: number } | null;
  endTaskSession: () => void;
  clearError: () => void;
}

const initialState: TaskSessionState = {
  engine: null,
  currentTrialSet: null,
  taskStatus: 'idle',
  error: null,
};

export const useTaskSessionStore = create<TaskSessionState & TaskSessionActions>((set, get) => ({
  ...initialState,

  startNewTaskSession: (items, config) => {
    set({ error: null }); // Clear previous errors
    try {
      const newEngine = new MaxDiffEngine(items, config);
      const firstTrialSet = newEngine.getNextTrialSet();
      
      set({
        engine: newEngine,
        currentTrialSet: firstTrialSet,
        taskStatus: 'in_progress',
        error: null,
      });
      console.log("Task session started successfully.");
      return true;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Failed to start task session:", errorMessage);
      set({ error: errorMessage, engine: null, currentTrialSet: null, taskStatus: 'idle' });
      return false;
    }
  },

  submitChoiceAndProceed: (bestItem, worstItem) => {
    const engine = get().engine;
    const currentTrial = get().currentTrialSet;

    if (!engine || !currentTrial) {
      const errorMessage = "Task session or current trial is not initialized.";
      console.error(errorMessage);
      set({ error: errorMessage });
      return;
    }

    try {
      engine.recordChoice(currentTrial, bestItem, worstItem);
      const nextTrialSet = engine.getNextTrialSet();
      
      set({
        currentTrialSet: nextTrialSet,
        taskStatus: engine.isComplete() ? 'completed' : 'in_progress',
        error: null, // Clear error on successful submission
      });

      if (engine.isComplete()) {
        console.log("Task session completed.");
      }

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error submitting choice:", errorMessage);
      set({ error: errorMessage });
    }
  },

  getRecordedChoices: () => {
    const engine = get().engine;
    if (engine) {
      return engine.getChoices();
    }
    return Object.freeze([]); // Return a Readonly empty array if no engine
  },

  getProgress: () => {
    const engine = get().engine;
    if (engine) {
      return engine.getProgress();
    }
    return null;
  },

  endTaskSession: () => {
    // Potentially could retrieve final choices here if needed for some async operation
    // const finalChoices = get().getRecordedChoices();
    // console.log("Task session ended. Final choices:", finalChoices);
    set(initialState);
    console.log("Task session ended and store reset.");
  },

  clearError: () => {
    set({ error: null });
  }
}));

