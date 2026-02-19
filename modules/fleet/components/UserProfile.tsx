
import React from 'react';
import { MaterialIcon } from '../constants';

const UserProfile: React.FC = () => {
  return (
    <div className="w-full space-y-8">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
         <div className="flex items-center gap-6 mb-10">
            <div className="relative">
               <div 
                  className="size-24 rounded-3xl bg-cover bg-center border-4 border-slate-50 dark:border-slate-800 shadow-xl"
                  style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuC1HGDKhQ-Y8zwK6qxbyhrE8Ku4zP5L9UOnJIdH3ZlS1JtBp92x4Hxp9fZmEeQmGGSJiuxSc7BhYYwHDTf9x2VXD6kGz-qm-5Q8dH4VTH5PPUDpZ2z6V9r72OFYpHve8bdAOoDToD5l5jsrOLSdPx0f50Y5ufI_QpWsUg-NXoIZaNQACEQIXj2MN7I02BpUC9AnEF_4Kfnzb44gDj5CWU54xeJQ_mwJNdYj5SBjEncbh39FlagUQ4mOK8ppzvA_7Q5VgGhH11dgaXjl')` }}
               />
               <button className="absolute -bottom-2 -right-2 size-8 bg-primary text-white rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                  <MaterialIcon name="photo_camera" className="!text-[16px]" />
               </button>
            </div>
            <div>
               <h2 className="text-2xl font-black">Mariana Silva</h2>
               <p className="text-slate-500 font-medium">mariana.silva@gestaofrota.com.br</p>
               <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase">Administrador</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Membro desde Out 2021</span>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase ml-1">Nome Completo</span>
                  <input type="text" defaultValue="Mariana Silva" className="w-full mt-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50" />
               </label>
               <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase ml-1">E-mail Corporativo</span>
                  <input type="email" defaultValue="mariana.silva@gestaofrota.com.br" className="w-full mt-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50" />
               </label>
            </div>
            <div className="space-y-4">
               <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase ml-1">Telefone</span>
                  <input type="text" defaultValue="(11) 99876-5432" className="w-full mt-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50" />
               </label>
               <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase ml-1">Cargo</span>
                  <input type="text" defaultValue="Gestora de Frota Sênior" className="w-full mt-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50" />
               </label>
            </div>
         </div>
         
         <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">Descartar</button>
            <button className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95">Salvar Alterações</button>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
         <h3 className="font-bold mb-6">Configurações de Notificação</h3>
         <div className="space-y-4">
            {[
               { title: 'Vencimento de Documentos', desc: 'Alertar 30 dias antes do vencimento do CRLV/IPVA', active: true },
               { title: 'Novas Multas', desc: 'Receber notificação em tempo real de novas infrações', active: true },
               { title: 'Exames Toxicológicos', desc: 'Avisar quando motoristas precisarem renovar o exame', active: false },
            ].map((pref, i) => (
               <div key={i} className="flex items-center justify-between py-4 border-b border-slate-50 dark:border-slate-800 last:border-none">
                  <div>
                     <p className="text-sm font-bold">{pref.title}</p>
                     <p className="text-xs text-slate-500">{pref.desc}</p>
                  </div>
                  <button className={`w-12 h-6 rounded-full relative transition-all duration-200 ${pref.active ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} hover:scale-105 active:scale-95`}>
                     <div className={`absolute top-1 size-4 bg-white rounded-full transition-all duration-200 ${pref.active ? 'right-1' : 'left-1'}`}></div>
                  </button>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default UserProfile;



