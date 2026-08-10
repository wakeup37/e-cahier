import React, { useState, useEffect } from 'react';
import API from '../api.js';
import Application from '../Application.jsx';
import EnseignantDashboard from './EnseignantDashboard';
import CenseurDashboard from './CenseurDashboard';
import ChefEtablissementDashboard from './ChefEtablissementDashboard';

export default function AppRouter() {
  const [userRole, setUserRole] = useState(''); 
  
  // États pour le Chef d'établissement
  const [etapeChefEcole, setEtapeChefEcole] = useState(false);
  const [choixModeEcole, setChoixModeEcole] = useState('choix');
  const [nomEcoleSaisi, setNomEcoleSaisi] = useState('');
  
  // États pour Enseignant et Censeur (Connexion/Inscription)
  const [etapeAuth, setEtapeAuth] = useState(null); // 'enseignant' ou 'censeur'
  const [modeAuth, setModeAuth] = useState('connexion'); // 'connexion' ou 'inscription'
  const [emailSaisi, setEmailSaisi] = useState('');
  const [mdpSaisi, setMdpSaisi] = useState('');

  const [notification, setNotification] = useState('');

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
        console.warn("Mode hors-ligne", err);
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

  const handleLoginRouter = (role) => {
    if (role === 'chef') {
      setEtapeChefEcole(true);
    } else {
      setEtapeAuth(role); // Ouvre l'écran de connexion pour prof/censeur
      setModeAuth('connexion');
    }
  };

  const validerAuthUtilisateur = (e) => {
    e.preventDefault();
    if (!emailSaisi || !mdpSaisi) {
      afficherNotification("⚠️ Veuillez remplir tous les champs.");
      return;
    }
    afficherNotification(modeAuth === 'inscription' ? "✅ Compte créé avec succès !" : "🔓 Connexion réussie !");
    setUserRole(etapeAuth);
    setEtapeAuth(null);
  };

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

  // 1. ÉCRAN CHEF D'ÉTABLISSEMENT
  if (etapeChefEcole) {
    return (
      <div style={styles.ecranAuth}>
        {notification && <div style={styles.conteneurNotification}>{notification}</div>}
        <div style={styles.carteAuth}>
          <span style={{ fontSize: '36px' }}>🏫</span>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '10px 0 6px 0' }}>Espace Chef d'Établissement</h2>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Veuillez vous connecter à un établissement.</p>

          {choixModeEcole === 'choix' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button type="button" style={styles.boutonPrincipal} onClick={() => setChoixModeEcole('creer')}>➕ Créer un nouvel établissement</button>
              <button type="button" style={styles.boutonInscription} onClick={() => setChoixModeEcole('rejoindre')}>🔗 Se connecter à un ancien établissement</button>
              <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', marginTop: '10px' }} onClick={() => setEtapeChefEcole(false)}>⬅️ Retour</button>
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
                <button type="button" style={{ ...styles.boutonPrincipal, flex: 2 }} onClick={() => validerEcoleChef('creer')}>Valider</button>
              </div>
            </div>
          )}

          {choixModeEcole === 'rejoindre' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div>
                <label style={styles.libelle}>Nom de l'établissement existant</label>
                <input type="text" placeholder="Entrez le nom exact..." value={nomEcoleSaisi} onChange={e => setNomEcoleSaisi(e.target.value)} style={styles.champSaisie} required />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', flex: 1 }} onClick={() => setChoixModeEcole('choix')}>Retour</button>
                <button type="button" style={{ ...styles.boutonInscription, flex: 2 }} onClick={() => validerEcoleChef('rejoindre')}>Se connecter</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. ÉCRAN CONNEXION/INSCRIPTION POUR ENSEIGNANT & CENSEUR
  if (etapeAuth) {
    const roleLabel = etapeAuth === 'enseignant' ? 'Enseignant' : 'Censeur';
    const icone = etapeAuth === 'enseignant' ? '👨‍🏫' : '📋';
    
    return (
      <div style={styles.ecranAuth}>
        {notification && <div style={styles.conteneurNotification}>{notification}</div>}
        <div style={styles.carteAuth}>
          <span style={{ fontSize: '36px' }}>{icone}</span>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '10px 0 6px 0' }}>Espace {roleLabel}</h2>
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', justifyContent: 'center', fontSize: '14px' }}>
              <span onClick={() => setModeAuth('connexion')} style={{ cursor: 'pointer', fontWeight: modeAuth === 'connexion' ? '800' : 'normal', color: modeAuth === 'connexion' ? '#2563eb' : '#94a3b8' }}>Connexion</span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span onClick={() => setModeAuth('inscription')} style={{ cursor: 'pointer', fontWeight: modeAuth === 'inscription' ? '800' : 'normal', color: modeAuth === 'inscription' ? '#16a34a' : '#94a3b8' }}>Inscription</span>
          </div>

          <form onSubmit={validerAuthUtilisateur} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            <div>
              <label style={styles.libelle}>Email</label>
              <input type="email" placeholder="votre@email.com" value={emailSaisi} onChange={e => setEmailSaisi(e.target.value)} style={styles.champSaisie} required />
            </div>
            <div>
              <label style={styles.libelle}>Mot de passe</label>
              <input type="password" placeholder="••••••••" value={mdpSaisi} onChange={e => setMdpSaisi(e.target.value)} style={styles.champSaisie} required />
              
              {/* Le lien "Mot de passe oublié" apparaît uniquement en mode connexion */}
              {modeAuth === 'connexion' && (
                <div style={{ textAlign: 'right', marginTop: '6px' }}>
                  <span 
                    onClick={() => afficherNotification("📩 Un lien de réinitialisation vous a été envoyé.")} 
                    style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Mot de passe oublié ?
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', flex: 1 }} onClick={() => { setEtapeAuth(null); setEmailSaisi(''); setMdpSaisi(''); }}>⬅️ Retour</button>
              <button type="submit" style={{ ...(modeAuth === 'connexion' ? styles.boutonPrincipal : styles.boutonInscription), flex: 2 }}>
                {modeAuth === 'connexion' ? 'Se connecter' : "S'inscrire"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
  // 3. ÉCRAN D'ACCUEIL PRINCIPAL (Choix du profil)
  if (!userRole) {
    return <Application onLogin={handleLoginRouter} />;
  }

  // 4. TABLEAUX DE BORD (Une fois connecté)
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {notification && <div style={styles.conteneurNotification}>{notification}</div>}

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
  boutonDeconnexion: { background: '#ef4444', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  ecranAuth: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '30px 20px', backgroundColor: '#f8fafc' },
  carteAuth: { background: '#ffffff', padding: '36px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)', border: '1px solid #e2e8f0', width: '100%', maxWidth: '450px', textAlign: 'center' },
  boutonPrincipal: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', width: '100%' },
  boutonInscription: { backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', width: '100%' },
  champSaisie: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#f8fafc', outline: 'none', marginTop: '4px' },
  libelle: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
  conteneurNotification: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, backgroundColor: '#1e293b', color: '#f8fafc', padding: '14px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }
};
