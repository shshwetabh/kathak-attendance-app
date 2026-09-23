import React from 'react';
import { Sparkles, Database, Cloud } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export const Header: React.FC = () => {
  return (
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

        <div className="flex items-center">
          {isSupabaseConfigured ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <Cloud className="w-3.5 h-3.5" />
              <span>Supabase Cloud</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-200 border border-amber-500/30">
              <Database className="w-3.5 h-3.5" />
              <span>Local Demo</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
