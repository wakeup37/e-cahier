import React, { useState, useEffect } from 'react';
import EnseignantDashboard from './components/EnseignantDashboard';
import CenseurDashboard from './components/CenseurDashboard';
import ChefEtablissementDashboard from './components/ChefEtablissementDashboard';

export default function Application() {
  const [userRole, setUserRole] = useState(''); 
  const [authContext, setAuthContext] = useState(''); 
  const [notification, setNotification] = useState('');
  const [estEnLigne, setEstEnLigne] = useState(navigator.onLine);

  const [modeAccueil, setModeAccueil] = useState('connexion'); // 'connexion', 'inscription', 'mdp-oublie'

  const [etapeChefEcole, setEtapeChefEcole] = useState(false);
  const [choixModeEcole, setChoixModeEcole] = useState('choix'); 
  
  const [formNouvelleEcole, setFormNouvelleEcole] = useState({
    nomEcole: '', codeMinistere: '', ville: '', commune: '', quartier: '', typeEtablissement: 'Public' 
  });
  const [moyenPaiement, setMoyenPaiement] = useState('wave');
  const [codeOuNomRejoins, setCodeOuNomRejoins] = useState('');

  const [formConnexion, setFormConnexion] = useState({ email: '', motDePasse: '', roleAttendu: 'enseignant' });
  const [emailMdpOublie, setEmailMdpOublie] = useState('');

  const [formInscription, setFormInscription] = useState({
    civilite: 'M.', role: 'enseignant', nom: '', prenoms: '', dateNaissance: '', telephone: '', ville: '',
    anciennete: '1 à 5 ans', matiere: '', secteurEnseignement: 'Public', typeStatutPublic: 'Titulaire', numeroMatricule: '', email: '', motDePasse: '',
    codeAffiliation: ''
  });

  const [menuBurgerOuvert, setMenuBurgerOuvert] = useState(false);
  const [modalProfilOuvert, setModalProfilOuvert] = useState(false);
  const [modalDeconnexionOuvert, setModalDeconnexionOuvert] = useState(false);
  const [modalEcoleOuvert, setModalEcoleOuvert] = useState(false);
  const [modalAffiliationOuvert, setModalAffiliationOuvert] = useState(false);

  const [configEcole, setConfigEcole] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_chef_ecole_config')) || { nomEcole: "Lycée Moderne d'Abidjan" }; }
    catch { return { nomEcole: "Lycée Moderne d'Abidjan" }; }
  });

  const [profilUtilisateur, setProfilUtilisateur] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_profil_utilisateur')) || { civilite: 'M.', nom: 'Kouassi', prenoms: 'Jean', telephone: '+225 01020304', photo: '' }; }
    catch { return { civilite: 'M.', nom: 'Kouassi', prenoms: 'Jean', telephone: '+225 01020304', photo: '' }; }
  });

  useEffect(() => {
    try { localStorage.setItem('app_profil_utilisateur', JSON.stringify(profilUtilisateur)); } catch {}
  }, [profilUtilisateur]);

  useEffect(() => {
    if (configEcole) {
      try { localStorage.setItem('app_chef_ecole_config', JSON.stringify(configEcole)); } catch {}
    }
  }, [configEcole]);

  const [demandesAffiliationEnseignants, setDemandesAffiliationEnseignants] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_demandes_affiliation')) || []; } catch { return []; }
  });
  const [seancesEnseignants, setSeancesEnseignants] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_seances_enseignants')) || []; } catch { return []; }
  });
  const [bibliothequeFiches, setBibliothequeFiches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_bibliotheque_fiches')) || []; } catch { return []; }
  });
  const [enseignantsSansFiche] = useState([
    { id: 201, enseignantNom: 'M. Yao Koffi', matiere: 'Histoire-Géographie', niveau: '2nde', classe: '2nde A', email: 'koffi.yao@prof.edu', derniereFiche: '2026-02-18' }
  ]);

  useEffect(() => {
    const gererEnLigne = () => { setEstEnLigne(true); afficherNotification("Connexion Internet rétablie."); };
    const gererHorsLigne = () => { setEstEnLigne(false); afficherNotification("⚠️ Mode hors ligne activé."); };
    window.addEventListener('online', gererEnLigne);
    window.addEventListener('offline', gererHorsLigne);
    return () => { window.removeEventListener('online', gererEnLigne); window.removeEventListener('offline', gererHorsLigne); };
  }, []);

  useEffect(() => { localStorage.setItem('app_demandes_affiliation', JSON.stringify(demandesAffiliationEnseignants)); }, [demandesAffiliationEnseignants]);
  useEffect(() => { localStorage.setItem('app_seances_enseignants', JSON.stringify(seancesEnseignants)); }, [seancesEnseignants]);
  useEffect(() => { localStorage.setItem('app_bibliotheque_fiches', JSON.stringify(bibliothequeFiches)); }, [bibliothequeFiches]);

  const afficherNotification = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 3000); };

  const handleConnexion = (e) => {
    e.preventDefault();
    if (!formConnexion.email || !formConnexion.motDePasse) {
      afficherNotification("Veuillez remplir vos identifiants."); return;
    }
    localStorage.setItem('app_enseignant_statut', 'actif');
    setAuthContext('connexion'); 
    if (formConnexion.roleAttendu === 'chef') { 
      if (!configEcole) { setEtapeChefEcole(true); return; }
    }
    afficherNotification("Connexion réussie ! Redirection...");
    setTimeout(() => setUserRole(formConnexion.roleAttendu), 200);
  };

  const handleRecuperationMdp = (e) => {
    e.preventDefault();
    if (!emailMdpOublie.trim()) {
      afficherNotification("⚠️ Veuillez entrer votre adresse e-mail."); return;
    }
    afficherNotification("📧 Instructions de réinitialisation envoyées par e-mail.");
    setEmailMdpOublie('');
    setModeAccueil('connexion');
  };

  const handleInscription = (e) => {
    e.preventDefault();
    if (!formInscription.nom || !formInscription.email || !formInscription.motDePasse) {
      afficherNotification("Veuillez renseigner tous les champs obligatoires."); return;
    }
    if (formInscription.secteurEnseignement === 'Public' && formInscription.typeStatutPublic === 'Titulaire' && !formInscription.numeroMatricule.trim()) {
      afficherNotification("❌ Veuillez renseigner votre numéro matricule."); return;
    }
    localStorage.setItem('app_enseignant_statut', 'nouveau');
    setAuthContext('inscription');
    setProfilUtilisateur(prev => ({ ...prev, nom: formInscription.nom, prenoms: formInscription.prenoms, civilite: formInscription.civilite, telephone: formInscription.telephone }));
    
    if (formInscription.codeAffiliation.trim()) {
      const nouvelleDemande = {
        id: Date.now(),
        enseignantNom: `${formInscription.civilite} ${formInscription.prenoms} ${formInscription.nom}`,
        matiere: formInscription.matiere || 'Non spécifiée',
        etablissementCible: formInscription.codeAffiliation.trim(),
        statut: 'En attente'
      };
      setDemandesAffiliationEnseignants(prev => [nouvelleDemande, ...prev]);
    }

    if (formInscription.role === 'chef') { 
      if (!configEcole) { setEtapeChefEcole(true); return; }
    }
    afficherNotification("Compte créé avec succès !");
    setTimeout(() => setUserRole(formInscription.role), 200);
  };

  const preparerPaiementCodeEcole = (e) => {
    e.preventDefault();
    if (!formNouvelleEcole.nomEcole.trim() || !formNouvelleEcole.codeMinistere.trim() || !formNouvelleEcole.ville.trim() || !formNouvelleEcole.commune.trim()) {
      afficherNotification("⚠️ Veuillez remplir tous les champs obligatoires."); return;
    }
    setChoixModeEcole('paiement');
  };

  const validerPaiementEtFinaliserEcole = () => {
    const montant = formNouvelleEcole.typeEtablissement === 'Privé' ? '50 000 FCFA' : '30 000 FCFA';
    const nouvelleConfig = {
      nomEcole: formNouvelleEcole.nomEcole.trim(), 
      codeEtablissement: formNouvelleEcole.codeMinistere.trim().toUpperCase(),
      ville: formNouvelleEcole.ville.trim(), 
      commune: formNouvelleEcole.commune.trim(), 
      quartier: formNouvelleEcole.quartier.trim(),
      typeEtablissement: formNouvelleEcole.typeEtablissement, 
      anneeScolaire: '2025-2026', 
      anneeOuverte: true
    };
    setConfigEcole(nouvelleConfig);
    setEtapeChefEcole(false);
    afficherNotification(`💳 Établissement enregistré (${montant}) !`);
    setUserRole('chef');
  };

  const validerConnexionEcoleExistante = (e) => {
    e.preventDefault();
    if (!codeOuNomRejoins.trim()) { afficherNotification("⚠️ Veuillez entrer le code officiel ou le nom."); return; }
    const nouvelleConfig = {
      nomEcole: codeOuNomRejoins.trim(), 
      codeEtablissement: codeOuNomRejoins.trim().toUpperCase(),
      ville: 'Abidjan', 
      commune: 'Standard', 
      quartier: '', 
      typeEtablissement: 'Public', 
      anneeScolaire: '2025-2026', 
      anneeOuverte: true
    };
    setConfigEcole(nouvelleConfig);
    setEtapeChefEcole(false);
    afficherNotification("🔗 Connexion à l'établissement réussie !");
    setUserRole('chef');
  };

  const handleDemandeAffiliationRapide = (e) => {
    e.preventDefault();
    const code = e.target.elements.codeEtablissement.value.trim();
    if (!code) { afficherNotification("⚠️ Veuillez entrer un code valide."); return; }
    
    const nouvelleDemande = {
      id: Date.now(),
      enseignantNom: `${profilUtilisateur.civilite} ${profilUtilisateur.prenoms} ${profilUtilisateur.nom}`,
      matiere: 'Enseignant',
      etablissementCible: code,
      statut: 'En attente'
    };
    setDemandesAffiliationEnseignants(prev => [nouvelleDemande, ...prev]);
    setModalAffiliationOuvert(false);
    afficherNotification("📨 Demande d'affiliation transmise à la direction.");
  };

  const handleReinitialiserEtablissement = () => {
    if (window.confirm("⚠️ ATTENTION : Voulez-vous vraiment réinitialiser toutes les données de l'établissement ?")) {
      localStorage.removeItem('app_chef_ecole_config');
      setConfigEcole(null);
      setModalEcoleOuvert(false);
      setUserRole('');
      setEtapeChefEcole(true);
      afficherNotification("🔄 Établissement réinitialisé.");
    }
  };

  const handleLogout = () => {
    setUserRole(''); 
    setAuthContext(''); 
    setEtapeChefEcole(false); 
    setChoixModeEcole('choix');
    setFormNouvelleEcole({ nomEcole: '', codeMinistere: '', ville: '', commune: '', quartier: '', typeEtablissement: 'Public' });
    setCodeOuNomRejoins(''); 
    localStorage.removeItem('app_enseignant_statut');
    setFormConnexion({ email: '', motDePasse: '', roleAttendu: 'enseignant' });
    setMenuBurgerOuvert(false);
    setModalProfilOuvert(false);
    setModalDeconnexionOuvert(false);
    afficherNotification("🚪 Déconnexion réussie.");
  };

  const handleChangerPhotoProfil = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilUtilisateur(prev => ({ ...prev, photo: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div style={styles.conteneurGlobal}>
      <style>{`
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; }
        body { margin: 0; background-color: #f8fafc; -webkit-font-smoothing: antialiased; }
        
        /* Ultra-fluidité style Meta / Instagram : Accélération GPU native */
        * { -webkit-overflow-scrolling: touch; transform: translateZ(0); will-change: auto; backface-visibility: hidden; }
        
        .anim-apparition { animation: apparition 0.15s ease-out forwards; }
        @keyframes apparition { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
        
        .bouton-principal { background-color: #0b1329; color: #ffffff; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: opacity 0.1s ease; width: 100%; }
        .bouton-principal:hover { opacity: 0.9; }
        
        .bouton-danger { background-color: #ef4444; color: #ffffff; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: opacity 0.1s ease; width: 100%; }
        .bouton-danger:hover { opacity: 0.9; }

        .bouton-secondaire { background-color: transparent; color: #475569; border: 1px solid #cbd5e1; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.1s ease; }
        .bouton-secondaire:hover { background-color: #f1f5f9; color: #0f172a; }

        .champ-saisie { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 14px; background-color: #f8fafc; color: #0f172a; outline: none; }
        .champ-saisie:focus { border-color: #0b1329; background-color: #ffffff; box-shadow: 0 0 0 3px rgba(11, 19, 41, 0.1); }
        
        .carte-auth { background: #ffffff; padding: 32px; border-radius: 20px; border: 1px solid #e2e8f0; width: 100%; max-width: 440px; margin: 0 auto; color: #0f172a; box-shadow: 0 15px 35px rgba(0,0,0,0.04); }
        .libelle { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        
        .onglet-conteneur { display: flex; background-color: #f1f5f9; border-radius: 10px; padding: 4px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
        .onglet-btn { flex: 1; padding: 10px; font-size: 14px; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; background: transparent; color: #64748b; }
        .onglet-btn.actif { background: #ffffff; color: #0b1329; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }

        .option-paiement { display: flex; align-items: center; gap: 14px; padding: 14px; border: 1px solid #cbd5e1; border-radius: 10px; cursor: pointer; background: #ffffff; margin-bottom: 10px; }
        .option-paiement.selectionne { border-color: #0b1329; background: #f8fafc; box-shadow: 0 0 0 2px rgba(11, 19, 41, 0.1); }

        .nav-header { display: flex; justify-content: space-between; align-items: center; background: #0b1329; padding: 12px 24px; border-bottom: 1px solid #17244a; position: sticky; top: 0; z-index: 50; }
        .nav-logo-container { display: flex; align-items: center; gap: 12px; }
        .nav-title { font-weight: 800; font-size: 17px; color: #ffffff; letter-spacing: -0.3px; }
        .nav-ecole-badge { font-weight: 500; color: #94a3b8; font-size: 12px; border-left: 1px solid #334155; padding-left: 12px; display: flex; align-items: center; gap: 6px; }

        .avatar-container { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 4px 10px; border-radius: 10px; transition: background 0.1s ease; border: 1px solid transparent; }
        .avatar-container:hover { background: rgba(255, 255, 255, 0.08); }
        .avatar-cercle { width: 36px; height: 36px; border-radius: 50%; background: #ffffff; color: #0b1329; display: flex; align-items: center; justify-content: center; font-weight: 700; overflow: hidden; }
        
        .menu-burger-btn { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); font-size: 18px; cursor: pointer; padding: 8px 12px; border-radius: 10px; color: #ffffff; }
        .menu-burger-btn:hover { background: rgba(255, 255, 255, 0.15); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(11, 19, 41, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 16px; }
        .modal-card { background: #ffffff; width: 100%; max-width: 440px; padding: 30px; border-radius: 20px; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 25px 50px rgba(0,0,0,0.15); }

        .drawer-overlay { position: fixed; inset: 0; background: rgba(11, 19, 41, 0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; justify-content: flex-end; }
        .drawer-content { width: 100%; max-width: 320px; background: #ffffff; height: 100%; padding: 24px; display: flex; flex-direction: column; border-left: 1px solid #e2e8f0; color: #0f172a; box-shadow: -15px 0 30px rgba(0,0,0,0.1); }
      `}</style>

      {!estEnLigne && <div style={styles.bandeauHorsLigne}>⚠️ Mode hors ligne actif. Sauvegarde locale activée.</div>}
      {notification && <div style={styles.conteneurNotification}><div style={styles.texteNotification}>{notification}</div></div>}

      {/* --- POP-UP DE CONFIRMATION DE DÉCONNEXION (UNIQUE) --- */}
      {modalDeconnexionOuvert && (
        <div className="modal-overlay anim-apparition">
          <div className="modal-card" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>🚪</span>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800' }}>Confirmation de déconnexion</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Êtes-vous sûr de vouloir vous déconnecter de votre session ?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setModalDeconnexionOuvert(false)} className="bouton-secondaire" style={{ flex: 1 }}>Annuler</button>
              <button onClick={handleLogout} className="bouton-danger" style={{ flex: 1 }}>Oui, me déconnecter</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE DEMANDE D'AFFILIATION RAPIDE --- */}
      {modalAffiliationOuvert && (
        <div className="modal-overlay anim-apparition">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>🔗 Demande d'affiliation</h3>
              <button onClick={() => setModalAffiliationOuvert(false)} className="bouton-secondaire" style={{ padding: '4px 10px', fontSize: '12px' }}>✕</button>
            </div>
            <form onSubmit={handleDemandeAffiliationRapide} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="libelle">Code officiel ou nom de l'établissement cible</label>
                <input type="text" name="codeEtablissement" placeholder="Ex: LYC-MOD-01" className="champ-saisie" required />
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Votre demande sera transmise au Censeur ou au Chef d'établissement pour validation.</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalAffiliationOuvert(false)} className="bouton-secondaire" style={{ flex: 1 }}>Annuler</button>
                <button type="submit" className="bouton-principal" style={{ flex: 2 }}>Envoyer la demande</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE GESTION DE L'ÉTABLISSEMENT --- */}
      {modalEcoleOuvert && configEcole && (
        <div className="modal-overlay anim-apparition">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>🏫 Gestion de l'Établissement</h3>
              <button onClick={() => setModalEcoleOuvert(false)} className="bouton-secondaire" style={{ padding: '4px 10px', fontSize: '12px' }}>✕</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              setModalEcoleOuvert(false);
              afficherNotification("✅ Paramètres de l'établissement mis à jour.");
            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="libelle">Nom de l'établissement</label>
                <input type="text" value={configEcole.nomEcole} onChange={e => setConfigEcole({...configEcole, nomEcole: e.target.value})} className="champ-saisie" required />
              </div>
              <div>
                <label className="libelle">Code Officiel (Ministère)</label>
                <input type="text" value={configEcole.codeEtablissement || ''} onChange={e => setConfigEcole({...configEcole, codeEtablissement: e.target.value})} className="champ-saisie" required />
              </div>
              <div className="form-grid">
                <div>
                  <label className="libelle">Ville</label>
                  <input type="text" value={configEcole.ville || ''} onChange={e => setConfigEcole({...configEcole, ville: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label className="libelle">Commune</label>
                  <input type="text" value={configEcole.commune || ''} onChange={e => setConfigEcole({...configEcole, commune: e.target.value})} className="champ-saisie" required />
                </div>
              </div>
              <div>
                <label className="libelle">Type d'établissement</label>
                <select value={configEcole.typeEtablissement || 'Public'} onChange={e => setConfigEcole({...configEcole, typeEtablissement: e.target.value})} className="champ-saisie">
                  <option value="Public">Public</option>
                  <option value="Privé">Privé</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalEcoleOuvert(false)} className="bouton-secondaire" style={{ flex: 1 }}>Fermer</button>
                <button type="submit" className="bouton-principal" style={{ flex: 2 }}>Enregistrer</button>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '12px', paddingTop: '12px' }}>
                <button type="button" onClick={handleReinitialiserEtablissement} className="bouton-danger" style={{ fontSize: '13px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                  ⚠️ Réinitialiser complètement l'école (Remise à zéro)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE PROFIL --- */}
      {modalProfilOuvert && (
        <div className="modal-overlay anim-apparition">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Mon Profil</h3>
              <button onClick={() => setModalProfilOuvert(false)} className="bouton-secondaire" style={{ padding: '4px 10px', fontSize: '12px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div className="avatar-cercle" style={{ width: '48px', height: '48px', fontSize: '18px', background: '#0b1329', color: '#ffffff' }}>
                  {profilUtilisateur.photo ? <img src={profilUtilisateur.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : `${profilUtilisateur.nom?.[0] || 'U'}`}
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#0b1329', cursor: 'pointer', display: 'inline-block', textDecoration: 'underline' }}>
                    Changer la photo
                    <input type="file" accept="image/*" onChange={handleChangerPhotoProfil} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div className="form-grid">
                <div>
                  <label className="libelle">Civilité</label>
                  <select value={profilUtilisateur.civilite} onChange={e => setProfilUtilisateur({...profilUtilisateur, civilite: e.target.value})} className="champ-saisie">
                    <option value="M.">M.</option><option value="Mme">Mme</option><option value="Dr">Dr</option><option value="Pr">Pr</option>
                  </select>
                </div>
                <div>
                  <label className="libelle">Nom</label>
                  <input type="text" value={profilUtilisateur.nom} onChange={e => setProfilUtilisateur({...profilUtilisateur, nom: e.target.value})} className="champ-saisie" />
                </div>
              </div>

              <div>
                <label className="libelle">Prénoms</label>
                <input type="text" value={profilUtilisateur.prenoms} onChange={e => setProfilUtilisateur({...profilUtilisateur, prenoms: e.target.value})} className="champ-saisie" />
              </div>

              <div>
                <label className="libelle">Téléphone</label>
                <input type="text" value={profilUtilisateur.telephone} onChange={e => setProfilUtilisateur({...profilUtilisateur, telephone: e.target.value})} className="champ-saisie" />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setModalProfilOuvert(false)} className="bouton-secondaire" style={{ flex: 1 }}>Fermer</button>
                <button onClick={() => { setModalProfilOuvert(false); afficherNotification("✅ Profil mis à jour."); }} className="bouton-principal" style={{ flex: 2 }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MENU BURGER DRAWER (UNIQUE ET ÉPURÉ) --- */}
      {menuBurgerOuvert && (
        <div className="drawer-overlay anim-apparition" onClick={() => setMenuBurgerOuvert(false)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontWeight: '800', fontSize: '16px', color: '#0b1329' }}>Menu E-cahier</span>
              <button onClick={() => setMenuBurgerOuvert(false)} className="menu-burger-btn" style={{ background: '#f1f5f9', color: '#0b1329', border: '1px solid #cbd5e1' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#64748b' }}>Connecté en tant que</p>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: '#0b1329' }}>{profilUtilisateur.civilite} {profilUtilisateur.prenoms} {profilUtilisateur.nom}</p>
              </div>

              <button onClick={() => { setMenuBurgerOuvert(false); setModalProfilOuvert(true); }} style={styles.menuItem}>
                👤 Gérer mon profil
              </button>

              <button onClick={() => { setMenuBurgerOuvert(false); setModalAffiliationOuvert(true); }} style={styles.menuItem}>
                🔗 Demande d'affiliation à une école
              </button>

              {userRole === 'chef' && (
                <button onClick={() => { setMenuBurgerOuvert(false); setModalEcoleOuvert(true); }} style={styles.menuItem}>
                  🏫 Gérer l'Établissement (Réglages & Reset)
                </button>
              )}

              <button onClick={() => { setMenuBurgerOuvert(false); afficherNotification("📚 Guide d'utilisation : Fiches et pointages sécurisés."); }} style={styles.menuItem}>
                📖 Guide d'utilisation
              </button>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button type="button" onClick={() => { setMenuBurgerOuvert(false); setModalDeconnexionOuvert(true); }} style={styles.boutonDeconnexionBurger}>
                🚪 Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ÉCRAN INTERMÉDIAIRE CHEF --- */}
      {etapeChefEcole && (
        <div style={styles.ecranAuth} className="anim-apparition">
          <div className="carte-auth" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>🏫</span>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px 0' }}>Espace Direction</h2>
            <p style={{ color: '#475569', fontSize: '13px', marginBottom: '20px' }}>Authentifiez votre établissement.</p>

            {choixModeEcole === 'choix' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button type="button" className="bouton-principal" onClick={() => setChoixModeEcole('creer')}>➕ Enregistrer un établissement (Payant)</button>
                <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('rejoindre')}>🔗 Se connecter avec le code officiel</button>
              </div>
            )}

            {choixModeEcole === 'creer' && (
              <form onSubmit={preparerPaiementCodeEcole} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                <div>
                  <label className="libelle">Type d'établissement</label>
                  <select value={formNouvelleEcole.typeEtablissement} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, typeEtablissement: e.target.value})} className="champ-saisie">
                    <option value="Public">Public (30 000 FCFA)</option>
                    <option value="Privé">Privé (50 000 FCFA)</option>
                  </select>
                </div>
                <div>
                  <label className="libelle">Nom de l'école</label>
                  <input type="text" placeholder="Ex: Lycée Moderne..." value={formNouvelleEcole.nomEcole} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, nomEcole: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label className="libelle">Code officiel (Ministère)</label>
                  <input type="text" placeholder="Ex: Code officiel..." value={formNouvelleEcole.codeMinistere} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, codeMinistere: e.target.value})} className="champ-saisie" required />
                </div>
                <div className="form-grid">
                  <div>
                    <label className="libelle">Ville</label>
                    <input type="text" placeholder="Ex: Abidjan" value={formNouvelleEcole.ville} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, ville: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label className="libelle">Commune</label>
                    <input type="text" placeholder="Ex: Cocody" value={formNouvelleEcole.commune} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, commune: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>
                <div className="form-grid" style={{ marginTop: '10px' }}>
                  <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('choix')}>Retour</button>
                  <button type="submit" className="bouton-principal">Continuer</button>
                </div>
              </form>
            )}

            {choixModeEcole === 'paiement' && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '16px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                  <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '12px' }}>Montant à régler</p>
                  <p style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0b1329' }}>{formNouvelleEcole.typeEtablissement === 'Privé' ? '50 000 FCFA' : '30 000 FCFA'}</p>
                </div>

                <div className={`option-paiement ${moyenPaiement === 'wave' ? 'selectionne' : ''}`} onClick={() => setMoyenPaiement('wave')}>
                  <span>🌊</span><div><strong style={{ fontSize: '13px' }}>Wave</strong></div>
                </div>
                <div className={`option-paiement ${moyenPaiement === 'orange' ? 'selectionne' : ''}`} onClick={() => setMoyenPaiement('orange')}>
                  <span>📱</span><div><strong style={{ fontSize: '13px' }}>Mobile Money</strong></div>
                </div>

                <div className="form-grid" style={{ marginTop: '16px' }}>
                  <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('creer')}>Retour</button>
                  <button type="button" className="bouton-principal" onClick={validerPaiementEtFinaliserEcole}>Payer</button>
                </div>
              </div>
            )}

            {choixModeEcole === 'rejoindre' && (
              <form onSubmit={validerConnexionEcoleExistante} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                <div>
                  <label className="libelle">Code officiel ou nom</label>
                  <input type="text" placeholder="Entrez le code..." value={codeOuNomRejoins} onChange={e => setCodeOuNomRejoins(e.target.value)} className="champ-saisie" required />
                </div>
                <div className="form-grid" style={{ marginTop: '6px' }}>
                  <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('choix')}>Retour</button>
                  <button type="submit" className="bouton-principal">Accéder</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- ÉCRAN CONNEXION / INSCRIPTION / MDP OUBLIÉ --- */}
      {!userRole && !etapeChefEcole && (
        <div style={styles.ecranAuth} className="anim-apparition">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '38px', display: 'block', marginBottom: '8px' }}>📖</span>
            <h1 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 4px 0', color: '#0b1329' }}>E-cahier !</h1>
            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>Espace institutionnel sécurisé</p>
          </div>

          <div className="carte-auth">
            {modeAccueil !== 'mdp-oublie' && (
              <div className="onglet-conteneur">
                <button type="button" className={`onglet-btn ${modeAccueil === 'connexion' ? 'actif' : ''}`} onClick={() => setModeAccueil('connexion')}>Connexion</button>
                <button type="button" className={`onglet-btn ${modeAccueil === 'inscription' ? 'actif' : ''}`} onClick={() => setModeAccueil('inscription')}>Inscription</button>
              </div>
            )}

            {modeAccueil === 'connexion' && (
              <form onSubmit={handleConnexion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="anim-apparition">
                <div>
                  <label className="libelle">Rôle</label>
                  <select value={formConnexion.roleAttendu} onChange={e => setFormConnexion({...formConnexion, roleAttendu: e.target.value})} className="champ-saisie">
                    <option value="enseignant">Enseignant</option>
                    <option value="censeur">Censeur Pédagogique</option>
                    <option value="chef">Chef d'établissement</option>
                  </select>
                </div>
                <div>
                  <label className="libelle">E-mail</label>
                  <input type="email" placeholder="nom@ecole.edu" value={formConnexion.email} onChange={e => setFormConnexion({...formConnexion, email: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="libelle" style={{ margin: 0 }}>Mot de passe</label>
                    <button type="button" onClick={() => setModeAccueil('mdp-oublie')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <input type="password" placeholder="••••••••" value={formConnexion.motDePasse} onChange={e => setFormConnexion({...formConnexion, motDePasse: e.target.value})} className="champ-saisie" required />
                </div>
                <button type="submit" className="bouton-principal" style={{ marginTop: '8px' }}>Se connecter</button>
              </form>
            )}

            {modeAccueil === 'mdp-oublie' && (
              <form onSubmit={handleRecuperationMdp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="anim-apparition">
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 6px 0', color: '#0b1329' }}>Récupération de mot de passe</h3>
                  <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Entrez votre e-mail professionnel pour recevoir les instructions.</p>
                </div>
                <div>
                  <label className="libelle">Adresse e-mail</label>
                  <input type="email" placeholder="nom@ecole.edu" value={emailMdpOublie} onChange={e => setEmailMdpOublie(e.target.value)} className="champ-saisie" required />
                </div>
                <button type="submit" className="bouton-principal" style={{ marginTop: '8px' }}>Envoyer le lien de récupération</button>
                <button type="button" onClick={() => setModeAccueil('connexion')} className="bouton-secondaire" style={{ width: '100%' }}>Retour à la connexion</button>
              </form>
            )}

            {modeAccueil === 'inscription' && (
              <form onSubmit={handleInscription} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="anim-apparition">
                <div className="form-grid">
                  <div>
                    <label className="libelle">Civilité</label>
                    <select value={formInscription.civilite} onChange={e => setFormInscription({...formInscription, civilite: e.target.value})} className="champ-saisie">
                      <option value="M.">M.</option><option value="Mme">Mme</option><option value="Dr">Dr</option><option value="Pr">Pr</option>
                    </select>
                  </div>
                  <div>
                    <label className="libelle">Rôle</label>
                    <select value={formInscription.role} onChange={e => setFormInscription({...formInscription, role: e.target.value})} className="champ-saisie">
                      <option value="enseignant">Enseignant</option><option value="censeur">Censeur</option><option value="chef">Direction</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="libelle">Nom</label>
                    <input type="text" placeholder="Nom" value={formInscription.nom} onChange={e => setFormInscription({...formInscription, nom: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label className="libelle">Prénoms</label>
                    <input type="text" placeholder="Prénoms" value={formInscription.prenoms} onChange={e => setFormInscription({...formInscription, prenoms: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="libelle">Date de naissance</label>
                    <input type="date" value={formInscription.dateNaissance} onChange={e => setFormInscription({...formInscription, dateNaissance: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label className="libelle">Téléphone</label>
                    <input type="text" placeholder="+225..." value={formInscription.telephone} onChange={e => setFormInscription({...formInscription, telephone: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="libelle">Matière</label>
                    <input type="text" placeholder="Mathématiques" value={formInscription.matiere} onChange={e => setFormInscription({...formInscription, matiere: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label className="libelle">Code Affiliation (Optionnel)</label>
                    <input type="text" placeholder="Code école" value={formInscription.codeAffiliation} onChange={e => setFormInscription({...formInscription, codeAffiliation: e.target.value})} className="champ-saisie" />
                  </div>
                </div>

                <div>
                  <label className="libelle">E-mail</label>
                  <input type="email" placeholder="nom@ecole.edu" value={formInscription.email} onChange={e => setFormInscription({...formInscription, email: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label className="libelle">Mot de passe</label>
                  <input type="password" placeholder="••••••••" value={formInscription.motDePasse} onChange={e => setFormInscription({...formInscription, motDePasse: e.target.value})} className="champ-saisie" required />
                </div>

                <button type="submit" className="bouton-principal" style={{ marginTop: '8px' }}>S'inscrire</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- DASHBOARD ET NAVIGATION --- */}
      {userRole && (
        <div className="anim-apparition">
          <header className="nav-header">
            <div className="nav-logo-container">
              <span style={{ fontSize: '18px' }}>📖</span>
              <span className="nav-title">E-cahier !</span>
              <div className="nav-ecole-badge">
                <span>🏫</span>
                <span style={{ fontWeight: '700', color: '#ffffff' }}>{configEcole?.nomEcole || 'Établissement'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar-container" onClick={() => setModalProfilOuvert(true)} title="Gérer mon profil">
                <div className="avatar-cercle">
                  {profilUtilisateur.photo ? <img src={profilUtilisateur.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : `${profilUtilisateur.nom?.[0] || 'U'}`}
                </div>
                <div style={{ textAlign: 'left', display: 'inline-block' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff' }}>{profilUtilisateur.nom}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>{userRole === 'enseignant' ? 'Enseignant' : userRole === 'censeur' ? 'Censeur' : 'Direction'}</div>
                </div>
              </div>

              <button type="button" className="menu-burger-btn" onClick={() => setMenuBurgerOuvert(true)} title="Menu">
                ☰
              </button>
            </div>
          </header>

          <main style={{ padding: '24px 16px', maxWidth: '1200px', margin: '0 auto' }}>
            {userRole === 'enseignant' && (
              <EnseignantDashboard authContext={authContext} demandesAffiliation={demandesAffiliationEnseignants} setDemandesAffiliation={setDemandesAffiliationEnseignants} seances={seancesEnseignants} setSeances={setSeancesEnseignants} />
            )}
            {userRole === 'censeur' && (
              <CenseurDashboard authContext={authContext} demandesAffiliation={demandesAffiliationEnseignants} setDemandesAffiliation={setDemandesAffiliationEnseignants} seances={seancesEnseignants} setSeances={setSeancesEnseignants} bibliotheque={bibliothequeFiches} setBibliotheque={setBibliothequeFiches} enseignantsSansFiche={enseignantsSansFiche} />
            )}
            {userRole === 'chef' && (
              <ChefEtablissementDashboard authContext={authContext} demandesAffiliation={demandesAffiliationEnseignants} seances={seancesEnseignants} bibliotheque={bibliothequeFiches} enseignantsSansFiche={enseignantsSansFiche} />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

const styles = {
  conteneurGlobal: { minHeight: '100vh', backgroundColor: '#f8fafc', position: 'relative' },
  bandeauHorsLigne: { backgroundColor: '#0b1329', color: '#ffffff', padding: '8px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', position: 'sticky', top: 0, zIndex: 10000 },
  ecranAuth: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '30px 20px' },
  conteneurNotification: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 },
  texteNotification: { backgroundColor: '#0b1329', color: '#ffffff', padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '1px solid #17244a' },
  menuItem: { background: 'none', border: 'none', textAlign: 'left', padding: '12px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#1e293b', width: '100%', transition: 'background 0.1s ease' },
  boutonDeconnexionBurger: { background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', width: '100%', textAlign: 'center', transition: 'all 0.1s ease' }
};
