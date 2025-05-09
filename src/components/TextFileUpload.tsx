import React, { useState, useEffect } from 'react';
import { useItemStore, CLEAR_FEEDBACK_EVENT } from '../store/itemStore';

interface FeedbackState {
  type: 'success' | 'error' | 'info';
  message: string;
}

const TextFileUpload: React.FC = () => {
  const addTextItems = useItemStore((state) => state.addTextItems);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Listen for clear feedback event
  useEffect(() => {
    const handleClearFeedback = () => {
      setFeedback(null);
    };

    window.addEventListener(CLEAR_FEEDBACK_EVENT, handleClearFeedback);
    
    return () => {
      window.removeEventListener(CLEAR_FEEDBACK_EVENT, handleClearFeedback);
    };
  }, []);

  /**
   * Handles the file selection event from the input element.
   * It validates if a .txt file is selected, then uses FileReader to read
   * the file content. The content is processed to extract lines,
   * trim whitespace, and filter out empty lines. The processed list of
   * item strings is then logged to the console.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event - The file input change event.
   */
  const processFile = (file: File) => {
    // Client-side validation for .txt file extension
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setFeedback({
        type: 'error',
        message: `Invalid file type: "${file.name}". Please select a .txt file.`
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        const lines = text
          .split(/\r\n|\r|\n/)
          .map(line => line.trim())
          .filter(line => line !== '');

        const { countAdded, countSkipped } = addTextItems(lines);

        if (countAdded > 0) {
          setFeedback({
            type: 'success',
            message: `Successfully added ${countAdded} items${countSkipped > 0 ? ` (${countSkipped} items skipped due to limit)` : ''}`
          });
        } else {
          setFeedback({
            type: 'info',
            message: 'No items were added. Please check your file content.'
          });
        }
      } else {
        setFeedback({
          type: 'error',
          message: 'Failed to read file content as text.'
        });
      }
    };

    reader.onerror = () => {
      setFeedback({
        type: 'error',
        message: `Error reading file: ${reader.error?.message || 'Unknown error'}`
      });
    };

    reader.readAsText(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    processFile(files[0]);
    event.target.value = ''; // Reset input to allow the same file to be selected again
  };
  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const textFile = files.find(file => file.name.toLowerCase().endsWith('.txt'));
    
    if (textFile) {
      processFile(textFile);
    } else {
      setFeedback({
        type: 'error',
        message: 'Please drop a .txt file'
      });
    }
  };

  return (
    <div className="upload-container">
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('text-file-upload')?.click()}
        role="button"
        tabIndex={0}
        aria-label="Click or drag and drop to upload a text file"
      >
        <div className="upload-content">
          <label htmlFor="text-file-upload" className="upload-label">
            Upload Items from Text File
          </label>
          <div className="upload-instructions">
            <p>Drag and drop a text file here, or click to select</p>
            <p className="upload-subtitle">Each line will become one item</p>
          </div>
          <input
            type="file"
            id="text-file-upload"
            className="file-input"
            accept=".txt"
            onChange={handleFileChange}
            aria-label="Choose a text file"
          />
        </div>
      </div>

      {feedback && (
        <div
          className={`feedback-message ${feedback.type}`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
};

export default TextFileUpload;