import React, { useState, useMemo, useRef, useEffect } from 'react';
import Header from '../components/Header'; // Assure-toi que le chemin d'importation correspond à ton arborescence

export default function CenseurDashboard() {
  
  // --- PROFIL DU CENSEUR & SESSION (AVEC BLINDAGE) ---
  const [infosCenseur, setInfosCenseur] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_censeur_profil'));
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
    } catch {}
    return { civilite: 'M.', nom: 'Touré', prenoms: 'Alpha', etablissement: 'Lycée Moderne d’Abidjan', role: 'Censeur Pédagogique', niveauCharge: '6ème', photoProfil: '', statutCompte: 'En attente de validation par le Chef d’Établissement' };
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_censeur_profil', JSON.stringify(infosCenseur));
    } catch {}
  }, [infosCenseur]);

  const [modalProfilCenseurOuvert, setModalProfilCenseurOuvert] = useState(false);
  const [formProfilCenseur, setFormProfilCenseur] = useState({ ...(infosCenseur || {}) });
  const [modalConfirmationQuitter, setModalConfirmationQuitter] = useState(false);

  // --- SYNCHRONISATION AVEC LES DONNÉES ENSEIGNANTS ---
  const [affiliations, setAffiliations] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_enseignant_affiliations'));
      if (Array.isArray(saved)) return saved;
    } catch {}
    return [
      { id: 1, enseignant: 'M. Kouassi Jean', ecole: 'Lycée Moderne d’Abidjan', statut: 'En attente', classes: ['6ème A', '6ème B'], matricule: 'MENA-123456', email: 'kouassi@ecole.ci' }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_enseignant_affiliations', JSON.stringify(affiliations));
    } catch {}
  }, [affiliations]);

  const [programmesClasses, setProgrammesClasses] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_enseignant_programmes_classes'));
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
    } catch {}
    return {
      '6ème A': {
        anneeScolaire: '2025-2026', matiere: 'EPS', enseignant: 'M. Kouassi Jean', niveau: '6ème',
        cycles: [
          {
            id: 1, titre: 'Cycle 1 : Gymnastique au sol', competence: 'Coordonner ses mouvements.', dateDebut: '2026-01-10', dateFin: '2026-02-28', soumisAuCenseur: true, viseParCenseur: false,
            lecons: [
              { id: 101, titre: 'Leçon 1 : Les équilibres', nombreSeancesPrevues: 2, soumisAuCenseur: true, viseParCenseur: false, seances: [{ id: 1001, numero: 1, titre: 'Séance d’initiation', date: '2026-03-10', lieu: 'Gymnase A', habilites: 'Savoir enrouler sa tête.', contenus: 'Atelier sol matelas.', exercices: 'Roulé-boulé.', evaluations: 'Formative.', soumisAuCenseur: true, viseParCenseur: false }] }
            ]
          }
        ]
      }
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_enseignant_programmes_classes', JSON.stringify(programmesClasses));
    } catch {}
  }, [programmesClasses]);

  // --- RAPPORTS DE SÉANCES REPORTÉES TRANSMIS PAR LES ENSEIGNANTS ---
  const [rapportsReports, setRapportsReports] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_censeur_rapports_reports'));
      if (Array.isArray(saved)) return saved;
    } catch {}
    return [];
  });

  useEffect(() => {
    const handleStorageUpdate = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('app_censeur_rapports_reports'));
        if (Array.isArray(saved)) setRapportsReports(saved);
      } catch {}
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, []);

  // --- NOTIFICATIONS CENSEUR ---
  const [notificationsCenseur, setNotificationsCenseur] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_censeur_notifications'));
      if (Array.isArray(saved)) return saved;
    } catch {}
    return [
      { id: 1, texte: 'Votre compte censeur est soumis à la validation du Chef d’Établissement.', date: 'Aujourd\'hui', lu: false },
      { id: 2, texte: '📥 Nouvelle fiche soumise par M. Kouassi Jean (6ème A - EPS) en attente de validation.', date: 'Aujourd\'hui', lu: false }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_censeur_notifications', JSON.stringify(notificationsCenseur));
    } catch {}
  }, [notificationsCenseur]);

  // --- RAPPORTS TRANSMIS AU CHEF D'ÉTABLISSEMENT ---
  const [rapportsEnvoyesChef, setRapportsEnvoyesChef] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_censeur_rapports_chef'));
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_censeur_rapports_chef', JSON.stringify(rapportsEnvoyesChef));
    } catch {}
  }, [rapportsEnvoyesChef]);

  // --- ARCHIVE PÉDAGOGIQUE PERMANENTE DE L'ÉTABLISSEMENT ---
  const [archiveEcole, setArchiveEcole] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_censeur_archive_ecole'));
      if (Array.isArray(saved)) return saved;
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_censeur_archive_ecole', JSON.stringify(archiveEcole));
    } catch {}
  }, [archiveEcole]);

  // --- GESTION DES PROPOSITIONS D'AFFILIATION CENSEUR -> ENSEIGNANT ---
  const [propositionsEnvoyees, setPropositionsEnvoyees] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_enseignant_propositions'));
      if (Array.isArray(saved)) return saved;
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_enseignant_propositions', JSON.stringify(propositionsEnvoyees));
    } catch {}
  }, [propositionsEnvoyees]);

  // --- MODALE DE PROPOSITION ENRICHIE ---
  const [modalProposition, setModalProposition] = useState({
    ouvert: false,
    civilite: 'M.',
    nom: '',
    prenoms: '',
    dateNaissance: '',
    telephone: '',
    email: '',
    matricule: '',
    classesProposees: ''
  });

  // --- MODALE DE RETRAIT D'UN ENSEIGNANT ---
  const [modalRetraitEnseignant, setModalRetraitEnseignant] = useState({
    ouvert: false,
    enseignantId: null,
    enseignantNom: ''
  });

  const [activeTab, setActiveTab] = useState('visa');
  const [message, setMessage] = useState('');

  // Filtres pour l'onglet Visa
  const [visaClasseFiltre, setVisaClasseFiltre] = useState('TOUTES');
  const [visaMatiereFiltre, setVisaMatiereFiltre] = useState('TOUTES');
  const [visaSemaineFiltre, setVisaSemaineFiltre] = useState('TOUTES');

  const [classesSelectionneesRapport, setClassesSelectionneesRapport] = useState([]);

  // Modale pour consulter et modifier les classes d'une demande d'affiliation
  const [modalAffiliationConsult, setModalAffiliationConsult] = useState({
    ouvert: false, affiliation: null, classesModifiees: ''
  });

  const [elementsSelectionnes, setElementsSelectionnes] = useState([]);
  const [enseignantsSelectionnesRappel, setEnseignantsSelectionnesRappel] = useState([]);

  const [modalConsultation, setModalConsultation] = useState({
    ouvert: false, element: null, type: ''
  });

  const [filtreArchiveEnseignant, setFiltreArchiveEnseignant] = useState('TOUS');
  const [filtreArchiveAnnee, setFiltreArchiveAnnee] = useState('TOUTES');
  const [filtreArchiveClasse, setFiltreArchiveClasse] = useState('TOUTES');
  const [filtreArchiveMatiere, setFiltreArchiveMatiere] = useState('TOUTES');

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleEnregistrerProfilCenseur = (e) => {
    e.preventDefault();
    setInfosCenseur({ ...formProfilCenseur });
    setModalProfilCenseurOuvert(false);
    showToast("✅ Profil et photo du censeur mis à jour avec succès !");
  };

  const handleChangerPhotoProfilCenseur = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormProfilCenseur(prev => ({ ...prev, photoProfil: reader.result }));
    reader.readAsDataURL(file);
  };

  const confirmerQuitterEcole = () => {
    setInfosCenseur(prev => ({ ...prev, etablissement: '' }));
    setModalConfirmationQuitter(false);
    showToast("🔄 Vous avez quitté l'établissement.");
  };

  // Gestion de la déconnexion
  const handleLogout = () => {
    localStorage.removeItem('app_censeur_profil');
    showToast("🚪 Déconnexion réussie.");
    // Redirection possible vers la page de connexion ici si nécessaire
  };

  // --- ACTIONS DES AFFILIATIONS ---
  const ouvrirConsultationAffiliation = (aff) => {
    setModalAffiliationConsult({
      ouvert: true,
      affiliation: aff,
      classesModifiees: aff.classes ? aff.classes.join(', ') : ''
    });
  };

  const validerAffiliationModifiee = (e) => {
    e.preventDefault();
    const { affiliation, classesModifiees } = modalAffiliationConsult;
    const classesArray = classesModifiees.split(',').map(c => c.trim()).filter(Boolean);
    setAffiliations(prev => (prev || []).map(a => a.id === affiliation.id ? { ...a, statut: 'Validée', classes: classesArray } : a));
    setModalAffiliationConsult({ ouvert: false, affiliation: null, classesModifiees: '' });
    showToast("✅ Affiliation validée avec succès avec les classes mises à jour !");
  };

  const rejeterAffiliation = (id) => {
    setAffiliations(prev => (prev || []).filter(a => a.id !== id));
    showToast("❌ Demande d'affiliation rejetée.");
  };

  const confirmerRetraitEnseignant = () => {
    setAffiliations(prev => (prev || []).filter(a => a && a.id !== modalRetraitEnseignant.enseignantId));
    setModalRetraitEnseignant({ ouvert: false, enseignantId: null, enseignantNom: '' });
    showToast(`❌ Affiliation de l'enseignant ${modalRetraitEnseignant.enseignantNom} retirée avec succès.`);
  };

  const envoyerPropositionAffiliation = (e) => {
    e.preventDefault();
    if (!modalProposition.nom.trim() || !modalProposition.matricule.trim() || !modalProposition.email.trim()) {
      showToast("⚠️ Le nom, l'email et le matricule sont obligatoires.");
      return;
    }

    const nouvelleProp = {
      id: Date.now() + Math.random(),
      ecole: infosCenseur?.etablissement || 'Établissement inconnu',
      enseignantCible: `${modalProposition.civilite} ${modalProposition.nom} ${modalProposition.prenoms}`.trim(),
      matricule: modalProposition.matricule.trim(),
      dateNaissance: modalProposition.dateNaissance,
      telephone: modalProposition.telephone.trim(),
      email: modalProposition.email.trim(),
      classes: (modalProposition.classesProposees || '').split(',').map(c => c.trim()).filter(Boolean),
      censeurExpediteur: `${infosCenseur?.civilite || ''} ${infosCenseur?.nom || ''}`,
      statut: 'En attente'
    };

    setPropositionsEnvoyees(prev => [...(prev || []), nouvelleProp]);
    setModalProposition({
      ouvert: false, civilite: 'M.', nom: '', prenoms: '', dateNaissance: '', telephone: '', email: '', matricule: '', classesProposees: ''
    });
    showToast(`📩 Proposition d'affiliation envoyée à ${nouvelleProp.enseignantCible} avec succès !`);
  };

  const transmettreRapportSelectionne = () => {
    if (classesSelectionneesRapport.length === 0) {
      showToast("⚠️ Veuillez cocher au moins une classe ou un niveau pour le rapport.");
      return;
    }
    const cleRapport = classesSelectionneesRapport.sort().join('_');
    if (rapportsEnvoyesChef[cleRapport]) {
      showToast("⚠️ Le rapport pour cette sélection a déjà été transmis au Chef d'Établissement.");
      return;
    }
    setRapportsEnvoyesChef(prev => ({
      ...prev,
      [cleRapport]: {
        censeur: `${infosCenseur?.civilite || ''} ${infosCenseur?.nom || ''} ${infosCenseur?.prenoms || ''}`,
        classes: classesSelectionneesRapport,
        date: new Date().toISOString().split('T')[0],
        statut: 'Transmis'
      }
    }));
    showToast(`📤 Rapport des classes (${classesSelectionneesRapport.join(', ')}) transmis avec succès au Chef d'Établissement !`);
    setClassesSelectionneesRapport([]);
  };

  const viserElementUnique = (classeKey, cycleId, leconId = null, seanceId = null) => {
    const prog = programmesClasses[classeKey];
    if (!prog) return;

    let elementArchiveLibelle = '';
    const cyclesMaj = (prog.cycles || []).map(cy => {
      if (cy.id === cycleId) {
        if (!leconId) {
          elementArchiveLibelle = cy.titre;
          return { ...cy, viseParCenseur: true, statut: 'Visé / Validé' };
        }
        return {
          ...cy,
          lecons: (cy.lecons || []).map(lc => {
            if (lc.id === leconId) {
              if (!seanceId) {
                elementArchiveLibelle = lc.titre;
                return { ...lc, viseParCenseur: true, statut: 'Validée' };
              }
              return {
                ...lc,
                seances: (lc.seances || []).map(sc => {
                  if (sc.id === seanceId) {
                    elementArchiveLibelle = sc.titre;
                    setArchiveEcole(prev => [...(prev || []), {
                      id: Date.now() + Math.random(),
                      enseignant: prog.enseignant || 'Kouassi Jean',
                      matiere: prog.matiere || 'EPS',
                      classe: classeKey,
                      niveau: prog.niveau || '6ème',
                      anneeScolaire: prog.anneeScolaire || '2025-2026',
                      type: 'Séance',
                      titre: sc.titre,
                      dateValidation: new Date().toISOString().split('T')[0],
                      details: sc
                    }]);
                    return { ...sc, viseParCenseur: true, statut: 'Validée' };
                  }
                  return sc;
                })
              };
            }
            return lc;
          })
        };
      }
      return cy;
    });

    setProgrammesClasses({ ...programmesClasses, [classeKey]: { ...prog, cycles: cyclesMaj } });
    showToast(`✍️ "${elementArchiveLibelle}" a été visé et synchronisé pour tous les censeurs !`);
  };

  const viserSelectionMultiple = () => {
    if (elementsSelectionnes.length === 0) {
      showToast("Veuillez sélectionner au moins une fiche à viser.");
      return;
    }
    showToast(`✅ ${elementsSelectionnes.length} fiche(s) visée(s) et archivée(s) en masse avec succès !`);
    setElementsSelectionnes([]);
  };

  const rejeterSelectionMultiple = () => {
    if (elementsSelectionnes.length === 0) {
      showToast("Veuillez sélectionner au moins un élément.");
      return;
    }
    showToast(`❌ ${elementsSelectionnes.length} élément(s) rejeté(s).`);
    setElementsSelectionnes([]);
  };

  const envoyerRappelMultiple = () => {
    if (enseignantsSelectionnesRappel.length === 0) {
      showToast("Veuillez sélectionner au moins un enseignant.");
      return;
    }
    showToast(`✉️ Rappels envoyés avec succès à : ${enseignantsSelectionnesRappel.join(', ')}.`);
    setEnseignantsSelectionnesRappel([]);
  };

  const envoyerRappelEnseignant = (nomEnseignant) => {
    showToast(`✉️ Message de rappel envoyé avec succès à ${nomEnseignant} pour fiches manquantes.`);
  };

  const envoyerRappelGlobal = () => {
    showToast(`✉️ Rappel hebdomadaire de soumission de fiches envoyé à tous les enseignants en retard !`);
  };

  const telechargerPDFArchive = (item) => {
    const fenetreImpression = window.open('', '_blank');
    if (!fenetreImpression) {
      showToast("⚠️ Votre navigateur bloque les fenêtres pop-up.");
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
            <p>Fiche visée et validée</p>
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
    showToast("📥 Fiche téléchargée en PDF avec succès !");
  };

  const archiveFiltree = useMemo(() => {
    return (archiveEcole || []).filter(item => {
      if (!item) return false;
      const matchEns = filtreArchiveEnseignant === 'TOUS' || item.enseignant === filtreArchiveEnseignant;
      const matchAnnee = filtreArchiveAnnee === 'TOUTES' || item.anneeScolaire === filtreArchiveAnnee;
      const matchClasse = filtreArchiveClasse === 'TOUTES' || item.classe === filtreArchiveClasse;
      const matchMat = filtreArchiveMatiere === 'TOUTES' || item.matiere === filtreArchiveMatiere;
      return matchEns && matchAnnee && matchClasse && matchMat;
    });
  }, [archiveEcole, filtreArchiveEnseignant, filtreArchiveAnnee, filtreArchiveClasse, filtreArchiveMatiere]);

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

      {/* COMPOSANT HEADER CENTRALISÉ ET RESPONSIVE */}
      <Header 
        title="E-cahier !" 
        roleName={`Censeur Pédagogique - ${infosCenseur?.etablissement || 'Établissement'}`} 
        onLogout={handleLogout} 
      />

      {/* BARRE DE NAVIGATION SECONDAIRE DES ONGLETS CENSEUR */}
      <div style={{ backgroundColor: '#1e293b', padding: '10px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <button onClick={() => setActiveTab('visa')} className={`bouton ${activeTab === 'visa' ? 'bouton-principal' : 'bouton-secondaire'}`}>✍️ Visa & Validation</button>
        <button onClick={() => setActiveTab('affiliations')} className={`bouton ${activeTab === 'affiliations' ? 'bouton-principal' : 'bouton-secondaire'}`}>👨‍🏫 Enseignants affiliés</button>
        <button onClick={() => setActiveTab('archive')} className={`bouton ${activeTab === 'archive' ? 'bouton-principal' : 'bouton-secondaire'}`}>📁 Archive de l'École</button>
        <button onClick={() => setActiveTab('stats')} className={`bouton ${activeTab === 'stats' ? 'bouton-principal' : 'bouton-secondaire'}`}>📊 Statistiques & Progression</button>
        <button onClick={() => setActiveTab('suivi')} className={`bouton ${activeTab === 'suivi' ? 'bouton-principal' : 'bouton-secondaire'}`}>⏰ Suivi Hebdomadaire</button>
        
        <button 
          onClick={() => setModalConfirmationQuitter(true)} 
          style={{ ...styles.navDarkBtn, backgroundColor: '#7f1d1d', borderColor: '#991b1b', color: '#f8fafc' }}
          title="Se détacher de cet établissement"
        >
          🚪 Quitter l'école
        </button>
      </div>

      <main style={styles.mainContentBody}>
        {message && <div style={styles.toastSuccess}>{message}</div>}

        {/* MODAL DE CONFIRMATION POUR QUITTER L'ÉCOLE */}
        {modalConfirmationQuitter && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.cardWide, width: '420px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#991b1b' }}>⚠️ Quitter l'établissement</h3>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
                Êtes-vous sûr de vouloir <strong>quitter cet établissement</strong> ? Votre établissement actuel sera réinitialisé.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalConfirmationQuitter(false)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={confirmerQuitterEcole} className="bouton bouton-danger">Oui, quitter l'école</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL POUR ADRESSER UNE PROPOSITION D'AFFILIATION ENRICHIE */}
        {modalProposition.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.cardWide, width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>✉️ Nouvelle Proposition d'Affiliation</h3>
                <button onClick={() => setModalProposition({ ouvert: false, civilite: 'M.', nom: '', prenoms: '', dateNaissance: '', telephone: '', email: '', matricule: '', classesProposees: '' })} className="bouton bouton-secondaire" style={{ padding: '4px 8px' }}>✕</button>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Veuillez remplir les informations d'identification complètes pour éviter tout doublon ou conflit d'intérêt.</p>
              <form onSubmit={envoyerPropositionAffiliation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>Civilité</label>
                    <select value={modalProposition.civilite} onChange={(e) => setModalProposition(prev => ({ ...prev, civilite: e.target.value }))} className="champ-saisie">
                      <option value="M.">M.</option><option value="Mme">Mme</option><option value="Dr">Dr</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Nom de famille</label>
                    <input type="text" placeholder="Ex: Kouassi" value={modalProposition.nom} onChange={(e) => setModalProposition(prev => ({ ...prev, nom: e.target.value }))} className="champ-saisie" required />
                  </div>
                  <div>
                    <label style={styles.label}>Prénoms</label>
                    <input type="text" placeholder="Ex: Jean" value={modalProposition.prenoms} onChange={(e) => setModalProposition(prev => ({ ...prev, prenoms: e.target.value }))} className="champ-saisie" required />
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
                    <input type="email" placeholder="Ex: kouassi@ecole.ci" value={modalProposition.email} onChange={(e) => setModalProposition(prev => ({ ...prev, email: e.target.value }))} className="champ-saisie" required />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Classes proposées (séparées par des virgules)</label>
                  <input type="text" placeholder="Ex: 6ème A, 5ème B" value={modalProposition.classesProposees} onChange={(e) => setModalProposition(prev => ({ ...prev, classesProposees: e.target.value }))} className="champ-saisie" required />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                  <button type="button" onClick={() => setModalProposition({ ouvert: false, civilite: 'M.', nom: '', prenoms: '', dateNaissance: '', telephone: '', email: '', matricule: '', classesProposees: '' })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Générer et envoyer l'invitation</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE RETRAIT D'UN ENSEIGNANT */}
        {modalRetraitEnseignant.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.cardWide, width: '420px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#991b1b' }}>⚠️ Retirer l'affiliation</h3>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
                Êtes-vous sûr de vouloir <strong>retirer l'affiliation de l'enseignant {modalRetraitEnseignant.enseignantNom}</strong> à votre établissement ?
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalRetraitEnseignant({ ouvert: false, enseignantId: null, enseignantNom: '' })} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={confirmerRetraitEnseignant} className="bouton bouton-danger">Oui, retirer l'affiliation</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE CONSULTATION ET MODIFICATION D'UNE DEMANDE D'AFFILIATION */}
        {modalAffiliationConsult.ouvert && (
          <div className="fond-modale">
            <div style={{ ...styles.cardWide, width: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>🏫 Consulter la Demande d'Affiliation</h3>
                <button onClick={() => setModalAffiliationConsult({ ouvert: false, affiliation: null, classesModifiees: '' })} className="bouton bouton-secondaire" style={{ padding: '4px 8px' }}>✕</button>
              </div>
              <form onSubmit={validerAffiliationModifiee} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Enseignant :</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '700', fontSize: '14px' }}>{modalAffiliationConsult.affiliation?.enseignant || 'Enseignant'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Établissement demandeur :</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '700', fontSize: '14px' }}>{modalAffiliationConsult.affiliation?.ecole}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Classes choisies par l'enseignant (modifiables) :</label>
                  <input 
                    type="text" 
                    value={modalAffiliationConsult.classesModifiees} 
                    onChange={(e) => setModalAffiliationConsult(prev => ({ ...prev, classesModifiees: e.target.value }))} 
                    className="champ-saisie" 
                    required 
                  />
                  <small style={{ color: '#64748b' }}>Séparez les classes par des virgules.</small>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                  <button type="button" onClick={() => setModalAffiliationConsult({ ouvert: false, affiliation: null, classesModifiees: '' })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-succes">Valider l'affiliation</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE CONSULTATION DÉTAILLÉE D'UNE FICHE */}
        {modalConsultation.ouvert && (
          <div className="fond-modale">
            <div style={{ ...styles.cardWide, width: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>👁️ Consultation détaillée de la Fiche</h3>
                <button onClick={() => setModalConsultation({ ouvert: false, element: null, type: '' })} className="bouton bouton-secondaire" style={{ padding: '4px 8px' }}>✕</button>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: 0 }}><strong>Titre :</strong> {modalConsultation.element?.titre}</p>
                <p style={{ margin: 0 }}><strong>Habilités :</strong> {modalConsultation.element?.habilites || 'N/A'}</p>
                <p style={{ margin: 0 }}><strong>Contenus :</strong> {modalConsultation.element?.contenus || 'N/A'}</p>
                <p style={{ margin: 0 }}><strong>Exercices :</strong> {modalConsultation.element?.exercices || 'N/A'}</p>
                <p style={{ margin: 0 }}><strong>Évaluations :</strong> {modalConsultation.element?.evaluations || 'N/A'}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button onClick={() => setModalConsultation({ ouvert: false, element: null, type: '' })} className="bouton bouton-principal">Fermer</button>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 1 : VISA & VALIDATION */}
        {activeTab === 'visa' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Validation & Visa des Fichiers Soumis (File d'actualité)</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Classement chronologique de la plus récente à la moins récente. Chaque fiche affiche le nom de son enseignant.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={viserSelectionMultiple} className="bouton bouton-succes">✓ Viser la sélection en masse</button>
                <button onClick={rejeterSelectionMultiple} className="bouton bouton-danger">✕ Rejeter la sélection</button>
              </div>
            </div>

            <div style={styles.bibliothequeFilterBox}>
              <div style={{ flex: '1 1 180px' }}>
                <label style={styles.labelFiltre}>1. Filtrer par Classe</label>
                <select value={visaClasseFiltre} onChange={(e) => setVisaClasseFiltre(e.target.value)} className="champ-saisie">
                  <option value="TOUTES">Toutes les classes</option>
                  {Object.keys(programmesClasses || {}).map(cl => <option key={cl} value={cl}>{cl}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={styles.labelFiltre}>2. Filtrer par Matière</label>
                <select value={visaMatiereFiltre} onChange={(e) => setVisaMatiereFiltre(e.target.value)} className="champ-saisie">
                  <option value="TOUTES">Toutes les matières</option>
                  <option value="EPS">EPS</option>
                  <option value="Mathématiques">Mathématiques</option>
                  <option value="Français">Français</option>
                </select>
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={styles.labelFiltre}>3. Filtrer par Semaine / Date</label>
                <select value={visaSemaineFiltre} onChange={(e) => setVisaSemaineFiltre(e.target.value)} className="champ-saisie">
                  <option value="TOUTES">Toutes les semaines</option>
                  <option value="2026-03-10">Semaine du 10 Mars 2026</option>
                </select>
              </div>
            </div>

            {Object.keys(programmesClasses || {}).length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', textAlign: 'center', padding: '30px' }}>Aucune soumission en attente.</p>
            ) : (
              Object.entries(programmesClasses || {})
                .filter(([classeNom]) => visaClasseFiltre === 'TOUTES' || visaClasseFiltre === classeNom)
                .filter(([_, prog]) => visaMatiereFiltre === 'TOUTES' || (prog?.matiere || 'EPS') === visaMatiereFiltre)
                .map(([classeNom, prog]) => (
                  <div key={classeNom} style={{ marginTop: '16px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', backgroundColor: '#f8fafc' }}>
                    <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>
                      🏫 Classe : {classeNom} | Matière : {prog?.matiere || 'EPS'} | Enseignant(e) : <span style={{ color: '#2563eb' }}>{prog?.enseignant || 'M. Kouassi Jean'}</span>
                    </h3>
                    {(prog?.cycles || []).map(cy => cy ? (
                      <div key={cy.id} style={{ backgroundColor: 'white', padding: '14px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                              type="checkbox" 
                              checked={elementsSelectionnes.includes(cy.id)}
                              onChange={(e) => {
                                const id = cy.id;
                                setElementsSelectionnes(prev => e.target.checked ? [...(prev || []), id] : (prev || []).filter(i => i !== id));
                              }} 
                            />
                            <strong>📁 {cy.titre}</strong>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setModalConsultation({ ouvert: true, element: cy, type: 'cycle' })} className="bouton bouton-secondaire" style={{ padding: '4px 8px', fontSize: '11px' }}>👁️ Consulter</button>
                            {!cy.viseParCenseur && (
                              <button onClick={() => viserElementUnique(classeNom, cy.id)} className="bouton bouton-succes" style={{ padding: '4px 10px', fontSize: '11px' }}>✍️ Viser</button>
                            )}
                            <span style={{ fontSize: '11px', fontWeight: '700', color: cy.viseParCenseur ? '#16a34a' : '#d97706' }}>
                              {cy.viseParCenseur ? '✅ Visé (Global)' : '⏳ En attente'}
                            </span>
                          </div>
                        </div>

                        {(cy.lecons || []).map(lc => lc ? (
                          <div key={lc.id} style={{ marginLeft: '16px', marginTop: '10px', borderLeft: '3px solid #2563eb', paddingLeft: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>📖 {lc.titre}</span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => setModalConsultation({ ouvert: true, element: lc, type: 'lecon' })} className="bouton bouton-secondaire" style={{ padding: '2px 6px', fontSize: '10px' }}>Consulter</button>
                                {!lc.viseParCenseur && (
                                  <button onClick={() => viserElementUnique(classeNom, cy.id, lc.id)} className="bouton bouton-succes" style={{ padding: '2px 8px', fontSize: '10px' }}>Viser</button>
                                )}
                              </div>
                            </div>

                            {[...(lc.seances || [])]
                              .sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0))
                              .filter(sc => visaSemaineFiltre === 'TOUTES' || sc?.date === visaSemaineFiltre)
                              .map(sc => sc ? (
                                <div key={sc.id} style={{ marginLeft: '16px', marginTop: '6px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={elementsSelectionnes.includes(sc.id)}
                                      onChange={(e) => {
                                        const id = sc.id;
                                        setElementsSelectionnes(prev => e.target.checked ? [...(prev || []), id] : (prev || []).filter(i => i !== id));
                                      }} 
                                    />
                                    <span>• Séance #{sc.numero} : {sc.titre} ({sc.date}) - <em>Enseignant: {prog?.enseignant || 'Kouassi Jean'}</em></span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => setModalConsultation({ ouvert: true, element: sc, type: 'seance' })} className="bouton bouton-secondaire" style={{ padding: '2px 6px', fontSize: '10px' }}>Consulter</button>
                                    {!sc.viseParCenseur && (
                                      <button onClick={() => viserElementUnique(classeNom, cy.id, lc.id, sc.id)} className="bouton bouton-succes" style={{ padding: '2px 8px', fontSize: '10px' }}>Viser & Archiver</button>
                                    )}
                                    <span style={{ color: sc.viseParCenseur ? '#16a34a' : '#64748b', fontWeight: '600' }}>{sc.viseParCenseur ? '✔ Visé & Archivé' : 'Non visé'}</span>
                                  </div>
                                </div>
                              ) : null)}
                          </div>
                        ) : null)}
                      </div>
                    ) : null)}
                  </div>
                ))
            )}
          </div>
        )}

        {/* ONGLET : GESTION DES ENSEIGNANTS & AFFILIATIONS */}
        {activeTab === 'affiliations' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>👨‍🏫 Gestion des Enseignants & Affiliations</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Supervisez l'équipe pédagogique ou invitez de nouveaux enseignants par Matricule.</p>
              </div>
              <button 
                onClick={() => setModalProposition({ ouvert: true, civilite: 'M.', nom: '', prenoms: '', dateNaissance: '', telephone: '', email: '', matricule: '', classesProposees: '' })} 
                className="bouton bouton-principal"
              >
                + Adresser une proposition à un enseignant
              </button>
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '12px', marginTop: '24px' }}>Enseignants affiliés / En attente</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(affiliations || []).length === 0 ? (
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#94a3b8' }}>Aucune demande ni enseignant affilié.</p>
              ) : (
                (affiliations || []).map(aff => aff ? (
                  <div key={aff.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <strong style={{ color: '#1e40af', fontSize: '15px' }}>{aff.enseignant || 'Enseignant'}</strong> <span style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>Matricule: {aff.matricule || 'N/A'}</span><br/>
                      <small style={{ color: '#475569', display: 'block', marginTop: '4px' }}>Classes : {(aff.classes || []).join(', ')} | Email : {aff.email || 'N/A'}</small>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', backgroundColor: aff.statut === 'Validée' ? '#dcfce7' : '#fef3c7', color: aff.statut === 'Validée' ? '#166534' : '#92400e', marginRight: '8px' }}>
                        {aff.statut}
                      </span>
                      {aff.statut !== 'Validée' ? (
                        <>
                          <button onClick={() => ouvrirConsultationAffiliation(aff)} className="bouton bouton-principal" style={{ padding: '6px 12px', fontSize: '11px' }}>
                            👁️ Consulter / Valider
                          </button>
                          <button onClick={() => rejeterAffiliation(aff.id)} className="bouton bouton-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>
                            Rejeter
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setModalRetraitEnseignant({ ouvert: true, enseignantId: aff.id, enseignantNom: aff.enseignant })} className="bouton bouton-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>
                          Retirer l'affiliation
                        </button>
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
                        <strong style={{ color: '#92400e' }}>{prop.enseignantCible || prop.nomEnseignant}</strong> <span style={{ fontSize: '11px', color: '#b45309', backgroundColor: '#fefce8', padding: '2px 6px', borderRadius: '4px' }}>Matricule: {prop.matricule || 'N/A'}</span><br/>
                        <small style={{ color: '#b45309', display: 'block', marginTop: '4px' }}>Classes : {(prop.classes || []).join(', ')} | Email : {prop.email || 'N/A'}</small>
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

        {/* ONGLET 2 : ARCHIVE PÉDAGOGIQUE */}
        {activeTab === 'archive' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>📁 Archive Pédagogique Permanente de l'École</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Base d'archives sécurisée de l'établissement. Accessible à tous les censeurs, toutes années confondues.</p>

            <div style={styles.bibliothequeFilterBox}>
              <div style={{ flex: '1 1 150px' }}>
                <label style={styles.labelFiltre}>Enseignant</label>
                <select value={filtreArchiveEnseignant} onChange={(e) => setFiltreArchiveEnseignant(e.target.value)} className="champ-saisie">
                  <option value="TOUS">Tous les enseignants</option>
                  <option value="M. Kouassi Jean">M. Kouassi Jean</option>
                </select>
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <label style={styles.labelFiltre}>Année</label>
                <select value={filtreArchiveAnnee} onChange={(e) => setFiltreArchiveAnnee(e.target.value)} className="champ-saisie">
                  <option value="TOUTES">Toutes les années</option>
                  <option value="2025-2026">2025-2026</option>
                </select>
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <label style={styles.labelFiltre}>Classe</label>
                <select value={filtreArchiveClasse} onChange={(e) => setFiltreArchiveClasse(e.target.value)} className="champ-saisie">
                  <option value="TOUTES">Toutes les classes</option>
                  <option value="6ème A">6ème A</option>
                </select>
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <label style={styles.labelFiltre}>Matière</label>
                <select value={filtreArchiveMatiere} onChange={(e) => setFiltreArchiveMatiere(e.target.value)} className="champ-saisie">
                  <option value="TOUTES">Toutes les matières</option>
                  <option value="EPS">EPS</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              {(archiveFiltree || []).length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#94a3b8', textAlign: 'center', padding: '30px' }}>Aucune archive trouvée avec ces critères.</p>
              ) : (
                (archiveFiltree || []).map(item => item ? (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>{item.classe}</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>({item.matiere} - {item.anneeScolaire})</span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{item.titre}</strong>
                      </div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Enseignant : <strong>{item.enseignant}</strong> | Validé le : {item.dateValidation}</p>
                    </div>
                    <div>
                      <button onClick={() => telechargerPDFArchive(item)} className="bouton bouton-principal" style={{ padding: '6px 12px', fontSize: '11px' }}>📥 Télécharger (PDF)</button>
                    </div>
                  </div>
                ) : null)
              )}
            </div>
          </div>
        )}

        {/* ONGLET 3 : STATISTIQUES & PROGRESSION */}
        {activeTab === 'stats' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>📊 Statistiques classées par Niveau et par Enseignant</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Cochez ci-dessous les classes/niveaux concernés, puis transmettez le rapport au Chef d'Établissement.</p>
              </div>
              <button 
                onClick={transmettreRapportSelectionne} 
                className="bouton bouton-succes"
              >
                📤 Transmettre le rapport des classes cochées au Chef d'Établissement
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>Sélectionner les classes/niveaux à inclure dans le rapport :</label>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {Object.keys(programmesClasses || {}).map(classeNom => {
                  const estCoche = (classesSelectionneesRapport || []).includes(classeNom);
                  return (
                    <label key={classeNom} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={estCoche}
                        onChange={(e) => {
                          setClassesSelectionneesRapport(prev => e.target.checked ? [...(prev || []), classeNom] : (prev || []).filter(c => c !== classeNom));
                        }} 
                      />
                      Classe {classeNom}
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '24px' }}>📈</span>
                <h4 style={{ margin: '8px 0 4px 0', fontSize: '15px' }}>Total Cycles Validés ({infosCenseur?.niveauCharge || ''})</h4>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#2563eb', margin: 0 }}>1</p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '24px' }}>📚</span>
                <h4 style={{ margin: '8px 0 4px 0', fontSize: '15px' }}>Fiches de Séances Archivées</h4>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#16a34a', margin: 0 }}>{(archiveEcole || []).length}</p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '24px' }}>⏰</span>
                <h4 style={{ margin: '8px 0 4px 0', fontSize: '15px' }}>Séances Reportées / Manquées</h4>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#ef4444', margin: 0 }}>{(rapportsReports || []).length}</p>
              </div>
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>Registre des Séances et Cours Reportés par les Professeurs</h3>
            {(rapportsReports || []).length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>Aucun report de cours enregistré.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {(rapportsReports || []).map(rep => rep ? (
                  <div key={rep.id} style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '14px', borderRadius: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: '#991b1b' }}>Professeur : {rep.enseignant} ({rep.matiere}) - Classe : {rep.classe}</strong>
                      <span style={{ fontSize: '11px', color: '#b91c1c', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>Date manquée : {rep.date}</span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', color: '#7f1d1d' }}><strong>Séance / Cours :</strong> {rep.seance}</p>
                    <p style={{ margin: '4px 0 0 0', color: '#475569' }}><strong>Motif :</strong> {rep.motif}</p>
                  </div>
                ) : null)}
              </div>
            )}
          </div>
        )}

        {/* ONGLET 4 : SUIVI HEBDOMADAIRE */}
        {activeTab === 'suivi' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>⏰ Suivi Hebdomadaire & Rappels Automatiques</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Sélectionnez un ou plusieurs enseignants en retard pour leur envoyer des rappels groupés.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={envoyerRappelMultiple} className="bouton bouton-danger">
                  ✉️ Envoyer un rappel aux sélectionnés
                </button>
                <button onClick={envoyerRappelGlobal} className="bouton bouton-principal">
                  ✉️ Rappel global (Tous)
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef2f2', padding: '14px', borderRadius: '8px', border: '1px solid #fecaca', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="checkbox" 
                    checked={(enseignantsSelectionnesRappel || []).includes('M. Kouassi Jean')}
                    onChange={(e) => {
                      const nom = 'M. Kouassi Jean';
                      setEnseignantsSelectionnesRappel(prev => e.target.checked ? [...(prev || []), nom] : (prev || []).filter(n => n !== nom));
                    }} 
                  />
                  <div>
                    <strong style={{ color: '#991b1b' }}>M. Kouassi Jean (EPS)</strong><br />
                    <small style={{ color: '#b91c1c' }}>Dernière soumission : Il y a 5 jours | Statut de la semaine : ⚠️ Aucune nouvelle séance enregistrée</small>
                  </div>
                </div>
                <div>
                  <button onClick={() => envoyerRappelEnseignant('M. Kouassi Jean')} className="bouton bouton-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>
                    Envoyer un rappel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f1f5f9', minHeight: '100vh', color: '#1e293b' },
  mainContentBody: { padding: '30px', maxWidth: '1280px', margin: '0 auto' },
  cardWide: { backgroundColor: '#ffffff', padding: '32px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' },
  bibliothequeFilterBox: { display: 'flex', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap' },
  labelFiltre: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' },
  'champ-saisie': { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#1e293b', outline: 'none' },
  toastSuccess: { backgroundColor: '#1e293b', color: '#f8fafc', padding: '14px 22px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: '600' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }
};
