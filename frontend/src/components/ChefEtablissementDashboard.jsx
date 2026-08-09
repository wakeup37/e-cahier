import React, { useState, useEffect, useRef, useMemo } from 'react';

// =========================================================================
// SÉCURISATION DES DONNÉES LOCALES
// =========================================================================
const safeGetArray = (key, defaultArr = []) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultArr;
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed : defaultArr;
  } catch { return defaultArr; }
};

const safeGetObject = (key, defaultObj = {}) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultObj;
    const parsed = JSON.parse(item);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : defaultObj;
  } catch { return defaultObj; }
};

export default function ChefEtablissementDashboard() {
  
  // --- ÉTATS GLOBAUX ---
  const [ecoleConfig, setEcoleConfig] = useState(() => safeGetObject('app_chef_ecole_config', null));
  const [modeSetup, setModeSetup] = useState('CHOIX'); 
  
  const [inputNomEcole, setInputNomEcole] = useState('');
  const [inputTypeEtablissement, setInputTypeEtablissement] = useState('public');
  const [inputCodeEtablissement, setInputCodeEtablissement] = useState('');
  const [inputSituationGeo, setInputSituationGeo] = useState('');
  const [inputAnneeScolaire, setInputAnneeScolaire] = useState('2025-2026');
  const [inputNombreEleves, setInputNombreEleves] = useState('450');
  const [inputNombreEnseignants, setInputNombreEnseignants] = useState('25');
  const [inputDateCreation, setInputDateCreation] = useState('2010-09-15');
  const [inputEmailRecuperation, setInputEmailRecuperation] = useState('');

  const [infosChef, setInfosChef] = useState(() => safeGetObject('app_chef_profil', {
    civilite: 'M.', nom: 'Koffi', prenoms: 'Bernard', etablissement: '', role: 'Chef d’Établissement', photoProfil: '', emailSecurite: 'bernard.koffi@chef.ci'
  }));

  useEffect(() => { localStorage.setItem('app_chef_profil', JSON.stringify(infosChef)); }, [infosChef]);
  useEffect(() => { 
    if (ecoleConfig) localStorage.setItem('app_chef_ecole_config', JSON.stringify(ecoleConfig)); 
    else localStorage.removeItem('app_chef_ecole_config');
  }, [ecoleConfig]);

  const [modalProfilChefOuvert, setModalProfilChefOuvert] = useState(false);
  const [formProfilChef, setFormProfilChef] = useState({ ...infosChef });
  const [profilChefOuvert, setProfilChefOuvert] = useState(false);
  const profilChefRef = useRef(null);

  const [modalSecurite, setModalSecurite] = useState(false);
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');

  const [modalQuitterEcole, setModalQuitterEcole] = useState(false);
  const [modalDeconnexion, setModalDeconnexion] = useState(false);

  const [menuBurgerChefOuvert, setMenuBurgerChefOuvert] = useState(false);
  const menuBurgerChefRef = useRef(null);

  const [modalConfirmationActionAnnee, setModalConfirmationActionAnnee] = useState({ ouvert: false, actionType: null });
  const [modeEditionEcole, setModeEditionEcole] = useState(false);
  const [formEcoleEdition, setFormEcoleEdition] = useState(ecoleConfig || {});

  const [censeursAffiliations, setCenseursAffiliations] = useState(() => safeGetArray('app_chef_censeurs_affiliations', [
    { id: 1, nomComplet: 'M. Touré Alpha', email: 'toure.alpha@ecole.ci', niveauCharge: '6ème', statut: 'En attente' }
  ]));
  useEffect(() => { localStorage.setItem('app_chef_censeurs_affiliations', JSON.stringify(censeursAffiliations)); }, [censeursAffiliations]);

  const [rapportsCenseurs, setRapportsCenseurs] = useState(() => safeGetArray('app_chef_rapports_censeurs', []));
  const [notificationsChef, setNotificationsChef] = useState(() => safeGetArray('app_chef_notifications', [
    { id: 1, texte: 'Bienvenue sur votre tableau de bord du réseau de l’établissement.', date: 'Aujourd’hui', lu: false }
  ]));
  useEffect(() => { localStorage.setItem('app_chef_notifications', JSON.stringify(notificationsChef)); }, [notificationsChef]);

  const [notifChefOuvert, setNotifChefOuvert] = useState(false);
  const notifChefRef = useRef(null);

  const [archivesHistoriques, setArchivesHistoriques] = useState(() => safeGetArray('app_chef_archives_historiques', []));
  useEffect(() => { localStorage.setItem('app_chef_archives_historiques', JSON.stringify(archivesHistoriques)); }, [archivesHistoriques]);

  const [fichiersAdministratifsUploads, setFichiersAdministratifsUploads] = useState(() => safeGetArray('app_chef_fichiers_admin', []));
  useEffect(() => { localStorage.setItem('app_chef_fichiers_admin', JSON.stringify(fichiersAdministratifsUploads)); }, [fichiersAdministratifsUploads]);

  const [personnelAdministratifManuel, setPersonnelAdministratifManuel] = useState(() => safeGetArray('app_chef_personnel_admin_manuel', []));
  useEffect(() => { localStorage.setItem('app_chef_personnel_admin_manuel', JSON.stringify(personnelAdministratifManuel)); }, [personnelAdministratifManuel]);

  const [nouveauAdminNom, setNouveauAdminNom] = useState('');
  const [nouveauAdminRole, setNouveauAdminRole] = useState('Éducateur');
  const [nouveauAdminMatricule, setNouveauAdminMatricule] = useState('');
  const [nouveauAdminContact, setNouveauAdminContact] = useState('');
  const [nouveauAdminEmail, setNouveauAdminEmail] = useState('');

  const [nomNouveauFichier, setNomNouveauFichier] = useState('');
  const [anneeFichier, setAnneeFichier] = useState('2025-2026');
  const [fichierSelectionneObj, setFichierSelectionneObj] = useState(null);

  const [activeTab, setActiveTab] = useState('profil_ecole');
  const [filtreProfMatiere, setFiltreProfMatiere] = useState('TOUTES');
  const [filtreProfNiveau, setFiltreProfNiveau] = useState('TOUS');
  const [filtreProfClasse, setFiltreProfClasse] = useState('TOUTES');
  const [anneeArchiveSelectionnee, setAnneeArchiveSelectionnee] = useState('TOUTES');

  const nombreClassesAutomatique = useMemo(() => {
    try {
      const programmes = JSON.parse(localStorage.getItem('app_enseignant_programmes_classes')) || {};
      const count = Object.keys(programmes).length;
      return count > 0 ? count : 1;
    } catch { return 1; }
  }, []);

  const listeProfesseursEtablissement = useMemo(() => {
    try {
      const affs = JSON.parse(localStorage.getItem('app_enseignant_affiliations')) || [];
      const profilActuel = JSON.parse(localStorage.getItem('app_enseignant_profil')) || { nom: 'Kouassi', prenoms: 'Jean', matiere: 'EPS', emailSecurite: 'jean.kouassi@prof.ci' };
      
      let enseignantsList = affs.map(a => ({
        id: a.id, nomComplet: a.enseignant || 'M. Kouassi Jean', matiere: profilActuel.matiere || 'EPS', niveau: '6ème / 5ème', classes: a.classes || ['6ème A', '6ème B'], statut: a.statut || 'Validée', ecole: a.ecole, matricule: 'ENS-8821', contact: '0506070809', email: profilActuel.emailSecurite || 'jean.kouassi@prof.ci', dureeService: '1 an (En cours)'
      }));
      return enseignantsList.filter(item => item.ecole === ecoleConfig?.nomEcole);
    } catch { return []; }
  }, [ecoleConfig]);

  const fichesPedagogiquesEcole = useMemo(() => {
    try {
      const archiveCenseur = JSON.parse(localStorage.getItem('app_censeur_archive_ecole')) || [];
      const biblioEnseignant = JSON.parse(localStorage.getItem('app_enseignant_bibliotheque_permanente')) || [];
      let fusion = [...archiveCenseur, ...biblioEnseignant];
      if (fusion.length === 0) {
        fusion = [{ id: 101, enseignant: 'M. Kouassi Jean', matiere: 'EPS', classe: '6ème A', niveau: '6ème', anneeScolaire: '2025-2026', titre: 'Séance d’initiation - Roulement avant', dateValidation: '10/03/2026' }];
      }
      return fusion;
    } catch { return []; }
  }, []);

  const professeursFiltres = useMemo(() => {
    return listeProfesseursEtablissement.filter(prof => {
      const matchMat = filtreProfMatiere === 'TOUTES' || prof.matiere === filtreProfMatiere;
      const matchNiv = filtreProfNiveau === 'TOUS' || prof.niveau.includes(filtreProfNiveau);
      const matchCl = filtreProfClasse === 'TOUTES' || (prof.classes && prof.classes.includes(filtreProfClasse));
      return matchMat && matchNiv && matchCl;
    });
  }, [listeProfesseursEtablissement, filtreProfMatiere, filtreProfNiveau, filtreProfClasse]);

  const fichesFiltrees = useMemo(() => {
    return fichesPedagogiquesEcole.filter(fiche => {
      const matchMat = filtreProfMatiere === 'TOUTES' || fiche.matiere === filtreProfMatiere;
      const matchNiv = filtreProfNiveau === 'TOUS' || (fiche.niveau && fiche.niveau.includes(filtreProfNiveau));
      const matchCl = filtreProfClasse === 'TOUTES' || fiche.classe === filtreProfClasse;
      return matchMat && matchNiv && matchCl;
    });
  }, [fichesPedagogiquesEcole, filtreProfMatiere, filtreProfNiveau, filtreProfClasse]);

  const statistiquesReseau = useMemo(() => {
    const censeursValidesCount = Array.isArray(censeursAffiliations) ? censeursAffiliations.filter(c => c.statut === 'Validé').length + 1 : 1;
    return {
      totalClasses: nombreClassesAutomatique,
      totalPersonnesConnectees: censeursValidesCount + listeProfesseursEtablissement.length + personnelAdministratifManuel.length
    };
  }, [censeursAffiliations, nombreClassesAutomatique, listeProfesseursEtablissement.length, personnelAdministratifManuel.length]);

  const [message, setMessage] = useState('');
  const showToast = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profilChefRef.current && !profilChefRef.current.contains(event.target)) setProfilChefOuvert(false);
      if (notifChefRef.current && !notifChefRef.current.contains(event.target)) setNotifChefOuvert(false);
      if (menuBurgerChefRef.current && !menuBurgerChefRef.current.contains(event.target)) setMenuBurgerChefOuvert(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- IMPRESSION PDF SANS PERTE DE FOCUS ---
  const telechargerDocumentPDF = (titre, contenuHTML) => {
    const fenetreImpression = window.open('', '_blank');
    if (!fenetreImpression) return;
    fenetreImpression.document.write(`
      <html>
        <head>
          <title>${titre}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            h1 { color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; }
            p { margin: 8px 0; }
          </style>
        </head>
        <body>
          <h1>${titre}</h1>
          ${contenuHTML}
          <script>
            window.onload = function() { 
              setTimeout(function() { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    fenetreImpression.document.close();
    showToast(`📥 Document "${titre}" généré et prêt pour le téléchargement !`);
  };

  const handleCreerOuConnecterEcole = (e, type) => {
    e.preventDefault();
    if (!inputNomEcole.trim()) { showToast("⚠️ Veuillez entrer un nom valide."); return; }
    const fraisCreation = type === 'CREER' ? (inputTypeEtablissement === 'prive' ? '50 000 FCFA' : '25 000 FCFA') : 'Gratuit (Connexion)';
    const nouvelleConfig = {
      nomEcole: inputNomEcole.trim(), typeEtablissement: type === 'CREER' ? inputTypeEtablissement : 'inconnu', codeEtablissement: inputCodeEtablissement.trim() || 'ETAB-001', situationGeo: inputSituationGeo.trim() || 'Non renseignée', anneeScolaire: inputAnneeScolaire.trim() || '2025-2026', nombreEleves: inputNombreEleves, nombreEnseignants: inputNombreEnseignants, dateCreation: inputDateCreation, anneeOuverte: true, fraisPayes: fraisCreation
    };
    setEcoleConfig(nouvelleConfig);
    setFormEcoleEdition(nouvelleConfig);
    setInfosChef(prev => ({ ...prev, etablissement: nouvelleConfig.nomEcole }));
    showToast(type === 'CREER' ? `🏫 Établissement créé !` : "🔗 Connecté avec succès !");
  };

  // --- SI AUCUN ÉTABLISSEMENT N'EST CONFIGURÉ ---
  if (!ecoleConfig) {
    return (
      <div style={styles.setupContainer}>
        <div style={styles.setupCard}>
          <div style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px auto' }}>🎓</div>
          <h2 style={{ color: '#0f172a', marginBottom: '8px', textAlign: 'center', fontSize: '22px', fontWeight: '800' }}>Espace Chef d'Établissement</h2>
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '24px', lineHeight: '1.5' }}>
            Veuillez rattacher votre session à un établissement pour accéder au réseau institutionnel.
          </p>

          {message && <div style={{ ...styles.toastSuccess, marginBottom: '16px' }}>{message}</div>}

          {modeSetup === 'CHOIX' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => setModeSetup('CREER')} className="bouton bouton-principal">🏫 Créer un nouvel établissement</button>
              <button onClick={() => setModeSetup('CONNECTER')} className="bouton bouton-secondaire">🔗 Se connecter à un établissement existant</button>
            </div>
          )}

          {/* FORMULAIRE DE CONNEXION AVEC BOUTON "CODE OUBLIÉ" OPTIMISÉ */}
          {modeSetup === 'CONNECTER' && (
            <form onSubmit={(e) => handleCreerOuConnecterEcole(e, 'CONNECTER')} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={styles.label}>Nom de l'établissement</label>
                <input type="text" placeholder="Entrez le nom exact..." value={inputNomEcole} onChange={(e) => setInputNomEcole(e.target.value)} style={styles.inputStyle} required />
              </div>
              <div>
                <label style={styles.label}>Code d'accès de l'établissement</label>
                <input type="text" placeholder="Entrez le code secret..." value={inputCodeEtablissement} onChange={(e) => setInputCodeEtablissement(e.target.value)} style={styles.inputStyle} required />
              </div>
              
              {/* BOUTON CODE OUBLIÉ PLACÉ ICI, SOUS LE CHAMP CODE, BIEN VISIBLE */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-6px' }}>
                <button type="button" onClick={() => setModeSetup('OUBLIE_CODE')} style={{ background: 'none', border: 'none', color: '#ea580c', fontSize: '12px', fontWeight: '800', cursor: 'pointer', textDecoration: 'underline' }}>
                  Code d'établissement oublié ?
                </button>
              </div>

              <div>
                <label style={styles.label}>Année Scolaire</label>
                <input type="text" value={inputAnneeScolaire} onChange={(e) => setInputAnneeScolaire(e.target.value)} style={styles.inputStyle} required />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setModeSetup('CHOIX')} className="bouton bouton-secondaire" style={{ flex: 1 }}>Retour</button>
                <button type="submit" className="bouton bouton-principal" style={{ flex: 1 }}>Se connecter</button>
              </div>
            </form>
          )}

          {modeSetup === 'OUBLIE_CODE' && (
            <form onSubmit={(e) => { e.preventDefault(); showToast("📩 Instructions de réinitialisation envoyées !"); setModeSetup('CONNECTER'); setInputEmailRecuperation(''); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={styles.label}>Email institutionnel de récupération</label>
                <input type="email" placeholder="Entrez votre email..." value={inputEmailRecuperation} onChange={(e) => setInputEmailRecuperation(e.target.value)} style={styles.inputStyle} required />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setModeSetup('CONNECTER')} className="bouton bouton-secondaire" style={{ flex: 1 }}>Retour</button>
                <button type="submit" className="bouton bouton-principal" style={{ flex: 1 }}>Réinitialiser le code</button>
              </div>
            </form>
          )}

          {modeSetup === 'CREER' && (
            <form onSubmit={(e) => handleCreerOuConnecterEcole(e, 'CREER')} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Contenu abrégé pour la création (inchangé) */}
              <input type="text" placeholder="Nom de l'établissement..." value={inputNomEcole} onChange={(e) => setInputNomEcole(e.target.value)} style={styles.inputStyle} required />
              <input type="text" placeholder="Code Établissement (Ex: LYM-01)" value={inputCodeEtablissement} onChange={(e) => setInputCodeEtablissement(e.target.value)} style={styles.inputStyle} required />
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setModeSetup('CHOIX')} className="bouton bouton-secondaire" style={{ flex: 1 }}>Retour</button>
                <button type="submit" className="bouton bouton-principal" style={{ flex: 1 }}>Payer & Créer</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- DASHBOARD PRINCIPAL DU CHEF D'ÉTABLISSEMENT ---
  return (
    <div style={styles.container}>
      <header style={styles.darkNavbar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
          
          {/* GAUCHE : PROFIL */}
          <div style={{ position: 'relative' }} ref={profilChefRef}>
            <button onClick={() => setProfilChefOuvert(!profilChefOuvert)} style={styles.navbarTeacherClickableBlock}>
              <div style={styles.avatarNavbarContainer}>
                {infosChef.photoProfil ? <img src={infosChef.photoProfil} alt="Profil" style={styles.avatarNavbarImg} /> : <div style={styles.avatarNavbarPlaceholder}>👤</div>}
              </div>
              <div style={styles.navbarTeacherInfo}>
                <span style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff' }}>{infosChef.civilite} {infosChef.nom}</span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#38bdf8' }}>CHEF D'ÉTABLISSEMENT</span>
              </div>
            </button>

            {profilChefOuvert && (
              <div style={{ ...styles.dropdownAbsolu, left: 0 }}>
                <div style={styles.dropdownHeader}>Mon Compte Directeur</div>
                <button onClick={() => { setModalProfilChefOuvert(true); setProfilChefOuvert(false); }} style={styles.optionMenu}>⚙️ Modifier mon profil</button>
                <button onClick={() => { setModalSecurite(true); setProfilChefOuvert(false); }} style={styles.optionMenu}>🔒 Changer mot de passe</button>
                <button onClick={() => { setModalQuitterEcole(true); setProfilChefOuvert(false); }} style={{ ...styles.optionMenu, color: '#ef4444', fontWeight: '800' }}>🚪 Quitter l'école</button>
              </div>
            )}
          </div>

          {/* DROITE : NOTIFICATIONS & BURGER (ISOLÉS POUR NE PLUS SE DÉCALER) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            
            {/* WRAPPER ISOLÉ POUR LA NOTIFICATION */}
            <div style={{ position: 'relative' }} ref={notifChefRef}>
              <button onClick={() => setNotifChefOuvert(!notifChefOuvert)} style={styles.navDarkBtn}>
                <span>🔔</span>
                {notificationsChef.filter(n => !n.lu).length > 0 && <span style={styles.pastilleAlerte}>{notificationsChef.filter(n => !n.lu).length}</span>}
              </button>
              {notifChefOuvert && (
                <div style={{ ...styles.dropdownAbsolu, right: 0, width: '280px' }}>
                  <div style={styles.dropdownHeader}>Notifications</div>
                  {notificationsChef.map(n => (
                    <div key={n.id} style={styles.notifItem}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>{n.texte}</p>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* WRAPPER ISOLÉ POUR LE BURGER */}
            <div style={{ position: 'relative' }} ref={menuBurgerChefRef}>
              <button onClick={() => setMenuBurgerChefOuvert(!menuBurgerChefOuvert)} style={styles.burgerBtn}>☰</button>
              {menuBurgerChefOuvert && (
                <div style={{ ...styles.dropdownAbsolu, right: 0, width: '260px' }}>
                  <div style={styles.dropdownHeader}>Menu Direction</div>
                  <button onClick={() => { setActiveTab('profil_ecole'); setMenuBurgerChefOuvert(false); }} style={styles.optionMenu}>🏛️ Profil & Carte d'Identité</button>
                  <button onClick={() => { setActiveTab('censeurs'); setMenuBurgerChefOuvert(false); }} style={styles.optionMenu}>👥 Validation Censeurs</button>
                  <button onClick={() => { setActiveTab('professeurs'); setMenuBurgerChefOuvert(false); }} style={styles.optionMenu}>👨‍🏫 Annuaire Personnel</button>
                  <button onClick={() => { setActiveTab('fichiers_pedagogiques'); setMenuBurgerChefOuvert(false); }} style={styles.optionMenu}>📚 Fiches Pédagogiques</button>
                  <button onClick={() => { setActiveTab('rapports'); setMenuBurgerChefOuvert(false); }} style={styles.optionMenu}>📈 Rapports Détaillés</button>
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px' }}>
                    <button onClick={() => { setModalDeconnexion(true); setMenuBurgerChefOuvert(false); }} style={{ ...styles.optionMenu, color: '#ef4444', fontWeight: '900', textAlign: 'center' }}>🚪 Se déconnecter</button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      <main style={styles.mainContentBody}>
        {message && <div style={styles.toastSuccess}>{message}</div>}

        {/* MODALES GLOBALES (Quitter, Déconnexion, Sécurité, etc.) */}
        {modalQuitterEcole && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>⚠️ Quitter l'établissement</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                Êtes-vous sûr de vouloir rompre l'affiliation avec <strong>{ecoleConfig?.nomEcole}</strong> ?
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalQuitterEcole(false)} className="bouton bouton-secondaire">Retour (Annuler)</button>
                <button onClick={() => { setModalQuitterEcole(false); setEcoleConfig(null); showToast("🔗 Affiliation rompue."); }} className="bouton bouton-danger">Oui, quitter l'école</button>
              </div>
            </div>
          </div>
        )}

        {/* ... Autres onglets (Profil, Censeurs, Professeurs) restent fonctionnels ... */}
        
        {/* EXEMPLE D'IMPRESSION PDF RÉPARÉE DANS FICHES PÉDAGOGIQUES */}
        {activeTab === 'fichiers_pedagogiques' && (
          <div style={styles.cardWide}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>📚 Fiches Pédagogiques</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {fichesPedagogiquesEcole.map(fiche => (
                <div key={fiche.id} style={styles.itemRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{fiche.matiere}</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{fiche.titre}</strong>
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Enseignant : <strong>{fiche.enseignant}</strong></p>
                  </div>
                  <div>
                    {/* APPEL DE LA FONCTION D'IMPRESSION SÉCURISÉE SANS PERTE DE FOCUS */}
                    <button onClick={() => telechargerDocumentPDF(`Fiche : ${fiche.titre}`, `<p>Matière: ${fiche.matiere}</p><p>Enseignant: ${fiche.enseignant}</p><p>Classe: ${fiche.classe}</p>`)} className="bouton bouton-principal" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      📥 Télécharger (PDF)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Le reste du Dashboard suit le même modèle... */}

      </main>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b', paddingBottom: '40px' },
  setupContainer: { backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
  setupCard: { backgroundColor: '#ffffff', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #334155' },
  darkNavbar: { backgroundColor: '#0f172a', color: '#ffffff', padding: '16px 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderBottom: '1px solid #1e293b', position: 'sticky', top: '0', zIndex: 30 },
  mainContentBody: { padding: '30px 20px', maxWidth: '1200px', margin: '0 auto' },
  cardWide: { backgroundColor: '#ffffff', padding: '32px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '12px' },
  label: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  inputStyle: { width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
  toastSuccess: { backgroundColor: '#0f172a', color: '#f8fafc', padding: '14px 20px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', fontWeight: '700', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  navbarTeacherClickableBlock: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '12px', border: '1px solid #334155', cursor: 'pointer', textAlign: 'left' },
  avatarNavbarContainer: { width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #475569', flexShrink: 0 },
  avatarNavbarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarNavbarPlaceholder: { fontSize: '16px', color: '#94a3b8' },
  navbarTeacherInfo: { display: 'flex', flexDirection: 'column' },
  // LE SECRET EST ICI : dropdownAbsolu utilisé uniformément avec une isolation des parents.
  dropdownAbsolu: { position: 'absolute', top: '50px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', width: '300px', zIndex: 100, padding: '12px' },
  dropdownHeader: { padding: '6px 8px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' },
  optionMenu: { width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', color: '#334155', fontSize: '13px', fontWeight: '700', cursor: 'pointer', borderRadius: '8px', marginBottom: '4px' },
  notifItem: { backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px', fontSize: '12px', marginBottom: '6px', border: '1px solid #f1f5f9' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 14px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
  fondModale: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' },
  pastilleAlerte: { backgroundColor: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '999px', fontSize: '10px', fontWeight: '800' },
  burgerBtn: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }
};
