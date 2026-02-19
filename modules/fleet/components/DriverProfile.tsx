
import React from 'react';
import { Badge, MaterialIcon } from '../constants';

const DriverProfile: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Alert */}
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-3xl flex flex-col sm:flex-row items-center gap-4">
        <div className="size-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
          <MaterialIcon name="warning" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm font-bold text-red-800 dark:text-red-300">Atencao: Exame Toxicologico Vence em 15 dias</p>
          <p className="text-xs text-red-700/80 dark:text-red-400/80">O motorista Joao Silva precisa realizar o exame periodico para manter a validade da categoria D.</p>
        </div>
        <button className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-red-600/20">Agendar Agora</button>
      </div>

      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div 
            className="size-32 rounded-3xl bg-cover bg-center border-4 border-slate-50 dark:border-slate-800 shadow-xl shrink-0"
            style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBnEUFHysWe_UsYygOuhABHdZWLjAfPJd8zBqv6lCMab049YOhRt7t0TDgtzU3Uo6i9K6DDubXWFG0hh_15X9NL8cUDFLjgnuWm_eYCF8SEQ7iP2gwU0srXa-BYkj7IUSP8nyq_w7KXMuoRMG8BECpucgAJqyFUqpnsXyed3HEsb_j-ktg7hzANBF-JSiMuPjCgn0KBs6csft-93rOxRqKTTwvOcAYOj0aNnAqSpxe7wD5Ci1Qg5fpvxo9VIvdT__4IFSpiJaOhjf4L')` }}
          />
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
              <h2 className="text-3xl font-black">Joao Silva de Souza</h2>
              <Badge variant="success">Ativo</Badge>
            </div>
            <p className="text-slate-500 font-medium mb-4">ID: #44921 - Motorista Senior - Unidade: Sao Paulo - SP</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                <MaterialIcon name="mail" className="!text-[18px] text-primary" />
                joao.silva@logistica.com
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                <MaterialIcon name="call" className="!text-[18px] text-primary" />
                (11) 98765-4321
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-center md:justify-start">
              <button className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
                <MaterialIcon name="edit" className="!text-[18px]" />
                Editar Perfil
              </button>
              <button className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95">
                <MaterialIcon name="picture_as_pdf" className="!text-[18px]" />
                Relatorio PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pontuacao CNH</span>
            <MaterialIcon name="assignment_late" className="text-amber-500" />
          </div>
          <h3 className="text-2xl font-black mb-4">12 / 40 pts</h3>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: '30%' }}></div>
          </div>
          <p className="text-[10px] font-bold text-emerald-500 mt-2 flex items-center gap-1">
            <MaterialIcon name="trending_up" className="!text-[12px]" />
            +3 pts este mes
          </p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Validade CNH</span>
            <MaterialIcon name="badge" className="text-primary" />
          </div>
          <h3 className="text-2xl font-black mb-4">15/10/2025</h3>
          <p className="text-[10px] font-bold text-primary mt-2">Expira em 342 dias</p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Proximo Toxicologico</span>
            <MaterialIcon name="medical_services" className="text-red-500" />
          </div>
          <h3 className="text-2xl font-black mb-4">05/12/2024</h3>
          <p className="text-[10px] font-bold text-red-500 mt-2">Faltam apenas 15 dias</p>
        </div>
      </div>

      {/* Basic Info Tabs Content Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-8 border-b border-slate-100 dark:border-slate-800 flex gap-10">
           <button className="py-4 border-b-2 border-primary text-primary text-sm font-bold">Dados CNH</button>
           <button className="py-4 border-b-2 border-transparent text-slate-400 text-sm font-bold">Multas</button>
           <button className="py-4 border-b-2 border-transparent text-slate-400 text-sm font-bold">Treinamentos</button>
        </div>
        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h4 className="font-bold text-lg border-l-4 border-primary pl-4">Informacoes Basicas</h4>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Registro</p>
                <p className="text-sm font-semibold">98234123567</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Categoria</p>
                <p className="text-lg font-black text-primary">AD</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Primeira Hab.</p>
                <p className="text-sm font-semibold">10/05/2012</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Emissao</p>
                <p className="text-sm font-semibold">15/10/2020</p>
              </div>
            </div>
            <div className="pt-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Observacoes (EAR, etc)</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-bold">EXERCE ATIVIDADE REMUNERADA (EAR)</span>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-bold">USO DE LENTES CORRETIVAS</span>
              </div>
            </div>
          </div>
          <div className="space-y-6">
             <h4 className="font-bold text-lg border-l-4 border-primary pl-4">Documento Digital</h4>
             <button
                type="button"
                className="aspect-[1.6/1] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center group cursor-pointer hover:border-primary hover:bg-white/60 dark:hover:bg-slate-700/40 transition-all active:scale-[0.99]"
             >
                <MaterialIcon name="image" className="text-4xl text-slate-300 group-hover:text-primary mb-2 transition-colors" />
                <p className="text-[10px] font-bold text-slate-400 group-hover:text-primary uppercase tracking-widest">Visualizar Anexo</p>
             </button>
             <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>cnh_joao_silva_2024.pdf (2.4 MB)</span>
                <button className="text-primary hover:text-primary/80 hover:underline transition-colors active:scale-95">Substituir</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverProfile;

