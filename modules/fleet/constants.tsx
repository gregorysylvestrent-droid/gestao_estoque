
import React from 'react';

export const MaterialIcon = ({ name, fill = false, className = "" }: { name: string, fill?: boolean, className?: string }) => (
  <span className={`material-symbols-outlined ${className}`} style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}` }}>
    {name}
  </span>
);

export const Badge = ({ children, variant = 'gray' }: { children?: React.ReactNode, variant?: 'success' | 'danger' | 'warning' | 'info' | 'gray' | 'blue' }) => {
  const styles = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    blue: 'bg-primary/10 text-primary',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${styles[variant]}`}>
      {children}
    </span>
  );
};

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
            <MaterialIcon name="close" />
          </button>
        </div>
        <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Input = ({ label, placeholder, type = "text", onAction, actionIcon, className = "", ...props }: any) => (
  <div className="space-y-1 relative group">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">{label}</label>
    <div className="relative">
      <input 
        type={type} 
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-xl text-sm focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400 font-semibold text-slate-700 dark:text-slate-200 ${onAction ? 'pr-12' : ''} ${className}`}
        {...props}
      />
      {onAction && (
        <button 
          type="button"
          onClick={onAction}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-white rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm"
        >
          <MaterialIcon name={actionIcon || "search"} className="!text-[18px]" />
        </button>
      )}
    </div>
  </div>
);

export const Select = ({ label, options, className = "", ...props }: any) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">{label}</label>
    <select 
      className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-xl text-sm focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-slate-900 transition-all cursor-pointer font-semibold text-slate-700 dark:text-slate-200 ${className}`}
      {...props}
    >
      {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);
