import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useItemStore, CLEAR_FEEDBACK_EVENT } from '../store/itemStore';

interface FeedbackState {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const ACCEPTED_MIME_TYPES = ['image/*', 'video/*', 'audio/*'];
const ACCEPTED_MIME_TYPES_STRING = ACCEPTED_MIME_TYPES.join(',');

/**
 * @component MediaUpload
 * @description A React component for uploading media files (images, videos, audio)
 * via a drag-and-drop area or a traditional file input. It validates file types
 * and logs information about the selected files to the console.
 */
const MediaUpload: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const addMediaItemsToStore = useItemStore((state) => state.addMediaItems);

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
   * Processes a list of files: validates types, adds valid files to the global item store,
   * and then generates local previews for items successfully added to the store.
   * @param {FileList | null} fileList - The list of files to process.
   */
  const processFiles = useCallback((incomingFileList: FileList | null) => {
    if (!incomingFileList || incomingFileList.length === 0) {
      return;
    }

    const validRawFiles: File[] = [];
    Array.from(incomingFileList).forEach((file) => {
      const isValidType = ACCEPTED_MIME_TYPES.some(mimeType => {
        if (mimeType.endsWith('/*')) {
          return file.type.startsWith(mimeType.slice(0, -2));
        }
        return file.type === mimeType;
      });

      if (isValidType) {
        validRawFiles.push(file);
      } else {
        setFeedback({
          type: 'error',
          message: `Invalid file type skipped: "${file.name}". Please upload only images, videos, or audio files.`
        });
      }
    });

    if (validRawFiles.length === 0) {
      if (!feedback || feedback.type !== 'error') {
        setFeedback({
          type: 'warning',
          message: 'No valid media files were found. Please try again with supported files (images, videos, or audio).'
        });
      }
      return;
    }

    const { countAdded, countSkipped } = addMediaItemsToStore(validRawFiles);
    
    if (countAdded > 0) {
      setFeedback({
        type: 'success',
        message: `Successfully added ${countAdded} media items${countSkipped > 0 ? ` (${countSkipped} skipped due to limit)` : ''}`
      });
    } else {
      setFeedback({
        type: 'warning',
        message: 'No items were added. Maximum limit may have been reached.'
      });
    }
  }, [addMediaItemsToStore, feedback]);

  /**
   * Handles the drag over event on the drop zone.
   * @param {React.DragEvent<HTMLDivElement>} event - The drag event.
   */
  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    processFiles(event.dataTransfer.files);
  };

  /**
   * Handles file selection via the file input element.
   * @param {React.ChangeEvent<HTMLInputElement>} event - The input change event.
   */
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
    // Reset input value to allow selecting the same file again if needed
    if (event.target) {
      event.target.value = '';
    }
  };

  /**
   * Triggers a click on the hidden file input when the drop zone is clicked.
   */
  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="upload-container">
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onClick={handleDropZoneClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Drag and drop media files or click to select"
      >
        <div className="upload-content">
          <label htmlFor="media-file-input" className="upload-label">
            Upload Media Files
          </label>
          <div className="upload-instructions">
            <p>Drag and drop media files here, or click to select</p>
            <p className="upload-subtitle">Accepts images, videos, and audio files</p>
          </div>
          <input
            type="file"
            multiple
            accept={ACCEPTED_MIME_TYPES_STRING}
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="file-input"
            id="media-file-input"
            aria-label="Choose media files to upload"
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

export default MediaUpload;