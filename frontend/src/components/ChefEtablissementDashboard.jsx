import React, { useState, useEffect, useRef, useMemo } from 'react';
import API from '../../api.js'; // Importation du client API configuré sur le port 5002

export default function ChefEtablissementDashboard() {
  
  // --- ÉTAPE DE SÉLECTION INITIALE (CRÉER OU SE CONNECTER À UN ÉTABLISSEMENT) ---
  const [ecoleConfig, setEcoleConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('app_chef_ecole_config');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [modeSetup, setModeSetup] = useState('CHOIX'); 
  const [inputNomEcole, setInputNomEcole] = useState('');
  const [inputAnneeScolaire, setInputAnneeScolaire] = useState('2025-2026');

  // --- PROFIL DU CHEF D'ÉTABLISSEMENT & SESSION (AVEC BLINDAGE) ---
  const [infosChef, setInfosChef] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_chef_profil'));
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
    } catch {}
    return {
      civilite: 'M.',
      nom: 'Koffi',
      prenoms: 'Bernard',
      etablissement: '',
      role: 'Chef d’Établissement (Proviseur)',
      photoProfil: ''
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_chef_profil', JSON.stringify(infosChef));
    } catch {}
  }, [infosChef]);

  const [modalProfilChefOuvert, setModalProfilChefOuvert] = useState(false);
  const [formProfilChef, setFormProfilChef] = useState({ ...(infosChef || {}) });
  const [profilChefOuvert, setProfilChefOuvert] = useState(false);
  const profilChefRef = useRef(null);

  useEffect(() => {
    try {
      if (ecoleConfig) {
        localStorage.setItem('app_chef_ecole_config', JSON.stringify(ecoleConfig));
      }
    } catch {}
  }, [ecoleConfig]);

  const [modalConfirmationTerminer, setModalConfirmationTerminer] = useState(false);
  const [modalConfirmationQuitter, setModalConfirmationQuitter] = useState(false);

  // --- CENSEURS EN ATTENTE OU VALIDÉS ---
  const [censeursAffiliations, setCenseursAffiliations] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_chef_censeurs_affiliations'));
      if (Array.isArray(saved)) return saved;
    } catch {}
    return [
      { id: 1, nomComplet: 'M. Touré Alpha', email: 'toure.alpha@ecole.ci', telephone: '0102030405', matricule: 'MENA-789456', niveauCharge: '6ème', statut: 'En attente' }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_chef_censeurs_affiliations', JSON.stringify(censeursAffiliations));
    } catch {}
  }, [censeursAffiliations]);

  // --- PROPOSITIONS D'AFFILIATION DU CHEF VERS LE CENSEUR (AVEC INFOS COMPLÈTES) ---
  const [propositionsEnvoyees, setPropositionsEnvoyees] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_censeur_propositions_entrantes'));
      if (Array.isArray(saved)) return saved;
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_censeur_propositions_entrantes', JSON.stringify(propositionsEnvoyees));
    } catch {}
  }, [propositionsEnvoyees]);

  // Modale de proposition enrichie
  const [modalProposition, setModalProposition] = useState({
    ouvert: false,
    civilite: 'M.',
    nom: '',
    prenoms: '',
    dateNaissance: '',
    telephone: '',
    email: '',
    matricule: '',
    niveauCharge: ''
  });

  // --- MODALE DE RETRAIT D'UN CENSEUR VALIDÉ ---
  const [modalRetraitCenseur, setModalRetraitCenseur] = useState({
    ouvert: false,
    censeurId: null,
    censeurNom: ''
  });

  // --- RAPPORTS ET NOTIFICATIONS ---
  const [rapportsCenseurs, setRapportsCenseurs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_chef_rapports_censeurs'));
      if (Array.isArray(saved)) return saved;
    } catch {}
    return [];
  });

  const [notificationsChef, setNotificationsChef] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_chef_notifications'));
      if (Array.isArray(saved)) return saved;
    } catch {}
    return [
      { id: 1, texte: 'Bienvenue sur votre tableau de bord du réseau de l’établissement.', date: 'Aujourd’hui', lu: false }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_chef_notifications', JSON.stringify(notificationsChef));
    } catch {}
  }, [notificationsChef]);

  const [notifChefOuvert, setNotifChefOuvert] = useState(false);
  const notifChefRef = useRef(null);

  // --- DONNÉES RÉCUPÉRÉES DEPUIS LE BACKEND API ---
  const [apiEtablissements, setApiEtablissements] = useState([]);

  useEffect(() => {
    const fetchApiEtablissements = async () => {
      try {
        const response = await API.get('/etablissements');
        // 🛠️ CORRECTION : Le backend renvoie directement un tableau d'établissements
        if (response.data && Array.isArray(response.data)) {
          setApiEtablissements(response.data);
        }
      } catch (err) {
        console.error("Erreur API :", err);
      }
    };
    fetchApiEtablissements();
  }, []);

  const [activeTab, setActiveTab] = useState('censeurs');
  const [message, setMessage] = useState('');
  
  const [filtreArchiveEnseignant, setFiltreArchiveEnseignant] = useState('TOUS');
  const [filtreArchiveClasse, setFiltreArchiveClasse] = useState('TOUTES');

  const [archiveEcole, setArchiveEcole] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('app_censeur_archive_ecole'));
      if (Array.isArray(stored)) return stored;
    } catch {}
    return [];
  });

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  useEffect(() => {
    const handleStorageUpdate = () => {
      try {
        const saved = localStorage.getItem('app_chef_rapports_censeurs');
        const rapports = saved ? JSON.parse(saved) : [];
        if (Array.isArray(rapports) && rapports.length > (rapportsCenseurs || []).length) {
          const dernierRapport = rapports[rapports.length - 1];
          const nouvelleNotif = {
            id: Date.now(),
            texte: `📥 Nouveau rapport de synthèse transmis par le censeur ${dernierRapport?.censeur || 'Inconnu'}`,
            date: new Date().toLocaleDateString(),
            lu: false
          };
          setNotificationsChef(prev => [nouvelleNotif, ...(prev || [])]);
        }
        if (Array.isArray(rapports)) setRapportsCenseurs(rapports);
      } catch {}
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, [rapportsCenseurs]);

  const statistiquesReseau = useMemo(() => {
    let classesCount = 1;
    try {
      const programmes = JSON.parse(localStorage.getItem('app_enseignant_programmes_classes'));
      if (programmes && typeof programmes === 'object') {
        classesCount = Object.keys(programmes).length || 1;
      }
    } catch {}

    const censeursValidesCount = Array.isArray(censeursAffiliations) ? censeursAffiliations.filter(c => c && c.statut === 'Validé').length + 1 : 1;
    let enseignantsCount = 1;
    try {
      const affs = JSON.parse(localStorage.getItem('app_enseignant_affiliations'));
      if (Array.isArray(affs)) {
        enseignantsCount = affs.filter(a => a && a.statut === 'Validée').length || 1;
      }
    } catch {}

    return {
      totalClasses: classesCount,
      totalPersonnesConnectees: censeursValidesCount + enseignantsCount
    };
  }, [censeursAffiliations]);

  const [menuOuvert, setMenuOuvert] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOuvert(false);
      if (profilChefRef.current && !profilChefRef.current.contains(event.target)) setProfilChefOuvert(false);
      if (notifChefRef.current && !notifChefRef.current.contains(event.target)) setNotifChefOuvert(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreerOuConnecterEcole = async (e, type) => {
    e.preventDefault();
    if (!inputNomEcole.trim()) {
      showToast("⚠️ Veuillez entrer un nom d'établissement valide.");
      return;
    }
    const nouvelleConfig = { nomEcole: inputNomEcole.trim(), anneeScolaire: inputAnneeScolaire.trim() || '2025-2026', anneeOuverte: true };
    setEcoleConfig(nouvelleConfig);
    setInfosChef(prev => ({ ...prev, etablissement: nouvelleConfig.nomEcole }));
    
    try { 
      // 🚀 Envoi direct vers ton backend Node.js / Supabase
      await API.post('/etablissements', { 
        nom: nouvelleConfig.nomEcole, 
        annee_scolaire_active: nouvelleConfig.anneeScolaire 
      }); 
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de l'établissement en base :", err);
    }

    showToast(type === 'CREER' ? "🏫 Établissement créé avec succès !" : "🔗 Connecté à l'établissement avec succès !");
  };

  const confirmerQuitterEcole = () => {
    localStorage.removeItem('app_chef_ecole_config');
    setEcoleConfig(null);
    setModalConfirmationQuitter(false);
    showToast("🔄 Vous avez quitté l'établissement.");
  };

  const handleEnregistrerProfilChef = (e) => {
    e.preventDefault();
    setInfosChef({ ...formProfilChef });
    setModalProfilChefOuvert(false);
    showToast("✅ Profil et photo mis à jour avec succès !");
  };

  const handleChangerPhotoProfilChef = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormProfilChef(prev => ({ ...prev, photoProfil: reader.result }));
    reader.readAsDataURL(file);
  };

  const ouvrirAnneeScolaire = () => {
    setEcoleConfig(prev => ({ ...prev, anneeOuverte: true }));
    showToast("🚀 Année scolaire ouverte et démarrée avec succès !");
  };

  const confirmerTerminerAnnee = () => {
    setEcoleConfig(prev => ({ ...prev, anneeOuverte: false }));
    setModalConfirmationTerminer(false);
    showToast("🔒 Année scolaire terminée avec succès.");
  };

  const validerCenseur = (id) => {
    setCenseursAffiliations(prev => (prev || []).map(c => c.id === id ? { ...c, statut: 'Validé' } : c));
    showToast("✅ Compte censeur validé avec succès sur le réseau !");
  };

  const rejeterCenseur = (id) => {
    setCenseursAffiliations(prev => (prev || []).filter(c => c.id !== id));
    showToast("❌ Demande de censeur rejetée.");
  };

  const confirmerRetraitCenseur = () => {
    setCenseursAffiliations(prev => (prev || []).filter(c => c.id !== modalRetraitCenseur.censeurId));
    setModalRetraitCenseur({ ouvert: false, censeurId: null, censeurNom: '' });
    showToast(`❌ Affiliation de ${modalRetraitCenseur.censeurNom} retirée avec succès.`);
  };

  // --- ENVOI DE LA PROPOSITION ENRICHIE ---
  const envoyerPropositionCenseur = (e) => {
    e.preventDefault();
    if (!modalProposition.nom.trim() || !modalProposition.matricule.trim() || !modalProposition.email.trim()) {
      showToast("⚠️ Le nom, l'email et le matricule sont obligatoires.");
      return;
    }

    const nouvelleProp = {
      id: Date.now() + Math.random(),
      ecole: ecoleConfig?.nomEcole || infosChef?.etablissement || 'Établissement inconnu',
      censeurCible: `${modalProposition.civilite} ${modalProposition.nom} ${modalProposition.prenoms}`.trim(),
      matricule: modalProposition.matricule.trim(),
      dateNaissance: modalProposition.dateNaissance,
      telephone: modalProposition.telephone.trim(),
      email: modalProposition.email.trim(),
      niveauCharge: modalProposition.niveauCharge.trim(),
      chefExpediteur: `${infosChef?.civilite || ''} ${infosChef?.nom || ''}`,
      statut: 'En attente'
    };

    setPropositionsEnvoyees(prev => [...(prev || []), nouvelleProp]);
    setModalProposition({
      ouvert: false, civilite: 'M.', nom: '', prenoms: '', dateNaissance: '', telephone: '', email: '', matricule: '', niveauCharge: ''
    });
    showToast(`📩 Proposition d'affiliation envoyée à ${nouvelleProp.censeurCible} avec succès !`);
  };

  const telechargerPDFArchive = (item) => {
    const fenetreImpression = window.open('', '_blank');
    if (!fenetreImpression) {
      showToast("⚠️ Votre navigateur bloque les pop-up.");
      return;
    }
    fenetreImpression.document.write(`
      <html>
        <head>
          <title>Archive - ${item.titre}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header-doc { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
            .header-doc h2 { margin: 0; color: #0f172a; font-size: 18px; text-transform: uppercase; }
            .meta { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #cbd5e1; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; font-size: 13px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header-doc">
            <h2>ARCHIVE PÉDAGOGIQUE OFFICIELLE DE L'ÉTABLISSEMENT</h2>
            <p>${infosChef.etablissement}</p>
          </div>
          <div class="meta">
            <p><strong>Enseignant(e) :</strong> ${item.enseignant} (${item.matiere})</p>
            <p><strong>Classe :</strong> ${item.classe} | <strong>Année :</strong> ${item.anneeScolaire}</p>
            <p><strong>Titre :</strong> ${item.titre} | <strong>Date de validation :</strong> ${item.dateValidation}</p>
          </div>
          <table>
            <tr><th>🎯 Habilités</th><td>${item.details?.habilites || 'N/A'}</td></tr>
            <tr><th>📚 Contenus</th><td>${item.details?.contenus || 'N/A'}</td></tr>
            <tr><th>⚡ Exercices</th><td>${item.details?.exercices || 'N/A'}</td></tr>
            <tr><th>📝 Évaluations</th><td>${item.details?.evaluations || 'N/A'}</td></tr>
          </table>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    fenetreImpression.document.close();
    showToast("📥 Document téléchargé en PDF !");
  };

  const archiveFiltree = useMemo(() => {
    return (archiveEcole || []).filter(item => {
      if (!item) return false;
      const matchEns = filtreArchiveEnseignant === 'TOUS' || item.enseignant === filtreArchiveEnseignant;
      const matchClasse = filtreArchiveClasse === 'TOUTES' || item.classe === filtreArchiveClasse;
      return matchEns && matchClasse;
    });
  }, [archiveEcole, filtreArchiveEnseignant, filtreArchiveClasse]);

  // --- SI AUCUN ÉTABLISSEMENT N'EST CONFIGURÉ ---
  if (!ecoleConfig) {
    return (
      <div style={styles.setupContainer}>
        <style>{`
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          .bouton { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; border: none; transition: all 0.2s ease; width: 100%; }
          .bouton-principal { background-color: #2563eb; color: white; }
          .bouton-principal:hover { background-color: #1d4ed8; }
          .bouton-secondaire { background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
          .bouton-secondaire:hover { background-color: #e2e8f0; }
          .champ-saisie { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; background-color: #fff; color: #1e293b; outline: none; margin-top: 4px; }
        `}</style>
        
        <div style={styles.setupCard}>
          <h2 style={{ color: '#0f172a', marginBottom: '8px', textAlign: 'center' }}>🎓 Espace Chef d'Établissement</h2>
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '24px' }}>
            Veuillez rattacher votre session à un établissement pour accéder au réseau.
          </p>

          {message && <div style={{ ...styles.toastSuccess, marginBottom: '16px' }}>{message}</div>}

          {modeSetup === 'CHOIX' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => setModeSetup('CREER')} className="bouton bouton-principal">🏫 Créer un nouvel établissement</button>
              <button onClick={() => setModeSetup('CONNECTER')} className="bouton bouton-secondaire">🔗 Se connecter à un ancien établissement</button>
            </div>
          )}

          {modeSetup === 'CREER' && (
            <form onSubmit={(e) => handleCreerOuConnecterEcole(e, 'CREER')} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={styles.label}>Nom du nouvel établissement</label><input type="text" value={inputNomEcole} onChange={(e) => setInputNomEcole(e.target.value)} className="champ-saisie" required /></div>
              <div><label style={styles.label}>Année Scolaire</label><input type="text" value={inputAnneeScolaire} onChange={(e) => setInputAnneeScolaire(e.target.value)} className="champ-saisie" required /></div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModeSetup('CHOIX')} className="bouton bouton-secondaire">Retour</button>
                <button type="submit" className="bouton bouton-principal">Valider la création</button>
              </div>
            </form>
          )}

          {modeSetup === 'CONNECTER' && (
            <form onSubmit={(e) => handleCreerOuConnecterEcole(e, 'CONNECTER')} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={styles.label}>Nom de l'établissement existant</label><input type="text" value={inputNomEcole} onChange={(e) => setInputNomEcole(e.target.value)} className="champ-saisie" required /></div>
              <div><label style={styles.label}>Année Scolaire</label><input type="text" value={inputAnneeScolaire} onChange={(e) => setInputAnneeScolaire(e.target.value)} className="champ-saisie" required /></div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModeSetup('CHOIX')} className="bouton bouton-secondaire">Retour</button>
                <button type="submit" className="bouton bouton-principal">Se connecter</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- DASHBOARD PRINCIPAL ---
  return (
    <div style={styles.container}>
      <style>{`
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .bouton { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 14px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: none; transition: all 0.2s ease; }
        .bouton-principal { background-color: #2563eb; color: white; }
        .bouton-principal:hover { background-color: #1d4ed8; }
        .bouton-succes { background-color: #16a34a; color: white; }
        .bouton-succes:hover { background-color: #15803d; }
        .bouton-danger { background-color: #ef4444; color: white; }
        .bouton-danger:hover { background-color: #dc2626; }
        .bouton-secondaire { background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
        .bouton-secondaire:hover { background-color: #e2e8f0; }
        .champ-saisie { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; background-color: #fff; color: #1e293b; outline: none; }
        .fond-modale { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        @keyframes apparition { from { opacity: 0; } to { opacity: 1; } }
        .anim-apparition { animation: apparition 0.2s ease-out forwards; }
        .pastille-alerte { background-color: #ef4444; color: white; padding: 2px 6px; border-radius: 999px; font-size: 10px; font-weight: 700; }
      `}</style>

      {/* EN-TÊTE NAVBAR CHEF D'ÉTABLISSEMENT */}
      <header style={styles.darkNavbar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', width: '100%' }}>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }} ref={profilChefRef}>
              <button onClick={() => setProfilChefOuvert(!profilChefOuvert)} style={styles.navbarTeacherClickableBlock}>
                <div style={styles.avatarNavbarContainer}>
                  {infosChef?.photoProfil ? (
                    <img src={infosChef.photoProfil} alt="Profil Chef" style={styles.avatarNavbarImg} />
                  ) : (
                    <div style={styles.avatarNavbarPlaceholder}>👤</div>
                  )}
                </div>
                <div style={styles.navbarTeacherInfo}>
                  <span style={styles.navbarTeacherName}>{infosChef?.civilite || ''} {infosChef?.nom || ''} {infosChef?.prenoms || ''}</span>
                  <span style={styles.navbarTeacherDetails}>{infosChef?.role || 'Chef d’Établissement'}</span>
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '4px' }}>{profilChefOuvert ? '▲' : '▼'}</span>
              </button>

              {profilChefOuvert && (
                <div style={styles.notificationDropdown} className="anim-apparition">
                  <div style={styles.dropdownHeader}>Mon Compte Directeur</div>
                  <div style={{ padding: '8px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #e2e8f0', marginBottom: '6px' }}>
                    <strong>{infosChef?.civilite || ''} {infosChef?.nom || ''} {infosChef?.prenoms || ''}</strong><br />
                    <span style={{ color: '#64748b', fontSize: '11px' }}>{infosChef?.etablissement || ecoleConfig?.nomEcole || ''}</span>
                  </div>
                  <button onClick={() => { setFormProfilChef({ ...(infosChef || {}) }); setModalProfilChefOuvert(true); setProfilChefOuvert(false); }} style={styles.optionMenu}>
                    ⚙️ Modifier mon profil & photo
                  </button>
                  <button onClick={() => { setModalConfirmationQuitter(true); setProfilChefOuvert(false); }} style={{ ...styles.optionMenu, color: '#ef4444' }}>
                    🚪 Quitter l'établissement / Changer
                  </button>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }} ref={notifChefRef}>
              <button onClick={() => setNotifChefOuvert(!notifChefOuvert)} style={styles.navDarkBtn}>
                <span>🔔 Rapports Censeurs</span>
                {(notificationsChef || []).filter(n => n && !n.lu).length > 0 && <span className="pastille-alerte">{(notificationsChef || []).filter(n => n && !n.lu).length}</span>}
              </button>
              {notifChefOuvert && (
                <div style={styles.notificationDropdown} className="anim-apparition">
                  <div style={styles.dropdownHeader}>Notifications des Rapports</div>
                  {(notificationsChef || []).map(n => n ? (
                    <div key={n.id} style={styles.notifItem}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#334155' }}>{n.texte}</p>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          </div>

          <div style={styles.schoolTitleContainer}>
            <span style={styles.schoolMainTitle}>{ecoleConfig?.nomEcole || infosChef?.etablissement || 'Établissement non défini'}</span>
          </div>

          <div style={styles.navActionsRight}>
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button onClick={() => setMenuOuvert(!menuOuvert)} style={styles.navDarkBtn}>
                <span>⚙️ Navigation</span>
                <span style={{ fontSize: '10px' }}>{menuOuvert ? '▲' : '▼'}</span>
              </button>
              {menuOuvert && (
                <div style={{ ...styles.multitaskDropdown, right: 0, left: 'auto' }} className="anim-apparition">
                  <button onClick={() => { setActiveTab('censeurs'); setMenuOuvert(false); }} className={`option-menu ${activeTab === 'censeurs' ? 'actif' : ''}`}>👨‍💼 Gestion des Censeurs</button>
                  <button onClick={() => { setActiveTab('stats'); setMenuOuvert(false); }} className={`option-menu ${activeTab === 'stats' ? 'actif' : ''}`}>📊 Statistiques & Rapports</button>
                  <button onClick={() => { setActiveTab('archive'); setMenuOuvert(false); }} className={`option-menu ${activeTab === 'archive' ? 'actif' : ''}`}>📁 Archive Pédagogique</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main style={styles.mainContentBody}>
        {message && <div style={styles.toastSuccess}>{message}</div>}

        {/* MODAL PROFIL CHEF */}
        {modalProfilChefOuvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.cardWide, width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 14px 0', color: '#0f172a' }}>👤 Paramètres du Profil & Photo</h3>
              <form onSubmit={handleEnregistrerProfilChef} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                    {formProfilChef?.photoProfil ? (
                      <img src={formProfilChef.photoProfil} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '28px' }}>👤</span>
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>Photo de profil</label>
                    <input type="file" accept="image/*" onChange={handleChangerPhotoProfilChef} style={{ fontSize: '11px' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>Civilité</label>
                    <select value={formProfilChef?.civilite || ''} onChange={(e) => setFormProfilChef({...formProfilChef, civilite: e.target.value})} className="champ-saisie">
                      <option value="M.">M.</option><option value="Mme">Mme</option><option value="Dr">Dr</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Nom</label>
                    <input type="text" value={formProfilChef?.nom || ''} onChange={(e) => setFormProfilChef({...formProfilChef, nom: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>
                <div><label style={styles.label}>Prénoms</label><input type="text" value={formProfilChef?.prenoms || ''} onChange={(e) => setFormProfilChef({...formProfilChef, prenoms: e.target.value})} className="champ-saisie" required /></div>
                <div><label style={styles.label}>Établissement</label><input type="text" value={formProfilChef?.etablissement || ''} onChange={(e) => setFormProfilChef({...formProfilChef, etablissement: e.target.value})} className="champ-saisie" required /></div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalProfilChefOuvert(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CONFIRMATION TERMINER ANNÉE */}
        {modalConfirmationTerminer && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.cardWide, width: '420px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#991b1b' }}>⚠️ Confirmation requise</h3>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>Êtes-vous sûr de vouloir <strong>terminer l'année scolaire</strong> ?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalConfirmationTerminer(false)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={confirmerTerminerAnnee} className="bouton bouton-danger">Oui, terminer l'année</button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE CONFIRMATION QUITTER ÉCOLE */}
        {modalConfirmationQuitter && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.cardWide, width: '420px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#991b1b' }}>⚠️ Quitter l'établissement</h3>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>Êtes-vous sûr de vouloir <strong>quitter cet établissement</strong> ?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalConfirmationQuitter(false)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={confirmerQuitterEcole} className="bouton bouton-danger">Oui, quitter l'école</button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE POUR ADRESSER UNE PROPOSITION D'AFFILIATION ENRICHIE */}
        {modalProposition.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.cardWide, width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>✉️ Nouvelle Proposition d'Affiliation</h3>
                <button onClick={() => setModalProposition({ ouvert: false, civilite: 'M.', nom: '', prenoms: '', dateNaissance: '', telephone: '', email: '', matricule: '', niveauCharge: '' })} className="bouton bouton-secondaire" style={{ padding: '4px 8px' }}>✕</button>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Veuillez remplir les informations d'identification complètes pour éviter tout doublon ou conflit d'intérêt.</p>
              <form onSubmit={envoyerPropositionCenseur} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>Civilité</label>
                    <select value={modalProposition.civilite} onChange={(e) => setModalProposition(prev => ({ ...prev, civilite: e.target.value }))} className="champ-saisie">
                      <option value="M.">M.</option><option value="Mme">Mme</option><option value="Dr">Dr</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Nom de famille</label>
                    <input type="text" placeholder="Ex: Touré" value={modalProposition.nom} onChange={(e) => setModalProposition(prev => ({ ...prev, nom: e.target.value }))} className="champ-saisie" required />
                  </div>
                  <div>
                    <label style={styles.label}>Prénoms</label>
                    <input type="text" placeholder="Ex: Alpha" value={modalProposition.prenoms} onChange={(e) => setModalProposition(prev => ({ ...prev, prenoms: e.target.value }))} className="champ-saisie" required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>N° Matricule (MENA)</label>
                    <input type="text" placeholder="Identifiant unique" value={modalProposition.matricule} onChange={(e) => setModalProposition(prev => ({ ...prev, matricule: e.target.value }))} className="champ-saisie" required />
                  </div>
                  <div>
                    <label style={styles.label}>Date de naissance</label>
                    <input type="date" value={modalProposition.dateNaissance} onChange={(e) => setModalProposition(prev => ({ ...prev, dateNaissance: e.target.value }))} className="champ-saisie" required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>Numéro de téléphone</label>
                    <input type="tel" placeholder="Ex: 0102030405" value={modalProposition.telephone} onChange={(e) => setModalProposition(prev => ({ ...prev, telephone: e.target.value }))} className="champ-saisie" required />
                  </div>
                  <div>
                    <label style={styles.label}>Email professionnel</label>
                    <input type="email" placeholder="Ex: toure@ecole.ci" value={modalProposition.email} onChange={(e) => setModalProposition(prev => ({ ...prev, email: e.target.value }))} className="champ-saisie" required />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Niveaux ou classes à sa charge</label>
                  <input type="text" placeholder="Ex: 6ème et 5ème" value={modalProposition.niveauCharge} onChange={(e) => setModalProposition(prev => ({ ...prev, niveauCharge: e.target.value }))} className="champ-saisie" required />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                  <button type="button" onClick={() => setModalProposition({ ouvert: false, civilite: 'M.', nom: '', prenoms: '', dateNaissance: '', telephone: '', email: '', matricule: '', niveauCharge: '' })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Générer et envoyer l'invitation</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODALE DE RETRAIT D'UN CENSEUR */}
        {modalRetraitCenseur.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.cardWide, width: '420px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#991b1b' }}>⚠️ Retirer l'affiliation</h3>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
                Êtes-vous sûr de vouloir <strong>retirer l'affiliation du censeur {modalRetraitCenseur.censeurNom}</strong> à votre établissement ?
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalRetraitCenseur({ ouvert: false, censeurId: null, censeurNom: '' })} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={confirmerRetraitCenseur} className="bouton bouton-danger">Oui, retirer l'affiliation</button>
              </div>
            </div>
          </div>
        )}

        {/* CARTES STATISTIQUES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '24px' }}>🏫</span>
            <h4 style={{ margin: '8px 0 4px 0', fontSize: '15px', color: '#64748b' }}>Nombre total de Classes</h4>
            <p style={{ fontSize: '26px', fontWeight: '800', color: '#2563eb', margin: 0 }}>{statistiquesReseau.totalClasses}</p>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '24px' }}>👥</span>
            <h4 style={{ margin: '8px 0 4px 0', fontSize: '15px', color: '#64748b' }}>Personnes Connectées au Réseau</h4>
            <p style={{ fontSize: '26px', fontWeight: '800', color: '#16a34a', margin: 0 }}>{statistiquesReseau.totalPersonnesConnectees}</p>
          </div>
        </div>

        {/* ONGLET : GESTION DES CENSEURS */}
        {activeTab === 'censeurs' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>👨‍💼 Gestion des Censeurs & Affiliations</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Supervisez l'équipe de direction ou invitez de nouveaux censeurs par Matricule.</p>
              </div>
              <button 
                onClick={() => setModalProposition({ ouvert: true, civilite: 'M.', nom: '', prenoms: '', dateNaissance: '', telephone: '', email: '', matricule: '', niveauCharge: '' })} 
                className="bouton bouton-principal"
              >
                + Adresser une proposition d'affiliation
              </button>
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '12px', marginTop: '24px' }}>Censeurs affiliés / En attente</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(censeursAffiliations || []).length === 0 ? (
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#94a3b8' }}>Aucune demande ni censeur affilié.</p>
              ) : (
                (censeursAffiliations || []).map(cen => cen ? (
                  <div key={cen.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <strong style={{ color: '#1e40af', fontSize: '15px' }}>{cen.nomComplet}</strong> <span style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>Matricule: {cen.matricule || 'N/A'}</span><br/>
                      <small style={{ color: '#475569', display: 'block', marginTop: '4px' }}>Niveaux : {cen.niveauCharge} | Tél : {cen.telephone || 'N/A'} | Email : {cen.email}</small>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', backgroundColor: cen.statut === 'Validé' ? '#dcfce7' : '#fef3c7', color: cen.statut === 'Validé' ? '#166534' : '#92400e', marginRight: '8px' }}>
                        {cen.statut}
                      </span>
                      {cen.statut !== 'Validé' ? (
                        <>
                          <button onClick={() => validerCenseur(cen.id)} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '11px' }}>Valider</button>
                          <button onClick={() => rejeterCenseur(cen.id)} className="bouton bouton-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>Rejeter</button>
                        </>
                      ) : (
                        <button onClick={() => setModalRetraitCenseur({ ouvert: true, censeurId: cen.id, censeurNom: cen.nomComplet })} className="bouton bouton-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>Retirer l'affiliation</button>
                      )}
                    </div>
                  </div>
                ) : null)
              )}
            </div>

            {(propositionsEnvoyees || []).length > 0 && (
              <>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '12px', marginTop: '30px' }}>Invitations envoyées (En attente de réponse)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(propositionsEnvoyees || []).map(prop => prop ? (
                    <div key={prop.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef3c7', padding: '14px', borderRadius: '8px', border: '1px solid #fde68a', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <strong style={{ color: '#92400e' }}>{prop.censeurCible}</strong> <span style={{ fontSize: '11px', color: '#b45309', backgroundColor: '#fefce8', padding: '2px 6px', borderRadius: '4px' }}>Matricule: {prop.matricule || 'N/A'}</span><br/>
                        <small style={{ color: '#b45309', display: 'block', marginTop: '4px' }}>Niveaux : {prop.niveauCharge} | Email : {prop.email || 'N/A'}</small>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#b45309' }}>⏳ En attente de sa connexion</span>
                      </div>
                    </div>
                  ) : null)}
                </div>
              </>
            )}
          </div>
        )}

        {/* ONGLET : STATISTIQUES & RAPPORTS */}
        {activeTab === 'stats' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>📊 Statistiques Globales de l'Établissement</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Rapports consolidés transmis par vos censeurs pédagogiques.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '24px' }}>📈</span>
                <h4 style={{ margin: '8px 0 4px 0', fontSize: '15px' }}>Rapports reçus</h4>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#2563eb', margin: 0 }}>{Object.keys(rapportsCenseurs || {}).length}</p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '24px' }}>📚</span>
                <h4 style={{ margin: '8px 0 4px 0', fontSize: '15px' }}>Fiches Globales Archivées</h4>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#16a34a', margin: 0 }}>{(archiveEcole || []).length}</p>
              </div>
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>Détails des Rapports Transmis par les Censeurs</h3>
            {Object.keys(rapportsCenseurs || {}).length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px' }}>Aucun rapport transmis par les censeurs pour le moment.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(rapportsCenseurs || {}).map(([cle, rapport]) => (
                  <div key={cle} style={{ backgroundColor: '#e0f2fe', padding: '14px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ color: '#0369a1', fontSize: '14px' }}>Rapport de : {rapport.censeur}</strong>
                      <span style={{ fontSize: '11px', color: '#0284c7' }}>Date : {rapport.date}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#0f172a' }}>
                      <strong>Classes concernées :</strong> {(rapport.classes || []).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET : ARCHIVE GLOBALE DE L'ÉTABLISSEMENT */}
        {activeTab === 'archive' && (
          <div style={styles.cardWide}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>📁 Archive Pédagogique Globale</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Base d'archives centralisée contenant toutes les fiches validées de l'établissement.</p>
              </div>
            </div>

            <div style={styles.bibliothequeFilterBox}>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.labelFiltre}>Classe</label>
                <select value={filtreArchiveClasse} onChange={(e) => setFiltreArchiveClasse(e.target.value)} className="champ-saisie">
                  <option value="TOUTES">Toutes les classes</option>
                  {Array.from(new Set((archiveEcole || []).map(a => a.classe))).map(cl => <option key={cl} value={cl}>{cl}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 240px' }}>
                <label style={styles.labelFiltre}>Enseignant</label>
                <select value={filtreArchiveEnseignant} onChange={(e) => setFiltreArchiveEnseignant(e.target.value)} className="champ-saisie">
                  <option value="TOUS">Tous les enseignants</option>
                  {Array.from(new Set((archiveEcole || []).map(a => a.enseignant))).map(ens => <option key={ens} value={ens}>{ens}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              {(archiveFiltree || []).length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '30px' }}>L'archive globale est vide pour ces critères.</p>
              ) : (
                (archiveFiltree || []).map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>{item.classe}</span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{item.titre}</strong>
                      </div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Enseignant : <strong>{item.enseignant}</strong> | Validé le : {item.dateValidation}</p>
                    </div>
                    <div>
                      <button onClick={() => telechargerPDFArchive(item)} className="bouton bouton-principal" style={{ padding: '6px 12px', fontSize: '11px' }}>📥 Télécharger (PDF)</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f1f5f9', minHeight: '100vh', color: '#1e293b' },
  setupContainer: { backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
  setupCard: { backgroundColor: '#ffffff', padding: '36px', borderRadius: '14px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' },
  darkNavbar: { backgroundColor: '#0f172a', color: '#ffffff', padding: '16px 30px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' },
  topBarMainRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  navbarAppTitle: { fontSize: '18px', fontWeight: '700', margin: 0, color: '#ffffff' },
  schoolTitleContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 },
  schoolMainTitle: { fontSize: '18px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase' },
  bottomBarRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' },
  mainContentBody: { padding: '30px', maxWidth: '1280px', margin: '0 auto' },
  cardWide: { backgroundColor: '#ffffff', padding: '32px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  label: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' },
  toastSuccess: { backgroundColor: '#1e293b', color: '#f8fafc', padding: '14px 22px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: '600' },
  navbarTeacherClickableBlock: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', textAlign: 'left' },
  avatarNavbarContainer: { width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #475569', flexShrink: 0 },
  avatarNavbarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarNavbarPlaceholder: { fontSize: '16px', color: '#94a3b8' },
  navbarTeacherInfo: { display: 'flex', flexDirection: 'column' },
  navbarTeacherName: { fontSize: '12px', fontWeight: '700', color: '#ffffff' },
  navbarTeacherDetails: { fontSize: '10px', color: '#94a3b8' },
  notificationDropdown: { position: 'absolute', top: '48px', left: 0, backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', width: '300px', zIndex: 100, padding: '10px' },
  dropdownHeader: { padding: '4px 8px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
  optionMenu: { width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', border: 'none', color: '#334155', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s', borderRadius: '6px' },
  notifItem: { backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '12px', marginBottom: '4px' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
  navActionsRight: { display: 'flex', gap: '12px', alignItems: 'center' },
  multitaskDropdown: { position: 'absolute', top: '44px', right: 0, backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', width: '280px', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '6px' },
  bibliothequeFilterBox: { display: 'flex', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap' },
  sectionHeader: { marginBottom: '20px' }
};
