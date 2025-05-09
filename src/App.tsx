import './App.css'
import { useEffect, useRef, useState, Suspense, lazy } from 'react'
import TextFileUpload from './components/TextFileUpload'
import MediaUpload from './components/MediaUpload'
import ItemListDisplay from './components/ItemListDisplay'
import ConfigPanel from './components/ConfigPanel'
import { useItemStore } from './store/itemStore'
import { useConfigStore } from './store/configStore'
import { useTaskSessionStore } from './store/taskSessionStore'
import './MaxDiffVisualization.css'

// Lazy load heavy components
const TrialView = lazy(() => import('./components/TrialView'));
const MaxDiffVisualization = lazy(() => import('./components/MaxDiffVisualization'));

// Loading fallback components
const VisualizationLoadingFallback = () => (
  <div style={{
    padding: '20px',
    margin: '20px 0',
    textAlign: 'center',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
  }}>
    <h3>Loading visualization...</h3>
    <div style={{ 
      marginTop: '20px',
      height: '8px',
      background: '#f0f0f0',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <div style={{
        width: '30%',
        height: '100%',
        background: 'var(--primary-color, #2196F3)',
        borderRadius: '4px',
        animation: 'loading 1.5s infinite',
      }}></div>
    </div>
    <style>{`
      @keyframes loading {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }
    `}</style>
  </div>
);

const TrialLoadingFallback = () => (
  <div style={{
    padding: '20px',
    textAlign: 'center',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    margin: '20px 0'
  }}>
    <h3>Loading trial interface...</h3>
  </div>
);

function App() {
  // Set the document title
  useEffect(() => {
    document.title = "MaxDiff App";
  }, []);

  // Item Store
  const items = useItemStore((state) => state.items)
  const itemCount = useItemStore((state) => state.getItemCount())

  // Config Store
  const itemsPerSubset = useConfigStore(state => state.itemsPerSubset)
  const targetNumberOfTrials = useConfigStore(state => state.targetNumberOfTrials)
  const isConfigValid = useConfigStore(state => state.isConfigValid)

  // Task Session Store
  const taskStatus = useTaskSessionStore(state => state.taskStatus)
  const startNewTaskSession = useTaskSessionStore(state => state.startNewTaskSession)
  const endTaskSession = useTaskSessionStore(state => state.endTaskSession)
  const getRecordedChoices = useTaskSessionStore(state => state.getRecordedChoices)

  // Track the way task ended
  const [manualTaskCancel, setManualTaskCancel] = useState(false)
  
  // Reference to the trial section for scrolling
  const trialSectionRef = useRef<HTMLDivElement>(null)

  // Scroll to the trial view when task starts
  useEffect(() => {
    // Scroll to trial view when task starts
    if (taskStatus === 'in_progress' && trialSectionRef.current) {
      trialSectionRef.current.scrollIntoView({ behavior: 'smooth' })
      setManualTaskCancel(false) // Reset this flag when starting a new task
    }
    
    // Only scroll back up if the user manually cancels the task
    // Don't scroll if they complete the task normally
    if (taskStatus === 'idle' && manualTaskCancel) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setManualTaskCancel(false) // Reset after handling
    }
  }, [taskStatus, manualTaskCancel])

  const handleStartTask = () => {
    const engineConfig = {
      itemsPerSubset,
      targetTrials: targetNumberOfTrials,
    };
    const success = startNewTaskSession(items, engineConfig);
    if (success) {
      console.log("App: Task started successfully.");
    } else {
      alert("App: Failed to start task. Check console for errors (e.g., not enough items or invalid config).");
    }
  };

  const handleEndTask = () => {
    // If the task is in progress when ended, it's a manual cancellation
    if (taskStatus === 'in_progress') {
      setManualTaskCancel(true)
    }
    endTaskSession();
  };

  // Updated to include isConfigValid in the check
  const canStartTask = isConfigValid && itemCount >= itemsPerSubset && taskStatus !== 'in_progress';
  
  let startButtonDisabledReason = "";
  if (taskStatus === 'in_progress') {
    startButtonDisabledReason = "Task is already in progress.";
  } else if (itemCount < itemsPerSubset) {
    startButtonDisabledReason = `Not enough items to start (need at least ${itemsPerSubset}, have ${itemCount}).`;
  } else if (!isConfigValid) {
    startButtonDisabledReason = "Please complete all configuration fields correctly.";
  }

  // Helper function to generate a unique filename with UUID and timestamp
  const generateUniqueFilename = () => {
    // Generate UUID
    const uuid = crypto.randomUUID ? crypto.randomUUID() : 
      `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create timestamp in ISO format and make it filename-friendly
    const timestamp = new Date().toISOString()
      .replace(/:/g, '-')  // Replace colons with hyphens
      .replace(/\..+/, ''); // Remove milliseconds
    
    return `maxdiff_results_${timestamp}_${uuid}.csv`;
  };

  const handleDownloadResults = () => {
    const choices = getRecordedChoices();
    if (!choices || choices.length === 0) {
      alert("No choices recorded to download.");
      return;
    }

    // Create a map of item IDs to their names for quick lookup
    const itemNameMap = new Map<string, string>();
    items.forEach(item => {
      itemNameMap.set(item.id, item.name);
    });

    // Updated headers: removed IDs, only using names
    const headers = [
      "TrialNumber",
      "BestItem",
      "WorstItem",
      ...Array.from({ length: itemsPerSubset }, (_, i) => `PresentedItem${i + 1}`)
    ];

    const rows = choices.map(choice => {
      // Get exactly itemsPerSubset presented items (names only)
      const presentedNames = Array(itemsPerSubset).fill('');
      choice.presentedItemIds.forEach((id, index) => {
        if (index < itemsPerSubset) {
          presentedNames[index] = itemNameMap.get(id) || 'Unknown Item';
        }
      });
      
      return [
        choice.trialNumber,
        itemNameMap.get(choice.bestItemId) || 'Unknown Item',
        itemNameMap.get(choice.worstItemId) || 'Unknown Item',
        ...presentedNames
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    // Generate unique filename with UUID and timestamp
    const filename = generateUniqueFilename();
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up the object URL
  };

  const isTaskInProgress = taskStatus === 'in_progress';
  const isTaskCompleted = taskStatus === 'completed';
  const isTaskActive = isTaskInProgress || isTaskCompleted;

  // We want to conditionally show setup sections:
  // - Hide when task is in progress
  // - Hide when task is completed (to keep focus on results section)
  const shouldShowSetupSections = !isTaskInProgress && !isTaskCompleted;

  return (
    <div className="maxdiff-container">
      <header className="maxdiff-header">
        <h1>MaxDiff Task</h1>
        <p className="app-description">Configure and run Maximum Difference Scaling experiments</p>
      </header>

      <main className="maxdiff-main">
        {/* Setup sections - hidden when task is in progress or completed */}
        {shouldShowSetupSections && (
          <>
            <section className="input-section">
              <h2>Upload Items</h2>
							<h5><i>
							<center>Any media you upload stays entirely within your browser session.</center>
							<center>Your uploaded files and response data are never transmitted elsewhere, stored in any database, or persisted after you close this page</center>
							</i></h5>
              <div className="input-controls">
                <TextFileUpload />
                <MediaUpload />
              </div>
              <ItemListDisplay />
            </section>

            <section className="config-section">
              <h2>Configure MaxDiff</h2>
              <ConfigPanel />
            </section>
          </>
        )}

        {/* Execution section - conditionally show different elements based on task state */}
        <section 
          ref={trialSectionRef} 
          className="execution-section"
          style={{
            margin: isTaskInProgress || isTaskCompleted ? '20px 0' : '0',
            padding: isTaskInProgress || isTaskCompleted ? '0' : '10px',
            border: isTaskInProgress || isTaskCompleted ? '1px solid #e0e0e0' : 'none',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Show title only when needed */}
          {(!isTaskInProgress || !shouldShowSetupSections) && (
            <h2 style={{ marginBottom: isTaskInProgress ? '10px' : '20px' }}>
              {isTaskInProgress ? 'MaxDiff Task' : (isTaskCompleted ? 'Task Results' : 'Run MaxDiff')}
            </h2>
          )}
          
          {/* Show warning message when needed */}
          {!isTaskInProgress && !isTaskCompleted && !canStartTask && startButtonDisabledReason && (
            <div className="status-message">
              <p className="warning-message">{startButtonDisabledReason}</p>
            </div>
          )}
          
          {/* Control buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            margin: isTaskInProgress ? '0 0 20px 0' : '10px 0',
            flexWrap: 'wrap',
            width: '100%'
          }}>
            {!isTaskInProgress && !isTaskCompleted && (
              <button 
                className={`control-button start-button ${!canStartTask ? 'disabled' : ''}`}
                onClick={handleStartTask} 
                disabled={!canStartTask}
              >
                Start MaxDiff Task
              </button>
            )}
            
            {isTaskActive && (
              <button 
                className="control-button end-button"
                onClick={handleEndTask}
              >
                {isTaskInProgress ? 'End Task Session' : 'Start New Task'}
              </button>
            )}
            
            {isTaskCompleted && (
              <button 
                className="control-button download-button"
                onClick={handleDownloadResults}
              >
                Download Results (CSV)
              </button>
            )}
          </div>
          
          {/* Completion message */}
          {isTaskCompleted && (
            <div className="completion-message" style={{
              margin: '0 0 20px 0',
              padding: '15px',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              borderLeft: '4px solid #4CAF50',
              borderRadius: '4px',
              width: 'calc(100% - 40px)',
              maxWidth: '800px'
            }}>
              <h3 style={{ marginTop: 0 }}>Task Completed!</h3>
              <p>You have successfully completed all trials. Please download your results using the button above.</p>
              <p>To start a new MaxDiff task, click "Start New Task".</p>
            </div>
          )}

          {/* MaxDiff Visualization - only show when task is completed */}
          {isTaskCompleted && (
            <Suspense fallback={<VisualizationLoadingFallback />}>
              <MaxDiffVisualization 
                choices={getRecordedChoices()} 
                items={items} 
              />
            </Suspense>
          )}

          {/* Trial container - only show when task is in progress */}
          {isTaskInProgress && (
            <div className="trial-container" style={{ width: '100%', margin: 0 }}>
              <Suspense fallback={<TrialLoadingFallback />}>
                <TrialView />
              </Suspense>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App