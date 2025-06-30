import React, { useState, useEffect } from 'react';

function App() {
  const [parcelCount, setParcelCount] = useState('');
  const [registeredArea, setRegisteredArea] = useState('');
  const [calculatedArea, setCalculatedArea] = useState('');
  const [parcels, setParcels] = useState([]);
  const [showCalculate, setShowCalculate] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl+Z for undo
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.shiftKey && event.key === 'z')) {
        event.preventDefault();
        redo();
      }
      // Ctrl+D for dark mode toggle
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        toggleDarkMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history.length, isDarkMode]);

  // Initialize history with empty state
  useEffect(() => {
    if (history.length === 0) {
      saveToHistory({ action: 'Initial state' });
    }
  }, []);

  // Notification system
  const addNotification = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-dismiss notification
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const showSuccess = (message) => addNotification(message, 'success', 3000);
  const showError = (message) => addNotification(message, 'error', 5000);
  const showInfo = (message) => addNotification(message, 'info', 4000);
  const showWarning = (message) => addNotification(message, 'warning', 4500);

  const addParcelRow = (index, parcelNumValue = '', parcelAreaValue = '') => {
    const newParcel = {
      id: Date.now() + index,
      parcelNumber: parcelNumValue,
      parcelArea: parcelAreaValue
    };
    setParcels(prev => [...prev, newParcel]);
  };

  const removeParcelRow = (id) => {
    setParcels(prev => prev.filter(parcel => parcel.id !== id));
  };

  const updateParcelInput = (id, field, value) => {
    setParcels(prev => 
      prev.map(parcel => 
        parcel.id === id ? { ...parcel, [field]: value } : parcel
      )
    );
  };

  const generateParcels = () => {
    const parcelCountNum = parseInt(parcelCount, 10);
    if (isNaN(parcelCountNum) || parcelCountNum <= 0) {
      showError('Please enter a valid number of parcels.');
      return;
    }

    saveToHistory({ action: 'Generate parcels' });
    
    setParcels([]);
    setResults(null);
    setShowCopy(false);

    const newParcels = [];
    for (let i = 1; i <= parcelCountNum; i++) {
      newParcels.push({
        id: Date.now() + i,
        parcelNumber: i.toString(),
        parcelArea: ''
      });
    }
    setParcels(newParcels);
    setShowCalculate(true);
    showSuccess(`Generated ${parcelCountNum} parcel${parcelCountNum > 1 ? 's' : ''} successfully! 🎉`);
  };

  const calculateResults = async () => {
    saveToHistory({ action: 'Calculate results' });
    
    setIsCalculating(true);
    setResults(null);
    setShowCopy(false);
    
    showInfo('Calculating parcel areas... 🧮');

    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const registeredAreaNum = parseFloat(registeredArea);
    const calculatedAreaNum = parseFloat(calculatedArea);
    const absoluteDifference = Math.abs(registeredAreaNum - calculatedAreaNum);
    const permissibleError = (0.8 * Math.sqrt(registeredAreaNum)) + (0.002 * registeredAreaNum);

    let totalBeforeRounding = 0;
    let totalAfterRounding = 0;
    const tableData = [];

    parcels.forEach((parcel) => {
      const parcelNumber = parcel.parcelNumber.trim();
      const parcelArea = parseFloat(parcel.parcelArea);
      let newArea = parcelArea;
      let roundedArea = Math.round(newArea);

      if (absoluteDifference <= permissibleError) {
        newArea = (registeredAreaNum / calculatedAreaNum) * parcelArea;
        roundedArea = Math.round(newArea);
      }

      if (!isNaN(parcelArea) && parcelArea > 0 && parcelNumber !== '') {
        totalBeforeRounding += newArea;
        totalAfterRounding += roundedArea;

        tableData.push({
          parcelNumber,
          newArea: newArea.toFixed(2),
          roundedArea
        });
      }
    });

    setResults({
      absoluteDifference: absoluteDifference.toFixed(2),
      permissibleError: permissibleError.toFixed(2),
      exceedsLimit: absoluteDifference > permissibleError,
      tableData,
      totalBeforeRounding: totalBeforeRounding.toFixed(2),
      totalAfterRounding
    });

    setIsCalculating(false);
    setShowCopy(true);
    showSuccess(`Calculation completed! ${tableData.length} parcel${tableData.length > 1 ? 's' : ''} processed. ✨`);
  };

  const exportAsImage = async () => {
    if (!results) {
      showWarning('No table data to export. Please calculate results first.');
      return;
    }

    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      canvas.width = 600;
      canvas.height = 450 + (results.tableData.length * 40);
      
      // Set background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Set font for Arabic text
      ctx.font = '18px Arial';
      ctx.fillStyle = '#000000';
      
      let y = 50;
      
      // Arabic Title: جدول الأقراز (1) - positioned at top right
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('(1) جدول الأقراز', 550, y);
      y += 60;
      
      // Draw main table border
      const tableX = 50;
      const tableY = y;
      const tableWidth = 500;
      const tableHeight = 120 + (results.tableData.length * 40);
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(tableX, tableY, tableWidth, tableHeight);
      
      // Header row background
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(tableX + 1, tableY + 1, tableWidth - 2, 80);
      
      // Column divisions (3 main columns)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      
      // First vertical divider (between area and parcel number)
      ctx.beginPath();
      ctx.moveTo(tableX + 200, tableY);
      ctx.lineTo(tableX + 200, tableY + tableHeight);
      ctx.stroke();
      
      // Second vertical divider (between parcel number and rounded area)
      ctx.beginPath();
      ctx.moveTo(tableX + 350, tableY);
      ctx.lineTo(tableX + 350, tableY + tableHeight);
      ctx.stroke();
      
      // Horizontal divider after main headers
      ctx.beginPath();
      ctx.moveTo(tableX, tableY + 40);
      ctx.lineTo(tableX + tableWidth, tableY + 40);
      ctx.stroke();
      
      // Additional horizontal divider for sub-headers
      ctx.beginPath();
      ctx.moveTo(tableX, tableY + 80);
      ctx.lineTo(tableX + tableWidth, tableY + 80);
      ctx.stroke();
      
      // Header text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      
      // Main headers
      ctx.fillText('المساحه', tableX + 100, tableY + 25);  // Area (left column)
      ctx.fillText('رقم القطعه', tableX + 275, tableY + 25);  // Parcel Number (middle column)
      ctx.fillText('المساحه النهائية', tableX + 425, tableY + 25);  // Final Area (right column)
      
      // Sub headers
      ctx.font = '14px Arial';
      ctx.fillText('بالدونم المتري', tableX + 100, tableY + 60);  // "In Metric Dunums"
      // Empty sub-headers for other columns
      
      y = tableY + 80;
      
      // Data rows
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      
      results.tableData.forEach((row, index) => {
        // Row background (alternating)
        if (index % 2 === 0) {
          ctx.fillStyle = '#f9f9f9';
          ctx.fillRect(tableX + 1, y, tableWidth - 2, 40);
        }
        
        // Row border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tableX, y + 40);
        ctx.lineTo(tableX + tableWidth, y + 40);
        ctx.stroke();
        
        // Vertical borders
        ctx.beginPath();
        ctx.moveTo(tableX + 200, y);
        ctx.lineTo(tableX + 200, y + 40);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(tableX + 350, y);
        ctx.lineTo(tableX + 350, y + 40);
        ctx.stroke();
        
        // Data text
        ctx.fillStyle = '#000000';
        ctx.fillText(row.newArea, tableX + 100, y + 25);  // Area value in left column
        ctx.fillText(row.parcelNumber, tableX + 275, y + 25);  // Parcel number in middle column
        ctx.fillText(row.roundedArea.toString(), tableX + 425, y + 25);  // Rounded area in right column
        
        y += 40;
      });
      
      // Total row
      ctx.fillStyle = '#e6f3ff';
      ctx.fillRect(tableX + 1, y, tableWidth - 2, 40);
      
      // Total row borders
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      
      // Horizontal border for total row
      ctx.beginPath();
      ctx.moveTo(tableX, y);
      ctx.lineTo(tableX + tableWidth, y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(tableX, y + 40);
      ctx.lineTo(tableX + tableWidth, y + 40);
      ctx.stroke();
      
      // Vertical borders for total row
      ctx.beginPath();
      ctx.moveTo(tableX + 200, y);
      ctx.lineTo(tableX + 200, y + 40);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(tableX + 350, y);
      ctx.lineTo(tableX + 350, y + 40);
      ctx.stroke();
      
      // Total text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(results.totalBeforeRounding, tableX + 100, y + 25);  // Total in left column
      // Empty middle column for parcel number total
      ctx.fillText(results.totalAfterRounding.toString(), tableX + 425, y + 25);  // Total rounded in right column
      
      y += 60;
      
      // Summary section in Arabic - positioned on the right
      ctx.font = '14px Arial';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#000000';
      ctx.fillText(`الفرق المطلق: ${results.absoluteDifference || 'NaN'}`, 530, y);
      y += 25;
      ctx.fillText(`الخطأ المسموح: ${results.permissibleError || 'NaN'}`, 530, y);
      y += 35;
      
      if (results.exceedsLimit) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('تحذير: الخطأ يتجاوز الحدود المسموحة!', 530, y);
      } else {
        ctx.fillStyle = '#008000';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('الحساب ضمن الحدود المقبولة', 530, y);
      }
      
      // Convert canvas to blob and copy to clipboard
      canvas.toBlob(async (blob) => {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          showSuccess('Arabic table copied to clipboard! 🖼️ Ready to paste into AutoCAD.');
        } catch (error) {
          console.error('Failed to copy image to clipboard:', error);
          // Fallback: download the image if clipboard fails
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'arabic-parcel-table.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          showInfo('Cannot copy to clipboard. Image downloaded instead! 📥');
        }
      });
    } catch (error) {
      console.error('Error creating image:', error);
      showError('Error creating table image. Please try again.');
    }
  };

  const copyTable = () => {
    if (!results) {
      showWarning('No table found to copy. Please calculate results first.');
      return;
    }

    // Simple AutoCAD-friendly format using only basic characters
    let textToCopy = '';
    
    // Title
    textToCopy += 'PARCEL CALCULATION TABLE\n';
    textToCopy += '=======================\n\n';
    
    // Simple header without vertical lines
    textToCopy += 'Parcel No.      New Area        Rounded Area\n';
    textToCopy += '----------      --------        ------------\n';
    
    // Data rows with fixed spacing
    results.tableData.forEach(row => {
      // Use fixed-width formatting for each column
      const parcelStr = row.parcelNumber.toString().padStart(6, ' ').padEnd(10, ' ');
      const newAreaStr = row.newArea.toString().padStart(8, ' ').padEnd(12, ' ');
      const roundedStr = row.roundedArea.toString().padStart(8, ' ');
      
      textToCopy += `${parcelStr}      ${newAreaStr}    ${roundedStr}\n`;
    });
    
    // Separator
    textToCopy += '----------      --------        ------------\n';
    
    // Total row
    const totalLabel = 'TOTAL:'.padEnd(10, ' ');
    const totalBeforeStr = results.totalBeforeRounding.toString().padStart(8, ' ').padEnd(12, ' ');
    const totalAfterStr = results.totalAfterRounding.toString().padStart(8, ' ');
    
    textToCopy += `${totalLabel}      ${totalBeforeStr}    ${totalAfterStr}\n`;
    textToCopy += '==============================================\n\n';
    
    // Summary with better formatting
    textToCopy += 'CALCULATION SUMMARY:\n';
    textToCopy += '-------------------\n';
    textToCopy += `Absolute Difference: ${results.absoluteDifference || '0.00'}\n`;
    textToCopy += `Permissible Error:   ${results.permissibleError || '0.00'}\n\n`;
    
    if (results.exceedsLimit) {
      textToCopy += '*** WARNING: Error exceeds permissible limits! ***\n';
    } else {
      textToCopy += 'Status: Calculation within acceptable limits\n';
    }
    
    textToCopy += '\n';
    textToCopy += 'Generated by Parcel Manager';

    const textArea = document.createElement('textarea');
    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    showSuccess('AutoCAD-optimized table copied to clipboard! 📋');
  };

  // Dark mode toggle
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    showInfo(`Switched to ${!isDarkMode ? 'dark' : 'light'} mode! ${!isDarkMode ? '🌙' : '☀️'}`);
  };

  // History management for undo/redo
  const saveToHistory = (state) => {
    const newState = {
      parcelCount,
      registeredArea,
      calculatedArea,
      parcels,
      results,
      timestamp: Date.now(),
      action: state.action || 'Unknown action'
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    // Limit history to last 20 actions
    if (newHistory.length > 20) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setParcelCount(previousState.parcelCount);
      setRegisteredArea(previousState.registeredArea);
      setCalculatedArea(previousState.calculatedArea);
      setParcels(previousState.parcels);
      setResults(previousState.results);
      setHistoryIndex(historyIndex - 1);
      showInfo(`Undone: ${previousState.action} ↶`);
    } else {
      showWarning('Nothing to undo! 🤷‍♂️');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setParcelCount(nextState.parcelCount);
      setRegisteredArea(nextState.registeredArea);
      setCalculatedArea(nextState.calculatedArea);
      setParcels(nextState.parcels);
      setResults(nextState.results);
      setHistoryIndex(historyIndex + 1);
      showInfo(`Redone: ${nextState.action} ↷`);
    } else {
      showWarning('Nothing to redo! 🤷‍♂️');
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-300 py-8 px-4 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      <div className="max-w-4xl mx-auto">
        {/* Header with Controls */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-6">
            {/* Undo/Redo Controls */}
            <div className="flex space-x-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className={`p-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <span className="text-lg">↶</span>
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className={`p-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <span className="text-lg">↷</span>
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 ${
                isDarkMode
                  ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              <span className="text-lg">{isDarkMode ? '☀️' : '🌙'}</span>
            </button>
          </div>

          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4 shadow-lg">
            <span className="text-2xl">📊</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Parcel Manager
          </h1>
          <p className={`text-lg transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Professional parcel area calculation tool
          </p>
          
          {/* Keyboard Shortcuts Info */}
          <div className={`mt-4 inline-flex items-center px-4 py-2 rounded-lg text-xs transition-all duration-300 ${
            isDarkMode 
              ? 'bg-gray-700 text-gray-300 border border-gray-600' 
              : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}>
            <span className="mr-2">⌨️</span>
            <span className="font-medium">Shortcuts:</span>
            <span className="ml-2">Ctrl+Z (Undo) • Ctrl+Y (Redo) • Ctrl+D (Dark Mode)</span>
          </div>
        </div>

        <div className={`rounded-2xl shadow-xl p-8 border transition-all duration-300 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-100'
        }`}>
          {/* Input Fields */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-2">
              <label className={`flex items-center text-sm font-semibold mb-3 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Number of Parcels
              </label>
              <input
                type="number"
                value={parcelCount}
                onChange={(e) => {
                  setParcelCount(e.target.value);
                  saveToHistory({ action: 'Update parcel count' });
                }}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500' 
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 hover:border-gray-300'
                }`}
                placeholder="Enter number..."
              />
            </div>

            <div className="space-y-2">
              <label className={`flex items-center text-sm font-semibold mb-3 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Registered Area (m²)
              </label>
              <input
                type="number"
                step="0.01"
                value={registeredArea}
                onChange={(e) => {
                  setRegisteredArea(e.target.value);
                  saveToHistory({ action: 'Update registered area' });
                }}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500' 
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 hover:border-gray-300'
                }`}
                placeholder="Enter registered area..."
              />
            </div>

            <div className="space-y-2">
              <label className={`flex items-center text-sm font-semibold mb-3 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                Calculated Area (m²)
              </label>
              <input
                type="number"
                step="0.01"
                value={calculatedArea}
                onChange={(e) => {
                  setCalculatedArea(e.target.value);
                  saveToHistory({ action: 'Update calculated area' });
                }}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500' 
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 hover:border-gray-300'
                }`}
                placeholder="Enter calculated area..."
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateParcels}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 mb-6"
          >
            <span className="flex items-center justify-center">
              <span className="mr-2">🚀</span>
              Generate Parcels
            </span>
          </button>

          {/* Dynamic Parcel Inputs */}
          {parcels.length > 0 && (
            <div className={`rounded-xl p-6 mb-6 border transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center transition-colors duration-300 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>
                <span className="mr-2">📝</span>
                Parcel Details ({parcels.length} parcels)
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {parcels.map((parcel, index) => (
                  <div key={parcel.id} className={`flex gap-3 items-center p-4 rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600 hover:bg-gray-700' 
                      : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}>
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <input
                      type="number"
                      placeholder="Parcel Number"
                      value={parcel.parcelNumber}
                      onChange={(e) => {
                        updateParcelInput(parcel.id, 'parcelNumber', e.target.value);
                        saveToHistory({ action: 'Update parcel number' });
                      }}
                      className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                    <input
                      type="number"
                      placeholder="Area (m²)"
                      value={parcel.parcelArea}
                      onChange={(e) => {
                        updateParcelInput(parcel.id, 'parcelArea', e.target.value);
                        saveToHistory({ action: 'Update parcel area' });
                      }}
                      className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                    <button
                      onClick={() => {
                        addParcelRow(parcels.length + 1);
                        saveToHistory({ action: 'Add parcel row' });
                      }}
                      className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                      title="Add parcel"
                    >
                      +
                    </button>
                    <button
                      onClick={() => {
                        removeParcelRow(parcel.id);
                        saveToHistory({ action: 'Remove parcel row' });
                      }}
                      className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                      title="Remove parcel"
                    >
                      −
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {showCalculate && (
              <button
                onClick={calculateResults}
                disabled={isCalculating}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed"
              >
                {isCalculating ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Calculating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <span className="mr-2">🧮</span>
                    Calculate Results
                  </span>
                )}
              </button>
            )}

            {showCopy && (
              <>
                <button
                  onClick={copyTable}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                >
                  <span className="flex items-center justify-center">
                    <span className="mr-2">📋</span>
                    Copy Text
                  </span>
                </button>
                
                <button
                  onClick={exportAsImage}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                >
                  <span className="flex items-center justify-center">
                    <span className="mr-2">🖼️</span>
                    Copy Image
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Results */}
          {results && (
            <div className={`rounded-xl p-6 border animate-fadeIn transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
            }`}>
              <h3 className={`text-xl font-bold mb-4 flex items-center transition-colors duration-300 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>
                <span className="mr-2">📊</span>
                Calculation Results
              </h3>
              
              {/* Summary Stats */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className={`p-4 rounded-lg shadow-sm border transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-600' 
                    : 'bg-white border-gray-200'
                }`}>
                  <div className={`text-sm mb-1 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Absolute Difference</div>
                  <div className="text-2xl font-bold text-blue-600">{results.absoluteDifference}</div>
                </div>
                <div className={`p-4 rounded-lg shadow-sm border transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-600' 
                    : 'bg-white border-gray-200'
                }`}>
                  <div className={`text-sm mb-1 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Permissible Error</div>
                  <div className="text-2xl font-bold text-green-600">{results.permissibleError}</div>
                </div>
              </div>

              {results.exceedsLimit && (
                <div className={`rounded-lg p-4 mb-6 border transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-red-900/20 border-red-700' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center">
                    <span className="text-red-500 mr-2">⚠️</span>
                    <span className={`font-semibold transition-colors duration-300 ${
                      isDarkMode ? 'text-red-300' : 'text-red-700'
                    }`}>
                      Error exceeds permissible limits. Using original areas.
                    </span>
                  </div>
                </div>
              )}

              {/* Results Table */}
              <div className={`rounded-lg shadow-sm border overflow-hidden transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        <th className="px-6 py-4 text-left font-semibold">Parcel Number</th>
                        <th className="px-6 py-4 text-right font-semibold">New Area (m²)</th>
                        <th className="px-6 py-4 text-right font-semibold">Rounded Area (m²)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.tableData.map((row, index) => (
                        <tr
                          key={index}
                          className={`transition-colors duration-150 ${
                            isDarkMode
                              ? `${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'} hover:bg-gray-700`
                              : `${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`
                          }`}
                        >
                          <td className={`px-6 py-4 font-medium transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-200' : 'text-gray-900'
                          }`}>
                            {row.parcelNumber}
                          </td>
                          <td className={`px-6 py-4 text-right transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {row.newArea}
                          </td>
                          <td className={`px-6 py-4 text-right font-semibold transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-200' : 'text-gray-900'
                          }`}>
                            {row.roundedArea}
                          </td>
                        </tr>
                      ))}
                      <tr className={`border-t-2 transition-colors duration-300 ${
                        isDarkMode 
                          ? 'bg-gradient-to-r from-gray-700 to-gray-600 border-gray-500' 
                          : 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300'
                      }`}>
                        <td className={`px-6 py-4 font-bold transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-900'
                        }`}>
                          Total:
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-blue-600">
                          {results.totalBeforeRounding}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-indigo-600 text-lg">
                          {results.totalAfterRounding}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`text-center mt-8 transition-colors duration-300 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <p>Professional Parcel Area Calculator • Built with React & Tailwind CSS</p>
        </div>
      </div>

      {/* Notification System */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`
              max-w-sm p-4 rounded-lg shadow-lg border-l-4 backdrop-blur-sm
              transform transition-all duration-300 ease-in-out
              animate-slideIn
              ${isDarkMode ? (
                notification.type === 'success' ? 'bg-green-900/90 border-green-400 text-green-300' :
                notification.type === 'error' ? 'bg-red-900/90 border-red-400 text-red-300' :
                notification.type === 'warning' ? 'bg-yellow-900/90 border-yellow-400 text-yellow-300' :
                'bg-blue-900/90 border-blue-400 text-blue-300'
              ) : (
                notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
                notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                notification.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
                'bg-blue-50 border-blue-500 text-blue-800'
              )}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-0.5">
                  {notification.type === 'success' && <span className={isDarkMode ? 'text-green-400' : 'text-green-600'}>✅</span>}
                  {notification.type === 'error' && <span className={isDarkMode ? 'text-red-400' : 'text-red-600'}>❌</span>}
                  {notification.type === 'warning' && <span className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}>⚠️</span>}
                  {notification.type === 'info' && <span className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}>ℹ️</span>}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-5">
                    {notification.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className={`ml-4 flex-shrink-0 transition-colors duration-200 ${
                  isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="sr-only">Close</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translateX(100%); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default App; 