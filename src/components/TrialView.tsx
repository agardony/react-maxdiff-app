import React, { useState, useEffect, useRef } from 'react';
import { useTaskSessionStore } from '../store/taskSessionStore';
import { useConfigStore } from '../store/configStore';
import type { MaxDiffItem } from '../types';

/**
 * @component TrialView
 * @description Displays the current MaxDiff trial, allowing users to drag and drop
 * their "best" and "worst" choices from a subset of items.
 * Uses a consistent layout with Best on top, Worst on bottom, and items in a grid.
 */
const TrialView: React.FC = () => {
  const {
    currentTrialSet,
    taskStatus,
    submitChoiceAndProceed,
    getProgress,
    error: taskError,
    clearError: clearTaskError,
  } = useTaskSessionStore();

  const {
    dimensionPositiveLabel,
    dimensionNegativeLabel,
    instructionText,
  } = useConfigStore();

  const [selectedBestItemId, setSelectedBestItemId] = useState<string | null>(null);
  const [selectedWorstItemId, setSelectedWorstItemId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<MaxDiffItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [touchTimer, setTouchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [showBestAnimation, setShowBestAnimation] = useState(false);
  const [showWorstAnimation, setShowWorstAnimation] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  // Object to store refs for all media elements
  const mediaRefs = useRef<Record<string, HTMLAudioElement | HTMLVideoElement | null>>({});
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const bestZoneRef = useRef<HTMLDivElement>(null);
  const worstZoneRef = useRef<HTMLDivElement>(null);
  const centralAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track window width for responsive adjustments
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle touch events with passive: false to fix mobile error
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const touchMoveHandler = (e: TouchEvent) => {
      // Check if we're in drag mode first
      if (isDragging && draggedItem && dragPreviewRef.current) {
        // We're already dragging, handle drag preview movement
        e.preventDefault(); // Now works with passive: false
        
        const touch = e.touches[0];
        const dragPreview = dragPreviewRef.current;
        
        // Update the position of the drag preview
        const touchX = touch.clientX;
        const touchY = touch.clientY;
        
        dragPreview.style.left = `${touchX - dragPreview.offsetWidth / 2}px`;
        dragPreview.style.top = `${touchY - dragPreview.offsetHeight / 2}px`;

        // Check which zone we're over
        checkDropZone(touchX, touchY);
      } 
      // Not dragging yet, check if this is a scroll attempt or potential drag start
      else if (touchTimer && touchStartY !== null) {
        const currentTouchY = e.touches[0].clientY;
        const verticalDelta = Math.abs(currentTouchY - touchStartY);
        
        // If user moved finger more than 10px vertically, cancel the drag timer
        // This means they're trying to scroll, not drag an item
        if (verticalDelta > 10) {
          clearTimeout(touchTimer);
          setTouchTimer(null);
        }
      }
    };
    
    const touchEndHandler = (e: TouchEvent) => {
      // Clear the timer if it's still running
      if (touchTimer) {
        clearTimeout(touchTimer);
        setTouchTimer(null);
      }
      
      if (!isDragging || !draggedItem) return;
      
      e.preventDefault();
      
      const touch = e.changedTouches[0];
      handleDrop(touch.clientX, touch.clientY);
      
      setIsDragging(false);
      setDraggedItem(null);
    };
    
    // Add event listeners with passive: false
    container.addEventListener('touchmove', touchMoveHandler, { passive: false });
    container.addEventListener('touchend', touchEndHandler, { passive: false });
    
    // Cleanup function to remove listeners
    return () => {
      container.removeEventListener('touchmove', touchMoveHandler);
      container.removeEventListener('touchend', touchEndHandler);
    };
  }, [isDragging, draggedItem, touchTimer, touchStartY]);

  // Reset selections and pause all media when a new trial set is loaded or task status changes
  useEffect(() => {
    setSelectedBestItemId(null);
    setSelectedWorstItemId(null);
    setDraggedItem(null);
    setIsDragging(false);
    
    // Clear errors when new trial appears or status changes
    if (taskError) clearTaskError();
    
    // Pause all active media players when trial changes
    Object.values(mediaRefs.current).forEach(mediaElement => {
      if (mediaElement && !mediaElement.paused) {
        mediaElement.pause();
      }
    });
    
    // Clear refs when trial set changes
    mediaRefs.current = {};
  }, [currentTrialSet, taskStatus, clearTaskError, taskError]);

  // Clean up touch timer on unmount
  useEffect(() => {
    return () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
      }
    };
  }, [touchTimer]);
	
	// Globally prevent dragging of all images in the container
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		
		const preventImageDrag = (e: DragEvent) => {
			// This will prevent ALL image dragging within the container
			if (e.target instanceof HTMLImageElement || 
					e.target instanceof HTMLVideoElement) {
				e.preventDefault();
			}
		};
		
		container.addEventListener('dragstart', preventImageDrag);
		
		return () => {
			container.removeEventListener('dragstart', preventImageDrag);
		};
	}, []);

  // Function to handle drag start
  const handleDragStart = (item: MaxDiffItem) => {
    // If an item is already selected as best/worst, remove it
    if (selectedBestItemId === item.id) {
      setSelectedBestItemId(null);
    } else if (selectedWorstItemId === item.id) {
      setSelectedWorstItemId(null);
    }
    
    // Pause media if it's playing
    if (mediaRefs.current[item.id] && !mediaRefs.current[item.id]!.paused) {
      mediaRefs.current[item.id]!.pause();
    }
    
    setDraggedItem(item);
    setIsDragging(true);
  };

  // Touch handlers for mobile support
  const handleTouchStart = (item: MaxDiffItem, e: React.TouchEvent) => {
    // Store the initial touch position for scroll detection
    const initialTouchY = e.touches[0].clientY;
    setTouchStartY(initialTouchY);
    
    // Start a timer - if the touch is held for 500ms, we'll consider it a drag start
    const timer = setTimeout(() => {
      handleDragStart(item);
      
      // Provide haptic feedback if supported
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
    
    setTouchTimer(timer);
  };

  // Mouse event handlers
  const handleMouseDown = (item: MaxDiffItem) => {
    handleDragStart(item);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedItem || !dragPreviewRef.current) return;
    
    e.preventDefault();
    
    const dragPreview = dragPreviewRef.current;
    
    // Update the position of the drag preview
    dragPreview.style.left = `${e.clientX - dragPreview.offsetWidth / 2}px`;
    dragPreview.style.top = `${e.clientY - dragPreview.offsetHeight / 2}px`;

    // Check which zone we're over
    checkDropZone(e.clientX, e.clientY);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging || !draggedItem) return;
    
    e.preventDefault();
    
    handleDrop(e.clientX, e.clientY);
    
    setIsDragging(false);
    setDraggedItem(null);
  };

  // Function to check which zone we're over
  const checkDropZone = (x: number, y: number) => {
    if (!bestZoneRef.current || !worstZoneRef.current) return;
    
    const bestZone = bestZoneRef.current.getBoundingClientRect();
    const worstZone = worstZoneRef.current.getBoundingClientRect();
    
    // Add a highlighting class to the zone we're over
    if (x >= bestZone.left && x <= bestZone.right && 
        y >= bestZone.top && y <= bestZone.bottom) {
      bestZoneRef.current.classList.add('highlight-drop-zone');
      worstZoneRef.current.classList.remove('highlight-drop-zone');
    } else if (x >= worstZone.left && x <= worstZone.right && 
               y >= worstZone.top && y <= worstZone.bottom) {
      worstZoneRef.current.classList.add('highlight-drop-zone');
      bestZoneRef.current.classList.remove('highlight-drop-zone');
    } else {
      bestZoneRef.current.classList.remove('highlight-drop-zone');
      worstZoneRef.current.classList.remove('highlight-drop-zone');
    }
  };

  // Function to handle drop
  const handleDrop = (x: number, y: number) => {
    if (!bestZoneRef.current || !worstZoneRef.current || !draggedItem) return;
    
    const bestZone = bestZoneRef.current.getBoundingClientRect();
    const worstZone = worstZoneRef.current.getBoundingClientRect();
    
    // Remove highlighting
    bestZoneRef.current.classList.remove('highlight-drop-zone');
    worstZoneRef.current.classList.remove('highlight-drop-zone');
    
    // Check if the drop is within the best zone
    if (x >= bestZone.left && x <= bestZone.right && 
        y >= bestZone.top && y <= bestZone.bottom) {
      // If we're dropping in the best zone, we need to ensure this isn't already the worst item
      if (selectedWorstItemId === draggedItem.id) {
        setSelectedWorstItemId(null);
      }
      
      // Set the best item
      setSelectedBestItemId(draggedItem.id);
      
      // Play an animation
      setShowBestAnimation(true);
      setTimeout(() => setShowBestAnimation(false), 600);
    } 
    // Check if the drop is within the worst zone
    else if (x >= worstZone.left && x <= worstZone.right && 
             y >= worstZone.top && y <= worstZone.bottom) {
      // If we're dropping in the worst zone, we need to ensure this isn't already the best item
      if (selectedBestItemId === draggedItem.id) {
        setSelectedBestItemId(null);
      }
      
      // Set the worst item
      setSelectedWorstItemId(draggedItem.id);
      
      // Play an animation
      setShowWorstAnimation(true);
      setTimeout(() => setShowWorstAnimation(false), 600);
    }
    // If we're dropping back in the central area, remove the item from best/worst
    else {
      if (selectedBestItemId === draggedItem.id) {
        setSelectedBestItemId(null);
      } else if (selectedWorstItemId === draggedItem.id) {
        setSelectedWorstItemId(null);
      }
    }
  };

  // Pause all other media when one starts playing
  const handleMediaPlay = (playingItemId: string) => {
    Object.entries(mediaRefs.current).forEach(([itemId, mediaElement]) => {
      if (itemId !== playingItemId && mediaElement && !mediaElement.paused) {
        mediaElement.pause();
      }
    });
  };

  const handleSubmit = () => {
    if (!selectedBestItemId || !selectedWorstItemId || !currentTrialSet) return;
    if (selectedBestItemId === selectedWorstItemId) {
      alert("Best and Worst item cannot be the same.");
      return;
    }

    // Pause all media before proceeding to next trial
    Object.values(mediaRefs.current).forEach(mediaElement => {
      if (mediaElement && !mediaElement.paused) {
        mediaElement.pause();
      }
    });

    const bestItem = currentTrialSet.find(item => item.id === selectedBestItemId);
    const worstItem = currentTrialSet.find(item => item.id === selectedWorstItemId);

    if (bestItem && worstItem) {
      submitChoiceAndProceed(bestItem, worstItem);
    } else {
      console.error("Selected best/worst item not found in current trial set.");
    }
  };

  const progress = getProgress();
  const isSubmitDisabled = !selectedBestItemId || !selectedWorstItemId || selectedBestItemId === selectedWorstItemId;

  // Determine how many columns to use based on window width
  const getNumColumns = () => {
    if (windowWidth < 600) {
      return 1; // Small mobile - 1 columns
		}	else {
      return 2; // else 2 columns
    }
  };

  // Get the appropriate media preview size based on window width
  const getMediaPreviewHeight = () => {
    if (windowWidth < 600) {
      return 120; // Small mobile
    } else if (windowWidth < 900) {
      return 160; // Tablet
    } else {
      return 200; // Desktop
    }
  };

  // Render the media preview based on the item type
	const renderMediaPreview = (item: MaxDiffItem) => {
		const mediaPreviewHeight = getMediaPreviewHeight();
		
		switch (item.type) {
			case 'text':
        // For text items, we need to show the text content
        return (
          <div style={{
            padding: '10px',
            borderRadius: '5px',
            background: 'var(--background-input)',
            width: '100%',
            minHeight: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 'normal',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
            color: 'var(--text-primary)',
          }}>
            {item.textContent || item.name}
          </div>
        );
			case 'image':
				return item.previewUrl ? (
					<img 
						src={item.previewUrl} 
						alt={item.name} 
						style={{
							...styles.mediaPreviewStyle,
							maxHeight: `${mediaPreviewHeight}px`,
						}}
						onDragStart={(e) => e.preventDefault()}
						draggable="false"
					/>
				) : null;
			
			case 'video':
				return item.previewUrl ? (
					<div style={styles.mediaContainerStyle}>
						<video 
							src={item.previewUrl} 
							controls 
							preload="metadata"
							style={{
								...styles.videoPlayerStyle,
								maxHeight: `${mediaPreviewHeight}px`,
							}}
							ref={(element) => { mediaRefs.current[item.id] = element; }}
							onPlay={() => handleMediaPlay(item.id)}
							onDragStart={(e) => e.preventDefault()}
							draggable="false"
						/>
					</div>
				) : null;
			
			case 'audio':
				return (
					<div style={styles.mediaContainerStyle}>
						<span 
							role="img" 
							aria-label="Audio icon" 
							style={styles.audioIconStyle}
							onDragStart={(e) => e.preventDefault()}
							draggable="false"
						>🎵</span>
						{item.file && (
							<audio 
								controls
								preload="metadata"
								style={styles.audioPlayerStyle}
								ref={(element) => { mediaRefs.current[item.id] = element; }}
								onPlay={() => handleMediaPlay(item.id)}
								onDragStart={(e) => e.preventDefault()}
							>
								<source src={item.previewUrl || URL.createObjectURL(item.file)} type={item.file.type} />
								Your browser does not support the audio element.
							</audio>
						)}
					</div>
				);
			
			default:
				return null;
		}
	};

  // Updated styles object with dark theme colors, but preserving all the original structure
	const styles = {
		viewStyle: { 
			border: '1px solid var(--border-color)', 
			borderRadius: '8px', 
			margin: 0,            
			padding: '10px',      
			position: 'relative' as const,
			overflow: 'hidden' as const,
			userSelect: 'none' as const,
			touchAction: 'pan-y' as const,
			width: '100%',
      backgroundColor: 'var(--background-card)',
		},
		
		containerStyle: {
			display: 'flex',
			flexDirection: 'column' as const,
			gap: '15px',
			width: '100%',
			margin: '10px 0 0 0',  
      touchAction: 'pan-y' as const,
		},
    
    bestZone: {
      width: '100%',
      background: 'rgba(74, 222, 128, 0.1)',
      border: '2px dashed #4ade80',
      borderRadius: '10px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      position: 'relative' as const,
      minHeight: '150px',
    },
    
    worstZone: {
      width: '100%',
      background: 'rgba(248, 113, 113, 0.1)',
      border: '2px dashed #f87171',
      borderRadius: '10px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      position: 'relative' as const,
      minHeight: '150px',
    },
    
    centralArea: {
      width: '100%',
      display: 'grid',
      gridTemplateColumns: `repeat(${getNumColumns()}, 1fr)`,
      gap: '15px',
      padding: '20px',
      background: 'var(--background-input)',
      borderRadius: '10px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
      minHeight: '300px',
      touchAction: 'pan-y' as const,
    },
    
    zoneLabel: {
      fontWeight: 'bold',
      fontSize: '1.2rem',
      marginBottom: '10px',
      textAlign: 'center' as const,
      color: 'var(--text-primary)',
    },
    
    itemCard: {
      width: '100%',
      padding: '15px',
      background: 'var(--background-card)',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      cursor: 'grab',
      transition: 'transform 0.2s ease',
      position: 'relative' as const,
      touchAction: 'pan-y' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid var(--border-color)',
    },
    
    selectedItemCard: {
      width: '200px',
      padding: '15px',
      marginBottom: '10px',
      background: 'var(--background-card)',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      cursor: 'grab',
      position: 'relative' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid var(--border-color)',
    },
    
    dragPreview: {
      position: 'fixed' as const,
      pointerEvents: 'none' as const,
      zIndex: 1000,
      opacity: 0.8,
      transform: 'scale(0.8)',
      width: '200px',
      padding: '15px',
      background: 'var(--background-card)',
      borderRadius: '8px',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
      display: 'none',
      border: '1px solid var(--border-color)',
    },
    
    itemDetailsStyle: { 
      width: '100%',
      textAlign: 'center' as const, 
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    mediaContainerStyle: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      margin: '10px 0'
    },
    
    mediaPreviewStyle: { 
		  width: '100%', 
		  maxHeight: '200px',
		  objectFit: 'contain' as const, 
		  pointerEvents: 'none' as const,
		  userSelect: 'none' as const,
		  WebkitUserDrag: 'none' as any,
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '4px',
		},
    
    audioPlayerStyle: {
      width: '100%',
      margin: '10px auto',
      backgroundColor: 'var(--background-input)',
    },
    
		videoPlayerStyle: {
			width: '100%',
			maxHeight: '200px',
      backgroundColor: 'var(--background-input)',
      borderRadius: '4px',
		},
    
    audioIconStyle: {
      fontSize: '3rem',
      margin: '5px auto',
      color: 'var(--primary-color)',
    },
    
    errorStyle: { 
      color: 'var(--error-color)', 
      marginTop: '10px', 
      border: '1px dashed var(--error-color)', 
      padding: '10px',
      borderRadius: '4px',
      backgroundColor: 'rgba(248, 113, 113, 0.1)',
    },
    
		buttonStyle: { 
			padding: '8px 20px',
			fontSize: '1em', 
			backgroundColor: 'var(--primary-color)', 
			color: 'white', 
			border: 'none', 
			borderRadius: '4px', 
			cursor: 'pointer', 
			marginTop: '10px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
		},

		disabledButtonStyle: { 
			padding: '8px 20px',
			fontSize: '1em', 
			backgroundColor: '#475569', 
			color: '#94a3b8', 
			border: 'none', 
			borderRadius: '4px', 
			cursor: 'not-allowed', 
			marginTop: '10px'
		},
    
    animation: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      pointerEvents: 'none' as const
    },
    
    bestAnimation: {
      animation: 'sparkle 0.6s ease-out',
      fontSize: '2.5rem',
      opacity: 0,
      color: '#4ade80'
    },
    
    worstAnimation: {
      animation: 'fade-in-out 0.6s ease-out',
      fontSize: '2.5rem',
      opacity: 0,
      color: '#f87171'
    },
    
    grabIcon: {
      position: 'absolute' as const,
      top: '5px',
      right: '5px',
      fontSize: '0.8rem',
      color: 'var(--text-tertiary)',
    },
    
		instructions: {
			color: 'var(--text-secondary)',
			fontStyle: 'italic' as const,
			fontSize: '0.9rem',
			textAlign: 'center' as const,
			margin: '5px 0',
			maxWidth: '600px',
			display: 'inline-block'
		},
    
    buttonContainer: {
      display: 'flex',
      justifyContent: 'center',
      width: '100%',
      marginTop: '20px'
    }
  };

  // Add CSS animations to the document - Only visual changes here
  useEffect(() => {
    // Check if the style already exists
    if (!document.getElementById('maxdiff-drag-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'maxdiff-drag-styles';
      styleElement.innerHTML = `
        .highlight-drop-zone {
          background-color: rgba(109, 93, 252, 0.2) !important;
          border: 2px solid var(--primary-color) !important;
          transform: scale(1.02);
          box-shadow: 0 0 15px rgba(109, 93, 252, 0.3) !important;
        }
        
        @keyframes sparkle {
          0% { transform: scale(0.5); opacity: 0; }
          20% { transform: scale(1.5); opacity: 0.8; }
          40% { transform: scale(1.2); opacity: 1; }
          60% { transform: scale(1.3); opacity: 0.8; }
          80% { transform: scale(1.1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        @keyframes fade-in-out {
          0% { transform: scale(0.5); opacity: 0; }
          20% { transform: scale(1.5); opacity: 0.8; }
          40% { transform: scale(1.2); opacity: 1; }
          60% { transform: scale(1.3); opacity: 0.8; }
          80% { transform: scale(1.1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        .drag-item-enter {
          transform: scale(0.8);
          opacity: 0;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        
        .drag-item-enter-active {
          transform: scale(1);
          opacity: 1;
        }
        
        .drag-item-exit {
          opacity: 1;
          transition: opacity 0.3s ease;
        }
        
        .drag-item-exit-active {
          opacity: 0;
        }
        
        /* Custom Scrollbars for inner containers */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: var(--background-dark);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: var(--primary-color);
        }
      `;
      document.head.appendChild(styleElement);
    }
  }, []);

  if (taskStatus === 'idle' || !currentTrialSet && taskStatus !== 'completed') {
    return null; // No active trial
  }
  
  if (taskStatus === 'completed') {
    return null; // Return null so only the App's completion message is shown
  }

  // taskStatus === 'in_progress' && currentTrialSet is not null
	return (
		<div 
			ref={containerRef}
			style={styles.viewStyle}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
		>
			{/* Make headers more compact */}
			<div style={{ textAlign: 'center', marginBottom: '15px' }}>
				<h3 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>{instructionText}</h3>
				
				{progress && (
					<p style={{ margin: '5px 0', color: 'var(--text-secondary)' }}>
						<strong>Progress: Trial {progress.conducted + 1} of {progress.target}</strong>
					</p>
				)}
				
				<p style={styles.instructions}>
					Drag items to the {dimensionPositiveLabel} or {dimensionNegativeLabel} zones. You can drag them back if you change your mind.
				</p>
			</div>
			
			{taskError && (
				<div style={{...styles.errorStyle, margin: '0 0 15px 0'}}>
					<p style={{ margin: 0 }}>Error: {taskError}</p>
				</div>
			)}

			{/* Main draggable container */}
			<div style={styles.containerStyle}>
        {/* Best Zone */}
        <div 
          ref={bestZoneRef}
          style={styles.bestZone}
        >
          <div style={styles.zoneLabel}>{dimensionPositiveLabel}</div>
          {selectedBestItemId && currentTrialSet && currentTrialSet.map(item => {
            if (item.id === selectedBestItemId) {
              return (
                <div 
                  key={`best-${item.id}`}
                  style={styles.selectedItemCard}
                  onMouseDown={() => handleMouseDown(item)}
                  onTouchStart={(e) => handleTouchStart(item, e)}
                >
                  <div style={styles.grabIcon}>⋮⋮</div>
                  <div style={styles.itemDetailsStyle}>
                    {renderMediaPreview(item)}
                  </div>
                </div>
              );
            }
            return null;
          })}
          {showBestAnimation && (
            <div style={styles.animation}>
              <div style={styles.bestAnimation}>👍</div>
            </div>
          )}
        </div>
        
        {/* Central Area */}
        <div 
          ref={centralAreaRef}
          style={styles.centralArea}
        >
          {currentTrialSet && currentTrialSet.map(item => {
            // Don't show items that are in the best or worst zones
            if (item.id === selectedBestItemId || item.id === selectedWorstItemId) {
              return null;
            }
            
            return (
              <div 
                key={item.id}
                style={styles.itemCard}
                onMouseDown={() => handleMouseDown(item)}
                onTouchStart={(e) => handleTouchStart(item, e)}
              >
                <div style={styles.grabIcon}>⋮⋮</div>
                <div style={styles.itemDetailsStyle}>
                  {renderMediaPreview(item)}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Worst Zone */}
        <div 
          ref={worstZoneRef}
          style={styles.worstZone}
        >
          <div style={styles.zoneLabel}>{dimensionNegativeLabel}</div>
          {selectedWorstItemId && currentTrialSet && currentTrialSet.map(item => {
            if (item.id === selectedWorstItemId) {
              return (
                <div 
                  key={`worst-${item.id}`}
                  style={styles.selectedItemCard}
                  onMouseDown={() => handleMouseDown(item)}
                  onTouchStart={(e) => handleTouchStart(item, e)}
                >
                  <div style={styles.grabIcon}>⋮⋮</div>
                  <div style={styles.itemDetailsStyle}>
                    {renderMediaPreview(item)}
                  </div>
                </div>
              );
            }
            return null;
          })}
          {showWorstAnimation && (
            <div style={styles.animation}>
              <div style={styles.worstAnimation}>👎</div>
            </div>
          )}
        </div>
      </div>

      {/* Drag Preview */}
			<div 
				ref={dragPreviewRef}
				style={{
					...styles.dragPreview,
					display: isDragging && draggedItem ? 'block' : 'none'
				}}
			>
				{draggedItem && (
					<div style={styles.itemDetailsStyle}>
						{/* Show different content based on item type */}
						{draggedItem.type === 'text' ? (
							<div style={{
								padding: '5px',
								fontSize: '0.9rem',
								textAlign: 'center',
								wordBreak: 'break-word',
								maxHeight: '80px',
								overflow: 'hidden',
                color: 'var(--text-primary)',
							}}>
								{draggedItem.textContent || draggedItem.name}
							</div>
						) : draggedItem.type === 'image' && draggedItem.previewUrl ? (
							<img 
								src={draggedItem.previewUrl} 
								alt="" 
								style={{
									maxWidth: '100%',
									maxHeight: '80px',
									objectFit: 'contain',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
								}} 
							/>
						) : draggedItem.type === 'audio' ? (
							<span role="img" aria-label="Audio icon" style={{ fontSize: '2rem', color: 'var(--primary-color)' }}>🎵</span>
						) : draggedItem.type === 'video' ? (
							<span role="img" aria-label="Video icon" style={{ fontSize: '2rem', color: 'var(--primary-color)' }}>🎬</span>
						) : (
							// Default fallback for any other type
							<div style={{ padding: '5px', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
								{draggedItem.name}
							</div>
						)}
					</div>
				)}
			</div>

      {/* Centered Submit Button */}
      <div style={{...styles.buttonContainer, margin: '15px 0 5px 0'}}>
				<button 
					onClick={handleSubmit} 
					disabled={isSubmitDisabled} 
					style={isSubmitDisabled ? styles.disabledButtonStyle : styles.buttonStyle}
				>
					Submit Choice
				</button>
			</div>
		</div>
  );
};

export default TrialView;