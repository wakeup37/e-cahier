import React, { useState } from 'react';

const Header = ({ title = "E-cahier !", roleName = "Espace Utilisateur", onLogout, onglets = [], activeTab, setActiveTab }) => {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <header className="bg-slate-900 text-white shadow-lg border-b border-slate-800 w-full relative z-50">
      <div className="w-full px-4 py-2.5 flex items-center justify-between">
        
        {/* Logo & Rôle ultra-épuré (Façon appli native) */}
        <div className="flex items-center gap-2 truncate">
          <span className="text-base font-bold tracking-wide text-blue-400">
            {title}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-xs font-medium text-slate-300 truncate max-w-[180px]">
            {roleName}
          </span>
        </div>

        {/* Bouton Menu Burger (Le gros bouton rouge a été totalement supprimé) */}
        <div className="flex items-center">
          <button 
            onClick={() => setMenuOuvert(!menuOuvert)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 shadow-sm transition-all"
          >
            <span className="text-sm">{menuOuvert ? '✕' : '☰'}</span>
            <span>{menuOuvert ? 'Fermer' : 'Menu'}</span>
          </button>
        </div>

      </div>

      {/* Menu Tiroir Mobile (Regroupe les onglets et la déconnexion fonctionnelle) */}
      {menuOuvert && (
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 flex flex-col gap-2 shadow-2xl w-full">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            Navigation
          </div>

          {onglets.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.action) {
                  tab.action();
                } else if (setActiveTab) {
                  setActiveTab(tab.id);
                }
                setMenuOuvert(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <div className="border-t border-slate-800 my-1.5 pt-1.5">
            <button 
              onClick={() => { setMenuOuvert(false); if (onLogout) onLogout(); }}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-xs font-semibold text-center shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>🚪</span> Se déconnecter
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

exports_default = Header;
export default Header;
