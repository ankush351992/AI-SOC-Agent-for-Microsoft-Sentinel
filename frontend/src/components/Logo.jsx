import React from 'react';
import { Shield, Sparkles } from 'lucide-react';

export default function Logo({ className = "h-8", showText = true }) {
  return (
    <div className="flex items-center space-x-2.5 select-none">
      <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 shadow-md shadow-blue-500/20 text-white">
        <Shield className="w-5 h-5 text-white" />
        <Sparkles className="w-3 h-3 text-cyan-200 absolute -top-0.5 -right-0.5 animate-pulse" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            Sentinel <span className="text-blue-500">AI</span>
          </span>
          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest mt-0.5">
            Autonomous SOC
          </span>
        </div>
      )}
    </div>
  );
}
