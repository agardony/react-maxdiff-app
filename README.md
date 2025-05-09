# React MaxDiff App

[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3.5-purple)](https://vitejs.dev/)
[![Zustand](https://img.shields.io/badge/Zustand-5.0.4-orange)](https://github.com/pmndrs/zustand)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## Table of Contents

- [Overview](#overview)
  - [Development Philosophy](#development-philosophy)
- [Features](#features)
- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
  - [Key Components](#key-components)
  - [State Management](#state-management)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Browser Compatibility](#browser-compatibility)
  - [Installation](#installation)
  - [Available Scripts](#available-scripts)
- [Usage Guide](#usage-guide)
  - [Uploading Items](#1-uploading-items)
  - [Configuring the Experiment](#2-configuring-the-experiment)
  - [Running the Experiment](#3-running-the-experiment)
  - [Viewing and Exporting Results](#4-viewing-and-exporting-results)
- [Privacy Notice](#privacy-notice)
- [License](#license)
- [Contributing](#contributing)
  - [Development Guidelines](#development-guidelines)
  - [Reporting Issues](#reporting-issues)

## Overview

React MaxDiff App is a modern, browser-based application for conducting Maximum Difference Scaling (MaxDiff) experiments. MaxDiff is a research technique used to elicit preferences among multiple items by asking participants to select the best and worst items from subsets of the full list.

This application is built with React, TypeScript, and Vite, featuring modern React patterns like Suspense and lazy loading for optimal performance. All data processing happens entirely client-side, ensuring participant privacy and eliminating the need for server infrastructure.

### Development Philosophy

React MaxDiff App embraces modern React development patterns to deliver a responsive and efficient user experience. The development philosophy centers on:

- **Modern React Patterns**: Using Suspense, lazy loading, and functional components with hooks
- **Privacy by Design**: Building privacy into the core architecture, not as an afterthought
- **Simplicity and Efficiency**: Focusing on a streamlined user experience without sacrificing functionality
- **Performance First**: Optimizing for speed and responsiveness

## Features

- **Multiple Item Types Support**
  - Text items
  - Image items
  - Video items
  - Audio items

- **Flexible Configuration**
  - Customize items per subset
  - Set target number of trials
  - Control various experiment parameters

- **Streamlined Workflow**
  - Upload items via text file or media uploads
  - Configure experiment parameters
  - Run MaxDiff trials with intuitive UI
  - View results with real-time visualizations

- **Privacy-Focused Design**
  - All data stays in the browser
  - No server communication or data storage
  - Export results directly to your device

- **Rich Results**
  - Interactive visualizations using Recharts
  - CSV export with unique filename generation
  - Comprehensive trial data recording

## Technical Stack

- **Frontend Framework**
  - React 19.1.0
  - React DOM 19.1.0

- **State Management**
  - Zustand 5.0.4 (lightweight, hooks-based state management)

- **Visualization**
  - Recharts 2.15.3 (responsive charting library)

- **Build Tools & Development**
  - TypeScript 5.8.3
  - Vite 6.3.5
  - ESLint 9.25.0

- **Module System**
  - ES Modules

## Project Structure

```
react-maxdiff-app/
├── public/             # Static assets
├── src/
│   ├── assets/         # Application assets
│   ├── components/     # React components
│   │   ├── TextFileUpload.tsx
│   │   ├── MediaUpload.tsx
│   │   ├── ItemListDisplay.tsx
│   │   ├── ConfigPanel.tsx
│   │   ├── TrialView.tsx
│   │   └── MaxDiffVisualization.tsx
│   ├── core/           # Core functionality
│   ├── store/          # Zustand state management
│   │   ├── itemStore.ts
│   │   ├── configStore.ts
│   │   └── taskSessionStore.ts
│   ├── App.css         # Main application styles
│   ├── App.tsx         # Main application component
│   ├── index.css       # Global styles
│   ├── main.tsx        # Application entry point
│   ├── types.ts        # TypeScript type definitions
│   └── vite-env.d.ts   # Vite environment types
├── index.html          # HTML entry point
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── vite.config.ts      # Vite configuration
```

### Key Components

- **TextFileUpload & MediaUpload**: Components for uploading items
- **ItemListDisplay**: Shows the list of uploaded items
- **ConfigPanel**: Interface for configuring MaxDiff parameters
- **TrialView**: The interface for conducting MaxDiff trials
- **MaxDiffVisualization**: Visualizes results of the MaxDiff experiment

### State Management

The application uses Zustand for state management with three main stores:

- **itemStore**: Manages the list of items for the MaxDiff experiment
- **configStore**: Handles configuration parameters for the experiment
- **taskSessionStore**: Controls the MaxDiff task execution and results

## Getting Started

### Prerequisites

- Node.js (>=16.x)
- npm or yarn

### Browser Compatibility

This application works best with modern browsers:
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

Mobile browser support:
- iOS Safari 14+
- Chrome for Android 90+

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/react-maxdiff-app.git
   cd react-maxdiff-app
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview the production build locally

## Usage Guide

### 1. Uploading Items

You can add items to your MaxDiff experiment in two ways:

- **Text file upload**: Upload a text file where each line represents one item
- **Media upload**: Upload image, video, or audio files as items

All uploaded items will appear in the item list display where you can review and manage them.

### 2. Configuring the Experiment

In the Configuration panel:

1. Set the number of items per subset (how many items will be shown in each trial)
2. Define the target number of trials (how many questions participants will answer)
3. Additional configuration options as needed

### 3. Running the Experiment

1. Click "Start MaxDiff Task" to begin the experiment
2. For each trial, select the "Best" and "Worst" items from the presented subset
3. Continue through all trials until completion

### 4. Viewing and Exporting Results

After completing all trials:

1. Review the visualizations that show the relative preferences across all items
2. Click "Download Results (CSV)" to export the raw data
3. The CSV file will include:
   - Trial number
   - Best item selected in each trial
   - Worst item selected in each trial
   - All items presented in each trial

## Privacy Notice

**Your data stays in your browser.** This application:

- Processes all data entirely in the browser
- Does not transmit your uploaded files or response data to any server
- Does not store data in databases or persistent storage
- All data is lost when you close the browser tab or window

This design ensures maximum privacy and security for your MaxDiff experiments.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions to React MaxDiff App are welcome! Here's how you can contribute:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and conventions
- Write tests for new features
- Update documentation to reflect changes
- Ensure your code passes linting (`npm run lint`)

### Reporting Issues

If you find a bug or have a feature request, please open an issue on GitHub with:
- A clear description of the issue or request
- Steps to reproduce (for bugs)
- Any relevant screenshots or error messages
