import React, { useState } from 'react';

const Header = ({ title = "E-cahier !", roleName = "Espace Utilisateur", onLogout }) => {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 w-full relative z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* Partie gauche : Logo & Rôle */}
        <div className="flex items-center gap-2 truncate">
          <span className="text-base sm:text-lg font-bold tracking-wide text-blue-400">
            {title}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-xs sm:text-sm font-medium text-slate-300 truncate max-w-[150px] sm:max-w-none">
            {roleName}
          </span>
        </div>

        {/* Partie droite : Actions Desktop & Bouton Menu Mobile */}
        <div className="flex items-center gap-2">
          
          {/* Bouton de déconnexion version PC */}
          <button 
            onClick={onLogout}
            className="hidden sm:inline-flex bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow"
          >
            Se déconnecter
          </button>

          {/* Bouton Menu Burger pour Mobile (pour alléger l'en-tête) */}
          <button 
            onClick={() => setMenuOuvert(!menuOuvert)}
            className="sm:hidden bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700"
          >
            <span>{menuOuvert ? '✕ Fermer' : '☰ Menu'}</span>
          </button>
        </div>

      </div>

      {/* Menu déroulant mobile si activé pour aérer l'interface */}
      {menuOuvert && (
        <div className="sm:hidden bg-slate-800 border-t border-slate-700 px-4 py-3 flex flex-col gap-2 shadow-xl">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Actions rapides</div>
          <button 
            onClick={() => { setMenuOuvert(false); onLogout(); }}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-xs font-medium text-center shadow"
          >
            Se déconnecter
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
