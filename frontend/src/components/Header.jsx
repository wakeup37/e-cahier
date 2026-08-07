import React, { useState } from 'react';

const Header = ({ title = "E-cahier !", roleName = "Espace Enseignant", onLogout, onglets = [], activeTab, setActiveTab }) => {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <header className="bg-slate-900 text-white shadow-xl border-b border-slate-800 w-full relative z-50">
      <div className="w-full px-4 py-3 flex items-center justify-between">
        
        {/* Logo & Rôle épuré */}
        <div className="flex items-center gap-2 truncate">
          <span className="text-base sm:text-lg font-bold tracking-wide text-blue-400">
            {title}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-xs sm:text-sm font-medium text-slate-300 truncate max-w-[150px] sm:max-w-none">
            {roleName}
          </span>
        </div>

        {/* Actions Desktop & Bouton Menu Burger Mobile */}
        <div className="flex items-center gap-2">
          
          {/* Bouton de déconnexion PC */}
          <button 
            onClick={onLogout}
            className="hidden sm:inline-flex bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow"
          >
            Se déconnecter
          </button>

          {/* Bouton Menu Burger Mobile */}
          <button 
            onClick={() => setMenuOuvert(!menuOuvert)}
            className="sm:hidden bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 shadow-sm transition-all"
          >
            <span className="text-sm">{menuOuvert ? '✕' : '☰'}</span>
            <span>{menuOuvert ? 'Fermer' : 'Menu'}</span>
          </button>
        </div>

      </div>

      {/* Menu Tiroir Mobile (Rrange tous les onglets et la déconnexion pour libérer l'espace) */}
      {menuOuvert && (
        <div className="sm:hidden bg-slate-900 border-t border-slate-800 px-4 py-4 flex flex-col gap-2 shadow-2xl animate-fadeIn">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Navigation du Menu
          </div>

          {onglets.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
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

          <div className="border-t border-slate-800 my-2 pt-2">
            <button 
              onClick={() => { setMenuOuvert(false); onLogout(); }}
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

export default Header;
