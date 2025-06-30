# Parcel Calculator - React Application

A React.js application for calculating parcel areas with Tailwind CSS styling. This application helps manage and calculate parcel areas based on registered and calculated area values.

## Features

- Dynamic parcel input generation
- Area calculations with permissible error checking
- Results display in a formatted table
- Copy table data to clipboard functionality
- Responsive design with Tailwind CSS

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

   Or if you prefer yarn:
   ```bash
   yarn install
   ```

## Running the Application

1. **Start the development server:**
   ```bash
   npm start
   ```

   Or with yarn:
   ```bash
   yarn start
   ```

2. **Open your browser and navigate to:**
   ```
   http://localhost:3000
   ```

## Building for Production

To create a production build:

```bash
npm run build
```

Or with yarn:
```bash
yarn build
```

The build files will be created in the `build` directory.

## How to Use

1. **Enter the number of parcels** you want to manage
2. **Enter the registered area** (total registered area)
3. **Enter the calculated area** (total calculated area)
4. **Click "Generate Parcels"** to create input fields for each parcel
5. **Fill in parcel numbers and areas** for each parcel
6. **Click "Calculate"** to process the calculations
7. **Use "Copy Table"** to copy the results to your clipboard

## Calculation Logic

The application calculates new areas based on the ratio of registered to calculated areas, but only if the absolute difference between them is within permissible limits:

- **Permissible Error = (0.8 × √registered_area) + (0.002 × registered_area)**
- If the difference exceeds this limit, original areas are used
- Results are displayed with both precise and rounded values

## Technologies Used

- **React.js** - Frontend framework
- **Tailwind CSS** - Utility-first CSS framework
- **JavaScript ES6+** - Modern JavaScript features

## Project Structure

```
parcel-calculator-react/
├── public/
│   └── index.html
├── src/
│   ├── App.js          # Main application component
│   ├── index.js        # Application entry point
│   └── index.css       # Tailwind CSS imports
├── package.json        # Dependencies and scripts
├── tailwind.config.js  # Tailwind configuration
└── postcss.config.js   # PostCSS configuration
``` 