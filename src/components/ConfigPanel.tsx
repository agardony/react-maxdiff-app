import React, { useState, useEffect, useRef } from 'react';
import { useConfigStore } from '../store/configStore';
import { useItemStore } from '../store/itemStore';

/**
 * @component ConfigPanel
 * @description Provides a UI for configuring MaxDiff task parameters.
 * Allows setting the number of items per subset, dimension labels,
 * number of trials, and customizable instruction text.
 */
const ConfigPanel: React.FC = () => {
  // Get config values and actions from store
  const {
    itemsPerSubset,
    dimensionPositiveLabel,
    dimensionNegativeLabel,
    targetNumberOfTrials,
    instructionText,
    setItemsPerSubset,
    setDimensionPositiveLabel,
    setDimensionNegativeLabel,
    setTargetNumberOfTrials,
    setInstructionText,
    resetConfigToDefaults,
    setConfigValidity,
  } = useConfigStore();

  // Get item count to help with validation - add the actual item count as a value to watch
  const getItemCount = useItemStore(state => state.getItemCount);
  const items = useItemStore(state => state.items); // Add this to watch for item changes
  
  // Local state for input fields to allow for empty values during editing
  const [trialsInputValue, setTrialsInputValue] = useState<string>(targetNumberOfTrials.toString());
  const [itemsPerSubsetInputValue, setItemsPerSubsetInputValue] = useState<string>(itemsPerSubset.toString());
  
  // Local validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Refs to track previous states to avoid unnecessary updates
  const prevItemCountRef = useRef<number>(getItemCount());
  const prevRecommendedTrialsRef = useRef<number>(0);
  
  // Update local input values when store values change (for initial load and resets)
  useEffect(() => {
    setTrialsInputValue(targetNumberOfTrials.toString());
  }, [targetNumberOfTrials]);
  
  useEffect(() => {
    setItemsPerSubsetInputValue(itemsPerSubset.toString());
  }, [itemsPerSubset]);

  // Calculate recommended number of trials based on item count and subset size
  const calculateRecommendedTrials = () => {
    const itemCount = getItemCount();
    return itemCount > 0 ? Math.ceil((3 * itemCount) / itemsPerSubset) : 10;
  };

  // Run form validation and update all relevant states
  const validateForm = () => {
    const errors: Record<string, string> = {};
    const itemCount = getItemCount();
    const recommendedTrials = calculateRecommendedTrials();
    
    // Store the current recommended value for change detection
    prevRecommendedTrialsRef.current = recommendedTrials;
    
    // Validate items per subset - check empty input value first
    if (itemsPerSubsetInputValue.trim() === '') {
      errors.itemsPerSubset = "Items per trial cannot be empty.";
    } else if (itemsPerSubset > itemCount && itemCount > 0) {
      errors.itemsPerSubset = `Not enough items (have ${itemCount}, need at least ${itemsPerSubset}).`;
    }
    
    // Validate dimension labels
    if (!dimensionPositiveLabel.trim()) {
      errors.dimensionPositiveLabel = "Positive dimension label cannot be empty.";
    }
    
    if (!dimensionNegativeLabel.trim()) {
      errors.dimensionNegativeLabel = "Negative dimension label cannot be empty.";
    }
    
    if (dimensionPositiveLabel.trim() === dimensionNegativeLabel.trim() && dimensionPositiveLabel.trim() !== '') {
      errors.dimensionBoth = "Positive and negative labels must be different.";
    }
    
    // Validate target number of trials
    if (trialsInputValue.trim() === '') {
      errors.targetNumberOfTrials = "Number of trials cannot be empty.";
    } else if (targetNumberOfTrials <= 0) {
      errors.targetNumberOfTrials = "Number of trials must be greater than zero.";
    } else if (targetNumberOfTrials < recommendedTrials) {
      errors.targetNumberOfTrials = `For statistical validity, we recommend at least ${recommendedTrials} trials for ${itemCount} items with ${itemsPerSubset} items per trial.`;
    }
    
    // Validate instruction text
    if (!instructionText.trim()) {
      errors.instructionText = "Instructions cannot be empty.";
    } else if (instructionText.trim().length < 20) {
      errors.instructionText = "Instructions should be descriptive (at least 20 characters).";
    }
    
    // Update local validation states
    setValidationErrors(errors);
    const valid = Object.keys(errors).length === 0;
    setIsFormValid(valid);
    
    // Update global config state
    setConfigValidity(valid);
    
    return valid;
  };

  // Validate when inputs change
  useEffect(() => {
    validateForm();
  }, [
    itemsPerSubset,
    itemsPerSubsetInputValue,
    dimensionPositiveLabel, 
    dimensionNegativeLabel, 
    targetNumberOfTrials,
    trialsInputValue,
    instructionText
  ]);
  
  // Special effect just for item count changes
  useEffect(() => {
    const currentItemCount = getItemCount();
    
    // Only trigger validation if the item count has actually changed
    if (currentItemCount !== prevItemCountRef.current) {
      prevItemCountRef.current = currentItemCount;
      validateForm();
    }
  }, [items]); // Only depend on items

  // Input handlers
  const handleItemsPerSubsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setItemsPerSubsetInputValue(inputValue);
    
    // If the input is empty, show validation error but don't update store
    if (inputValue.trim() === '') {
      setValidationErrors(prev => ({
        ...prev,
        itemsPerSubset: "Items per trial cannot be empty."
      }));
      return;
    }
    
    // Parse the numeric value
    const numValue = parseInt(inputValue, 10);
    if (isNaN(numValue)) {
      return; // Not a valid number, don't update store
    }
    
    // Enforce min/max constraints
    if (numValue < 3) {
      setItemsPerSubset(3);
      setItemsPerSubsetInputValue('3');
    } else if (numValue > 7) {
      setItemsPerSubset(7);
      setItemsPerSubsetInputValue('7');
    } else {
      setItemsPerSubset(numValue);
    }
  };

  // Allow any numeric input without restriction but prevent negative values
  const handleTargetTrialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Prevent negative values (but still allow empty string for UX)
    if (inputValue !== '' && Number(inputValue) < 0) {
      // Set to 0 if attempting to enter a negative value
      setTrialsInputValue('0');
      setTargetNumberOfTrials(0);
      return;
    }
    
    setTrialsInputValue(inputValue);
    
    // If the input is empty, show validation error but don't update store
    if (inputValue.trim() === '') {
      setValidationErrors(prev => ({
        ...prev,
        targetNumberOfTrials: "Number of trials cannot be empty."
      }));
      return;
    }
    
    // Only update the store if the value is a valid number
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue)) {
      // Store exactly what user typed (after negative check)
      setTargetNumberOfTrials(numValue);
    }
  };

  // Don't force any minimum value
  const handleTargetTrialsBlur = () => {
    // If the field is empty, set error and keep it empty for UX
    if (trialsInputValue.trim() === '') {
      setValidationErrors(prev => ({
        ...prev,
        targetNumberOfTrials: "Number of trials cannot be empty."
      }));
      return;
    }
    
    // If it's not a valid number, show error but don't change the value
    const numValue = parseInt(trialsInputValue, 10);
    if (isNaN(numValue)) {
      setValidationErrors(prev => ({
        ...prev,
        targetNumberOfTrials: "Please enter a valid number."
      }));
    }
  };

  // Handle blur events for immediate validation when leaving fields
  const handleItemsPerSubsetBlur = () => {
    // If the field is empty, set error and keep it empty for UX
    if (itemsPerSubsetInputValue.trim() === '') {
      setValidationErrors(prev => ({
        ...prev,
        itemsPerSubset: "Items per trial cannot be empty."
      }));
      return;
    }
    
    // If it's not a valid number, default to min value
    const numValue = parseInt(itemsPerSubsetInputValue, 10);
    if (isNaN(numValue)) {
      setItemsPerSubset(3);
      setItemsPerSubsetInputValue('3');
    }
  };

  const configPanelStyle: React.CSSProperties = {
    width: '100%',
  };
  
  const configFormStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  };
  
  const formGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  };
  
  const labelStyle: React.CSSProperties = {
    fontWeight: 600,
    color: 'var(--text-primary)',
  };
  
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    fontSize: '1rem',
    transition: 'border-color 0.2s ease',
  };
  
  const inputErrorStyle: React.CSSProperties = {
    ...inputStyle,
    border: '1px solid var(--error-color)',
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
  };
  
  const smallTextStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
  };
  
  const errorMessageStyle: React.CSSProperties = {
    color: 'var(--error-color)',
    fontSize: '0.85rem',
    marginTop: '0.25rem',
  };
  
  const configStatusStyle: React.CSSProperties = {
    padding: '1rem 0',
    borderTop: '1px solid var(--border-color)',
    marginTop: '1rem',
  };
  
  const validConfigMessageStyle: React.CSSProperties = {
    color: 'var(--success-color)',
    fontWeight: 500,
    padding: '0.5rem 0',
  };
  
  const invalidConfigMessageStyle: React.CSSProperties = {
    color: 'var(--error-color)',
    fontWeight: 500,
    padding: '0.5rem 0',
  };
  
  const resetButtonStyle: React.CSSProperties = {
    backgroundColor: 'var(--text-secondary)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    alignSelf: 'flex-start',
    transition: 'background-color 0.2s ease, transform 0.2s ease',
  };

  return (
    <div style={configPanelStyle}>
      <div style={configFormStyle}>
        <div style={formGroupStyle}>
          <label htmlFor="items-per-subset" style={labelStyle}>Items Per Trial:</label>
          <input
            type="number"
            id="items-per-subset"
            min="3"
            max="7"
            value={itemsPerSubsetInputValue}
            onChange={handleItemsPerSubsetChange}
            onBlur={handleItemsPerSubsetBlur}
            style={validationErrors.itemsPerSubset ? inputErrorStyle : inputStyle}
          />
          <small style={smallTextStyle}>How many items to show in each trial (3-7 recommended)</small>
          {validationErrors.itemsPerSubset && (
            <div style={errorMessageStyle}>{validationErrors.itemsPerSubset}</div>
          )}
        </div>

        <div style={formGroupStyle}>
          <label htmlFor="positive-label" style={labelStyle}>Positive Dimension Label:</label>
          <input
            type="text"
            id="positive-label"
            value={dimensionPositiveLabel}
            onChange={(e) => setDimensionPositiveLabel(e.target.value)}
            placeholder="e.g., Best, Most Important, Most Liked"
            style={validationErrors.dimensionPositiveLabel || validationErrors.dimensionBoth ? inputErrorStyle : inputStyle}
          />
          {validationErrors.dimensionPositiveLabel && (
            <div style={errorMessageStyle}>{validationErrors.dimensionPositiveLabel}</div>
          )}
        </div>

        <div style={formGroupStyle}>
          <label htmlFor="negative-label" style={labelStyle}>Negative Dimension Label:</label>
          <input
            type="text"
            id="negative-label"
            value={dimensionNegativeLabel}
            onChange={(e) => setDimensionNegativeLabel(e.target.value)}
            placeholder="e.g., Worst, Least Important, Least Liked"
            style={validationErrors.dimensionNegativeLabel || validationErrors.dimensionBoth ? inputErrorStyle : inputStyle}
          />
          {validationErrors.dimensionNegativeLabel && (
            <div style={errorMessageStyle}>{validationErrors.dimensionNegativeLabel}</div>
          )}
          {validationErrors.dimensionBoth && (
            <div style={errorMessageStyle}>{validationErrors.dimensionBoth}</div>
          )}
        </div>

        <div style={formGroupStyle}>
          <label htmlFor="target-trials" style={labelStyle}>Target Number of Trials:</label>
          <input
            type="number"
            id="target-trials"
            min="0" 
            value={trialsInputValue}
            onChange={handleTargetTrialsChange}
            onBlur={handleTargetTrialsBlur}
            style={validationErrors.targetNumberOfTrials ? inputErrorStyle : inputStyle}
          />
          <small style={smallTextStyle}>
            How many questions to present to the participant 
            (<b>Recommended: {calculateRecommendedTrials()} trials minimum</b> for optimal statistical validity)
          </small>
          {validationErrors.targetNumberOfTrials && (
            <div style={errorMessageStyle}>{validationErrors.targetNumberOfTrials}</div>
          )}
        </div>

        <div style={formGroupStyle}>
          <label htmlFor="instruction-text" style={labelStyle}>Task Instructions:</label>
          <textarea
            id="instruction-text"
            value={instructionText}
            onChange={(e) => setInstructionText(e.target.value)}
            rows={4}
            placeholder="Instructions for participants..."
            style={validationErrors.instructionText ? inputErrorStyle : inputStyle}
          />
          {validationErrors.instructionText && (
            <div style={errorMessageStyle}>{validationErrors.instructionText}</div>
          )}
        </div>

        <div style={configStatusStyle}>
          {isFormValid ? (
            <div style={validConfigMessageStyle}>Configuration is valid ✓</div>
          ) : (
            <div style={invalidConfigMessageStyle}>
              Please fix the configuration errors above
            </div>
          )}
        </div>

        <button
          type="button"
          style={resetButtonStyle}
          onClick={resetConfigToDefaults}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;