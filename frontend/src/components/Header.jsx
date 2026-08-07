import React, { useState } from 'react';

const Header = ({ title = "E-cahier !", roleName = "Espace Utilisateur", onLogout, onglets = [], activeTab, setActiveTab }) => {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <header className="bg-slate-900 text-white shadow-xl border-b border-slate-800 w-full relative z-50">
      <div className="w-full px-4 py-3 flex items-center justify-between">
        
        {/* Partie gauche : Logo & Rôle épuré (Style Facebook/Instagram natif) */}
        <div className="flex items-center gap-2 truncate">
          <span className="text-base sm:text-lg font-bold tracking-wide text-blue-400">
            {title}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate max-w-[180px] sm:max-w-none">
            {roleName}
          </span>
        </div>

        {/* Partie droite : Bouton Menu Burger Silicon Valley (Suppression totale du gros bouton rouge externe) */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMenuOuvert(!menuOuvert)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 shadow-sm transition-all active:scale-95"
          >
            <span className="text-base">{menuOuvert ? '✕' : '☰'}</span>
            <span>{menuOuvert ? 'Fermer' : 'Menu'}</span>
          </button>
        </div>

      </div>

      {/* Menu Tiroir Mobile (Rrange tous les onglets et la déconnexion fonctionnelle) */}
      {menuOuvert && (
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-4 flex flex-col gap-2.5 shadow-2xl animate-fadeIn w-full">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Navigation de l'Espace
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
              className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}

          <div className="border-t border-slate-800 my-2 pt-2">
            <button 
              onClick={() => { setMenuOuvert(false); onLogout(); }}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-xs font-semibold text-center shadow-md transition-all flex items-center justify-center gap-2"
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
