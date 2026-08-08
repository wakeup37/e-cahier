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
  
  // Mode sans affiliation (exclusivement enseignant)
  const [modalPaiementSansAffiliation, setModalPaiementSansAffiliation] = useState(false);
  const [modeSansAffiliationActif, setModeSansAffiliationActif] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_mode_sans_affiliation')) || false; }
    catch { return false; }
  });

  useEffect(() => {
    localStorage.setItem('app_mode_sans_affiliation', JSON.stringify(modeSansAffiliationActif));
  }, [modeSansAffiliationActif]);

  const [configEcole, setConfigEcole] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_chef_ecole_config')) || null; }
    catch { return null; }
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
    
    // Si c'est un chef d'établissement, on vérifie s'il a déjà un établissement configuré
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
    
    if (formInscription.role === 'enseignant') {
      if (formInscription.codeAffiliation.trim()) {
        setModeSansAffiliationActif(false);
        const nouvelleDemande = {
          id: Date.now(),
          enseignantNom: `${formInscription.civilite} ${formInscription.prenoms} ${formInscription.nom}`,
          matiere: formInscription.matiere || 'Non spécifiée',
          etablissementCible: formInscription.codeAffiliation.trim(),
          statut: 'En attente'
        };
        setDemandesAffiliationEnseignants(prev => [nouvelleDemande, ...prev]);
      } else {
        setModeSansAffiliationActif(true);
        setSeancesEnseignants([]);
      }
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

  const basculerEnModeSansAffiliation = () => {
    if (window.confirm("⚠️ Attention : En passant en mode sans affiliation (réservé aux enseignants), vos classes actuelles disparaîtront et vous passerez sur l'abonnement indépendant de 1 900 FCFA/mois. Continuer ?")) {
      setModeSansAffiliationActif(true);
      setSeancesEnseignants([]);
      setModalPaiementSansAffiliation(true);
      setMenuBurgerOuvert(false);
    }
  };

  const validerPaiementSansAffiliation = () => {
    setModalPaiementSansAffiliation(false);
    afficherNotification("💳 Abonnement de 1 900 FCFA validé ! Mode sans affiliation actif.");
  };

  const handleReinitialiserEtablissement = () => {
    if (window.confirm("⚠️ ATTENTION : Voulez-vous vraiment réinitialiser l'établissement ?")) {
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
        html, body { margin: 0; padding: 0; background-color: #f8fafc; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
        
        .anim-apparition { animation: apparition 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes apparition { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        
        .bouton-principal { background: linear-gradient(135deg, #0b1329 0%, #1e293b 100%); color: #ffffff; border: none; padding: 13px 20px; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s ease; width: 100%; box-shadow: 0 4px 12px rgba(11, 19, 41, 0.15); }
        .bouton-principal:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(11, 19, 41, 0.25); }
        
        .bouton-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; border: none; padding: 13px 20px; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s ease; width: 100%; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }
        .bouton-danger:hover { transform: translateY(-1px); }

        .bouton-secondaire { background-color: #ffffff; color: #475569; border: 1px solid #e2e8f0; padding: 13px 20px; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .bouton-secondaire:hover { background-color: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }

        .champ-saisie { width: 100%; padding: 13px 16px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 14px; background-color: #ffffff; color: #0f172a; outline: none; transition: all 0.2s ease; }
        .champ-saisie:focus { border-color: #2563eb; background-color: #ffffff; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
        
        .carte-auth { background: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #e2e8f0; width: 100%; max-width: 480px; margin: 0 auto; color: #0f172a; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.08); }
        .libelle { display: block; font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        
        .onglet-conteneur { display: flex; background-color: #f1f5f9; border-radius: 12px; padding: 6px; margin-bottom: 28px; border: 1px solid #e2e8f0; }
        .onglet-btn { flex: 1; padding: 12px; font-size: 14px; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; background: transparent; color: #64748b; transition: all 0.2s ease; }
        .onglet-btn.actif { background: #ffffff; color: #0b1329; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

        .option-paiement { display: flex; align-items: center; gap: 16px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer; background: #ffffff; margin-bottom: 12px; transition: all 0.2s ease; }
        .option-paiement:hover { border-color: #cbd5e1; }
        .option-paiement.selectionne { border-color: #2563eb; background: #eff6ff; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }

        .nav-header { display: flex; justify-content: space-between; align-items: center; background: #0b1329; padding: 16px 32px; border-bottom: 1px solid #1e293b; position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .nav-logo-container { display: flex; align-items: center; gap: 14px; }
        .nav-title { font-weight: 800; font-size: 18px; color: #ffffff; letter-spacing: -0.3px; }
        .nav-ecole-badge { font-weight: 500; color: #cbd5e1; font-size: 13px; border-left: 1px solid #334155; padding-left: 14px; display: flex; align-items: center; gap: 8px; }

        .avatar-container { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 6px 12px; border-radius: 12px; transition: background 0.2s ease; border: 1px solid transparent; }
        .avatar-container:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.1); }
        .avatar-cercle { width: 40px; height: 40px; border-radius: 50%; background: #ffffff; color: #0b1329; display: flex; align-items: center; justify-content: center; font-weight: 700; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        
        .menu-burger-btn { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); font-size: 20px; cursor: pointer; padding: 10px 14px; border-radius: 12px; color: #ffffff; transition: background 0.2s ease; }
        .menu-burger-btn:hover { background: rgba(255, 255, 255, 0.15); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(11, 19, 41, 0.65); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 16px; }
        .modal-card { background: #ffffff; width: 100%; max-width: 480px; padding: 36px; border-radius: 24px; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 25px 50px rgba(0,0,0,0.2); }

        .drawer-overlay { position: fixed; inset: 0; background: rgba(11, 19, 41, 0.65); backdrop-filter: blur(8px); z-index: 2000; display: flex; justify-content: flex-end; }
        .drawer-content { width: 100%; max-width: 340px; background: #ffffff; height: 100%; padding: 32px; display: flex; flex-direction: column; border-left: 1px solid #e2e8f0; color: #0f172a; box-shadow: -20px 0 40px rgba(0,0,0,0.15); }
      `}</style>

      {!estEnLigne && <div style={styles.bandeauHorsLigne}>⚠️ Mode hors ligne actif. Sauvegarde locale activée.</div>}
      {notification && <div style={styles.conteneurNotification}><div style={styles.texteNotification}>{notification}</div></div>}

      {/* --- POP-UP DE CONFIRMATION DE DÉCONNEXION --- */}
      {modalDeconnexionOuvert && (
        <div className="modal-overlay anim-apparition">
          <div className="modal-card" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '42px', display: 'block', marginBottom: '16px' }}>🚪</span>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800' }}>Confirmation de déconnexion</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '28px' }}>Êtes-vous sûr de vouloir vous déconnecter de votre session ?</p>
            <div style={{ display: 'flex', gap: '14px' }}>
              <button onClick={() => setModalDeconnexionOuvert(false)} className="bouton-secondaire" style={{ flex: 1 }}>Annuler</button>
              <button onClick={handleLogout} className="bouton-danger" style={{ flex: 1 }}>Oui, me déconnecter</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PAIEMENT MODE SANS AFFILIATION (1 900 FCFA / MOIS) --- */}
      {modalPaiementSansAffiliation && (
        <div className="modal-overlay anim-apparition">
          <div className="modal-card" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '42px', display: 'block', marginBottom: '16px' }}>💳</span>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800' }}>Mode Sans Affiliation (Enseignant)</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>L'accès indépendant pour enseignant est facturé à <strong>1 900 FCFA par mois</strong>.</p>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '24px', fontWeight: '800', color: '#0b1329' }}>1 900 FCFA / mois</span>
            </div>
            <div style={{ display: 'flex', gap: '14px' }}>
              <button onClick={() => setModalPaiementSansAffiliation(false)} className="bouton-secondaire" style={{ flex: 1 }}>Annuler</button>
              <button onClick={validerPaiementSansAffiliation} className="bouton-principal" style={{ flex: 1 }}>Payer l'abonnement</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE DEMANDE D'AFFILIATION --- */}
      {modalAffiliationOuvert && (
        <div className="modal-overlay anim-apparition">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>🔗 Demande d'affiliation</h3>
              <button onClick={() => setModalAffiliationOuvert(false)} className="bouton-secondaire" style={{ padding: '6px 12px', fontSize: '12px' }}>✕</button>
            </div>
            <form onSubmit={handleDemandeAffiliationRapide} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="libelle">Code officiel ou nom de l'établissement cible</label>
                <input type="text" name="codeEtablissement" placeholder="Ex: LYC-MOD-01" className="champ-saisie" required />
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>Votre demande sera transmise à la direction pour validation.</p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
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
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>🏫 Gestion de l'Établissement</h3>
              <button onClick={() => setModalEcoleOuvert(false)} className="bouton-secondaire" style={{ padding: '6px 12px', fontSize: '12px' }}>✕</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              setModalEcoleOuvert(false);
              afficherNotification("✅ Paramètres de l'établissement mis à jour.");
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalEcoleOuvert(false)} className="bouton-secondaire" style={{ flex: 1 }}>Fermer</button>
                <button type="submit" className="bouton-principal" style={{ flex: 2 }}>Enregistrer</button>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '16px', paddingTop: '16px' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Mon Profil</h3>
              <button onClick={() => setModalProfilOuvert(false)} className="bouton-secondaire" style={{ padding: '6px 12px', fontSize: '12px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div className="avatar-cercle" style={{ width: '56px', height: '56px', fontSize: '20px', background: '#0b1329', color: '#ffffff' }}>
                  {profilUtilisateur.photo ? <img src={profilUtilisateur.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : `${profilUtilisateur.nom?.[0] || 'U'}`}
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb', cursor: 'pointer', display: 'inline-block' }}>
                    Changer la photo de profil
                    <input type="file" accept="image/*" onChange={handleChangerPhotoProfil} style={{ display: 'none' }} />
                  </label>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>PNG ou JPG haute résolution.</p>
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

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button onClick={() => setModalProfilOuvert(false)} className="bouton-secondaire" style={{ flex: 1 }}>Fermer</button>
                <button onClick={() => { setModalProfilOuvert(false); afficherNotification("✅ Profil mis à jour."); }} className="bouton-principal" style={{ flex: 2 }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MENU BURGER DRAWER --- */}
      {menuBurgerOuvert && (
        <div className="drawer-overlay anim-apparition" onClick={() => setMenuBurgerOuvert(false)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <span style={{ fontWeight: '800', fontSize: '18px', color: '#0b1329' }}>Menu E-cahier</span>
              <button onClick={() => setMenuBurgerOuvert(false)} className="menu-burger-btn" style={{ background: '#f1f5f9', color: '#0b1329', border: '1px solid #cbd5e1' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Session active</p>
                <p style={{ margin: 0, fontWeight: '800', fontSize: '14px', color: '#0b1329' }}>{profilUtilisateur.civilite} {profilUtilisateur.prenoms} {profilUtilisateur.nom}</p>
              </div>

              <button onClick={() => { setMenuBurgerOuvert(false); setModalProfilOuvert(true); }} style={styles.menuItem}>
                👤 Gérer mon profil
              </button>

              <button onClick={() => { setMenuBurgerOuvert(false); setModalAffiliationOuvert(true); }} style={styles.menuItem}>
                🔗 Demande d'affiliation à une école
              </button>

              {userRole === 'enseignant' && !modeSansAffiliationActif && (
                <button onClick={basculerEnModeSansAffiliation} style={styles.menuItem}>
                  💳 Passer en mode sans affiliation (1 900F/mois)
                </button>
              )}

              {userRole === 'chef' && (
                <button onClick={() => { setMenuBurgerOuvert(false); setModalEcoleOuvert(true); }} style={styles.menuItem}>
                  🏫 Gérer l'Établissement (Réglages & Reset)
                </button>
              )}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <button type="button" onClick={() => { setMenuBurgerOuvert(false); setModalDeconnexionOuvert(true); }} style={styles.boutonDeconnexionBurger}>
                🚪 Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ÉCRAN INTERMÉDIAIRE CHEF D'ÉTABLISSEMENT --- */}
      {etapeChefEcole && (
        <div style={styles.ecranAuth} className="anim-apparition">
          <div className="carte-auth" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '42px', display: 'block', marginBottom: '16px' }}>🏫</span>
            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 8px 0' }}>Espace Direction</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '28px', lineHeight: '1.5' }}>Le chef d'établissement doit configurer ou lier son établissement unique.</p>

            {choixModeEcole === 'choix' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <button type="button" className="bouton-principal" onClick={() => setChoixModeEcole('creer')}>➕ Enregistrer un nouvel établissement</button>
                <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('rejoindre')}>🔗 Se connecter à un établissement existant</button>
              </div>
            )}

            {choixModeEcole === 'creer' && (
              <form onSubmit={preparerPaiementCodeEcole} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                <div>
                  <label className="libelle">Type d'établissement</label>
                  <select value={formNouvelleEcole.typeEtablissement} onChange={e => setFormNouvelleEcole({...formNouvelleEcole, typeEtablissement: e.target.value})} className="champ-saisie">
                    <option value="Public">Public (30 000 FCFA à la création)</option>
                    <option value="Privé">Privé (50 000 FCFA à la création)</option>
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
                <div className="form-grid" style={{ marginTop: '12px' }}>
                  <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('choix')}>Retour</button>
                  <button type="submit" className="bouton-principal">Continuer</button>
                </div>
              </form>
            )}

            {choixModeEcole === 'paiement' && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '20px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                  <p style={{ margin: '0 0 6px 0', color: '#64748b', fontSize: '13px' }}>Frais d'enregistrement de l'école (+ factures mensuelles)</p>
                  <p style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0b1329' }}>{formNouvelleEcole.typeEtablissement === 'Privé' ? '50 000 FCFA' : '30 000 FCFA'}</p>
                </div>

                <div className={`option-paiement ${moyenPaiement === 'wave' ? 'selectionne' : ''}`} onClick={() => setMoyenPaiement('wave')}>
                  <span style={{ fontSize: '22px' }}>🌊</span><div><strong style={{ fontSize: '14px', color: '#0b1329' }}>Wave</strong><span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Paiement instantané</span></div>
                </div>
                <div className={`option-paiement ${moyenPaiement === 'orange' ? 'selectionne' : ''}`} onClick={() => setMoyenPaiement('orange')}>
                  <span style={{ fontSize: '22px' }}>📱</span><div><strong style={{ fontSize: '14px', color: '#0b1329' }}>Mobile Money</strong><span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Orange, MTN, Moov</span></div>
                </div>

                <div className="form-grid" style={{ marginTop: '20px' }}>
                  <button type="button" className="bouton-secondaire" onClick={() => setChoixModeEcole('creer')}>Retour</button>
                  <button type="button" className="bouton-principal" onClick={validerPaiementEtFinaliserEcole}>Payer et Finaliser</button>
                </div>
              </div>
            )}

            {choixModeEcole === 'rejoindre' && (
              <form onSubmit={validerConnexionEcoleExistante} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                <div>
                  <label className="libelle">Code officiel ou nom de l'école</label>
                  <input type="text" placeholder="Entrez le code..." value={codeOuNomRejoins} onChange={e => setCodeOuNomRejoins(e.target.value)} className="champ-saisie" required />
                </div>
                <div className="form-grid" style={{ marginTop: '8px' }}>
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
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '16px', background: '#0b1329', color: '#ffffff', fontSize: '32px', boxShadow: '0 10px 25px rgba(11, 19, 41, 0.2)', marginBottom: '16px' }}>📖</div>
            <h1 style={{ fontSize: '28px', fontWeight: '900', margin: '0 0 6px 0', color: '#0b1329', letterSpacing: '-0.5px' }}>E-cahier !</h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Espace institutionnel sécurisé</p>
          </div>

          <div className="carte-auth">
            {modeAccueil !== 'mdp-oublie' && (
              <div className="onglet-conteneur">
                <button type="button" className={`onglet-btn ${modeAccueil === 'connexion' ? 'actif' : ''}`} onClick={() => setModeAccueil('connexion')}>Connexion</button>
                <button type="button" className={`onglet-btn ${modeAccueil === 'inscription' ? 'actif' : ''}`} onClick={() => setModeAccueil('inscription')}>Inscription</button>
              </div>
            )}

            {modeAccueil === 'connexion' && (
              <form onSubmit={handleConnexion} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="anim-apparition">
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
                    <button type="button" onClick={() => setModeAccueil('mdp-oublie')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: 0 }}>
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <input type="password" placeholder="••••••••" value={formConnexion.motDePasse} onChange={e => setFormConnexion({...formConnexion, motDePasse: e.target.value})} className="champ-saisie" required />
                </div>
                <button type="submit" className="bouton-principal" style={{ marginTop: '12px' }}>Se connecter</button>
              </form>
            )}

            {modeAccueil === 'mdp-oublie' && (
              <form onSubmit={handleRecuperationMdp} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="anim-apparition">
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px 0', color: '#0b1329' }}>Récupération de mot de passe</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Entrez votre e-mail professionnel pour recevoir les instructions.</p>
                </div>
                <div>
                  <label className="libelle">Adresse e-mail</label>
                  <input type="email" placeholder="nom@ecole.edu" value={emailMdpOublie} onChange={e => setEmailMdpOublie(e.target.value)} className="champ-saisie" required />
                </div>
                <button type="submit" className="bouton-principal" style={{ marginTop: '12px' }}>Envoyer le lien de récupération</button>
                <button type="button" onClick={() => setModeAccueil('connexion')} className="bouton-secondaire" style={{ width: '100%' }}>Retour à la connexion</button>
              </form>
            )}

            {modeAccueil === 'inscription' && (
              <form onSubmit={handleInscription} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="anim-apparition">
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

                <button type="submit" className="bouton-principal" style={{ marginTop: '12px' }}>S'inscrire</button>
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
              <span style={{ fontSize: '20px' }}>📖</span>
              <span className="nav-title">E-cahier !</span>
              <div className="nav-ecole-badge">
                <span>🏫</span>
                <span style={{ fontWeight: '700', color: '#ffffff' }}>{modeSansAffiliationActif ? 'Indépendant (Sans Affiliation)' : (configEcole?.nomEcole || 'Établissement')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="avatar-container" onClick={() => setModalProfilOuvert(true)} title="Gérer mon profil">
                <div className="avatar-cercle">
                  {profilUtilisateur.photo ? <img src={profilUtilisateur.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : `${profilUtilisateur.nom?.[0] || 'U'}`}
                </div>
                <div style={{ textAlign: 'left', display: 'inline-block' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>{profilUtilisateur.nom}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{userRole === 'enseignant' ? (modeSansAffiliationActif ? 'Sans Affiliation' : 'Enseignant') : userRole === 'censeur' ? 'Censeur' : 'Direction'}</div>
                </div>
              </div>

              <button type="button" className="menu-burger-btn" onClick={() => setMenuBurgerOuvert(true)} title="Menu">
                ☰
              </button>
            </div>
          </header>

          <main style={{ padding: '32px 20px', maxWidth: '1200px', margin: '0 auto' }}>
            {userRole === 'enseignant' && (
              <EnseignantDashboard authContext={authContext} demandesAffiliation={demandesAffiliationEnseignants} setDemandesAffiliation={setDemandesAffiliationEnseignants} seances={seancesEnseignants} setSeances={setSeancesEnseignants} modeSansAffiliation={modeSansAffiliationActif} />
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
  bandeauHorsLigne: { backgroundColor: '#0b1329', color: '#ffffff', padding: '10px 20px', textAlign: 'center', fontSize: '13px', fontWeight: '600', position: 'sticky', top: 0, zIndex: 3000 },
  ecranAuth: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '40px 20px' },
  conteneurNotification: { position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 3000 },
  texteNotification: { backgroundColor: '#0b1329', color: '#ffffff', padding: '14px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', boxShadow: '0 15px 30px rgba(0,0,0,0.2)', border: '1px solid #1e293b' },
  menuItem: { background: 'none', border: 'none', textAlign: 'left', padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#1e293b', width: '100%', transition: 'background 0.15s ease' },
  boutonDeconnexionBurger: { background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', width: '100%', textAlign: 'center', transition: 'all 0.15s ease' }
};
