import React, { useMemo, useState, useEffect } from 'react';
import type { RecordedChoice } from '../core/maxDiffEngine';
import type { MaxDiffItem } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LabelList
} from 'recharts';

// Custom tick component for Y-axis labels to handle text wrapping
const CustomYAxisTick = (props: any) => {
  const { x, y, payload, windowWidth } = props;
  
  // Adjust maxLength based on screen width
  const maxLength = windowWidth < 600 ? 10 : 15; // Shorter on mobile
  
  // If the label is longer than maxLength, truncate with ellipsis
  const displayText = payload.value.length > maxLength 
    ? `${payload.value.substring(0, maxLength)}...` 
    : payload.value;
  
  // Adjust font size for mobile
  const fontSize = windowWidth < 600 ? 11 : 13;
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        x={-10} 
        y={0} 
        dy={4} 
        textAnchor="end" 
        fill="#666" 
        fontSize={fontSize}
      >
        {displayText}
      </text>
    </g>
  );
};

interface MaxDiffVisualizationProps {
  choices: readonly RecordedChoice[];
  items: MaxDiffItem[];
}

interface ItemScore {
  id: string;
  name: string;
  preferenceScore: number;
  timesShown: number;
  timesBest: number;
  timesWorst: number;
  percentBest: number;
  percentWorst: number;
}

