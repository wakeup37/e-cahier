import React from 'react';

const Header = ({ title = "E-cahier !", roleName = "Espace Enseignant", onLogout }) => {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Ligne du haut sur mobile : Logo et Bouton Déconnexion */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-2 truncate">
            <span className="text-lg font-bold tracking-wide text-blue-400">
              {title}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs sm:text-sm font-medium text-slate-300 truncate max-w-[180px] sm:max-w-none">
              {roleName}
            </span>
          </div>

          {/* Bouton de déconnexion mobile */}
          <button 
            onClick={onLogout}
            className="sm:hidden bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium shrink-0"
          >
            Quitter
          </button>
        </div>

        {/* Bouton de déconnexion version PC */}
        <div className="hidden sm:block">
          <button 
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow"
          >
            Se déconnecter
          </button>
        </div>

      </div>
    </header>
  );
};

export default Header;
