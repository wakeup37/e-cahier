import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCcw, 
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function CyclesDashboard() {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'EN_COURS', 'TERMINE'

  const fetchCycles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:5001/api/cahiers/cycles');
      setCycles(response.data);
    } catch (err) {
      console.error("Erreur API :", err);
      setError("Impossible de joindre le serveur. Vérifie que ton backend tourne.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  const handleCloturer = async (id) => {
    try {
      await axios.put(`http://localhost:5001/api/cahiers/cycles/${id}/terminer`);
      // Mise à jour optimiste de l'UI
      setCycles(cycles.map(c => c.id === id ? { ...c, statut: 'Terminé' } : c));
    } catch (err) {
      console.error("Erreur lors de la clôture :", err);
    }
  };

  const filteredCycles = cycles.filter(cycle => {
    if (filter === 'EN_COURS') return cycle.statut !== 'Terminé';
    if (filter === 'TERMINE') return cycle.statut === 'Terminé';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm mb-1">
              <Sparkles size={16} />
              <span>E-Cahier de Texte • Premium Workspace</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Gestion des Cycles</h1>
          </div>
          <button 
            onClick={() => alert("Ouverture du modal de création...")}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition-all duration-200 active:scale-95"
          >
            <Plus size={18} />
            <span>Nouveau Cycle</span>
          </button>
        </div>

        {/* Filtres & Stats Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            {['ALL', 'EN_COURS', 'TERMINE'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === tab 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {tab === 'ALL' ? 'Tous les cycles' : tab === 'EN_COURS' ? 'En cours' : 'Terminés'}
              </button>
            ))}
          </div>
          <div className="text-sm text-slate-400 font-medium">
            Total : <span className="text-white font-bold">{cycles.length}</span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button 
              onClick={fetchCycles}
              className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              <RefreshCcw size={14} />
              <span>Réessayer</span>
            </button>
          </div>
        )}

        {/* Loading State (Skeletons) */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 h-48 animate-pulse space-y-4">
                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                <div className="pt-8 flex justify-between">
                  <div className="h-6 bg-slate-800 rounded w-20"></div>
                  <div className="h-8 bg-slate-800 rounded w-8"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Content Grid */
          filteredCycles.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl space-y-4">
              <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
                <Layers size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white">Aucun cycle trouvé</h3>
                <p className="text-sm text-slate-400">Commence par créer ton premier cycle pédagogique.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCycles.map((cycle) => (
                <div 
                  key={cycle.id} 
                  className="group relative bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <BookOpen size={12} />
                        Niveau {cycle.niveau}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        cycle.statut === 'Terminé' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {cycle.statut === 'Terminé' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {cycle.statut || 'En cours'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {cycle.titre_cycle}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                        Compétence : {cycle.competence}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      Durée : <span className="text-slate-200 font-medium">{cycle.duree}</span>
                    </div>
                    {cycle.statut !== 'Terminé' && (
                      <button
                        onClick={() => handleCloturer(cycle.id)}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                      >
                        <span>Clôturer</span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </div>
  );
}