const MaxDiffVisualization: React.FC<MaxDiffVisualizationProps> = ({ choices, items }) => {
  // Add window width tracking for responsiveness
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const scores = useMemo(() => {
    // Return early if no choices
    if (!choices || choices.length === 0 || !items || items.length === 0) {
      return [];
    }
    // Create a map of item IDs to their names for quick lookup
    const itemNameMap = new Map<string, string>();
    items.forEach(item => {
      itemNameMap.set(item.id, item.name);
    });
    // Initialize counters for each item
    const counters: Record<string, {
      timesShown: number;
      timesBest: number;
      timesWorst: number;
    }> = {};
    // Initialize counters for all items
    items.forEach(item => {
      counters[item.id] = {
        timesShown: 0,
        timesBest: 0,
        timesWorst: 0
      };
    });
    // Count appearances, best selections, and worst selections
    choices.forEach(choice => {
      choice.presentedItemIds.forEach(itemId => {
        if (counters[itemId]) {
          counters[itemId].timesShown++;
        }
      });
      if (counters[choice.bestItemId]) {
        counters[choice.bestItemId].timesBest++;
      }
      if (counters[choice.worstItemId]) {
        counters[choice.worstItemId].timesWorst++;
      }
    });
    // Calculate preference scores
    const itemScores: ItemScore[] = items.map(item => {
      const stats = counters[item.id] || { timesShown: 0, timesBest: 0, timesWorst: 0 };
      
      // Avoid division by zero
      const denominator = Math.max(stats.timesShown, 1);
      
      // Calculate percentage best and worst
      const percentBest = (stats.timesBest / denominator) * 100;
      const percentWorst = (stats.timesWorst / denominator) * 100;
      
      // MaxDiff preference score: (%Best - %Worst)
      const preferenceScore = percentBest - percentWorst;
      
      // No confidence interval calculation needed
      
      return {
        id: item.id,
        name: itemNameMap.get(item.id) || item.id,
        preferenceScore,
        timesShown: stats.timesShown,
        timesBest: stats.timesBest,
        timesWorst: stats.timesWorst,
        percentBest,
        percentWorst
      };
    });
    // Sort by preference score (descending)
    itemScores.sort((a, b) => b.preferenceScore - a.preferenceScore);
    return itemScores;
  }, [choices, items]);
  
  // Generate colors for the visualizations
  const getBarColor = (index: number, max: number) => {
    // Color-blind friendly blue gradient
    const baseColor = [65, 105, 225]; // Royal blue
    const minOpacity = 0.3;
    const opacity = minOpacity + ((1 - minOpacity) * (max - index) / max);
    return `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${opacity})`;
  };

  // Don't display anything if no data is available
  if (scores.length === 0) {
    return <div className="no-data-message">No MaxDiff data available for visualization.</div>;
  }

  // Calculate the height for bars based on number of items
  const barChartHeight = Math.max(500, items.length * 50);
  
  // Get responsive margins based on screen width
  const getMargins = () => {
    if (windowWidth < 600) {
      // Mobile
      return { 
        top: 20, 
        right: 70, // Smaller right margin
        bottom: 40, 
        left: 80    // Smaller left margin
      };
    } else if (windowWidth < 900) {
      // Tablet
      return { 
        top: 20, 
        right: 100, 
        bottom: 40, 
        left: 120 
      };
    } else {
      // Desktop (original)
      return { 
        top: 20, 
        right: 140, 
        bottom: 40, 
        left: 160 
      };
    }
  };
  
  // Get responsive axis properties
  const getYAxisProps = () => {
    if (windowWidth < 600) {
      return {
        width: 70,
        tickMargin: 5
      };
    } else if (windowWidth < 900) {
      return {
        width: 110,
        tickMargin: 8
      };
    } else {
      return {
        width: 150,
        tickMargin: 10
      };
    }
  };
  
  // Get responsive label styling
  const getLabelStyle = () => {
    if (windowWidth < 600) {
      return { 
        fontSize: 10, 
        fontWeight: 'bold' 
      };
    } else if (windowWidth < 900) {
      return { 
        fontSize: 12, 
        fontWeight: 'bold' 
      };
    } else {
      return { 
        fontSize: 14, 
        fontWeight: 'bold' 
      };
    }
  };

  const margins = getMargins();
  const yAxisProps = getYAxisProps();
  const labelStyle = getLabelStyle();
  
  // Container style with proper responsive handling
  const containerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    padding: '0',
    margin: '0 auto'
  };
  
  return (
    <div className="maxdiff-visualization" style={containerStyle}>
      <h2 style={{ textAlign: 'center', fontSize: windowWidth < 600 ? '1.5rem' : '2rem' }}>MaxDiff Analysis Results</h2>
      <p className="visualization-subtitle" style={{ textAlign: 'center', fontSize: windowWidth < 600 ? '0.85rem' : '1rem' }}>
        Based on {choices.length} completed trials with {items.length} items
      </p>
      <div className="chart-container" style={{ width: '100%', overflow: 'hidden' }}>
        <h3 style={{ textAlign: 'center', fontSize: windowWidth < 600 ? '1rem' : '1.2rem' }}>Item Preference Scores: What People Prefer Most to Least</h3>
        <p className="chart-description" style={{ textAlign: 'center', fontSize: windowWidth < 600 ? '0.85rem' : '1rem' }}>
          Higher scores indicate greater preference.
        </p>
        <div style={{ width: '100%', overflowX: 'hidden' }}>
          <ResponsiveContainer width="100%" height={barChartHeight}>
            <BarChart
              layout="vertical"
              data={scores}
              margin={margins}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                domain={['dataMin - 5', 'dataMax + 5']} 
                label={{ 
                  value: windowWidth < 600 ? 'Preference Score' : 'Preference Score (%Best - %Worst)', 
                  position: 'bottom', 
                  offset: 10, 
                  fontSize: windowWidth < 600 ? 10 : 14 
                }} 
                tick={{ fontSize: windowWidth < 600 ? 10 : 13 }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={yAxisProps.width}
                tick={props => <CustomYAxisTick {...props} windowWidth={windowWidth} />}
                tickMargin={yAxisProps.tickMargin}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Preference Score']}
                labelFormatter={(label) => `Item: ${label}`}
                contentStyle={{ fontSize: windowWidth < 600 ? 12 : 14 }}
              />
              <Bar 
                dataKey="preferenceScore" 
                name="Preference Score" 
                isAnimationActive={true}
                barSize={windowWidth < 600 ? 20 : 30}
              >
                {scores.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(index, scores.length)} />
                ))}
                <LabelList 
                  dataKey="preferenceScore" 
                  position="right" 
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  style={labelStyle}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="chart-footer">
        <p className="methodology-note" style={{ 
          fontSize: windowWidth < 600 ? '0.75rem' : '0.9rem',
          textAlign: 'center',
          margin: '20px 10px'
        }}>
          <strong>Methodology:</strong> Preference scores calculated as (%Best - %Worst) for each item.
          n = {choices.length} trials.
        </p>
      </div>
    </div>
  );
};

export default MaxDiffVisualization;