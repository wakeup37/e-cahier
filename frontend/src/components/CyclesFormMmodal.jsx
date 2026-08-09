import React, { useState } from 'react';
import axios from 'axios';
import { X, PlusCircle } from 'lucide-react';

export default function CycleFormModal({ isOpen, onClose, onCycleCreated }) {
  const [formData, setFormData] = useState({
    enseignant_id: '',
    classe_id: '',
    titre_cycle: '',
    competence: '',
    duree: '',
    niveau: '',
    activite: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:5001/api/cahiers/cycles', formData);
      onCycleCreated(response.data); // Met à jour la liste dans le parent
      onClose(); // Ferme le modal
    } catch (err) {
      console.error("Erreur lors de la création :", err);
      setError("Erreur lors de l'enregistrement. Vérifie les champs.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl relative text-slate-100">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <PlusCircle className="text-indigo-400" size={22} />
            Créer un nouveau cycle
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 p-2 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">ID Enseignant</label>
              <input 
                type="text" 
                name="enseignant_id" 
                value={formData.enseignant_id} 
                onChange={handleChange} 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ex: 1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">ID Classe</label>
              <input 
                type="text" 
                name="classe_id" 
                value={formData.classe_id} 
                onChange={handleChange} 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ex: 2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Titre du cycle</label>
            <input 
              type="text" 
              name="titre_cycle" 
              value={formData.titre_cycle} 
              onChange={handleChange} 
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Ex: Initiation à la programmation"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Compétence visée</label>
            <input 
              type="text" 
              name="competence" 
              value={formData.competence} 
              onChange={handleChange} 
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Ex: Maîtriser les bases logiques"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Durée</label>
              <input 
                type="text" 
                name="duree" 
                value={formData.duree} 
                onChange={handleChange} 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ex: 4 semaines"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Niveau</label>
              <input 
                type="text" 
                name="niveau" 
                value={formData.niveau} 
                onChange={handleChange} 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ex: 6ème"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Activité principale</label>
            <input 
              type="text" 
              name="activite" 
              value={formData.activite} 
              onChange={handleChange} 
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Ex: Exercices pratiques"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {submitting ? 'Création...' : 'Enregistrer le cycle'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
