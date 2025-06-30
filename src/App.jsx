import React, { useState } from 'react';

function App() {
  const [parcelCount, setParcelCount] = useState('');
  const [registeredArea, setRegisteredArea] = useState('');
  const [calculatedArea, setCalculatedArea] = useState('');
  const [parcelInputs, setParcelInputs] = useState([]);
  const [showCalculate, setShowCalculate] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const addParcelRow = (index, parcelNumValue = '', parcelAreaValue = '') => {
    const newParcel = {
      id: Date.now() + index,
      parcelNumber: parcelNumValue,
      parcelArea: parcelAreaValue
    };
    setParcelInputs(prev => [...prev, newParcel]);
  };

  const removeParcelRow = (id) => {
    setParcelInputs(prev => prev.filter(parcel => parcel.id !== id));
  };

  const updateParcelInput = (id, field, value) => {
    setParcelInputs(prev => 
      prev.map(parcel => 
        parcel.id === id ? { ...parcel, [field]: value } : parcel
      )
    );
  };

  const generateParcels = () => {
    const parcelCountNum = parseInt(parcelCount, 10);
    if (isNaN(parcelCountNum) || parcelCountNum <= 0) {
      alert('Please enter a valid number of parcels.');
      return;
    }

    setParcelInputs([]);
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
    setParcelInputs(newParcels);
    setShowCalculate(true);
  };

  const calculateResults = async () => {
    setIsCalculating(true);
    setResults(null);
    setShowCopy(false);

    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const registeredAreaNum = parseFloat(registeredArea);
    const calculatedAreaNum = parseFloat(calculatedArea);
    const absoluteDifference = Math.abs(registeredAreaNum - calculatedAreaNum);
    const permissibleError = (0.8 * Math.sqrt(registeredAreaNum)) + (0.002 * registeredAreaNum);

    let totalBeforeRounding = 0;
    let totalAfterRounding = 0;
    const tableData = [];

    parcelInputs.forEach((parcel) => {
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
  };

  const exportAsImage = async () => {
    if (!results) {
      alert('No table data to export.');
      return;
    }

    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      canvas.width = 600;
      canvas.height = 400 + (results.tableData.length * 30);
      
      // Set background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Set font
      ctx.font = '14px monospace';
      ctx.fillStyle = '#000000';
      
      let y = 30;
      
      // Title
      ctx.font = 'bold 18px monospace';
      ctx.fillText('PARCEL CALCULATION TABLE', 150, y);
      y += 40;
      
      // Draw table border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, y - 10, 500, 30);
      
      // Headers
      ctx.font = 'bold 14px monospace';
      ctx.fillText('Parcel Number', 70, y + 10);
      ctx.fillText('New Area', 220, y + 10);
      ctx.fillText('Rounded Area', 370, y + 10);
      y += 30;
      
      // Header line
      ctx.strokeRect(50, y - 10, 500, 1);
      
      // Data rows
      ctx.font = '14px monospace';
      results.tableData.forEach((row, index) => {
        // Alternate row background
        if (index % 2 === 0) {
          ctx.fillStyle = '#f9f9f9';
          ctx.fillRect(50, y - 5, 500, 25);
        }
        
        ctx.fillStyle = '#000000';
        ctx.fillText(row.parcelNumber, 100, y + 10);
        ctx.fillText(row.newArea, 240, y + 10);
        ctx.fillText(row.roundedArea.toString(), 400, y + 10);
        
        // Row border
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(50, y - 5, 500, 25);
        
        y += 25;
      });
      
      // Total row
      ctx.fillStyle = '#e6f3ff';
      ctx.fillRect(50, y, 500, 30);
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('TOTAL:', 100, y + 20);
      ctx.fillText(results.totalBeforeRounding, 240, y + 20);
      ctx.fillText(results.totalAfterRounding.toString(), 400, y + 20);
      
      // Total border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, y, 500, 30);
      
      y += 50;
      
      // Summary
      ctx.font = 'bold 16px monospace';
      ctx.fillText('CALCULATION SUMMARY:', 70, y);
      y += 30;
      
      ctx.font = '14px monospace';
      ctx.fillText(`Absolute Difference: ${results.absoluteDifference || '0.00'}`, 70, y);
      y += 25;
      ctx.fillText(`Permissible Error: ${results.permissibleError || '0.00'}`, 70, y);
      y += 35;
      
      if (results.exceedsLimit) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('⚠ WARNING: Error exceeds permissible limits!', 70, y);
      } else {
        ctx.fillStyle = '#008000';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('✓ Calculation within acceptable limits', 70, y);
      }
      
      // Convert canvas to blob and copy to clipboard
      canvas.toBlob(async (blob) => {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          alert('Table image copied to clipboard! 🖼️\nYou can now paste it directly into AutoCAD or any other application.');
        } catch (error) {
          console.error('Failed to copy image to clipboard:', error);
          // Fallback: download the image if clipboard fails
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'parcel-calculation-table.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          alert('Could not copy to clipboard. Image downloaded instead! 📥');
        }
      });
    } catch (error) {
      console.error('Error creating image:', error);
      alert('Error creating table image. Please try again.');
    }
  };

  const copyTable = () => {
    if (!results) {
      alert('No table found to copy.');
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

    alert('AutoCAD-optimized table copied to clipboard! 📋');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4 shadow-lg">
            <span className="text-2xl">📊</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Parcel Manager
          </h1>
          <p className="text-gray-600 text-lg">Professional parcel area calculation tool</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Input Fields */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Number of Parcels
              </label>
              <input
                type="number"
                value={parcelCount}
                onChange={(e) => setParcelCount(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                placeholder="Enter number..."
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Registered Area (m²)
              </label>
              <input
                type="number"
                value={registeredArea}
                onChange={(e) => setRegisteredArea(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                placeholder="Enter area..."
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                Calculated Area (m²)
              </label>
              <input
                type="number"
                value={calculatedArea}
                onChange={(e) => setCalculatedArea(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                placeholder="Enter area..."
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
          {parcelInputs.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📝</span>
                Parcel Details ({parcelInputs.length} parcels)
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {parcelInputs.map((parcel, index) => (
                  <div key={parcel.id} className="flex gap-3 items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <input
                      type="number"
                      placeholder="Parcel Number"
                      value={parcel.parcelNumber}
                      onChange={(e) => updateParcelInput(parcel.id, 'parcelNumber', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    <input
                      type="number"
                      placeholder="Area (m²)"
                      value={parcel.parcelArea}
                      onChange={(e) => updateParcelInput(parcel.id, 'parcelArea', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    <button
                      onClick={() => addParcelRow(parcelInputs.length + 1)}
                      className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                      title="Add parcel"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeParcelRow(parcel.id)}
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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 animate-fadeIn">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📊</span>
                Calculation Results
              </h3>
              
              {/* Summary Stats */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Absolute Difference</div>
                  <div className="text-2xl font-bold text-blue-600">{results.absoluteDifference}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Permissible Error</div>
                  <div className="text-2xl font-bold text-green-600">{results.permissibleError}</div>
                </div>
              </div>

              {results.exceedsLimit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <span className="text-red-500 mr-2">⚠️</span>
                    <span className="text-red-700 font-semibold">
                      Error exceeds permissible limits. Using original areas.
                    </span>
                  </div>
                </div>
              )}

              {/* Results Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                          className={`${
                            index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                          } hover:bg-blue-50 transition-colors duration-150`}
                        >
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {row.parcelNumber}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-700">
                            {row.newArea}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-900">
                            {row.roundedArea}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gradient-to-r from-gray-100 to-gray-200 border-t-2 border-gray-300">
                        <td className="px-6 py-4 font-bold text-gray-900">
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
        <div className="text-center mt-8 text-gray-500">
          <p>Professional Parcel Area Calculator • Built with React & Tailwind CSS</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

export default App; 