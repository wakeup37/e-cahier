import React, { useState } from 'react';
import { useApp } from '../context/AppContext'; // On importe le pont

export default function CahierDetexteForm() {
  const { ajouterFiche } = useApp(); // On récupère la fonction pour ajouter une fiche

  // Des états locaux pour retenir ce que l'utilisateur tape dans le formulaire
  const [titreLecon, setTitreLecon] = useState('');
  const [matiere, setMatiere] = useState('');
  const [classe, setClasse] = useState('');

  // Ce qui se passe quand on clique sur le bouton de soumission
  const handleSubmit = (e) => {
    e.preventDefault();

    // On crée la nouvelle fiche avec ce qui a été tapé
    const nouvelleFiche = {
      nom: 'M. Enseignant', // Vous pourrez l'adapter dynamiquement plus tard
      matiere: matiere,
      classe: classe,
      titreLecon: titreLecon,
    };

    // On l'envoie dans le système global
    ajouterFiche(nouvelleFiche);

    alert('Fiche transmise au censeur avec succès !');
    
    // On vide les champs du formulaire après l'envoi
    setTitreLecon('');
    setMatiere('');
    setClasse('');
  };

  return (
    <form onSubmit={handleSubmit} className="cahier-form">
      <h3>Remplir le cahier de texte</h3>
      
      <div>
        <label>Matière :</label>
        <input 
          type="text" 
          value={matiere} 
          onChange={(e) => setMatiere(e.target.value)} 
          placeholder="Ex: Mathématiques"
        />
      </div>

      <div>
        <label>Classe :</label>
        <input 
          type="text" 
          value={classe} 
          onChange={(e) => setClasse(e.target.value)} 
          placeholder="Ex: 3ème A"
        />
      </div>

      <div>
        <label>Titre de la leçon :</label>
        <input 
          type="text" 
          value={titreLecon} 
          onChange={(e) => setTitreLecon(e.target.value)} 
          placeholder="Ex: Théorème de Thalès"
        />
      </div>

      <button type="submit">Soumettre au Censeur</button>
    </form>
  );
}
