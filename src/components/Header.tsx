import React, { useState, useEffect } from 'react';
import { Sparkles, Database, Cloud, Smartphone, Download, X, Check, Lock } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface HeaderProps {
  onLock?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLock }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  const [showInstructionModal, setShowInstructionModal] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    // Check if already installed as standalone app
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    // Listen for Chrome / Android beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if on mobile browser to display Install button
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && !checkStandalone) {
      setShowInstallBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstructionModal(true);
    }
  };

  return (
    <>
      <header className="bg-gradient-to-r from-rose-900 via-rose-800 to-rose-900 text-white shadow-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-rose-700/80 p-2 rounded-xl shadow-inner border border-rose-500/30">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-wide">Kathak Class</h1>
              <p className="text-xs text-rose-200 font-medium">Attendance & Fee Manager</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onLock && (
              <button
                onClick={onLock}
                className="p-1.5 bg-rose-950/60 hover:bg-rose-950 text-rose-200 hover:text-white rounded-xl border border-rose-700/40 text-xs font-semibold transition-colors flex items-center gap-1"
                title="Lock Application"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}

            {!isStandalone && (
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-400 text-rose-950 hover:bg-amber-300 shadow-sm transition-all active:scale-95"
                title="Add Kathak App Icon to Phone Home Screen"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            )}

            {isSupabaseConfigured ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Cloud className="w-3 h-3" />
                <span>Cloud</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-200 border border-amber-500/30">
                <Database className="w-3 h-3" />
                <span>Local</span>
              </span>
            )}
          </div>
        </div>

        {/* Floating Quick Install Notification Banner on Mobile */}
        {showInstallBanner && !isStandalone && (
          <div className="max-w-md mx-auto mt-2.5 bg-rose-950/90 border border-amber-400/40 p-2.5 rounded-2xl flex items-center justify-between text-xs text-amber-100 shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-400 text-rose-950 rounded-lg">
                <Download className="w-4 h-4 font-bold" />
              </div>
              <div>
                <span className="font-bold block text-white text-xs">Add Icon to Phone</span>
                <span className="text-[11px] text-rose-200">Use like a native Android app</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleInstallClick}
                className="bg-amber-400 hover:bg-amber-300 text-rose-950 font-extrabold px-3 py-1 rounded-xl text-xs shadow-sm transition-colors"
              >
                Add Now
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-rose-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Instruction Modal if direct prompt not triggered */}
      {showInstructionModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4 animate-scale-up text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base">Add App Icon to Phone</h3>
              </div>
              <button
                onClick={() => setShowInstructionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <p className="font-medium text-slate-700">
                To put the <strong>Kathak Tracker</strong> icon directly on your Android phone home screen:
              </p>

              <ol className="space-y-2.5 font-medium list-decimal list-inside bg-rose-50/60 p-3 rounded-2xl border border-rose-100">
                <li>
                  Tap the <strong>3 vertical dots menu (⋮)</strong> in the top-right corner of Chrome.
                </li>
                <li>
                  Tap <strong>"Add to Home screen"</strong> (or <strong>"Install app"</strong>).
                </li>
                <li>
                  Tap <strong>"Add"</strong>.
                </li>
              </ol>

              <p className="text-[11px] text-slate-500">
                An icon will appear on your phone home screen that launches the app directly without opening Chrome links!
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowInstructionModal(false)}
                className="w-full bg-rose-700 hover:bg-rose-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-rose-700/20"
              >
                <Check className="w-4 h-4" />
                <span>Got It</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
