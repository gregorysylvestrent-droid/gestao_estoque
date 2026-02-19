import React from 'react';
import { Screen } from '../types';
import { MaterialIcon } from '../constants';
import { FLEET_MENU_SECTIONS } from '../derArchitecture';

interface LayoutProps {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
  onAddClick?: () => void;
  addLabel?: string;
  addIcon?: string;
  onBackToModules?: () => void;
  children: React.ReactNode;
}

const flattenMenu = FLEET_MENU_SECTIONS.flatMap((section) => section.items);

const Layout: React.FC<LayoutProps> = ({ currentScreen, setScreen, onAddClick, addLabel, addIcon, onBackToModules, children }) => {
  const activeItem = flattenMenu.find((item) => item.id === currentScreen);
  const activeSection = FLEET_MENU_SECTIONS.find((section) => section.items.some((item) => item.id === currentScreen));

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-sans">
      <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 text-primary border-b border-slate-100 dark:border-slate-800">
          <div className="size-8 bg-primary/10 flex items-center justify-center rounded-lg">
            <MaterialIcon name="local_shipping" fill />
          </div>
          <div>
            <h1 className="text-slate-900 dark:text-white font-bold leading-none uppercase tracking-tighter">Central Frota</h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Modelo DER Integrado</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
          {FLEET_MENU_SECTIONS.map((section) => (
            <div key={section.id} className="space-y-1">
              <div className="px-3 pb-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em]">{section.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{section.subtitle}</p>
              </div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  title={item.hint}
                  className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    currentScreen === item.id
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <MaterialIcon name={item.icon} fill={currentScreen === item.id} className="text-[20px] mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight">{item.label}</p>
                    <p
                      className={`text-[11px] mt-0.5 leading-tight ${
                        currentScreen === item.id ? 'text-white/80' : 'text-slate-400'
                      }`}
                    >
                      {item.hint}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <button
          onClick={() => setScreen(Screen.PERFIL)}
          className={`p-4 m-4 mt-0 border border-slate-200 dark:border-slate-700 flex items-center gap-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${
            currentScreen === Screen.PERFIL ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-primary/20' : ''
          }`}
        >
          <div className="size-10 rounded-full bg-primary/10 border border-primary/20 shrink-0 flex items-center justify-center">
            <MaterialIcon name="person" className="!text-[18px] text-primary" />
          </div>
          <div className="overflow-hidden text-left">
            <p className="text-sm font-bold truncate">Mariana Silva</p>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tighter">Gestora de Frota</p>
          </div>
        </button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 md:px-8 shrink-0">
          <div className="flex items-center gap-4">
            {onBackToModules && (
              <button
                onClick={onBackToModules}
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                title="Voltar para Selecionar Modulo"
              >
                <MaterialIcon name="arrow_back" className="!text-[18px]" />
                Voltar aos Modulos
              </button>
            )}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em]">{activeSection?.title ?? 'Gestao de Frota'}</p>
              <h2 className="text-lg font-black uppercase tracking-tight">{activeItem?.label ?? 'Painel Executivo'}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {onBackToModules && (
              <button
                onClick={onBackToModules}
                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-95"
                title="Voltar para Selecionar Modulo"
              >
                <MaterialIcon name="arrow_back" />
              </button>
            )}
            {onAddClick && addLabel && (
              <button
                onClick={onAddClick}
                className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-[11px] font-black flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest"
              >
                <MaterialIcon name={addIcon || 'add'} className="!text-[18px]" />
                <span>{addLabel}</span>
              </button>
            )}
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative" title="Notificacoes">
              <MaterialIcon name="notifications" />
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 2xl:p-10 bg-background-light dark:bg-background-dark/50">
          <div className="w-full max-w-none">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
