import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Calculator, Download, CheckCircle, AlertTriangle,
  Moon, Sun, Plus, Trash2, RefreshCw, Undo, Redo,
  ChevronRight, HelpCircle, RotateCcw, FileDown, Info
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────── */
const fmt4 = (n) => parseFloat(n).toFixed(4);
const fmtNum = (n) => isNaN(parseFloat(n)) ? '–' : parseFloat(n).toFixed(4);

function Tooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <HelpCircle className="w-4 h-4 opacity-40 cursor-help" />
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 text-xs font-normal bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xl leading-relaxed">
          {text}
        </span>
      )}
    </span>
  );
}

function StepBadge({ n, active, done }) {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 transition-all ${
      done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
    }`}>
      {done ? <CheckCircle className="w-5 h-5" /> : n}
    </div>
  );
}

/* ─── Main App ────────────────────────────────────────── */
export default function App() {
  const [registeredArea, setRegisteredArea] = useState('');
  const [calculatedArea, setCalculatedArea] = useState('');
  const [parcelCount, setParcelCount] = useState('');
  const [parcels, setParcels] = useState([]);
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [errorCalc, setErrorCalc] = useState(null);

  // Dark mode body class
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : '';
  }, [isDarkMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [historyIndex, history]);

  useEffect(() => {
    if (history.length === 0) saveToHistory('Initial');
  }, []);

  // Auto-sum parcels → calculatedArea
  useEffect(() => {
    if (parcels.length > 0) {
      const total = parcels.reduce((s, p) => s + (parseFloat(p.parcelArea) || 0), 0);
      if (total > 0) setCalculatedArea(total.toFixed(4));
    }
  }, [parcels]);

  // Live error check whenever areas change
  useEffect(() => {
    const reg = parseFloat(registeredArea);
    const calc = parseFloat(calculatedArea);
    if (!isNaN(reg) && !isNaN(calc) && reg > 0 && calc > 0) {
      const diff = Math.abs(reg - calc);
      const perm = 0.8 * Math.sqrt(reg) + 0.002 * reg;
      setErrorCalc({ diff: diff.toFixed(4), perm: perm.toFixed(4), exceeds: diff > perm });
    } else {
      setErrorCalc(null);
    }
  }, [registeredArea, calculatedArea]);

  /* ── notification system ── */
  const notify = (message, type = 'info', ms = 3500) => {
    const id = Date.now() + Math.random();
    setNotifications(p => [...p, { id, message, type }]);
    setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), ms);
  };

  /* ── history ── */
  const saveToHistory = (action) => {
    const snap = { registeredArea, calculatedArea, parcelCount, parcels, results, action };
    setHistory(h => {
      const next = [...h.slice(0, historyIndex + 1), snap].slice(-30);
      setHistoryIndex(next.length - 1);
      return next;
    });
  };
  const undo = () => {
    if (historyIndex > 0) {
      const s = history[historyIndex - 1];
      setRegisteredArea(s.registeredArea); setCalculatedArea(s.calculatedArea);
      setParcelCount(s.parcelCount); setParcels(s.parcels); setResults(s.results);
      setHistoryIndex(i => i - 1);
    }
  };
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const s = history[historyIndex + 1];
      setRegisteredArea(s.registeredArea); setCalculatedArea(s.calculatedArea);
      setParcelCount(s.parcelCount); setParcels(s.parcels); setResults(s.results);
      setHistoryIndex(i => i + 1);
    }
  };

  /* ── parcels ── */
  const generateParcels = () => {
    const n = parseInt(parcelCount, 10);
    if (isNaN(n) || n <= 0 || n > 500) { notify('Enter a valid number of parcels (1–500).', 'error'); return; }
    saveToHistory('Generate parcels');
    setParcels(Array.from({ length: n }, (_, i) => ({ id: Date.now() + i, parcelNumber: String(i + 1), parcelArea: '' })));
    setResults(null);
    notify(`${n} parcels created. Now fill in their areas.`, 'success');
  };

  const addParcelRow = () => {
    setParcels(p => [...p, { id: Date.now(), parcelNumber: String(p.length + 1), parcelArea: '' }]);
  };

  const removeParcelRow = (id) => {
    if (parcels.length === 1) { notify('You need at least one parcel.', 'error'); return; }
    setParcels(p => p.filter(r => r.id !== id));
  };

  const updateParcel = (id, field, val) =>
    setParcels(p => p.map(r => r.id === id ? { ...r, [field]: val } : r));

  /* ── calculate ── */
  const calculate = async () => {
    const reg = parseFloat(registeredArea);
    const calc = parseFloat(calculatedArea);
    if (isNaN(reg) || reg <= 0) { notify('Please enter the Registered Area first.', 'error'); return; }
    if (isNaN(calc) || calc <= 0) { notify('Calculated Area is missing. Fill parcel areas first.', 'error'); return; }
    const filled = parcels.filter(p => parseFloat(p.parcelArea) > 0);
    if (filled.length === 0) { notify('Please fill in at least one parcel area.', 'error'); return; }

    saveToHistory('Calculate');
    setIsCalculating(true);
    setResults(null);
    await new Promise(r => setTimeout(r, 600));

    const diff = Math.abs(reg - calc);
    const perm = 0.8 * Math.sqrt(reg) + 0.002 * reg;
    const exceeds = diff > perm;

    let totalAdj = 0, totalRnd = 0;
    const rows = [];
    parcels.forEach(p => {
      const pNum = p.parcelNumber.trim();
      const pArea = parseFloat(p.parcelArea);
      if (isNaN(pArea) || pArea <= 0 || !pNum) return;
      const adj = exceeds ? pArea : (reg / calc) * pArea;
      const rnd = Math.round(adj);
      totalAdj += adj;
      totalRnd += rnd;
      rows.push({ parcelNumber: pNum, originalArea: pArea.toFixed(4), adjustedArea: adj.toFixed(4), roundedArea: rnd });
    });

    setResults({ diff: diff.toFixed(4), perm: perm.toFixed(4), exceeds, rows, totalAdj: totalAdj.toFixed(4), totalRnd });
    setIsCalculating(false);
    notify('Done! Results are ready below.', 'success');
  };

  /* ── reset ── */
  const resetAll = () => {
    saveToHistory('Reset');
    setRegisteredArea(''); setCalculatedArea(''); setParcelCount('');
    setParcels([]); setResults(null); setErrorCalc(null);
    notify('All data cleared.', 'info');
  };

  /* ── PDF ── */
  const exportPDF = () => {
    if (!results && !errorCalc) { notify('Nothing to export yet.', 'error'); return; }
    const doc = new jsPDF();
    let y = 18;
    const m = 18;
    const line = (txt, bold = false) => {
      doc.setFont('courier', bold ? 'bold' : 'normal');
      doc.text(txt, m, y); y += 7;
    };
    const sep = () => { line('='.repeat(68), true); };

    doc.setFontSize(11);
    sep(); y += 1;
    doc.setFontSize(13);
    line('ERROR CALCULATIONS', true);
    doc.setFontSize(11);
    sep(); y += 6;

    line('OVERALL CALCULATION SUMMARY:', true); y += 3;
    const reg = fmtNum(registeredArea);
    const calc = fmtNum(calculatedArea);
    const diff = results?.diff || errorCalc?.diff || '0.0000';
    const perm = results?.perm || errorCalc?.perm || '0.0000';
    line(`Total Registered Area:   ${reg} m2`);
    line(`Total Calculated Area:   ${calc} m2`);
    line(`Absolute Difference:     ${diff} m2`);
    line(`Permissible Error:       ${perm} m2`);
    y += 4;
    line(`Formula: Permissible Error = 0.8 x sqrt(${reg}) + 0.002 x ${reg}`);
    y += 6;
    const exc = results?.exceeds ?? errorCalc?.exceeds;
    line(exc
      ? 'WARNING: EXCEEDS PERMISSIBLE LIMITS - Original areas retained'
      : 'OK: WITHIN PERMISSIBLE LIMITS - Areas adjusted proportionally', true);

    if (results?.rows?.length > 0) {
      y += 10;
      line('PARCEL RESULTS:', true); y += 2;
      autoTable(doc, {
        startY: y,
        theme: 'plain',
        styles: { font: 'courier', fontSize: 10, cellPadding: 1.5 },
        headStyles: { fontStyle: 'bold', textColor: [0, 0, 0] },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 45 }, 2: { cellWidth: 45 }, 3: { cellWidth: 45 } },
        head: [['Parcel #', 'Original (m2)', 'Adjusted (m2)', 'Rounded (m2)']],
        body: [
          ['--------', '-------------', '-------------', '------------'],
          ...results.rows.map(r => [r.parcelNumber, r.originalArea, r.adjustedArea, r.roundedArea]),
          ['', '', '', ''],
          ['TOTAL:', calc, results.totalAdj, results.totalRnd],
        ],
      });
    }
    doc.save('Error_Calculations.pdf');
    notify('PDF saved!', 'success');
  };

  /* ── derived state for step logic ── */
  const step1Done = parseFloat(registeredArea) > 0;
  const step2Done = parcels.length > 0 && parcels.some(p => parseFloat(p.parcelArea) > 0);
  const step3Done = !!results;

  const dm = isDarkMode;
  const card = `rounded-3xl border p-7 shadow-xl transition-all ${dm ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`;
  const input = `w-full px-4 py-3 rounded-xl border-2 outline-none font-medium transition-all text-base ${dm ? 'bg-slate-900/60 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'}`;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dm ? 'bg-[#0d1117] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* ── Top Bar ── */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${dm ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl"><Calculator className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="font-extrabold text-lg leading-tight">Parcel Area Calculator</h1>
              <p className="text-xs opacity-50 leading-none">Error calculation tool for land surveyors</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)" className="p-2 rounded-xl hover:bg-slate-500/10 disabled:opacity-30 transition-all"><Undo className="w-4 h-4" /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)" className="p-2 rounded-xl hover:bg-slate-500/10 disabled:opacity-30 transition-all"><Redo className="w-4 h-4" /></button>
            <button onClick={resetAll} title="Start over" className="p-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-all"><RotateCcw className="w-4 h-4" /></button>
            <button onClick={() => setIsDarkMode(!dm)} className="p-2 rounded-xl hover:bg-slate-500/10 transition-all">
              {dm ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={exportPDF} className="ml-1 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-all">
              <FileDown className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── How it works banner ── */}
        <div className={`flex items-start gap-3 p-4 rounded-2xl border text-sm ${dm ? 'bg-blue-900/20 border-blue-700/40 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            <strong>How to use:</strong> Follow the 3 steps below. Enter the registered area, then fill in each parcel's area. The tool will automatically calculate the error and adjust areas proportionally if needed.
          </p>
        </div>

        {/* ═══ STEP 1 ═══ */}
        <div className={card}>
          <div className="flex items-center gap-3 mb-6">
            <StepBadge n={1} active={!step1Done} done={step1Done} />
            <div>
              <h2 className="text-lg font-extrabold">Enter the Registered Area</h2>
              <p className="text-sm opacity-60">The official area from the land registry document (in m²)</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-1">
                Registered Area (m²)
                <Tooltip text="This is the total area recorded in the official land registry. It is the 'correct' reference area." />
              </label>
              <input
                type="number"
                step="0.0001"
                value={registeredArea}
                onChange={e => setRegisteredArea(e.target.value)}
                className={input}
                placeholder="e.g. 11252.0000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-1">
                Calculated Area (m²)
                <Tooltip text="This is automatically calculated from the sum of all parcel areas you enter below. You can also type it manually." />
              </label>
              <input
                type="number"
                step="0.0001"
                value={calculatedArea}
                onChange={e => setCalculatedArea(e.target.value)}
                className={`${input} ${calculatedArea && !isNaN(parseFloat(calculatedArea)) ? (dm ? 'border-purple-500' : 'border-purple-400') : ''}`}
                placeholder="Auto-filled from parcels below"
              />
              {calculatedArea && <p className="text-xs opacity-50">← Auto-updated as you fill parcel areas</p>}
            </div>
          </div>

          {/* Live Error Status */}
          {errorCalc && (
            <div className={`mt-5 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              errorCalc.exceeds ? (dm ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200') : (dm ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200')
            }`}>
              <div className="flex items-start gap-3">
                {errorCalc.exceeds
                  ? <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                  : <CheckCircle className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />}
                <div>
                  <p className={`font-bold ${errorCalc.exceeds ? 'text-red-600' : 'text-green-600'}`}>
                    {errorCalc.exceeds ? 'Error exceeds permissible limits' : 'Within permissible error limits'}
                  </p>
                  <p className="text-sm opacity-70 mt-0.5">
                    Difference: <strong>{errorCalc.diff} m²</strong> &nbsp;|&nbsp; Permissible: <strong>{errorCalc.perm} m²</strong>
                  </p>
                  <p className="text-xs opacity-50 mt-1">Formula: 0.8 × √{registeredArea} + 0.002 × {registeredArea}</p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-xl text-sm font-extrabold shrink-0 ${errorCalc.exceeds ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                {errorCalc.exceeds ? 'EXCEEDS LIMITS' : 'OK ✓'}
              </span>
            </div>
          )}
        </div>

        {/* ═══ STEP 2 ═══ */}
        <div className={card}>
          <div className="flex items-center gap-3 mb-6">
            <StepBadge n={2} active={step1Done && !step2Done} done={step2Done} />
            <div>
              <h2 className="text-lg font-extrabold">Enter Parcel Areas</h2>
              <p className="text-sm opacity-60">Add each parcel with its ID and measured area</p>
            </div>
          </div>

          {/* Quick generate */}
          <div className={`flex flex-col sm:flex-row items-stretch sm:items-end gap-3 p-4 rounded-2xl mb-6 ${dm ? 'bg-slate-700/40' : 'bg-slate-50'}`}>
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-semibold">Quick generate rows</label>
              <p className="text-xs opacity-50">Enter how many parcels you have, then click Generate</p>
              <input
                type="number"
                min={1}
                max={500}
                value={parcelCount}
                onChange={e => setParcelCount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && generateParcels()}
                className={input}
                placeholder="e.g. 6"
              />
            </div>
            <button
              onClick={generateParcels}
              className="px-6 py-3 rounded-xl bg-slate-800 dark:bg-blue-600 text-white font-bold hover:opacity-90 transition-all whitespace-nowrap"
            >
              Generate Rows
            </button>
          </div>

          {parcels.length > 0 ? (
            <>
              {/* Column headers */}
              <div className={`grid grid-cols-12 gap-3 px-3 mb-2 text-xs font-bold uppercase tracking-wider opacity-50`}>
                <div className="col-span-1">#</div>
                <div className="col-span-4">Parcel ID</div>
                <div className="col-span-6">Area (m²)</div>
                <div className="col-span-1" />
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {parcels.map((parcel, idx) => (
                  <div key={parcel.id} className={`grid grid-cols-12 gap-3 items-center p-3 rounded-xl border transition-all ${
                    dm ? 'bg-slate-900/50 border-slate-700 hover:border-blue-500/40' : 'bg-slate-50 border-slate-200 hover:border-blue-300'
                  }`}>
                    <div className="col-span-1 text-center text-sm font-bold opacity-40">{idx + 1}</div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={parcel.parcelNumber}
                        onChange={e => updateParcel(parcel.id, 'parcelNumber', e.target.value)}
                        className={`${input} py-2 text-sm`}
                        placeholder="ID"
                      />
                    </div>
                    <div className="col-span-6">
                      <input
                        type="number"
                        step="0.0001"
                        value={parcel.parcelArea}
                        onChange={e => updateParcel(parcel.id, 'parcelArea', e.target.value)}
                        className={`${input} py-2 text-sm`}
                        placeholder="0.0000"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => removeParcelRow(parcel.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500 hover:text-white transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Running total */}
              <div className={`mt-4 flex items-center justify-between px-4 py-3 rounded-xl ${dm ? 'bg-slate-700/40' : 'bg-slate-100'}`}>
                <span className="text-sm font-semibold opacity-70">Total of all parcel areas:</span>
                <span className="font-extrabold text-blue-600">{calculatedArea || '0.0000'} m²</span>
              </div>

              <button onClick={addParcelRow} className={`mt-3 w-full py-2.5 rounded-xl border-2 border-dashed font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                dm ? 'border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-400' : 'border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500'
              }`}>
                <Plus className="w-4 h-4" /> Add another parcel
              </button>
            </>
          ) : (
            <div className={`text-center py-10 rounded-2xl border-2 border-dashed ${dm ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
              <Calculator className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No parcels yet</p>
              <p className="text-sm mt-1">Enter a number above and click "Generate Rows", or add one at a time</p>
              <button onClick={addParcelRow} className="mt-4 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all">
                + Add Parcel Manually
              </button>
            </div>
          )}
        </div>

        {/* ═══ STEP 3 ═══ */}
        <div className={card}>
          <div className="flex items-center gap-3 mb-6">
            <StepBadge n={3} active={step1Done && step2Done && !step3Done} done={step3Done} />
            <div>
              <h2 className="text-lg font-extrabold">Calculate & Get Results</h2>
              <p className="text-sm opacity-60">Areas are adjusted proportionally if within permissible error</p>
            </div>
          </div>

          <button
            onClick={calculate}
            disabled={isCalculating}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-lg shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all disabled:opacity-60"
          >
            {isCalculating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Calculator className="w-6 h-6" />}
            {isCalculating ? 'Calculating…' : 'Calculate Results'}
          </button>

          {/* Results table */}
          {results && (
            <div className="mt-8 animate-fadeIn">

              {/* Status banner */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl mb-6 ${
                results.exceeds ? (dm ? 'bg-red-900/20 border border-red-700/40' : 'bg-red-50 border border-red-200') : (dm ? 'bg-green-900/20 border border-green-700/40' : 'bg-green-50 border border-green-200')
              }`}>
                {results.exceeds
                  ? <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                  : <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />}
                <div>
                  <p className={`font-bold ${results.exceeds ? 'text-red-600' : 'text-green-600'}`}>
                    {results.exceeds
                      ? 'Error exceeds limits — original areas are shown (no adjustment)'
                      : 'Within limits — areas have been adjusted proportionally'}
                  </p>
                  <p className="text-sm opacity-60 mt-0.5">
                    Difference: {results.diff} m² &nbsp;|&nbsp; Permissible: {results.perm} m²
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className={`overflow-hidden rounded-2xl border ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-xs uppercase tracking-wider font-bold ${dm ? 'bg-slate-900' : 'bg-slate-100'}`}>
                      <th className="px-4 py-3 text-left">Parcel #</th>
                      <th className="px-4 py-3 text-right">Original (m²)</th>
                      <th className="px-4 py-3 text-right text-blue-500">Adjusted (m²)</th>
                      <th className="px-4 py-3 text-right text-indigo-500">Rounded (m²)</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${dm ? 'divide-slate-800' : 'divide-slate-100'}`}>
                    {results.rows.map((row, i) => (
                      <tr key={i} className={`transition-colors ${dm ? 'hover:bg-slate-700/40' : 'hover:bg-blue-50/50'}`}>
                        <td className="px-4 py-3 font-semibold">{row.parcelNumber}</td>
                        <td className="px-4 py-3 text-right opacity-70">{row.originalArea}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-500">{row.adjustedArea}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-indigo-500">{row.roundedArea}</td>
                      </tr>
                    ))}
                    <tr className={`font-extrabold text-base ${dm ? 'bg-slate-900/60' : 'bg-slate-50'}`}>
                      <td className="px-4 py-4">TOTAL</td>
                      <td className="px-4 py-4 text-right opacity-70">{fmtNum(calculatedArea)}</td>
                      <td className="px-4 py-4 text-right text-blue-500">{results.totalAdj}</td>
                      <td className="px-4 py-4 text-right text-indigo-500">{results.totalRnd}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button onClick={exportPDF} className="mt-5 w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                <Download className="w-5 h-5" /> Download PDF Report
              </button>
            </div>
          )}
        </div>

      </main>

      {/* ── Notifications ── */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold pointer-events-auto border ${
            n.type === 'success' ? (dm ? 'bg-green-900 border-green-700 text-green-200' : 'bg-green-50 border-green-200 text-green-800') :
            n.type === 'error'   ? (dm ? 'bg-red-900 border-red-700 text-red-200'     : 'bg-red-50 border-red-200 text-red-800')     :
                                   (dm ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700')
          }`}>
            {n.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> :
             n.type === 'error'   ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0"  /> :
                                    <Info className="w-4 h-4 text-blue-500 shrink-0" />}
            {n.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.35s ease-out both; }
      `}</style>
    </div>
  );
}