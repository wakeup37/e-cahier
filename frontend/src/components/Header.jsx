import React, { useState } from 'react';

const Header = ({ title = "E-cahier !", roleName = "Espace Utilisateur", onLogout }) => {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <header className="bg-slate-900 text-white shadow-lg border-b border-slate-800 w-full relative z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* Logo & Rôle ultra-propre */}
        <div className="flex items-center gap-2 truncate">
          <span className="text-base sm:text-lg font-bold tracking-wide text-blue-400">
            {title}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-xs sm:text-sm font-medium text-slate-300 truncate max-w-[160px] sm:max-w-none">
            {roleName}
          </span>
        </div>

        {/* Boutons d'actions et Menu Mobile */}
        <div className="flex items-center gap-2">
          
          {/* Bouton de déconnexion version PC */}
          <button 
            onClick={onLogout}
            className="hidden sm:inline-flex bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow"
          >
            Se déconnecter
          </button>

          {/* Bouton Menu Burger Silicon Valley style */}
          <button 
            onClick={() => setMenuOuvert(!menuOuvert)}
            className="sm:hidden bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 shadow-sm transition-all"
          >
            <span className="text-sm">{menuOuvert ? '✕' : '☰'}</span>
            <span>{menuOuvert ? 'Fermer' : 'Menu'}</span>
          </button>
        </div>

      </div>

      {/* Tiroir de menu mobile (Effet application native fluide) */}
      {menuOuvert && (
        <div className="sm:hidden bg-slate-900 border-t border-slate-800 px-4 py-4 flex flex-col gap-3 shadow-2xl animate-fadeIn">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            Navigation & Options
          </div>
          
          <button 
            onClick={() => { setMenuOuvert(false); onLogout(); }}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-xs font-semibold text-center shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>🚪</span> Se déconnecter
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
