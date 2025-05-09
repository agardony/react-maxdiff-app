import React, { useState } from 'react';
import { useItemStore } from '../store/itemStore';
import type { MaxDiffItem } from '../types';

/**
 * @component ItemListDisplay
 * @description Displays the list of items currently in the `useItemStore`.
 * Now with collapsible functionality to save space.
 * Allows removal of items and shows the total item count.
 */
const ItemListDisplay: React.FC = () => {
  const items = useItemStore((state) => state.items);
  const removeItem = useItemStore((state) => state.removeItem);
  const clearAllItems = useItemStore((state) => state.clearAllItems);
  const getItemCount = useItemStore((state) => state.getItemCount);
  
  // New state for collapsed/expanded view
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  const totalItems = getItemCount();

  // Toggle collapsed state
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Container style for grid layout
  const gridContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px',
    justifyContent: 'flex-start'
  };

  const itemStyle: React.CSSProperties = {
    border: '1px solid var(--border-color)',
    padding: '10px',
    borderRadius: 'var(--border-radius)',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    width: 'calc(25% - 15px)', // Four items per row with gap consideration
    minWidth: '220px', // Minimum width for responsiveness
    maxWidth: '300px',
    marginBottom: '5px',
    backgroundColor: 'var(--background-card)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
  };

  const mediaPreviewStyle: React.CSSProperties = {
    maxWidth: '100%',
    maxHeight: '150px',
    border: '1px solid var(--border-color)',
    objectFit: 'contain',
    marginBottom: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
  };

  const nameStyle: React.CSSProperties = {
    textAlign: 'center',
    fontWeight: 'bold',
    margin: '10px 0',
    wordWrap: 'break-word', // Enable word wrapping
    overflow: 'hidden', // Prevent overflow
    width: '100%', // Ensure the text stays within the container
    color: 'var(--text-primary)',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '5px 10px',
    backgroundColor: 'var(--error-color)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    marginTop: 'auto', // Push button to bottom of flex container
    fontWeight: '500',
    transition: 'background-color 0.2s ease, transform 0.2s ease',
    boxShadow: 'var(--shadow-sm)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isCollapsed ? '0' : '15px',
    padding: '10px',
    backgroundColor: 'var(--background-input)',
    borderRadius: 'var(--border-radius)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-color)',
  };

  const removeAllButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: 'var(--error-color)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--border-radius)',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.2s ease, transform 0.2s ease',
    boxShadow: 'var(--shadow-sm)',
  };

  const collapsibleContentStyle: React.CSSProperties = {
    display: isCollapsed ? 'none' : 'block',
    transition: 'height 0.3s ease-in-out',
    overflow: 'hidden',
  };

  const collapseIconStyle: React.CSSProperties = {
    marginLeft: '10px',
    transition: 'transform 0.3s ease',
    transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
    display: 'inline-block',
    color: 'var(--text-secondary)',
  };

  const handleRemoveAll = () => {
    if (totalItems === 0) return;
    
    if (window.confirm('Are you sure you want to remove all items? This action cannot be undone.')) {
      clearAllItems();
    }
  };

  // Handle header click without triggering Remove All
  const handleHeaderClick = (e: React.MouseEvent) => {
    // Only toggle if the click wasn't on the Remove All button
    if (!(e.target as HTMLElement).closest('button')) {
      toggleCollapse();
    }
  };

  // Add hover style for items using CSS and className
  const itemHoverStyleId = 'item-hover-style';
  React.useEffect(() => {
    if (!document.getElementById(itemHoverStyleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = itemHoverStyleId;
      styleEl.innerHTML = `
        .item-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--primary-color);
        }
        .remove-button:hover {
          background-color: #ef4444;
          transform: translateY(-1px);
        }
        .remove-all-button:hover {
          background-color: #ef4444;
          transform: translateY(-1px);
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={headerStyle} onClick={handleHeaderClick}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
          Current Items in Collection ({totalItems})
          <span style={collapseIconStyle}>▼</span>
        </h3>
        <button 
          className="remove-all-button"
          style={removeAllButtonStyle} 
          onClick={handleRemoveAll}
          aria-label="Remove all items"
        >
          Remove All
        </button>
      </div>

      {/* Collapsible content */}
      <div style={collapsibleContentStyle}>
        {totalItems === 0 ? (
          <div style={{ padding: '15px 0', color: 'var(--text-secondary)' }}><p>No items added yet.</p></div>
        ) : (
          <div style={gridContainerStyle}>
            {items.map((item: MaxDiffItem) => (
              <div key={item.id} style={itemStyle} className="item-card">
                {/* Media content is displayed first */}
                {item.type === 'image' && item.previewUrl && (
                  <img src={item.previewUrl} alt={item.name} style={mediaPreviewStyle} />
                )}
                {item.type === 'video' && item.previewUrl && (
                  <video src={item.previewUrl} controls muted style={mediaPreviewStyle} />
                )}
                {item.type === 'audio' && (
                  <div style={{ textAlign: 'center', margin: '10px 0' }}>
                    <span role="img" aria-label="Audio icon" style={{ fontSize: '2rem', color: 'var(--primary-color)' }}>🎵</span>
                  </div>
                )}
                
                {/* Only the name is displayed with word wrapping */}
                <p style={nameStyle}>{item.name}</p>

                <button className="remove-button" style={buttonStyle} onClick={() => removeItem(item.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemListDisplay;