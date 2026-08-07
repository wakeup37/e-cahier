import React from 'react';

const Header = ({ title = "E-cahier !", roleName = "Espace Enseignant", onLogout }) => {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Partie gauche : Logo / Nom de l'app et Rôle */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-wide text-blue-400">
              {title}
            </span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="text-sm md:text-base font-medium text-slate-300">
              {roleName}
            </span>
          </div>

          {/* Bouton déconnexion visible uniquement sur mobile dans la barre du haut */}
          <button 
            onClick={onLogout}
            className="md:hidden bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            Se déconnecter
          </button>
        </div>

        {/* Partie droite : Bouton déconnexion pour version PC (masqué sur mobile) */}
        <div className="hidden md:block">
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
