import React, { useState } from 'react';
import { Lock, Sparkles, KeyRound, Check, AlertCircle } from 'lucide-react';

interface PasscodeLockProps {
  onUnlock: () => void;
}

// Configurable App PIN (Defaults to 2026 or VITE_APP_PIN if configured in Vercel env)
const APP_PIN = import.meta.env.VITE_APP_PIN || '2026';

export const PasscodeLock: React.FC<PasscodeLockProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError('');

      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const verifyPin = (enteredPin: string) => {
    if (enteredPin === APP_PIN) {
      sessionStorage.setItem('kathak_app_unlocked', 'true');
      localStorage.setItem('kathak_app_unlocked', 'true');
      onUnlock();
    } else {
      setError('Incorrect PIN. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white z-50 flex flex-col items-center justify-between p-6 select-none animate-fade-in">
      {/* App Header / Logo */}
      <div className="pt-8 text-center space-y-2">
        <div className="inline-flex p-3 bg-rose-900/60 rounded-3xl border border-rose-700/50 shadow-lg shadow-rose-900/30">
          <Sparkles className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-black tracking-wide text-white">Kathak Class</h1>
        <p className="text-xs text-rose-300 font-medium">Akanksha's Attendance Manager</p>
      </div>

      {/* PIN Dots & Status */}
      <div className="w-full max-w-xs space-y-6 text-center">
        <div className="flex items-center justify-center gap-2 text-rose-200">
          <Lock className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold">Enter Security PIN</span>
        </div>

        {/* 4 Digit Indicators */}
        <div className={`flex justify-center items-center gap-4 ${shake ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > idx
                  ? 'bg-amber-400 border-amber-400 scale-110 shadow-md shadow-amber-400/40'
                  : 'border-slate-700 bg-slate-900'
              }`}
            />
          ))}
        </div>

        {error ? (
          <p className="text-xs font-semibold text-rose-400 flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        ) : (
          <p className="text-[11px] text-slate-400">Default PIN: <strong className="text-amber-300">2026</strong></p>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="w-full max-w-xs space-y-3 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="h-16 rounded-2xl bg-slate-900/80 hover:bg-rose-900/50 active:bg-rose-800 border border-slate-800 text-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center shadow-md"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-2xl bg-slate-900/80 hover:bg-rose-900/50 active:bg-rose-800 border border-slate-800 text-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center shadow-md"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-slate-900/40 hover:bg-slate-800 text-xs font-semibold text-slate-400 transition-all active:scale-95 flex items-center justify-center"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
