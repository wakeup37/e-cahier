import React, { useState } from 'react';
import axios from 'axios';
import { 
  BookOpen, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Sparkles,
  Layers,
  Users
} from 'lucide-react';

export default function CahierTexteForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    enseignant_id: '',
    classe_id: '',
    cycle_id: '',
    date_seance: new Date().toISOString().split('T')[0],
    titre_seance: '',
    contenu: '',
    devoirs: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await axios.post('http://localhost:5001/api/cahiers/textes', formData);
      setSuccess(true);
      setFormData({
        enseignant_id: '',
        classe_id: '',
        cycle_id: '',
        date_seance: new Date().toISOString().split('T')[0],
        titre_seance: '',
        contenu: '',
        devoirs: ''
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du cahier de texte :", err);
      setError("Impossible d'enregistrer la séance. Vérifie les informations saisies et la connexion au serveur.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-xl text-slate-100 font-sans">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm mb-1">
            <Sparkles size={16} />
            <span>E-Cahier de Texte • Espace Enseignant</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Saisie d'une Séance</h2>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <BookOpen size={14} />
          <span>Nouvelle Entrée</span>
        </div>
      </div>

      {/* Feedback Messages */}
      {success && (
        <div className="mb-6 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl animate-fade-in">
          <CheckCircle2 size={20} />
          <span className="text-sm font-medium">La séance a été enregistrée avec succès dans le cahier de texte !</span>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl animate-fade-in">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Form Grid */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ID Enseignant</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Users size={16} />
              </span>
              <input 
                type="text" 
                name="enseignant_id" 
                value={formData.enseignant_id} 
                onChange={handleChange} 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ex: 1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ID Classe</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Layers size={16} />
              </span>
              <input 
                type="text" 
                name="classe_id" 
                value={formData.classe_id} 
                onChange={handleChange} 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ex: 2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ID Cycle (Optionnel)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <BookOpen size={16} />
              </span>
              <input 
                type="text" 
                name="cycle_id" 
                value={formData.cycle_id} 
                onChange={handleChange} 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ex: 4"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Date de la séance</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Calendar size={16} />
              </span>
              <input 
                type="date" 
                name="date_seance" 
                value={formData.date_seance} 
                onChange={handleChange} 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Titre de la séance</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <FileText size={16} />
              </span>
              <input 
                type="text" 
                name="titre_seance" 
                value={formData.titre_seance} 
                onChange={handleChange} 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ex: Introduction aux structures conditionnelles"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Contenu / Déroulé du cours</label>
          <textarea 
            name="contenu" 
            rows="5"
            value={formData.contenu} 
            onChange={handleChange} 
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            placeholder="Détaillez les notions abordées, les exercices et les points clés..."
          ></textarea>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Travail à faire / Devoirs</label>
          <textarea 
            name="devoirs" 
            rows="3"
            value={formData.devoirs} 
            onChange={handleChange} 
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            placeholder="Indiquez les consignes pour la prochaine séance (optionnel)..."
          ></textarea>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Send size={18} />
            <span>{submitting ? 'Enregistrement...' : 'Enregistrer la séance'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
