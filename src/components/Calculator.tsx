import React, { useState, useEffect, useRef } from 'react';
import { Calculator as CalcIcon, X, Delete, Scale, Pill, Stethoscope, Hash, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CalculatorProps {
  isDarkMode?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

type CalcMode = 'standard' | 'medical';

const Calculator: React.FC<CalculatorProps> = ({ isDarkMode, onClose, inline }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [justCalculated, setJustCalculated] = useState(false);
  const [mode, setMode] = useState<CalcMode>('standard');
  const [medicalCalc, setMedicalCalc] = useState({ weight: '', dose: '', unit: 'mg/kg' });
  const [medicalResult, setMedicalResult] = useState<string | null>(null);

  const handleDigit = (digit: string) => {
    if (justCalculated) {
      setDisplay(digit === '.' ? '0.' : digit);
      setJustCalculated(false);
      return;
    }
    setDisplay(prev => {
      if (digit === '.' && prev.includes('.')) return prev;
      if (prev === '0' && digit !== '.') return digit;
      return prev + digit;
    });
  };

  const handleOperator = (op: string) => {
    setJustCalculated(false);
    if (equation && !justCalculated) {
      try {
        const result = new Function(`return ${(equation + display).replace(/×/g, '*').replace(/÷/g, '/')}`)();
        setEquation(String(result) + ' ' + op + ' ');
        setDisplay('0');
      } catch {
        setEquation(display + ' ' + op + ' ');
        setDisplay('0');
      }
    } else {
      setEquation(display + ' ' + op + ' ');
      setDisplay('0');
    }
  };

  const calculate = () => {
    try {
      const fullEquation = equation + display;
      if (!fullEquation || !equation) return;
      const result = new Function(`return ${fullEquation.replace(/×/g, '*').replace(/÷/g, '/')}`)();
      const formatted = Number.isInteger(result) ? String(result) : parseFloat(result.toFixed(10)).toString();
      setHistory(prev => [`${fullEquation}= ${formatted}`, ...prev.slice(0, 4)]);
      setDisplay(formatted);
      setEquation('');
      setJustCalculated(true);
    } catch {
      setDisplay('Lỗi');
      setEquation('');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
    setJustCalculated(false);
  };

  const clearEntry = () => {
    setDisplay('0');
  };

  const backspace = () => {
    if (justCalculated) { clear(); return; }
    setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  const toggleSign = () => {
    setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
  };

  const percentage = () => {
    try {
      const val = parseFloat(display) / 100;
      setDisplay(String(val));
    } catch { /* noop */ }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
      else if (e.key === '.') handleDigit('.');
      else if (e.key === '+') handleOperator('+');
      else if (e.key === '-') handleOperator('-');
      else if (e.key === '*') handleOperator('×');
      else if (e.key === '/') { e.preventDefault(); handleOperator('÷'); }
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); calculate(); }
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Escape') clear();
      else if (e.key === '%') percentage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, equation, justCalculated]);

  const calculateDose = () => {
    const w = parseFloat(medicalCalc.weight);
    const d = parseFloat(medicalCalc.dose);
    if (!isNaN(w) && !isNaN(d) && w > 0 && d > 0) {
      const result = w * d;
      const formatted = parseFloat(result.toFixed(4)).toString();
      setMedicalResult(formatted);
    }
  };

  // Button config
  const row1 = [
    { label: 'C',   action: clear,        cls: 'text-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20' },
    { label: '+/-', action: toggleSign,   cls: isDarkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' },
    { label: '%',   action: percentage,   cls: isDarkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' },
    { label: '÷',   action: () => handleOperator('÷'), cls: 'bg-primary text-white hover:bg-primary/80 shadow-md shadow-primary/30' },
  ];
  const row2 = [
    { label: '7', action: () => handleDigit('7') },
    { label: '8', action: () => handleDigit('8') },
    { label: '9', action: () => handleDigit('9') },
    { label: '×', action: () => handleOperator('×'), cls: 'bg-primary text-white hover:bg-primary/80 shadow-md shadow-primary/30' },
  ];
  const row3 = [
    { label: '4', action: () => handleDigit('4') },
    { label: '5', action: () => handleDigit('5') },
    { label: '6', action: () => handleDigit('6') },
    { label: '-', action: () => handleOperator('-'), cls: 'bg-primary text-white hover:bg-primary/80 shadow-md shadow-primary/30' },
  ];
  const row4 = [
    { label: '1', action: () => handleDigit('1') },
    { label: '2', action: () => handleDigit('2') },
    { label: '3', action: () => handleDigit('3') },
    { label: '+', action: () => handleOperator('+'), cls: 'bg-primary text-white hover:bg-primary/80 shadow-md shadow-primary/30' },
  ];
  const row5 = [
    { label: '0', action: () => handleDigit('0') },
    { label: '.', action: () => handleDigit('.')  },
    { label: '=', action: calculate,              cls: 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/30' },
    { label: '⌫', action: backspace,              cls: isDarkMode ? 'bg-slate-700 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20' : 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-100' },
  ];

  const numCls = isDarkMode
    ? 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
    : 'bg-white text-slate-900 hover:bg-slate-50 border border-slate-100 shadow-sm';

  const renderBtn = (btn: any, idx: number) => {
    const isColSpan2 = btn.cls?.includes('col-span-2');
    const customCls = btn.cls ? btn.cls.replace('col-span-2', '').trim() : '';
    
    return (
      <button
        key={idx}
        onClick={btn.action}
        className={cn(
          'flex items-center justify-center rounded-2xl text-sm font-black transition-all duration-150 active:scale-90 select-none h-12',
          isColSpan2 ? 'col-span-2' : '',
          customCls !== '' ? customCls : numCls
        )}
      >
        {btn.label === '⌫'
          ? <Delete size={16} />
          : <span>{btn.label}</span>
        }
      </button>
    );
  };

  const displayFontSize = display.length > 10 ? 'text-2xl' : display.length > 7 ? 'text-3xl' : 'text-4xl';

  return (
    <div className={cn(
      'w-full rounded-[28px] overflow-hidden transition-all',
      inline ? '' : 'max-w-sm',
      isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100 shadow-2xl shadow-slate-200/60'
    )}>

      {/* Header */}
      <div className={cn(
        'px-5 py-3 flex items-center justify-between border-b',
        isDarkMode ? 'border-slate-800 bg-slate-800/40' : 'border-slate-100 bg-slate-50/80'
      )}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary rounded-lg text-white shadow-md shadow-primary/30">
            <CalcIcon size={14} />
          </div>
          <span className={cn('text-[11px] font-black uppercase tracking-widest', isDarkMode ? 'text-white' : 'text-slate-800')}>
            Máy tính
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Mode tabs */}
          <div className={cn('flex items-center rounded-lg p-0.5 gap-0.5 mr-1', isDarkMode ? 'bg-slate-700' : 'bg-slate-200/60')}>
            <button
              onClick={() => setMode('standard')}
              className={cn(
                'px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all',
                mode === 'standard'
                  ? 'bg-primary text-white shadow-sm'
                  : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
              )}
            >
              <Hash size={10} />
            </button>
            <button
              onClick={() => setMode('medical')}
              className={cn(
                'px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all',
                mode === 'medical'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
              )}
            >
              <Stethoscope size={10} />
            </button>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className={cn('p-1.5 rounded-lg transition-colors ml-1', isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-400')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'standard' ? (
          <motion.div
            key="standard"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Display */}
            <div className={cn(
              'px-5 pt-5 pb-3 text-right',
              isDarkMode ? 'bg-slate-950/60' : 'bg-slate-50'
            )}>
              {/* Equation */}
              <p className={cn(
                'text-[11px] font-semibold h-5 mb-1 truncate transition-all',
                isDarkMode ? 'text-slate-500' : 'text-slate-400'
              )}>
                {equation || '\u00A0'}
              </p>
              {/* Main display */}
              <motion.p
                key={display}
                initial={{ opacity: 0.6, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'font-black tracking-tighter truncate leading-none',
                  displayFontSize,
                  justCalculated
                    ? 'text-primary'
                    : (isDarkMode ? 'text-white' : 'text-slate-900')
                )}
              >
                {display}
              </motion.p>

              {/* History */}
              {history.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {history.slice(0, 2).map((h, i) => (
                    <p key={i} className={cn(
                      'text-[9px] font-semibold truncate',
                      i === 0 ? (isDarkMode ? 'text-slate-500' : 'text-slate-400') : (isDarkMode ? 'text-slate-700' : 'text-slate-300')
                    )}>{h}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Keypad */}
            <div className={cn('p-3 space-y-2', isDarkMode ? 'bg-slate-900' : 'bg-white')}>
              <div className="grid grid-cols-4 gap-2">{row1.map(renderBtn)}</div>
              <div className="grid grid-cols-4 gap-2">{row2.map(renderBtn)}</div>
              <div className="grid grid-cols-4 gap-2">{row3.map(renderBtn)}</div>
              <div className="grid grid-cols-4 gap-2">{row4.map(renderBtn)}</div>
              <div className="grid grid-cols-4 gap-2">{row5.map(renderBtn)}</div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="medical"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className={cn('p-5 space-y-4', isDarkMode ? 'bg-slate-900' : 'bg-white')}
          >
            {/* Medical dose calc */}
            <div className={cn(
              'p-4 rounded-2xl border space-y-3',
              isDarkMode ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-emerald-50/60 border-emerald-100'
            )}>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-emerald-500 rounded-lg text-white shadow-sm shadow-emerald-500/30">
                  <Pill size={12} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  Tính liều theo cân nặng
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={cn('block text-[9px] font-black uppercase tracking-widest mb-1 ml-1', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                    Cân nặng (kg)
                  </label>
                  <div className="relative">
                    <Scale size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      value={medicalCalc.weight}
                      onChange={e => setMedicalCalc({ ...medicalCalc, weight: e.target.value })}
                      onWheel={e => (e.target as HTMLInputElement).blur()}
                      onKeyDown={e => e.key === 'Enter' && calculateDose()}
                      placeholder="0"
                      className={cn(
                        'w-full pl-7 pr-2 py-2 rounded-xl text-sm font-bold transition-all border outline-none',
                        isDarkMode
                          ? 'bg-slate-800 text-white border-slate-700 focus:border-emerald-500'
                          : 'bg-white text-slate-900 border-slate-200 shadow-sm focus:border-emerald-400'
                      )}
                    />
                  </div>
                </div>
                <div>
                  <label className={cn('block text-[9px] font-black uppercase tracking-widest mb-1 ml-1', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                    Liều (mg/kg)
                  </label>
                  <div className="relative">
                    <Pill size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      value={medicalCalc.dose}
                      onChange={e => setMedicalCalc({ ...medicalCalc, dose: e.target.value })}
                      onWheel={e => (e.target as HTMLInputElement).blur()}
                      onKeyDown={e => e.key === 'Enter' && calculateDose()}
                      placeholder="0"
                      className={cn(
                        'w-full pl-7 pr-2 py-2 rounded-xl text-sm font-bold transition-all border outline-none',
                        isDarkMode
                          ? 'bg-slate-800 text-white border-slate-700 focus:border-emerald-500'
                          : 'bg-white text-slate-900 border-slate-200 shadow-sm focus:border-emerald-400'
                      )}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={calculateDose}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-md shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                Tính liều <ChevronRight size={14} />
              </button>

              <AnimatePresence>
                {medicalResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className={cn(
                      'p-4 rounded-2xl border text-center',
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-200 shadow-md shadow-emerald-100'
                    )}
                  >
                    <p className={cn('text-[9px] font-black uppercase tracking-widest mb-1', isDarkMode ? 'text-slate-400' : 'text-slate-400')}>
                      Tổng liều cần dùng
                    </p>
                    <p className="text-3xl font-black text-emerald-500 tracking-tight">
                      {medicalResult} <span className="text-base font-bold">mg</span>
                    </p>
                    <p className={cn('text-[9px] font-semibold mt-1', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                      {medicalCalc.weight} kg × {medicalCalc.dose} mg/kg
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Info card */}
            <div className={cn(
              'p-3 rounded-xl border text-center',
              isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'
            )}>
              <p className={cn('text-[9px] font-bold leading-relaxed', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                Lưu ý: Kết quả chỉ mang tính tham khảo. Liều thực tế cần được xác nhận bởi bác sĩ điều trị.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Calculator;
