import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Calculator, Download, FileText, CheckCircle, AlertTriangle, 
  Moon, Sun, Plus, Minus, FilePlus, Copy, RefreshCw, Undo, Redo, Trash2
} from 'lucide-react';

function App() {
  const [parcelCount, setParcelCount] = useState('');
  const [registeredArea, setRegisteredArea] = useState('');
  const [calculatedArea, setCalculatedArea] = useState('');
  const [parcels, setParcels] = useState([]);
  const [showCalculate, setShowCalculate] = useState(false);
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [errorCalc, setErrorCalc] = useState(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if ((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.shiftKey && event.key === 'z')) {
        event.preventDefault();
        redo();
      }
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        toggleDarkMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history.length, isDarkMode]);

  useEffect(() => {
    if (history.length === 0) {
      saveToHistory({ action: 'Initial state' });
    }
  }, []);

  // Instant Error Calculation
  useEffect(() => {
    const regArea = parseFloat(registeredArea);
    const calcArea = parseFloat(calculatedArea);
    
    if (!isNaN(regArea) && !isNaN(calcArea) && regArea > 0 && calcArea > 0) {
      const absoluteDifference = Math.abs(regArea - calcArea);
      const permissibleError = (0.8 * Math.sqrt(regArea)) + (0.002 * regArea);
      setErrorCalc({
        absoluteDifference: absoluteDifference.toFixed(4),
        permissibleError: permissibleError.toFixed(4),
        exceedsLimit: absoluteDifference > permissibleError
      });
    } else {
      setErrorCalc(null);
    }
  }, [registeredArea, calculatedArea]);

  // If parcels area changes, update calculatedArea automatically
  useEffect(() => {
    if (parcels.length > 0) {
      const totalOriginal = parcels.reduce((acc, p) => acc + (parseFloat(p.parcelArea) || 0), 0);
      if (totalOriginal > 0) {
        setCalculatedArea(totalOriginal.toFixed(4));
      }
    }
  }, [parcels]);

  const addNotification = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => removeNotification(id), duration);
  };

  const removeNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));
  const showSuccess = (msg) => addNotification(msg, 'success', 3000);
  const showError = (msg) => addNotification(msg, 'error', 5000);
  const showWarning = (msg) => addNotification(msg, 'warning', 4500);
  const showInfo = (msg) => addNotification(msg, 'info', 4000);

  const addParcelRow = (index) => {
    setParcels(prev => [...prev, {
      id: Date.now() + index,
      parcelNumber: (prev.length + 1).toString(),
      parcelArea: ''
    }]);
  };

  const removeParcelRow = (id) => {
    setParcels(prev => prev.filter(parcel => parcel.id !== id));
  };

  const updateParcelInput = (id, field, value) => {
    setParcels(prev => prev.map(parcel => parcel.id === id ? { ...parcel, [field]: value } : parcel));
  };

  const generateParcels = () => {
    const count = parseInt(parcelCount, 10);
    if (isNaN(count) || count <= 0) {
      showError('Please enter a valid number of parcels.');
      return;
    }

    saveToHistory({ action: 'Generate parcels' });
    const newParcels = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      parcelNumber: (i + 1).toString(),
      parcelArea: ''
    }));
    
    setParcels(newParcels);
    setResults(null);
    setShowCalculate(true);
    showSuccess(`Generated ${count} parcels successfully!`);
  };

  const calculateResults = async () => {
    saveToHistory({ action: 'Calculate results' });
    setIsCalculating(true);
    setResults(null);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const regArea = parseFloat(registeredArea);
    const calcArea = parseFloat(calculatedArea);
    
    if (isNaN(regArea) || isNaN(calcArea)) {
      showError('Please ensure Registered Area and Calculated Area are filled.');
      setIsCalculating(false);
      return;
    }

    const diff = Math.abs(regArea - calcArea);
    const permError = (0.8 * Math.sqrt(regArea)) + (0.002 * regArea);
    const exceedsLimit = diff > permError;

    let totalBefore = 0;
    let totalAfter = 0;
    const tableData = [];

    parcels.forEach((parcel) => {
      const pNum = parcel.parcelNumber.trim();
      const pArea = parseFloat(parcel.parcelArea);
      
      let newArea = pArea;
      let roundedArea = Math.round(newArea);

      if (!exceedsLimit) {
        newArea = (regArea / calcArea) * pArea;
        roundedArea = Math.round(newArea);
      }

      if (!isNaN(pArea) && pArea > 0 && pNum !== '') {
        totalBefore += newArea;
        totalAfter += roundedArea;
        tableData.push({
          parcelNumber: pNum,
          originalArea: pArea.toFixed(4),
          newArea: newArea.toFixed(4),
          roundedArea
        });
      }
    });

    setResults({
      absoluteDifference: diff.toFixed(4),
      permissibleError: permError.toFixed(4),
      exceedsLimit,
      tableData,
      totalBeforeRounding: totalBefore.toFixed(4),
      totalAfterRounding: totalAfter
    });

    setIsCalculating(false);
    showSuccess('Calculation completed!');
  };

  const exportAsPDF = () => {
    if (!errorCalc && !results) {
      showWarning('No data available to export.');
      return;
    }

    const doc = new jsPDF();
    let y = 20;
    const margin = 20;

    const addText = (text, isBold = false) => {
      doc.setFont('courier', isBold ? 'bold' : 'normal');
      doc.text(text, margin, y);
      y += 6;
    };

    doc.setFontSize(12);
    addText('========================================================================', true);
    y += 2;
    doc.setFontSize(14);
    addText('ERROR CALCULATIONS', true);
    y += 2;
    doc.setFontSize(12);
    addText('========================================================================', true);
    y += 8;

    addText('OVERALL CALCULATION SUMMARY:', true);
    y += 6;

    const regArea = parseFloat(registeredArea).toFixed(4);
    const calcArea = parseFloat(calculatedArea).toFixed(4);
    const diff = results?.absoluteDifference || errorCalc?.absoluteDifference || '0.0000';
    const perm = results?.permissibleError || errorCalc?.permissibleError || '0.0000';

    addText(`Total Registered Area:   ${regArea} m2`);
    y += 2;
    addText(`Total Calculated Area:   ${calcArea} m2`);
    y += 2;
    addText(`Absolute Difference:     ${diff} m2`);
    y += 2;
    addText(`Permissible Error:       ${perm} m2`);
    y += 6;

    const formula = `Formula: Permissible Error = 0.8 x \\u221A(${regArea}) + 0.002 x ${regArea}`;
    doc.setFont('courier', 'normal');
    // Using simple text for root symbol to ensure Courier compatibility
    doc.text(`Formula: Permissible Error = 0.8 x sqrt(${regArea}) + 0.002 x ${regArea}`, margin, y);
    y += 12;

    const exceedsLimit = results?.exceedsLimit ?? errorCalc?.exceedsLimit;
    if (exceedsLimit) {
      addText('WARNING: EXCEEDS PERMISSIBLE LIMITS - Original areas retained', true);
    } else {
      addText('OK: WITHIN PERMISSIBLE LIMITS - Areas adjusted proportionally', true);
    }

    if (results?.tableData?.length > 0) {
      y += 12;
      addText('PARCEL RESULTS:', true);
      y += 4;

      autoTable(doc, {
        startY: y,
        theme: 'plain',
        styles: { font: 'courier', fontSize: 10, cellPadding: 1.5 },
        headStyles: { fontStyle: 'normal', textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 48 },
          2: { cellWidth: 48 },
          3: { cellWidth: 40 }
        },
        head: [['Parcel #', 'Original (m2)', 'Adjusted (m2)', 'Rounded (m2)']],
        body: [
          ['--------', '-------------', '-------------', '------------'],
          ...results.tableData.map(row => [
            row.parcelNumber,
            row.originalArea,
            row.newArea,
            row.roundedArea
          ]),
          ['', '', '', ''],
          [
            'TOTAL:',
            calcArea,
            results.totalBeforeRounding,
            results.totalAfterRounding
          ]
        ]
      });
    }

    doc.save('Error_Calculations.pdf');
    showSuccess('PDF Downloaded Successfully!');
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const saveToHistory = (state) => {
    const newState = {
      parcelCount, registeredArea, calculatedArea, parcels, results,
      timestamp: Date.now(), action: state.action || 'Unknown action'
    };
    const newHistory = [...history.slice(0, historyIndex + 1), newState].slice(-20);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const state = history[historyIndex - 1];
      setParcelCount(state.parcelCount); setRegisteredArea(state.registeredArea);
      setCalculatedArea(state.calculatedArea); setParcels(state.parcels); setResults(state.results);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const state = history[historyIndex + 1];
      setParcelCount(state.parcelCount); setRegisteredArea(state.registeredArea);
      setCalculatedArea(state.calculatedArea); setParcels(state.parcels); setResults(state.results);
      setHistoryIndex(historyIndex + 1);
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-500 py-10 px-4 font-sans ${
      isDarkMode 
        ? 'bg-[#0f172a] text-slate-200' 
        : 'bg-[#f8fafc] text-slate-800'
    }`}>
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Parcel Manager Pro</h1>
              <p className="text-sm font-medium opacity-70 mt-1">Advanced Area Error Calculation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-2.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 disabled:opacity-50 transition-all"><Undo className="w-5 h-5" /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 disabled:opacity-50 transition-all"><Redo className="w-5 h-5" /></button>
            <button onClick={toggleDarkMode} className="p-2.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 transition-all">
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-blue-600" />}
            </button>
            <button onClick={exportAsPDF} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </header>

        {/* Input Configuration */}
        <div className={`p-8 rounded-3xl shadow-2xl backdrop-blur-xl border ${
          isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-slate-200/50'
        }`}>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <label className="text-sm font-bold uppercase tracking-wider opacity-80 flex items-center gap-2">
                <FilePlus className="w-4 h-4 text-blue-500" /> Number of Parcels
              </label>
              <input
                type="number"
                value={parcelCount}
                onChange={(e) => { setParcelCount(e.target.value); saveToHistory({ action: 'Update count' }); }}
                className={`w-full px-5 py-4 rounded-2xl border-2 font-medium text-lg outline-none transition-all ${
                  isDarkMode ? 'bg-slate-900/50 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'
                }`}
                placeholder="e.g. 6"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold uppercase tracking-wider opacity-80 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Registered Area (m²)
              </label>
              <input
                type="number"
                step="0.01"
                value={registeredArea}
                onChange={(e) => { setRegisteredArea(e.target.value); saveToHistory({ action: 'Update registered area' }); }}
                className={`w-full px-5 py-4 rounded-2xl border-2 font-medium text-lg outline-none transition-all ${
                  isDarkMode ? 'bg-slate-900/50 border-slate-700 focus:border-green-500' : 'bg-slate-50 border-slate-200 focus:border-green-500'
                }`}
                placeholder="e.g. 11252.00"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold uppercase tracking-wider opacity-80 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" /> Calculated Area (m²)
              </label>
              <input
                type="number"
                step="0.01"
                value={calculatedArea}
                onChange={(e) => { setCalculatedArea(e.target.value); saveToHistory({ action: 'Update calculated area' }); }}
                className={`w-full px-5 py-4 rounded-2xl border-2 font-medium text-lg outline-none transition-all ${
                  isDarkMode ? 'bg-slate-900/50 border-slate-700 focus:border-purple-500' : 'bg-slate-50 border-slate-200 focus:border-purple-500'
                }`}
                placeholder="Sum of parcels"
              />
            </div>
          </div>

          {/* Instant Error Summary Card */}
          {errorCalc && (
            <div className={`mt-8 p-6 rounded-2xl border flex items-center justify-between ${
              errorCalc.exceedsLimit 
                ? 'bg-red-500/10 border-red-500/30' 
                : 'bg-green-500/10 border-green-500/30'
            }`}>
              <div className="flex items-center gap-4">
                {errorCalc.exceedsLimit ? <AlertTriangle className="w-8 h-8 text-red-500" /> : <CheckCircle className="w-8 h-8 text-green-500" />}
                <div>
                  <h3 className="font-bold text-lg">Error Calculation Summary</h3>
                  <p className="text-sm opacity-80 mt-1">
                    Difference: <span className="font-bold">{errorCalc.absoluteDifference}</span> | 
                    Permissible: <span className="font-bold">{errorCalc.permissibleError}</span>
                  </p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
                errorCalc.exceedsLimit ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
              }`}>
                {errorCalc.exceedsLimit ? 'EXCEEDS LIMITS' : 'WITHIN LIMITS'}
              </div>
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={generateParcels}
              className="w-full py-4 rounded-2xl bg-slate-800 text-white hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-700 font-bold text-lg shadow-xl transition-all"
            >
              Generate Parcel Table
            </button>
          </div>
        </div>

        {/* Dynamic Parcel Table */}
        {parcels.length > 0 && (
          <div className={`p-8 rounded-3xl shadow-xl border ${
            isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-500" /> Parcel Details
              </h2>
              <button onClick={() => addParcelRow(parcels.length + 1)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-500/20 transition-all">
                <Plus className="w-4 h-4" /> Add Row
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-bold uppercase tracking-wider opacity-60">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Parcel ID</div>
                <div className="col-span-6">Original Area (m²)</div>
                <div className="col-span-1 text-center">Del</div>
              </div>

              {parcels.map((parcel, index) => (
                <div key={parcel.id} className={`grid grid-cols-12 gap-4 items-center p-4 rounded-2xl transition-all border ${
                  isDarkMode ? 'bg-slate-900/50 border-slate-700 hover:border-blue-500/50' : 'bg-slate-50 border-slate-200 hover:border-blue-500/30'
                }`}>
                  <div className="col-span-1 font-bold opacity-50 pl-2">{index + 1}</div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={parcel.parcelNumber}
                      onChange={(e) => updateParcelInput(parcel.id, 'parcelNumber', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border outline-none font-medium ${
                        isDarkMode ? 'bg-slate-800 border-slate-600 focus:border-blue-500' : 'bg-white border-slate-300 focus:border-blue-500'
                      }`}
                      placeholder="ID"
                    />
                  </div>
                  <div className="col-span-6">
                    <input
                      type="number"
                      step="0.0001"
                      value={parcel.parcelArea}
                      onChange={(e) => updateParcelInput(parcel.id, 'parcelArea', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border outline-none font-medium ${
                        isDarkMode ? 'bg-slate-800 border-slate-600 focus:border-blue-500' : 'bg-white border-slate-300 focus:border-blue-500'
                      }`}
                      placeholder="0.0000"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => removeParcelRow(parcel.id)} className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <button
                onClick={calculateResults}
                disabled={isCalculating}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 flex items-center justify-center gap-3 transition-all"
              >
                {isCalculating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Calculator className="w-6 h-6" />}
                {isCalculating ? 'Processing...' : 'Run Final Calculations'}
              </button>
            </div>
          </div>
        )}

        {/* Calculation Results */}
        {results && (
          <div className={`p-8 rounded-3xl shadow-xl border animate-fadeIn ${
            isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500" /> Final Adjusted Results
            </h2>
            
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 text-sm uppercase tracking-wider font-bold">
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700">Parcel #</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Original (m²)</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right text-blue-600 dark:text-blue-400">Adjusted (m²)</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right text-indigo-600 dark:text-indigo-400">Rounded (m²)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {results.tableData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">{row.parcelNumber}</td>
                      <td className="p-4 text-right opacity-80">{row.originalArea}</td>
                      <td className="p-4 text-right text-blue-600 dark:text-blue-400 font-bold">{row.newArea}</td>
                      <td className="p-4 text-right text-indigo-600 dark:text-indigo-400 font-extrabold">{row.roundedArea}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-900/50 font-extrabold text-lg">
                    <td className="p-4">TOTAL</td>
                    <td className="p-4 text-right">{parseFloat(calculatedArea).toFixed(4)}</td>
                    <td className="p-4 text-right text-blue-600 dark:text-blue-400">{results.totalBeforeRounding}</td>
                    <td className="p-4 text-right text-indigo-600 dark:text-indigo-400">{results.totalAfterRounding}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-md border ${
            isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {n.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> : 
             n.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-500" /> : 
             <FileText className="w-5 h-5 text-blue-500" />}
            <p className="font-medium text-sm">{n.message}</p>
          </div>
        ))}
      </div>

      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}

export default App;