import React, { useState, useEffect } from 'react';
import API from '../api.js';
import Application from './Application';
import EnseignantDashboard from './components/EnseignantDashboard';
import CenseurDashboard from './components/CenseurDashboard';
import ChefEtablissementDashboard from './components/ChefEtablissementDashboard';

export default function AppRouter() {
  // Gère le rôle de l'utilisateur connecté ('', 'enseignant', 'censeur', 'chef')
  const [userRole, setUserRole] = useState(''); 

  // --- ÉTATS POUR L'ÉCRAN INTERMÉDIAIRE DU CHEF D'ÉTABLISSEMENT ---
  const [etapeChefEcole, setEtapeChefEcole] = useState(false);
  const [choixModeEcole, setChoixModeEcole] = useState('choix'); // 'choix', 'creer', 'rejoindre'
  const [nomEcoleSaisi, setNomEcoleSaisi] = useState('');
  const [notification, setNotification] = useState('');

  // --- ÉTATS GLOBAUX DE L'APPLICATION ---
  const [demandesAffiliation, setDemandesAffiliation] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_demandes_affiliation')) || []; } catch { return []; }
  });
  const [seances, setSeances] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_seances_enseignants')) || []; } catch { return []; }
  });
  const [bibliotheque, setBibliotheque] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_bibliotheque_fiches')) || []; } catch { return []; }
  });
  const [enseignantsSansFiche] = useState([
    { id: 201, enseignantNom: 'M. Yao Koffi', matiere: 'Histoire-Géographie', niveau: '2nde', classe: '2nde A', email: 'koffi.yao@prof.edu', derniereFiche: '2026-02-18' }
  ]);

  // --- CHARGEMENT INITIAL DEPUIS LE BACKEND ---
  useEffect(() => {
    const chargerDonneesBackend = async () => {
      try {
        const [resSeances, resBiblio, resDemandes] = await Promise.all([
          API.get('/seances').catch(() => ({ data: [] })),
          API.get('/bibliotheque').catch(() => ({ data: [] })),
          API.get('/demandes').catch(() => ({ data: [] }))
        ]);

        if (resSeances.data && resSeances.data.length > 0) setSeances(resSeances.data);
        if (resBiblio.data && resBiblio.data.length > 0) setBibliotheque(resBiblio.data);
        if (resDemandes.data && resDemandes.data.length > 0) setDemandesAffiliation(resDemandes.data);
      } catch (err) {
        console.warn("Mode hors-ligne ou routes backend non encore initialisées, utilisation du cache local.", err);
      }
    };

    chargerDonneesBackend();
  }, []);

  useEffect(() => { localStorage.setItem('app_demandes_affiliation', JSON.stringify(demandesAffiliation)); }, [demandesAffiliation]);
  useEffect(() => { localStorage.setItem('app_seances_enseignants', JSON.stringify(seances)); }, [seances]);
  useEffect(() => { localStorage.setItem('app_bibliotheque_fiches', JSON.stringify(bibliotheque)); }, [bibliotheque]);

  const afficherNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  // --- INTERCEPTION DE LA CONNEXION ---
  const handleLoginRouter = (role) => {
    if (role === 'chef') {
      // Si c'est un chef, on déclenche l'étape intermédiaire de l'école
      setEtapeChefEcole(true);
    } else {
      setUserRole(role);
    }
  };

  // Validation de l'école par le Chef
  const validerEcoleChef = (action) => {
    if (!nomEcoleSaisi.trim()) {
      afficherNotification("⚠️ Veuillez entrer le nom de l'établissement.");
      return;
    }
    const configEcole = {
      nomEcole: nomEcoleSaisi.trim(),
      anneeScolaire: '2025-2026',
      anneeOuverte: true
    };
    localStorage.setItem('app_chef_ecole_config', JSON.stringify(configEcole));
    setEtapeChefEcole(false);
    afficherNotification(action === 'creer' ? "🏫 Établissement créé avec succès !" : "🔗 Connexion à l'établissement réussie !");
    setUserRole('chef');
  };

  // --- LE ROUTAGE (Le choix de l'écran à afficher) ---

  // 0. Si le chef d'établissement vient de se connecter, on affiche l'écran de choix d'école
  if (etapeChefEcole) {
    return (
      <div style={styles.ecranAuth}>
        {notification && <div style={styles.conteneurNotification}>{notification}</div>}
        <div style={styles.carteAuth} className="anim-apparition">
          <span style={{ fontSize: '36px' }}>🏫</span>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '10px 0 6px 0' }}>Espace Chef d'Établissement</h2>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Veuillez vous connecter à un ancien établissement ou créer un nouvel établissement.</p>

          {choixModeEcole === 'choix' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button type="button" style={styles.boutonPrincipal} onClick={() => setChoixModeEcole('creer')}>
                ➕ Créer un nouvel établissement
              </button>
              <button type="button" style={styles.boutonInscription} onClick={() => setChoixModeEcole('rejoindre')}>
                🔗 Se connecter à un ancien établissement
              </button>
            </div>
          )}

          {choixModeEcole === 'creer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div>
                <label style={styles.libelle}>Nom du nouvel établissement</label>
                <input type="text" placeholder="Ex: Lycée Moderne..." value={nomEcoleSaisi} onChange={e => setNomEcoleSaisi(e.target.value)} style={styles.champSaisie} required />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', flex: 1 }} onClick={() => setChoixModeEcole('choix')}>Retour</button>
                <button type="button" style={{ ...styles.boutonPrincipal, flex: 2 }} onClick={() => validerEcoleChef('creer')}>Valider la création</button>
              </div>
            </div>
          )}

          {choixModeEcole === 'rejoindre' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div>
                <label style={styles.libelle}>Nom de l'ancien établissement existant</label>
                <input type="text" placeholder="Entrez le nom exact..." value={nomEcoleSaisi} onChange={e => setNomEcoleSaisi(e.target.value)} style={styles.champSaisie} required />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', flex: 1 }} onClick={() => setChoixModeEcole('choix')}>Retour</button>
                <button type="button" style={{ ...styles.boutonInscription, flex: 2 }} onClick={() => validerEcoleChef('rejoindre')}>Se connecter à l'école</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // 1. Si personne n'est connecté, on affiche la page de Connexion (Application.jsx)
  if (!userRole) {
    return <Application onLogin={handleLoginRouter} />;
  }

  // 2. Si l'utilisateur est connecté, on affiche son tableau de bord
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {notification && <div style={styles.conteneurNotification}>{notification}</div>}
      <div style={styles.barreNavigation}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📖</span>
          <span style={{ fontWeight: '800' }}>E-cahier !</span>
        </div>
        <button style={styles.boutonDeconnexion} onClick={() => { setUserRole(''); setEtapeChefEcole(false); setChoixModeEcole('choix'); setNomEcoleSaisi(''); }}>Se déconnecter</button>
      </div>

      {userRole === 'enseignant' && (
        <EnseignantDashboard demandesAffiliation={demandesAffiliation} setDemandesAffiliation={setDemandesAffiliation} seances={seances} setSeances={setSeances} />
      )}
      
      {userRole === 'censeur' && (
        <CenseurDashboard demandesAffiliation={demandesAffiliation} setDemandesAffiliation={setDemandesAffiliation} seances={seances} setSeances={setSeances} bibliotheque={bibliotheque} setBibliotheque={setBibliotheque} enseignantsSansFiche={enseignantsSansFiche} />
      )}
      
      {userRole === 'chef' && (
        <ChefEtablissementDashboard demandesAffiliation={demandesAffiliation} seances={seances} bibliotheque={bibliotheque} enseignantsSansFiche={enseignantsSansFiche} />
      )}
    </div>
  );
}

const styles = {
  barreNavigation: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', color: '#ffffff', padding: '14px 30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  boutonDeconnexion: { background: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  ecranAuth: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '30px 20px', backgroundColor: '#f8fafc' },
  carteAuth: { background: '#ffffff', padding: '36px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)', border: '1px solid #e2e8f0', width: '100%', maxWidth: '500px', textAlign: 'center' },
  boutonPrincipal: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', width: '100%' },
  boutonInscription: { backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', width: '100%' },
  champSaisie: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#f8fafc', outline: 'none', marginTop: '4px' },
  libelle: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
  conteneurNotification: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, backgroundColor: '#1e293b', color: '#f8fafc', padding: '14px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }
};
