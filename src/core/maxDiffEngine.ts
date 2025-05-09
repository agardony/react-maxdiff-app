import type { MaxDiffItem } from '../types';

export interface EngineConfig {
  itemsPerSubset: number;
  targetTrials: number;
}

export interface RecordedChoice {
  trialNumber: number;
  presentedItemIds: string[];
  bestItemId: string;
  worstItemId: string;
}

/**
 * @class MaxDiffEngine
 * @description Manages the logic for a MaxDiff task session, including
 * trial generation, choice recording, and progress tracking.
 * This is a simplified engine focusing on random subset generation.
 */
export class MaxDiffEngine {
  private readonly items: Readonly<MaxDiffItem[]>;
  private readonly config: Readonly<EngineConfig>;
  private trialsConducted: number;
  private choices: RecordedChoice[];

  /**
   * Creates an instance of MaxDiffEngine.
   * @param {MaxDiffItem[]} items - The list of all items for the MaxDiff task.
   * @param {EngineConfig} config - Configuration for the engine.
   * @throws {Error} If the number of items is less than itemsPerSubset.
   */
  constructor(items: MaxDiffItem[], config: EngineConfig) {
    if (items.length < config.itemsPerSubset) {
      throw new Error('Number of items cannot be less than itemsPerSubset.');
    }
    if (config.itemsPerSubset < 2) {
        throw new Error('Items per subset must be at least 2 to pick best and worst.');
    }
    // Store a copy to prevent external modification of the items list during a session
    this.items = Object.freeze([...items]); 
    this.config = Object.freeze({...config});
    this.trialsConducted = 0;
    this.choices = [];
  }

  /**
   * Generates the next set of items for a trial.
   * Uses simple random sampling without replacement from the item list.
   * @returns {MaxDiffItem[] | null} An array of items for the trial, or null if the task is complete.
   */
  public getNextTrialSet(): MaxDiffItem[] | null {
    if (this.isComplete()) {
      return null;
    }    
    // Simple random sampling: shuffle a copy of items and take the first N
    const shuffledItems = [...this.items].sort(() => 0.5 - Math.random());
    const trialSet = shuffledItems.slice(0, this.config.itemsPerSubset);
    return trialSet;
  }

  /**
   * Records the user's choice for a given trial.
   * @param {MaxDiffItem[]} presentedItems - The array of items presented in the trial.
   * @param {MaxDiffItem} bestItem - The item chosen as best.
   * @param {MaxDiffItem} worstItem - The item chosen as worst.
   * @throws {Error} If bestItem and worstItem are the same, or not part of presentedItems.
   */
  public recordChoice(
    presentedItems: MaxDiffItem[],
    bestItem: MaxDiffItem,
    worstItem: MaxDiffItem
  ): void {
    if (this.isComplete()) {
        console.warn("MaxDiffEngine: Attempted to record choice after task completion.");
        return; // Or throw error, depending on desired strictness
    }

    if (bestItem.id === worstItem.id) {
      throw new Error('Best and worst items cannot be the same.');
    }
    if (!presentedItems.find(item => item.id === bestItem.id) || 
        !presentedItems.find(item => item.id === worstItem.id)) {
      throw new Error('Best and/or worst items are not part of the presented items.');
    }

    this.trialsConducted++;
    this.choices.push({
      trialNumber: this.trialsConducted,
      presentedItemIds: presentedItems.map(item => item.id),
      bestItemId: bestItem.id,
      worstItemId: worstItem.id,
    });
  }

  /**
   * Checks if the MaxDiff task is complete (i.e., target number of trials reached).
   * @returns {boolean} True if complete, false otherwise.
   */
  public isComplete(): boolean {
    return this.trialsConducted >= this.config.targetTrials;
  }

  /**
   * Retrieves all recorded choices.
   * @returns {Readonly<RecordedChoice[]>} A read-only array of choices.
   */
  public getChoices(): Readonly<RecordedChoice[]> {
    return Object.freeze([...this.choices]); // Return a copy to maintain immutability
  }

  /**
   * Gets the current progress of the task.
   * @returns {{ conducted: number; target: number }} Object with conducted and target trials.
   */
  public getProgress(): { conducted: number; target: number } {
    return {
      conducted: this.trialsConducted,
      target: this.config.targetTrials,
    };
  }
}

