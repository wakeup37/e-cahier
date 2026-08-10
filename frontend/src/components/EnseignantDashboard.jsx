import React, { useState, useMemo, useRef, useEffect } from 'react';

export default function EnseignantDashboard() {
  
  // --- GESTION DES AFFILIATIONS MULTI-ÉTABLISSEMENTS & DEMANDES DE DÉPART ---
  const [affiliations, setAffiliations] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('app_enseignant_affiliations')) || [
        { id: 1, ecole: 'Lycée Moderne d’Abidjan', statut: 'Validée', classes: ['6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '3ème A'] }
      ];
    } catch {
      return [
        { id: 1, ecole: 'Lycée Moderne d’Abidjan', statut: 'Validée', classes: ['6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '3ème A'] }
      ];
    }
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_affiliations', JSON.stringify(affiliations));
  }, [affiliations]);

  const [demandesDepart, setDemandesDepart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('app_enseignant_demandes_depart')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_demandes_depart', JSON.stringify(demandesDepart));
  }, [demandesDepart]);

  const [modalDepart, setModalDepart] = useState({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' });

  // --- MODALE DE CONFIRMATION UNIVERSELLE POUR ACTIONS IRRÉVERSIBLES ---
  const [modalConfirmation, setModalConfirmation] = useState({
    ouvert: false,
    titre: '',
    message: '',
    actionCallback: null
  });

  const [modeSansAffiliation, setModeSansAffiliation] = useState(() => {
    return localStorage.getItem('app_enseignant_mode_sans_aff') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_mode_sans_aff', modeSansAffiliation);
  }, [modeSansAffiliation]);

  const [classesSansAffiliation, setClassesSansAffiliation] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('app_enseignant_classes_libres')) || ['Classe Autonome 1', 'Classe Autonome 2'];
    } catch {
      return ['Classe Autonome 1', 'Classe Autonome 2'];
    }
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_classes_libres', JSON.stringify(classesSansAffiliation));
  }, [classesSansAffiliation]);

  const [nouvelleClasseLibre, setNouvelleClasseLibre] = useState('');

  const classesActivesValidees = useMemo(() => {
    if (modeSansAffiliation) {
      return classesSansAffiliation;
    }
    let classes = [];
    affiliations.forEach(aff => {
      if (aff.statut === 'Validée' && Array.isArray(aff.classes)) {
        aff.classes.forEach(cl => {
          if (!classes.includes(cl)) classes.push(cl);
        });
      }
    });
    return classes.length > 0 ? classes : ['6ème A', '6ème B'];
  }, [modeSansAffiliation, classesSansAffiliation, affiliations]);

  const [activeTab, setActiveTab] = useState('cycles');
  const [message, setMessage] = useState('');

  // --- MENU BURGER & DROPDOWNS ---
  const [menuBurgerOuvert, setMenuBurgerOuvert] = useState(false);
  const menuBurgerRef = useRef(null);

  const [modalDeconnexion, setModalDeconnexion] = useState(false);
  const [modalSecurite, setModalSecurite] = useState(false);
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');

  const [rapportsSeances, setRapportsSeances] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('app_enseignant_rapports')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_rapports', JSON.stringify(rapportsSeances));
  }, [rapportsSeances]);

  const [modalRapport, setModalRapport] = useState({
    ouvert: false,
    seanceTitre: '',
    ecolesCibles: [],
    classesCibles: [],
    motifReport: '',
    nouvelleDatePrevue: '',
    contenuRapport: '',
    difficultes: ''
  });

  const [propositionsCenseur, setPropositionsCenseur] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('app_enseignant_propositions')) || [
        { id: 99, ecole: 'Collège Moderne les Élites', classes: ['4ème 2', '3ème B'], censeur: 'M. Touré' }
      ];
    } catch {
      return [{ id: 99, ecole: 'Collège Moderne les Élites', classes: ['4ème 2', '3ème B'], censeur: 'M. Touré' }];
    }
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_propositions', JSON.stringify(propositionsCenseur));
  }, [propositionsCenseur]);

  const [modalPaiement, setModalPaiement] = useState(false);
  const [methodePaiement, setMethodePaiement] = useState('wave');

  const [notifications, setNotifications] = useState([
    { id: 1, texte: 'Votre demande d’affiliation pour le Lycée Moderne a été validée.', date: 'Aujourd\'hui', lu: false },
    { id: 2, texte: 'Proposition d’affiliation reçue de la part du Collège Moderne les Élites.', date: 'Hier', lu: false }
  ]);
  const [notifOuvert, setNotifOuvert] = useState(false);
  const notifRef = useRef(null);

  const [infosEnseignant, setInfosEnseignant] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('app_enseignant_profil')) || {
        civilite: 'M.',
        nom: 'Kouassi',
        prenoms: 'Jean',
        ville: 'Abidjan',
        matiere: 'Éducation Physique et Sportive (EPS)',
        photoProfil: '',
        etablissementSaisi: 'Lycée Moderne d’Abidjan',
        classesSelectionneesEnCours: ['6ème A', '6ème B'],
        emailSecurite: 'jean.kouassi@prof.ci'
      };
    } catch {
      return {
        civilite: 'M.',
        nom: 'Kouassi',
        prenoms: 'Jean',
        ville: 'Abidjan',
        matiere: 'Éducation Physique et Sportive (EPS)',
        photoProfil: '',
        etablissementSaisi: 'Lycée Moderne d’Abidjan',
        classesSelectionneesEnCours: ['6ème A', '6ème B'],
        emailSecurite: 'jean.kouassi@prof.ci'
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_profil', JSON.stringify(infosEnseignant));
  }, [infosEnseignant]);

  const [modalProfilOuvert, setModalProfilOuvert] = useState(false);
  const [formProfil, setFormProfil] = useState({ ...infosEnseignant });

  const [profilOuvert, setProfilOuvert] = useState(false);
  const profilRef = useRef(null);

  const [demandePromotionCenseur, setDemandePromotionCenseur] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('app_enseignant_demande_promotion')) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_demande_promotion', JSON.stringify(demandePromotionCenseur));
  }, [demandePromotionCenseur]);

  const [modalPromotion, setModalPromotion] = useState(false);
  const [formPromotion, setFormPromotion] = useState({ type: 'interne', ecoleCible: infosEnseignant.etablissementSaisi });

  const [champEnEditionPleinEcran, setChampEnEditionPleinEcran] = useState(null);
  const [champASupprimer, setChampASupprimer] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profilRef.current && !profilRef.current.contains(event.target)) setProfilOuvert(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOuvert(false);
      if (menuBurgerRef.current && !menuBurgerRef.current.contains(event.target)) setMenuBurgerOuvert(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [classeSelectionneeVue, setClasseSelectionneeVue] = useState(null);

  const [bibliotheque, setBibliotheque] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('app_enseignant_bibliotheque_permanente')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_bibliotheque_permanente', JSON.stringify(bibliotheque));
  }, [bibliotheque]);

  const [filtreBiblioAnnee, setFiltreBiblioAnnee] = useState('2025-2026');
  const [filtreBiblioClasse, setFiltreBiblioClasse] = useState('TOUTES');
  const [filtreBiblioTexte, setFiltreBiblioTexte] = useState('');

  const [modalConsulterReutiliser, setModalConsulterReutiliser] = useState({
    ouvert: false,
    item: null,
    donneesModifiees: {},
    classesSelectionnees: [],
    datesParClasse: {}
  });

  const [programmesClasses, setProgrammesClasses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('app_enseignant_programmes_classes')) || {
        '6ème A': {
          anneeScolaire: '2025-2026',
          titre: 'Programme Annuel 2025-2026',
          cycles: [
            {
              id: 1,
              titre: 'Cycle 1 : Gymnastique au sol et coordination',
              competence: 'Traiter une situation de coordination motrice.',
              dateDebut: '2026-01-10',
              dateFin: '2026-02-28',
              dureeEstimee: '7 semaines',
              statut: 'En cours',
              soumisAuCenseur: false,
              lecons: [
                {
                  id: 101,
                  titre: 'Leçon 1 : Maîtriser les équilibres et roulements',
                  nombreSeancesPrevues: 2,
                  statut: 'En cours',
                  soumisAuCenseur: false,
                  seances: [
                    {
                      id: 1001,
                      numero: 1,
                      titre: 'Séance d’initiation - Roulement avant',
                      date: '2026-03-10',
                      lieu: 'Gymnase A',
                      valeursChamps: {
                        habilites: 'Savoir enrouler sa tête.',
                        contenus: 'Atelier sol matelas.',
                        exercices: 'Roulé-boulé.',
                        evaluations: 'Formative.'
                      },
                      statut: 'En cours',
                      soumisAuCenseur: false,
                      fichiersMultimedias: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      };
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_programmes_classes', JSON.stringify(programmesClasses));
  }, [programmesClasses]);

  const [champsPersonnalises, setChampsPersonnalises] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('app_enseignant_champs_perso')) || [
        { id: 'habilites', label: '🎯 Habilités', type: 'textarea' },
        { id: 'contenus', label: '📚 Contenus Pédagogiques', type: 'textarea' },
        { id: 'exercices', label: '⚡ Exercices d\'Application', type: 'textarea' },
        { id: 'evaluations', label: '📝 Modalités d\'Évaluation', type: 'textarea' }
      ];
    } catch {
      return [
        { id: 'habilites', label: '🎯 Habilités', type: 'textarea' },
        { id: 'contenus', label: '📚 Contenus Pédagogiques', type: 'textarea' },
        { id: 'exercices', label: '⚡ Exercices d\'Application', type: 'textarea' },
        { id: 'evaluations', label: '📝 Modalités d\'Évaluation', type: 'textarea' }
      ];
    }
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_champs_perso', JSON.stringify(champsPersonnalises));
  }, [champsPersonnalises]);

  const [cyclesOuverts, setCyclesOuverts] = useState({});
  const [leconsOuvertes, setLeconsOuvertes] = useState({});

  const toggleCycle = (cycleId) => {
    setCyclesOuverts(prev => ({ ...prev, [cycleId]: !prev[cycleId] }));
  };

  const toggleLecon = (leconId) => {
    setLeconsOuvertes(prev => ({ ...prev, [leconId]: !prev[leconId] }));
  };

  const [modalAssistant, setModalAssistant] = useState({
    ouvert: false,
    niveauCible: 'cycle',
    cycleIdCible: null,
    leconIdCible: null,
    titreProgramme: '',
    cyclesProgramme: [{ id: Date.now(), titre: 'Cycle 1', duree: '3 semaines', nbLecons: 2 }],
    titreCycle: '',
    competenceCycle: '',
    dateDebutCycle: new Date().toISOString().split('T')[0],
    dateFinCycle: new Date().toISOString().split('T')[0],
    titreLecon: '',
    nombreSeancesLecon: '3',
    titreSeance: '',
    dateSeance: new Date().toISOString().split('T')[0],
    lieuSeance: '',
    valeursChamps: {},
    fichiersMultimedias: [],
    ecolesCiblesCycle: [],
    classesCiblesCycle: [],
    datesParClasseCycle: {}
  });

  const [modalEdition, setModalEdition] = useState({
    ouvert: false,
    type: null,
    cycleId: null,
    leconId: null,
    seanceId: null,
    donnees: {}
  });

  const [modalAffiliation, setModalAffiliation] = useState(false);
  const [nouvelleEcoleSaisie, setNouvelleEcoleSaisie] = useState('');
  const [nouvellesClassesSaisies, setNouvellesClassesSaisies] = useState('6ème A, 5ème A');

  const [modalDuplicationIntelligente, setModalDuplicationIntelligente] = useState({
    ouvert: false,
    itemSource: null,
    typeSource: '',
    classesCibles: [],
    datesParClasse: {}
  });

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleEnregistrerProfil = (e) => {
    e.preventDefault();
    setInfosEnseignant({ ...formProfil });
    setModalProfilOuvert(false);
    showToast("✅ Profil mis à jour avec succès !");
  };

  const handleChangerPhotoProfil = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormProfil(prev => ({ ...prev, photoProfil: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const envoyerDemandePromotionCenseur = (e) => {
    e.preventDefault();
    setDemandePromotionCenseur({
      date: new Date().toLocaleDateString(),
      type: formPromotion.type,
      ecoleCible: formPromotion.type === 'interne' ? infosEnseignant.etablissementSaisi : formPromotion.ecoleCible,
      statut: 'En attente de validation'
    });
    setModalPromotion(false);
    showToast("🚀 Demande d'évolution vers le poste de Censeur envoyée au chef d'établissement !");
  };

  const soumettreDemandeDepart = (e) => {
    e.preventDefault();
    if (!modalDepart.ecoleId) return;

    const nouvelleDemande = {
      id: Date.now(),
      ecoleId: modalDepart.ecoleId,
      ecoleNom: modalDepart.ecoleNom,
      motif: modalDepart.motif,
      dateDemande: new Date().toLocaleDateString(),
      statut: 'En attente du visa du censeur'
    };

    setDemandesDepart(prev => [nouvelleDemande, ...prev]);
    setModalDepart({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' });
    showToast("📤 Demande de départ transmise au censeur pour visa officiel !");
  };

  const supprimerClasseLibre = (classeNom) => {
    setClassesSansAffiliation(prev => Array.isArray(prev) ? prev.filter(c => c !== classeNom) : []);
    showToast(`🗑️ Classe "${classeNom}" supprimée avec succès !`);
  };

  const executerDuplicationIntelligente = (e) => {
    e.preventDefault();
    const { itemSource, typeSource, classesCibles, datesParClasse } = modalDuplicationIntelligente;
    if (!Array.isArray(classesCibles) || classesCibles.length === 0) {
      showToast("⚠️ Veuillez sélectionner au moins une classe cible.");
      return;
    }

    classesCibles.forEach(classeCible => {
      const dateCible = (datesParClasse && datesParClasse[classeCible]) || new Date().toISOString().split('T')[0];
      if (!programmesClasses[classeCible]) {
        initialiserProgrammeClasse(classeCible);
      }
      const progCible = programmesClasses[classeCible] || { anneeScolaire: '2025-2026', cycles: [] };

      if (typeSource === 'cycle') {
        const nouveauCycle = {
          ...itemSource,
          id: Date.now() + Math.random(),
          titre: `${itemSource.titre} (Dupliqué - ${classeCible})`,
          lecons: Array.isArray(itemSource.lecons) ? itemSource.lecons.map(lc => ({
            ...lc,
            id: Date.now() + Math.random(),
            seances: Array.isArray(lc.seances) ? lc.seances.map(sc => ({ ...sc, id: Date.now() + Math.random(), date: dateCible })) : []
          })) : []
        };
        setProgrammesClasses(prev => ({
          ...prev,
          [classeCible]: { ...progCible, cycles: [...(progCible.cycles || []), nouveauCycle] }
        }));
      } else if (typeSource === 'lecon') {
        const nouvelleLecon = {
          ...itemSource,
          id: Date.now() + Math.random(),
          titre: `${itemSource.titre} (Dupliqué - ${classeCible})`,
          seances: Array.isArray(itemSource.seances) ? itemSource.seances.map(sc => ({ ...sc, id: Date.now() + Math.random(), date: dateCible })) : []
        };
        setProgrammesClasses(prev => {
          let cyclesMaj = Array.isArray(progCible.cycles) ? [...progCible.cycles] : [];
          if (cyclesMaj.length === 0) {
            cyclesMaj.push({
              id: Date.now(),
              titre: 'Cycle Général',
              competence: 'Compétence',
              dateDebut: '2026-01-01',
              dateFin: '2026-06-30',
              statut: 'En cours',
              lecons: [nouvelleLecon]
            });
          } else {
            cyclesMaj[0] = {
              ...cyclesMaj[0],
              lecons: [...(cyclesMaj[0].lecons || []), nouvelleLecon]
            };
          }
          return { ...prev, [classeCible]: { ...progCible, cycles: cyclesMaj } };
        });
      } else if (typeSource === 'seance') {
        const nouvelleSeance = {
          ...itemSource,
          id: Date.now() + Math.random(),
          titre: `${itemSource.titre} (Dupliqué - ${classeCible})`,
          date: dateCible
        };
        setProgrammesClasses(prev => {
          let cyclesMaj = Array.isArray(progCible.cycles) ? [...progCible.cycles] : [];
          if (cyclesMaj.length === 0) {
            cyclesMaj.push({
              id: Date.now(),
              titre: 'Cycle Général',
              competence: 'Compétence',
              dateDebut: '2026-01-01',
              dateFin: '2026-06-30',
              statut: 'En cours',
              lecons: [{
                id: Date.now() + 1,
                titre: 'Leçon Générale',
                nombreSeancesPrevues: 3,
                statut: 'En cours',
                seances: [nouvelleSeance]
              }]
            });
          } else {
            let premierCycle = { ...cyclesMaj[0] };
            let leconsMaj = Array.isArray(premierCycle.lecons) ? [...premierCycle.lecons] : [];
            if (leconsMaj.length === 0) {
              leconsMaj.push({
                id: Date.now() + 1,
                titre: 'Leçon Générale',
                nombreSeancesPrevues: 3,
                statut: 'En cours',
                seances: [nouvelleSeance]
              });
            } else {
              let premiereLecon = { ...leconsMaj[0] };
              premiereLecon.seances = [...(premiereLecon.seances || []), nouvelleSeance];
              leconsMaj[0] = premiereLecon;
            }
            premierCycle.lecons = leconsMaj;
            cyclesMaj[0] = premierCycle;
          }
          return { ...prev, [classeCible]: { ...progCible, cycles: cyclesMaj } };
        });
      }
    });

    showToast("✨ Duplication intelligente effectuée avec succès !");
    setModalDuplicationIntelligente({ ouvert: false, itemSource: null, typeSource: '', classesCibles: [], datesParClasse: {} });
  };

  const soumettreRapportSeance = (e) => {
    e.preventDefault();
    if (!modalRapport.seanceTitre || !Array.isArray(modalRapport.classesCibles) || modalRapport.classesCibles.length === 0) {
      showToast("⚠️ Veuillez renseigner le titre et sélectionner au moins une classe.");
      return;
    }

    const nouveauRapport = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      ...modalRapport,
      enseignant: `${infosEnseignant.civilite} ${infosEnseignant.nom} ${infosEnseignant.prenoms}`
    };

    setRapportsSeances(prev => [nouveauRapport, ...(Array.isArray(prev) ? prev : [])]);
    setModalRapport({ ouvert: false, seanceTitre: '', ecolesCibles: [], classesCibles: [], motifReport: '', nouvelleDatePrevue: '', contenuRapport: '', difficultes: '' });
    showToast("📤 Rapport de séance et compte rendu transmis au censeur avec succès !");
  };

  const initialiserProgrammeClasse = (classe) => {
    if (programmesClasses[classe]) return;
    setProgrammesClasses(prev => ({
      ...(prev || {}),
      [classe]: {
        anneeScolaire: '2025-2026',
        cycles: []
      }
    }));
    showToast(`Programme initialisé pour la classe ${classe} !`);
  };

  const gererValidationAssistant = (e) => {
    e.preventDefault();
    const { niveauCible, cycleIdCible, leconIdCible, titreCycle, competenceCycle, dateDebutCycle, dateFinCycle, titreLecon, nombreSeancesLecon, titreSeance, dateSeance, lieuSeance, valeursChamps, fichiersMultimedias, classesCiblesCycle, datesParClasseCycle, cyclesProgramme, titreProgramme } = modalAssistant;

    if (niveauCible === 'programme_annuel') {
      if (!Array.isArray(classesCiblesCycle) || classesCiblesCycle.length === 0) {
        showToast("⚠️ Veuillez sélectionner au moins une classe cible pour ce programme.");
        return;
      }

      classesCiblesCycle.forEach(classeCible => {
        let nouveauxCyclesGeneres = cyclesProgramme.map(cp => {
          let leconsGenerees = [];
          for (let i = 1; i <= cp.nbLecons; i++) {
            leconsGenerees.push({
              id: Date.now() + Math.random(),
              titre: `Leçon ${i} du ${cp.titre}`,
              nombreSeancesPrevues: 3, 
              statut: 'En attente',
              soumisAuCenseur: false,
              seances: []
            });
          }

          return {
            id: Date.now() + Math.random(),
            titre: cp.titre,
            competence: `Compétence pour ${cp.titre}`,
            dateDebut: new Date().toISOString().split('T')[0],
            dateFin: new Date().toISOString().split('T')[0],
            dureeEstimee: cp.duree,
            statut: 'En attente',
            soumisAuCenseur: false,
            lecons: leconsGenerees
          };
        });

        setProgrammesClasses(prev => ({
          ...(prev || {}),
          [classeCible]: { anneeScolaire: '2025-2026', titre: titreProgramme, cycles: nouveauxCyclesGeneres }
        }));
      });

      showToast("✨ Programme annuel complet généré avec succès !");
    }
    else if (niveauCible === 'cycle') {
      if (!Array.isArray(classesCiblesCycle) || classesCiblesCycle.length === 0) {
        showToast("⚠️ Veuillez sélectionner au moins une classe cible pour ce cycle.");
        return;
      }

      classesCiblesCycle.forEach(classeCible => {
        const dateDebClasse = (datesParClasseCycle && datesParClasseCycle[classeCible]?.debut) || dateDebutCycle || '2026-01-01';
        const dateFinClasse = (datesParClasseCycle && datesParClasseCycle[classeCible]?.fin) || dateFinCycle || '2026-02-01';

        if (!programmesClasses[classeCible]) {
          initialiserProgrammeClasse(classeCible);
        }
        const progCible = programmesClasses[classeCible] || { anneeScolaire: '2025-2026', cycles: [] };

        const nouveauCycleMulti = {
          id: Date.now() + Math.random(),
          titre: titreCycle || 'Nouveau Cycle',
          competence: competenceCycle || '',
          dateDebut: dateDebClasse,
          dateFin: dateFinClasse,
          statut: 'En cours',
          soumisAuCenseur: false,
          lecons: []
        };

        setProgrammesClasses(prev => ({
          ...(prev || {}),
          [classeCible]: { ...progCible, cycles: [...(progCible.cycles || []), nouveauCycleMulti] }
        }));
      });

      showToast("✨ Cycle créé et dupliqué avec succès !");
    } 
    else {
      if (!classeSelectionneeVue) return;
      const progClasse = programmesClasses[classeSelectionneeVue];
      if (!progClasse) return;

      let nouveauxCycles = Array.isArray(progClasse.cycles) ? [...progClasse.cycles] : [];

      if (niveauCible === 'lecon') {
        nouveauxCycles = nouveauxCycles.map(c => {
          if (c.id === Number(cycleIdCible)) {
            return {
              ...c,
              lecons: [
                ...(Array.isArray(c.lecons) ? c.lecons : []),
                {
                  id: Date.now(),
                  titre: titreLecon || 'Nouvelle Leçon',
                  nombreSeancesPrevues: parseInt(nombreSeancesLecon) || 3,
                  statut: 'En cours',
                  soumisAuCenseur: false,
                  seances: []
                }
              ]
            };
          }
          return c;
        });
        showToast("Leçon créée !");
      } 
      else if (niveauCible === 'seance') {
        nouveauxCycles = nouveauxCycles.map(c => {
          if (c.id === Number(cycleIdCible)) {
            return {
              ...c,
              lecons: Array.isArray(c.lecons) ? c.lecons.map(l => {
                if (l.id === Number(leconIdCible)) {
                  const nouvelleSeance = {
                    id: Date.now(),
                    numero: Array.isArray(l.seances) ? l.seances.length + 1 : 1,
                    titre: titreSeance || 'Séance pédagogique',
                    date: dateSeance || new Date().toISOString().split('T')[0],
                    lieu: lieuSeance || 'Gymnase',
                    valeursChamps: valeursChamps || {},
                    fichiersMultimedias: fichiersMultimedias || [],
                    statut: 'En cours',
                    soumisAuCenseur: false
                  };

                  setBibliotheque(prev => [...(Array.isArray(prev) ? prev : []), {
                    id: Date.now(),
                    type: 'seance',
                    nom: nouvelleSeance.titre,
                    niveau: '6ème',
                    classe: classeSelectionneeVue,
                    anneeScolaire: '2025-2026',
                    date: nouvelleSeance.date,
                    cycleAssocie: c.titre,
                    leconAssociee: l.titre,
                    valeursChamps: valeursChamps || {},
                    fichiersMultimedias: fichiersMultimedias || []
                  }]);

                  return { ...l, seances: [...(Array.isArray(l.seances) ? l.seances : []), nouvelleSeance] };
                }
                return l;
              }) : []
            };
          }
          return c;
        });
        showToast("Séance personnalisée créée !");
      }

      setProgrammesClasses({
        ...(programmesClasses || {}),
        [classeSelectionneeVue]: { ...progClasse, cycles: nouveauxCycles }
      });
    }

    setModalAssistant({
      ouvert: false, niveauCible: 'programme', cycleIdCible: null, leconIdCible: null,
      titreCycle: '', competenceCycle: '', dateDebutCycle: '', dateFinCycle: '',
      titreLecon: '', nombreSeancesLecon: '3', titreSeance: '',
      dateSeance: new Date().toISOString().split('T')[0], lieuSeance: '',
      valeursChamps: {}, fichiersMultimedias: [], ecolesCiblesCycle: [], classesCiblesCycle: [], datesParClasseCycle: {},
      titreProgramme: '', cyclesProgramme: [{ id: Date.now(), titre: 'Cycle 1', duree: '3 semaines', nbLecons: 2 }]
    });
  };

  const executerConsultationEtReutilisation = (e) => {
    e.preventDefault();
    const { item, donneesModifiees, classesSelectionnees, datesParClasse } = modalConsulterReutiliser;
    if (!Array.isArray(classesSelectionnees) || classesSelectionnees.length === 0) {
      showToast("⚠️ Veuillez sélectionner au moins une classe cible.");
      return;
    }

    classesSelectionnees.forEach(classeCible => {
      const dateAttribuee = (datesParClasse && datesParClasse[classeCible]) || new Date().toISOString().split('T')[0];
      
      if (!programmesClasses[classeCible]) {
        initialiserProgrammeClasse(classeCible);
      }

      const progCible = programmesClasses[classeCible] || { anneeScolaire: '2025-2026', cycles: [] };

      const nouvelleSeanceReutilisee = {
        id: Date.now() + Math.random(),
        numero: 1,
        titre: (donneesModifiees && donneesModifiees.nom) || (item && item.nom) || 'Séance réutilisée',
        date: dateAttribuee,
        lieu: 'Gymnase',
        valeursChamps: (donneesModifiees && donneesModifiees.valeursChamps) || (item && item.valeursChamps) || {},
        fichiersMultimedias: (item && item.fichiersMultimedias) || [],
        statut: 'En cours',
        soumisAuCenseur: false
      };

      setProgrammesClasses(prev => {
        let cyclesCible = Array.isArray(progCible.cycles) ? [...progCible.cycles] : [];
        if (cyclesCible.length === 0) {
          cyclesCible.push({
            id: Date.now(),
            titre: (donneesModifiees && donneesModifiees.cycleAssocie) || (item && item.cycleAssocie) || 'Cycle Général',
            competence: 'Compétence',
            dateDebut: '2026-01-01',
            dateFin: '2026-06-30',
            statut: 'En cours',
            lecons: [{
              id: Date.now() + 1,
              titre: (donneesModifiees && donneesModifiees.leconAssociee) || (item && item.leconAssociee) || 'Leçon Générale',
              nombreSeancesPrevues: 3,
              statut: 'En cours',
              seances: [nouvelleSeanceReutilisee]
            }]
          });
        } else {
          let premierCycle = { ...cyclesCible[0] };
          let leconsCibles = Array.isArray(premierCycle.lecons) ? [...premierCycle.lecons] : [];
          if (leconsCibles.length === 0) {
            leconsCibles.push({
              id: Date.now() + 1,
              titre: 'Leçon Générale',
              nombreSeancesPrevues: 3,
              statut: 'En cours',
              seances: [nouvelleSeanceReutilisee]
            });
          } else {
            let premiereLecon = { ...leconsCibles[0] };
            premiereLecon.seances = [...(premiereLecon.seances || []), nouvelleSeanceReutilisee];
            leconsCibles[0] = premiereLecon;
          }
          premierCycle.lecons = leconsCibles;
          cyclesCible[0] = premierCycle;
        }
        return { ...(prev || {}), [classeCible]: { ...progCible, cycles: cyclesCible } };
      });
    });

    showToast("♻️ Fiche réutilisée avec succès !");
    setModalConsulterReutiliser({ ouvert: false, item: null, donneesModifiees: {}, classesSelectionnees: [], datesParClasse: {} });
  };

  const soumettreAuCenseur = (type, cycleId, leconId = null, seanceId = null) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !Array.isArray(prog.cycles)) return;

    const cyclesMaj = prog.cycles.map(c => {
      if (c.id === cycleId) {
        if (type === 'programme' || type === 'cycle') return { ...c, soumisAuCenseur: true };
        return {
          ...c,
          lecons: Array.isArray(c.lecons) ? c.lecons.map(l => {
            if (l.id === leconId) {
              if (type === 'lecon') return { ...l, soumisAuCenseur: true };
              return {
                ...l,
                seances: Array.isArray(l.seances) ? l.seances.map(s => s.id === seanceId ? { ...s, soumisAuCenseur: true } : s) : []
              };
            }
            return l;
          }) : []
        };
      }
      return c;
    });

    setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🚀 Élément envoyé au censeur !");
  };

  const marquerLeconTerminee = (cycleId, leconId) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !Array.isArray(prog.cycles)) return;
    const cyclesMaj = prog.cycles.map(c => c.id === cycleId ? {
      ...c,
      lecons: Array.isArray(c.lecons) ? c.lecons.map(l => l.id === leconId ? { ...l, statut: 'Terminée' } : l) : []
    } : c);
    setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🏁 Leçon terminée !");
  };

  const marquerCycleTermine = (cycleId) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !Array.isArray(prog.cycles)) return;
    const cyclesMaj = prog.cycles.map(c => c.id === cycleId ? { ...c, statut: 'Terminé' } : c);
    setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🏆 Cycle terminé !");
  };

  const ouvrirModalEdition = (type, cycleId, leconId = null, seanceId = null) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !Array.isArray(prog.cycles)) return;
    const cycle = prog.cycles.find(c => c.id === cycleId);
    if (!cycle) return;

    let donnees = {};
    if (type === 'cycle') donnees = { titre: cycle.titre, competence: cycle.competence, dateDebut: cycle.dateDebut, dateFin: cycle.dateFin };
    else if (type === 'lecon') {
      const lecon = Array.isArray(cycle.lecons) ? cycle.lecons.find(l => l.id === leconId) : null;
      if (lecon) donnees = { titre: lecon.titre, nombreSeancesPrevues: lecon.nombreSeancesPrevues };
    } else if (type === 'seance') {
      const lecon = Array.isArray(cycle.lecons) ? cycle.lecons.find(l => l.id === leconId) : null;
      const seance = lecon && Array.isArray(lecon.seances) ? lecon.seances.find(s => s.id === seanceId) : null;
      if (seance) donnees = { titre: seance.titre, date: seance.date, lieu: seance.lieu, ...(seance.valeursChamps || {}) };
    }

    setModalEdition({ ouvert: true, type, cycleId, leconId, seanceId, donnees });
  };

  const sauvegarderEdition = (e) => {
    e.preventDefault();
    const { type, cycleId, leconId, seanceId, donnees } = modalEdition;
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !Array.isArray(prog.cycles)) return;

    const cyclesMaj = prog.cycles.map(c => {
      if (c.id === cycleId) {
        if (type === 'cycle') return { ...c, ...(donnees || {}) };
        return {
          ...c,
          lecons: Array.isArray(c.lecons) ? c.lecons.map(l => {
            if (l.id === leconId) {
              if (type === 'lecon') return { ...l, ...(donnees || {}) };
              return {
                ...l,
                seances: Array.isArray(l.seances) ? l.seances.map(s => {
                  if (s.id === seanceId) {
                    let valeursChampsMaj = { ...(s.valeursChamps || {}) };
                    if (Array.isArray(champsPersonnalises)) {
                      champsPersonnalises.forEach(champ => {
                        if (donnees && donnees[champ.id] !== undefined) {
                          valeursChampsMaj[champ.id] = donnees[champ.id];
                        }
                      });
                    }
                    return { 
                      ...s, 
                      titre: (donnees && donnees.titre) || s.titre, 
                      date: (donnees && donnees.date) || s.date, 
                      lieu: (donnees && donnees.lieu) || s.lieu, 
                      valeursChamps: valeursChampsMaj 
                    };
                  }
                  return s;
                }) : []
              };
            }
            return l;
          }) : []
        };
      }
      return c;
    });

    setProgrammesClasses({ ...(programmesClasses || {}), [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    setModalEdition({ ouvert: false, type: null, cycleId: null, leconId: null, seanceId: null, donnees: {} });
    showToast("✅ Modification enregistrée !");
  };

  const soumettreDemandeAffiliation = (e) => {
    e.preventDefault();
    if (!nouvelleEcoleSaisie.trim()) return;

    const nouvelleAff = {
      id: Date.now(),
      ecole: nouvelleEcoleSaisie,
      statut: 'En attente',
      classes: typeof nouvellesClassesSaisies === 'string' ? nouvellesClassesSaisies.split(',').map(c => c.trim()) : []
    };

    setAffiliations(prev => [...(Array.isArray(prev) ? prev : []), nouvelleAff]);
    setModalAffiliation(false);
    setNouvelleEcoleSaisie('');
    showToast("🚀 Demande d'affiliation transmise au censeur !");
  };

  const telechargerPDFEntite = (titreEntite, sousTitre, contenuTableau) => {
    const fenetreImpression = window.open('', '_blank');
    if (!fenetreImpression) return;
    fenetreImpression.document.write(`
      <html>
        <head>
          <title>${titreEntite}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; background: #fff; }
            .header-doc { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
            .header-doc h2 { margin: 0; color: #0f172a; font-size: 16px; text-transform: uppercase; font-weight: 800; }
            .meta { background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #cbd5e1; font-size: 13px; }
            .meta p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px 14px; font-size: 13px; text-align: left; vertical-align: top; }
            th { background-color: #f1f5f9; font-weight: 700; color: #0f172a; width: 30%; }
            td { color: #334155; width: 70%; }
          </style>
        </head>
        <body>
          <div class="header-doc">
            <h2>${infosEnseignant.etablissementSaisi}</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">E-cahier Numérique de Suivi Pédagogique</p>
          </div>
          <div class="meta">
            <p><strong>Enseignant(e) :</strong> ${infosEnseignant.civilite} ${infosEnseignant.nom} ${infosEnseignant.prenoms} (${infosEnseignant.matiere})</p>
            <p><strong>Classe :</strong> ${classeSelectionneeVue || 'Toutes'} | <strong>Type :</strong> ${titreEntite}</p>
            <p><strong>Détails :</strong> ${sousTitre}</p>
          </div>
          ${contenuTableau}
          <script>
            window.onload = function() { 
              setTimeout(function() { window.print(); }, 300);
            }
          </script>
        </body>
      </html>
    `);
    fenetreImpression.document.close();
    showToast(`📥 Document "${titreEntite}" prêt pour impression / téléchargement !`);
  };

  const telechargerFicheSeancePDF = (seance, lecon, cycle) => {
    let champsHtml = '<table>';
    if (Array.isArray(champsPersonnalises)) {
      champsPersonnalises.forEach(champ => {
        const valeur = (seance && seance.valeursChamps && seance.valeursChamps[champ.id]) || 'N/A';
        champsHtml += `<tr><th>${champ.label}</th><td>${valeur.replace(/\n/g, '<br>')}</td></tr>`;
      });
    }
    if (seance && Array.isArray(seance.fichiersMultimedias) && seance.fichiersMultimedias.length) {
      champsHtml += `<tr><th>📎 Fichiers Multimedias</th><td>${seance.fichiersMultimedias.join(', ')}</td></tr>`;
    }
    champsHtml += '</table>';
    telechargerPDFEntite(`Fiche de Séance - ${seance?.titre || 'Séance'}`, `Cycle: ${cycle?.titre || ''} | Leçon: ${lecon?.titre || ''}`, champsHtml);
  };

  const telechargerLeconPDF = (lecon, cycle) => {
    let htmlContent = `<h3 style="color: #0f172a; font-size: 16px; border-bottom: 2px solid #2563eb; padding-bottom: 6px;">📖 Leçon : ${lecon.titre}</h3>`;
    htmlContent += `<p style="font-size: 13px; color: #475569;"><strong>Cycle parent :</strong> ${cycle.titre} | <strong>Séances prévues :</strong> ${lecon.nombreSeancesPrevues}</p>`;
    
    if (Array.isArray(lecon.seances) && lecon.seances.length > 0) {
      lecon.seances.forEach(sc => {
        htmlContent += `<div style="margin-top: 20px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; background: #f8fafc;">`;
        htmlContent += `<h4 style="margin: 0 0 8px 0; color: #2563eb; font-size: 14px;">⚡ Séance #${sc.numero} : ${sc.titre} (Date : ${sc.date})</h4>`;
        htmlContent += `<table>`;
        if (Array.isArray(champsPersonnalises)) {
          champsPersonnalises.forEach(champ => {
            const val = (sc.valeursChamps && sc.valeursChamps[champ.id]) || 'N/A';
            htmlContent += `<tr><th>${champ.label}</th><td>${val.replace(/\n/g, '<br>')}</td></tr>`;
          });
        }
        htmlContent += `</table></div>`;
      });
    } else {
      htmlContent += `<p style="font-style: italic; color: #94a3b8;">Aucune séance enregistrée pour cette leçon.</p>`;
    }

    telechargerPDFEntite(`Leçon - ${lecon.titre}`, `Regroupement complet de la leçon`, htmlContent);
  };

  const telechargerCyclePDF = (cycle) => {
    let htmlContent = `<h3 style="color: #0f172a; font-size: 16px; border-bottom: 2px solid #16a34a; padding-bottom: 6px;">📁 Cycle : ${cycle.titre}</h3>`;
    htmlContent += `<p style="font-size: 13px; color: #475569;"><strong>Compétence :</strong> ${cycle.competence} | <strong>Période :</strong> Du ${cycle.dateDebut} au ${cycle.dateFin}</p>`;

    if (Array.isArray(cycle.lecons) && cycle.lecons.length > 0) {
      cycle.lecons.forEach(lc => {
        htmlContent += `<div style="margin-top: 25px; border-top: 2px dashed #cbd5e1; padding-top: 15px;">`;
        htmlContent += `<h4 style="color: #1e293b; font-size: 15px; margin: 0 0 6px 0;">📖 Leçon : ${lc.titre}</h4>`;
        
        if (Array.isArray(lc.seances) && lc.seances.length > 0) {
          lc.seances.forEach(sc => {
            htmlContent += `<div style="margin-top: 12px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fdfdfd;">`;
            htmlContent += `<h5 style="margin: 0 0 6px 0; color: #2563eb; font-size: 13px;">Séance #${sc.numero} : ${sc.titre} (${sc.date})</h5>`;
            htmlContent += `<table>`;
            if (Array.isArray(champsPersonnalises)) {
              champsPersonnalises.forEach(champ => {
                const val = (sc.valeursChamps && sc.valeursChamps[champ.id]) || 'N/A';
                htmlContent += `<tr><th>${champ.label}</th><td>${val.replace(/\n/g, '<br>')}</td></tr>`;
              });
            }
            htmlContent += `</table></div>`;
          });
        }
        htmlContent += `</div>`;
      });
    } else {
      htmlContent += `<p style="font-style: italic; color: #94a3b8;">Aucune leçon enregistrée dans ce cycle.</p>`;
    }

    telechargerPDFEntite(`Cycle - ${cycle.titre}`, `Regroupement complet du cycle`, htmlContent);
  };

  const telechargerProgrammeAnnuelPDF = (progClasse, classeNom) => {
    let htmlContent = '<h3 style="color: #0f172a; font-size: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Programme Annuel Complet</h3>';
    if (progClasse && Array.isArray(progClasse.cycles)) {
      progClasse.cycles.forEach(cy => {
        htmlContent += `<div style="margin-top: 15px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc;">`;
        htmlContent += `<h4 style="margin: 0 0 6px 0; color: #2563eb; font-size: 14px;">📁 ${cy.titre} (Du ${cy.dateDebut} au ${cy.dateFin})</h4>`;
        htmlContent += `<p style="margin: 0 0 8px 0; font-size: 12px;"><strong>Compétence :</strong> ${cy.competence}</p>`;
        if (Array.isArray(cy.lecons)) {
          cy.lecons.forEach(lc => {
            htmlContent += `<div style="margin-left: 10px; margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">`;
            htmlContent += `<p style="margin: 0 0 4px 0; font-size: 12px;"><strong>📖 Leçon :</strong> ${lc.titre}</p>`;
            if (Array.isArray(lc.seances)) {
              lc.seances.forEach(sc => {
                htmlContent += `<p style="margin: 2px 0 2px 15px; font-size: 11px; color: #475569;">• Séance #${sc.numero}: ${sc.titre} (${sc.date})</p>`;
              });
            }
            htmlContent += `</div>`;
          });
        }
        htmlContent += `</div>`;
      });
    }
    telechargerPDFEntite(`Programme Annuel - ${classeNom}`, `Année scolaire ${progClasse?.anneeScolaire || ''}`, htmlContent);
  };

  const bibliothequeFiltree = useMemo(() => {
    if (!Array.isArray(bibliotheque)) return [];
    return bibliotheque.filter(b => {
      const matchAnnee = !filtreBiblioAnnee || b.anneeScolaire === filtreBiblioAnnee;
      const matchClasse = filtreBiblioClasse === 'TOUTES' || b.classe === filtreBiblioClasse;
      const matchTexte = !filtreBiblioTexte || 
                         (b.nom && b.nom.toLowerCase().includes(filtreBiblioTexte.toLowerCase())) ||
                         (b.cycleAssocie && b.cycleAssocie.toLowerCase().includes(filtreBiblioTexte.toLowerCase())) ||
                         (b.leconAssociee && b.leconAssociee.toLowerCase().includes(filtreBiblioTexte.toLowerCase()));
      return matchAnnee && matchClasse && matchTexte;
    });
  }, [bibliotheque, filtreBiblioAnnee, filtreBiblioClasse, filtreBiblioTexte]);

  return (
    <div style={styles.container}>
      <header style={styles.darkNavbar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '8px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          {/* SECTION PROFIL ÉPURÉE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }} ref={profilRef}>
            <button onClick={() => setProfilOuvert(!profilOuvert)} style={styles.navbarTeacherClickableBlock}>
              <div style={styles.avatarNavbarContainer}>
                {infosEnseignant.photoProfil ? (
                  <img src={infosEnseignant.photoProfil} alt="Profil" style={styles.avatarNavbarImg} />
                ) : (
                  <div style={styles.avatarNavbarPlaceholder}>👤</div>
                )}
              </div>
              <div style={styles.navbarTeacherInfo}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#ffffff', whiteSpace: 'nowrap' }}>
                  {infosEnseignant.civilite} {infosEnseignant.nom}
                </span>
                <span style={{ fontSize: '9px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase' }}>
                  Enseignant
                </span>
              </div>
              <span style={{ fontSize: '9px', color: '#94a3b8', marginLeft: '2px' }}>{profilOuvert ? '▲' : '▼'}</span>
            </button>

            {profilOuvert && (
              <div style={{ ...styles.notificationDropdown, left: 0, right: 'auto' }}>
                <div style={styles.dropdownHeader}>Mon Compte Enseignant</div>
                <div style={{ padding: '10px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #e2e8f0', marginBottom: '6px', background: '#f8fafc', borderRadius: '8px' }}>
                  <strong>{infosEnseignant.civilite} {infosEnseignant.nom} {infosEnseignant.prenoms}</strong><br />
                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                    {infosEnseignant.etablissementSaisi}<br />
                    <em>{infosEnseignant.matiere}</em>
                  </span>
                </div>
                <button onClick={() => { setFormProfil({ ...infosEnseignant }); setModalProfilOuvert(true); setProfilOuvert(false); }} className="bouton-option">
                  ⚙️ Modifier mon profil
                </button>
                <button onClick={() => { setModalSecurite(true); setProfilOuvert(false); }} className="bouton-option">
                  🔒 Changer mon mot de passe
                </button>
                <button onClick={() => { setModalPromotion(true); setProfilOuvert(false); }} className="bouton-option" style={{ color: '#8b5cf6', fontWeight: '800' }}>
                  🎓 Devenir Censeur (Évolution)
                </button>
                <button onClick={() => {
                  if (!modeSansAffiliation) {
                    setModalPaiement(true);
                  } else {
                    setModeSansAffiliation(false);
                    showToast("Mode sans affiliation désactivé.");
                  }
                  setProfilOuvert(false);
                }} className="bouton-option" style={{ color: '#d97706', fontWeight: '800' }}>
                  {modeSansAffiliation ? '🔄 Quitter le mode sans affiliation' : '💳 Activer Mode Sans Affiliation'}
                </button>
              </div>
            )}
          </div>

          {/* LOGO CENTRAL (ENTRE PROFIL ET NOTIFICATIONS) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.08)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <span style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px' }}>E-cahier !</span>
            <span style={{ fontSize: '12px' }}>📖</span>
          </div>

          {/* MENU BURGER & NOTIFICATIONS SÉCURISÉS DANS LE BON SENS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button onClick={() => setNotifOuvert(!notifOuvert)} style={styles.navDarkBtn}>
                <span>🔔</span>
                {Array.isArray(notifications) && notifications.filter(n => !n.lu).length > 0 && <span style={styles.pastilleAlerte}>{notifications.filter(n => !n.lu).length}</span>}
              </button>
              {notifOuvert && (
                <div style={{ ...styles.notificationDropdown, right: 0, left: 'auto' }}>
                  <div style={styles.dropdownHeader}>Notifications & Validations</div>
                  {Array.isArray(notifications) && notifications.map(n => (
                    <div key={n.id} style={styles.notifItem}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>{n.texte}</p>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                    </div>
                  ))}
                  {Array.isArray(propositionsCenseur) && propositionsCenseur.length > 0 && (
                    <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb' }}>Propositions d'affiliation :</span>
                      {propositionsCenseur.map(p => (
                        <div key={p.id} style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '8px', marginTop: '6px', fontSize: '12px', border: '1px solid #bfdbfe' }}>
                          <strong>{p.ecole}</strong> ({p.censeur})<br/>
                          <button onClick={() => {
                            const nouvelleAff = { id: Date.now(), ecole: p.ecole, statut: 'Validée', classes: p.classes || [] };
                            setAffiliations(prev => [...prev, nouvelleAff]);
                            setPropositionsCenseur(prev => prev.filter(prop => prop.id !== p.id));
                            setModeSansAffiliation(false);
                            showToast(`✅ Affiliation acceptée pour ${p.ecole} !`);
                          }} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '11px', marginTop: '6px' }}>Accepter l'affiliation</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }} ref={menuBurgerRef}>
              <button onClick={() => setMenuBurgerOuvert(!menuBurgerOuvert)} style={styles.burgerBtn} title="Menu des fonctionnalités">
                ☰
              </button>

              {menuBurgerOuvert && (
                <div style={{ ...styles.burgerDropdown, right: 0, left: 'auto' }}>
                  <div style={styles.dropdownHeader}>Menu de Navigation</div>
                  <button onClick={() => { setActiveTab('cycles'); setMenuBurgerOuvert(false); }} className="bouton-option">📊 Programme Annuel</button>
                  <button onClick={() => { setActiveTab('bibliotheque'); setMenuBurgerOuvert(false); }} className="bouton-option">📁 Bibliothèque Permanente</button>
                  <button onClick={() => { setActiveTab('affiliation'); setMenuBurgerOuvert(false); }} className="bouton-option">🏫 Gestion des Écoles & Demandes de Départ</button>
                  <button onClick={() => { setActiveTab('rapports'); setMenuBurgerOuvert(false); }} className="bouton-option">📝 Rapports de Séance</button>
                  <button onClick={() => { setModalAffiliation(true); setMenuBurgerOuvert(false); }} className="bouton-option" style={{ color: '#16a34a', fontWeight: '800' }}>+ Demander une Affiliation</button>
                  
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px' }}>
                    <button onClick={() => { setModalDeconnexion(true); setMenuBurgerOuvert(false); }} className="bouton-option" style={{ color: '#ef4444', fontWeight: '900', textAlign: 'center' }}>
                      🚪 Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* --- STYLE UNIVERSEL DES BOUTONS HARMONIEUX ET MODERNES --- */}
      <style>{`
        .bouton {
          padding: 8px 16px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .bouton:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .bouton-principal {
          background-color: #2563eb;
          color: #ffffff;
        }
        .bouton-secondaire {
          background-color: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
        }
        .bouton-succes {
          background-color: #16a34a;
          color: #ffffff;
        }
        .bouton-danger {
          background-color: #ef4444;
          color: #ffffff;
        }
        .bouton-option {
          width: 100%;
          text-align: left;
          padding: 9px 12px;
          background: transparent;
          border: none;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border-radius: 8px;
          margin-bottom: 2px;
          transition: background 0.15s ease;
        }
        .bouton-option:hover {
          background-color: #f1f5f9;
        }
      `}</style>

      <main style={styles.mainContentBody}>
        {message && <div style={styles.toastSuccess}>{message}</div>}

        {/* MODALE DE CONFIRMATION UNIVERSELLE POUR ACTIONS IRRÉVERSIBLES */}
        {modalConfirmation.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '380px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>{modalConfirmation.titre}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                {modalConfirmation.message}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalConfirmation({ ouvert: false, titre: '', message: '', actionCallback: null })} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={() => {
                  if (modalConfirmation.actionCallback) modalConfirmation.actionCallback();
                  setModalConfirmation({ ouvert: false, titre: '', message: '', actionCallback: null });
                }} className="bouton bouton-danger">Confirmer</button>
              </div>
            </div>
          </div>
        )}

        {modalDeconnexion && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🚪 Confirmation de Déconnexion</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                Êtes-vous sûr de vouloir vous déconnecter de votre session E-cahier ?
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalDeconnexion(false)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={() => {
                  setModalDeconnexion(false);
                  localStorage.removeItem('app_enseignant_statut');
                  window.location.reload();
                }} className="bouton bouton-danger">Oui, me déconnecter</button>
              </div>
            </div>
          </div>
        )}

        {modalDepart.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🚪 Demande de Départ / Mutation</h3>
                <button onClick={() => setModalDepart({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.4' }}>
                Vous demandez à quitter l'établissement <strong>{modalDepart.ecoleNom}</strong>. Conformément aux règles administratives, cette demande sera transmise au censeur pour <strong>visa officiel</strong>.
              </p>
              <form onSubmit={soumettreDemandeDepart} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.label}>Motif du départ / Mutation (obligatoire)</label>
                  <textarea 
                    value={modalDepart.motif} 
                    onChange={(e) => setModalDepart(prev => ({ ...prev, motif: e.target.value }))} 
                    placeholder="Précisez la raison..." 
                    style={{ ...styles.inputStyle, height: '90px', resize: 'vertical' }} 
                    required 
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalDepart({ ouvert: false, ecoleId: null, ecoleNom: '', motif: '' })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-danger">Soumettre pour visa du censeur</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {champASupprimer && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '16px' }}>
            <div style={{ ...styles.cardWide, width: '380px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>⚠️ Supprimer ce champ ?</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                Êtes-vous sûr de vouloir retirer ce champ de la fiche ? Cette action est irréversible.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setChampASupprimer(null)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={() => {
                  setChampsPersonnalises(prev => Array.isArray(prev) ? prev.filter(c => c.id !== champASupprimer) : []);
                  setChampASupprimer(null);
                  showToast("🗑️ Champ supprimé avec succès !");
                }} className="bouton bouton-danger">Oui, supprimer</button>
              </div>
            </div>
          </div>
        )}

        {modalSecurite && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🔒 Changer mon mot de passe</h3>
                <button onClick={() => setModalSecurite(false)} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (!ancienMdp || !nouveauMdp) {
                  showToast("⚠️ Veuillez remplir tous les champs de mot de passe.");
                  return;
                }
                showToast("🔒 Mot de passe modifié et sécurisé avec succès !");
                setModalSecurite(false);
                setAncienMdp('');
                setNouveauMdp('');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.label}>Ancien mot de passe</label>
                  <input type="password" value={ancienMdp} onChange={e => setAncienMdp(e.target.value)} style={styles.inputStyle} required />
                </div>
                <div>
                  <label style={styles.label}>Nouveau mot de passe sécurisé</label>
                  <input type="password" value={nouveauMdp} onChange={e => setNouveauMdp(e.target.value)} style={styles.inputStyle} required />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalSecurite(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Mettre à jour</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalPromotion && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🎓 Évolution de Carrière : Devenir Censeur</h3>
                <button onClick={() => setModalPromotion(false)} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <form onSubmit={envoyerDemandePromotionCenseur} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={styles.label}>Type d'évolution souhaitée</label>
                  <select value={formPromotion.type} onChange={(e) => setFormPromotion({...formPromotion, type: e.target.value})} style={styles.inputStyle}>
                    <option value="interne">Évolution Interne (Prendre la relève dans l'établissement actuel)</option>
                    <option value="externe">Évolution Externe / Mutation (Devenir Censeur dans un autre établissement)</option>
                  </select>
                </div>

                {formPromotion.type === 'interne' ? (
                  <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <p style={{ fontSize: '12px', color: '#1e40af', margin: 0 }}>Votre demande sera envoyée au Chef d'Établissement actuel ({infosEnseignant.etablissementSaisi}) pour validation de succession.</p>
                  </div>
                ) : (
                  <div>
                    <label style={styles.label}>Nom de l'établissement cible (Mutation)</label>
                    <input type="text" placeholder="Ex: Lycée Classique d'Abidjan..." value={formPromotion.ecoleCible} onChange={(e) => setFormPromotion({...formPromotion, ecoleCible: e.target.value})} style={styles.inputStyle} required />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalPromotion(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Soumettre la demande officielle</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalRapport.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>📋 Soumettre un Rapport de Séance & Compte Rendu</h3>
                <button onClick={() => setModalRapport({ ouvert: false, seanceTitre: '', ecolesCibles: [], classesCibles: [], motifReport: '', nouvelleDatePrevue: '', contenuRapport: '', difficultes: '' })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <form onSubmit={soumettreRapportSeance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.label}>Séance concernée</label>
                  <input type="text" placeholder="Ex: Séance d'initiation..." value={modalRapport.seanceTitre} onChange={e => setModalRapport({...modalRapport, seanceTitre: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div>
                  <label style={{ ...styles.label, marginBottom: '6px' }}>Établissements concernés :</label>
                  {Array.isArray(affiliations) && affiliations.map(aff => {
                    const estCoche = modalRapport.ecolesCibles.includes(aff.ecole);
                    return (
                      <label key={aff.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', marginBottom: '4px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={estCoche}
                          onChange={() => {
                            const updated = estCoche 
                              ? modalRapport.ecolesCibles.filter(e => e !== aff.ecole)
                              : [...modalRapport.ecolesCibles, aff.ecole];
                            setModalRapport(prev => ({ ...prev, ecolesCibles: updated }));
                          }}
                        />
                        {aff.ecole}
                      </label>
                    );
                  })}
                </div>

                <div>
                  <label style={{ ...styles.label, marginBottom: '6px' }}>Classes concernées (Multi-classes) :</label>
                  {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => {
                    const estCoche = modalRapport.classesCibles.includes(cl);
                    return (
                      <label key={cl} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', marginBottom: '4px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={estCoche}
                          onChange={() => {
                            const updated = estCoche 
                              ? modalRapport.classesCibles.filter(c => c !== cl)
                              : [...modalRapport.classesCibles, cl];
                            setModalRapport(prev => ({ ...prev, classesCibles: updated }));
                          }}
                        />
                        Classe {cl}
                      </label>
                    );
                  })}
                </div>

                <div>
                  <label style={styles.label}>Motif du report (optionnel)</label>
                  <input type="text" placeholder="Ex: Intempéries, absence professeur..." value={modalRapport.motifReport} onChange={e => setModalRapport({...modalRapport, motifReport: e.target.value})} style={styles.inputStyle} />
                </div>
                <div>
                  <label style={styles.label}>📅 Nouvelle date de report prévue (optionnel)</label>
                  <input type="date" value={modalRapport.nouvelleDatePrevue} onChange={e => setModalRapport({...modalRapport, nouvelleDatePrevue: e.target.value})} style={styles.inputStyle} />
                </div>
                <div>
                  <label style={styles.label}>Compte rendu / Observations / Difficultés</label>
                  <textarea placeholder="Détails complémentaires..." value={modalRapport.contenuRapport} onChange={e => setModalRapport({...modalRapport, contenuRapport: e.target.value})} style={{ ...styles.inputStyle, height: '80px', resize: 'vertical' }} required />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalRapport({ ouvert: false, seanceTitre: '', ecolesCibles: [], classesCibles: [], motifReport: '', nouvelleDatePrevue: '', contenuRapport: '', difficultes: '' })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton" style={{ fontWeight: '800', backgroundColor: '#d97706', color: '#fff' }}>📤 Transmettre le rapport</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalDuplicationIntelligente.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>⚡ Duplication Intelligente</h3>
                <button onClick={() => setModalDuplicationIntelligente({ ouvert: false, itemSource: null, typeSource: '', classesCibles: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Dupliquez instantanément cet élément vers d'autres classes avec attribution de dates personnalisées.
              </p>

              <form onSubmit={executerDuplicationIntelligente} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ ...styles.label, marginBottom: '8px' }}>Sélectionner les classes cibles :</label>
                  {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => {
                    const estCoche = modalDuplicationIntelligente.classesCibles.includes(cl);
                    return (
                      <div key={cl} style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', backgroundColor: '#f8fafc', marginBottom: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>
                          <input 
                            type="checkbox" 
                            checked={estCoche}
                            onChange={() => {
                              const updated = estCoche 
                                ? modalDuplicationIntelligente.classesCibles.filter(c => c !== cl)
                                : [...modalDuplicationIntelligente.classesCibles, cl];
                              setModalDuplicationIntelligente(prev => ({ ...prev, classesCibles: updated }));
                            }} 
                          />
                          Classe {cl}
                        </label>
                        {estCoche && (
                          <div style={{ marginTop: '6px', marginLeft: '22px' }}>
                            <label style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '2px', fontWeight: '700' }}>Date pour {cl} :</label>
                            <input 
                              type="date" 
                              value={(modalDuplicationIntelligente.datesParClasse && modalDuplicationIntelligente.datesParClasse[cl]) || ''} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setModalDuplicationIntelligente(prev => ({
                                  ...prev,
                                  datesParClasse: { ...(prev.datesParClasse || {}), [cl]: val }
                                }));
                              }} 
                              style={{ ...styles.inputStyle, padding: '6px 10px' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalDuplicationIntelligente({ ouvert: false, itemSource: null, typeSource: '', classesCibles: [], datesParClasse: {} })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Lancer la duplication</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalProfilOuvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>👤 Modifier mon profil</h3>
              
              <form onSubmit={handleEnregistrerProfil} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid #cbd5e1', flexShrink: 0 }}>
                    {formProfil.photoProfil ? (
                      <img src={formProfil.photoProfil} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '28px' }}>👤</span>
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={styles.label}>Photo de profil</label>
                    <input type="file" accept="image/*" onChange={handleChangerPhotoProfil} style={{ fontSize: '12px', cursor: 'pointer' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>Civilité</label>
                    <select value={formProfil.civilite} onChange={(e) => setFormProfil({...formProfil, civilite: e.target.value})} style={styles.inputStyle}>
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Dr">Dr</option>
                      <option value="Pr">Pr</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Nom</label>
                    <input type="text" value={formProfil.nom} onChange={(e) => setFormProfil({...formProfil, nom: e.target.value})} style={styles.inputStyle} required />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Prénoms</label>
                  <input type="text" value={formProfil.prenoms} onChange={(e) => setFormProfil({...formProfil, prenoms: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div>
                  <label style={styles.label}>Matière enseignée</label>
                  <input type="text" value={formProfil.matiere} onChange={(e) => setFormProfil({...formProfil, matiere: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div>
                  <label style={styles.label}>Nom de l'établissement</label>
                  <input type="text" value={formProfil.etablissementSaisi} onChange={(e) => setFormProfil({...formProfil, etablissementSaisi: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div>
                  <label style={styles.label}>Ville</label>
                  <input type="text" value={formProfil.ville} onChange={(e) => setFormProfil({...formProfil, ville: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalProfilOuvert(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalPaiement && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>💳 Abonnement Mode Sans Affiliation</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                Définissez vos propres classes en toute autonomie. Montant : <strong style={{ color: '#d97706' }}>1 900 FCFA / mois</strong>.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <label style={styles.label}>Moyen de paiement :</label>
                
                <div onClick={() => setMethodePaiement('wave')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: methodePaiement === 'wave' ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
                  <div style={{ width: '42px', height: '42px', backgroundColor: '#0083ff', borderRadius: '10px', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '15px' }}>W</div>
                  <div style={{ flex: 1 }}><strong>Wave Mobile Money</strong></div>
                </div>

                <div onClick={() => setMethodePaiement('orange')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: methodePaiement === 'orange' ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
                  <div style={{ width: '42px', height: '42px', backgroundColor: '#ff6600', borderRadius: '10px', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '12px' }}>OM</div>
                  <div style={{ flex: 1 }}><strong>Orange Money</strong></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalPaiement(false)} className="bouton bouton-secondaire">Annuler</button>
                <button type="button" onClick={() => {
                  setModeSansAffiliation(true);
                  setModalPaiement(false);
                  showToast("💳 Paiement validé ! Mode Sans Affiliation activé.");
                }} className="bouton bouton-principal">Procéder au paiement (1 900 FCFA)</button>
              </div>
            </div>
          </div>
        )}

        {modalAffiliation && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🏫 Demande d'Affiliation à une École</h3>
              <form onSubmit={soumettreDemandeAffiliation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.label}>Nom de l'établissement</label>
                  <input type="text" placeholder="Ex: Lycée Moderne..." value={nouvelleEcoleSaisie} onChange={(e) => setNouvelleEcoleSaisie(e.target.value)} style={styles.inputStyle} required />
                </div>
                <div>
                  <label style={styles.label}>Classes concernées (séparées par des virgules)</label>
                  <input type="text" placeholder="Ex: 6ème A, 5ème B" value={nouvellesClassesSaisies} onChange={(e) => setNouvellesClassesSaisies(e.target.value)} style={styles.inputStyle} required />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalAffiliation(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Soumettre la demande</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {champEnEditionPleinEcran && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '16px' }}>
            <div style={{ ...styles.cardWide, width: '90vw', maxWidth: '650px', height: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '24px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>✍️ Rédiger : {champEnEditionPleinEcran.label}</h3>
                  <button onClick={() => setChampEnEditionPleinEcran(null)} className="bouton bouton-secondaire" style={{ padding: '6px 12px' }}>✕</button>
                </div>
                <textarea 
                  autoFocus
                  value={champEnEditionPleinEcran.valeurTemporaire}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChampEnEditionPleinEcran(prev => ({ ...prev, valeurTemporaire: val }));
                  }}
                  placeholder="Écrivez votre contenu ici..."
                  style={{ ...styles.inputStyle, height: '45vh', resize: 'none', fontSize: '15px', lineHeight: '1.6', padding: '16px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <button type="button" onClick={() => setChampEnEditionPleinEcran(null)} className="bouton bouton-secondaire">Annuler</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setModalAssistant(prev => ({
                      ...prev,
                      valeursChamps: { ...(prev.valeursChamps || {}), [champEnEditionPleinEcran.id]: champEnEditionPleinEcran.valeurTemporaire }
                    }));
                    setChampEnEditionPleinEcran(null);
                    showToast("✨ Texte validé avec succès !");
                  }} 
                  className="bouton bouton-succes"
                  style={{ padding: '10px 24px', fontWeight: '900', fontSize: '14px' }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {modalAssistant.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>
                  {modalAssistant.niveauCible === 'programme_annuel' && '📊 Créer un Programme Annuel Complet'}
                  {modalAssistant.niveauCible === 'cycle' && '✨ Créer un Cycle Multi-Écoles & Multi-Classes'}
                  {modalAssistant.niveauCible === 'lecon' && '📖 Créer une nouvelle Leçon'}
                  {modalAssistant.niveauCible === 'seance' && '📝 Créer une Séance'}
                </h3>
                <button onClick={() => setModalAssistant({ ...modalAssistant, ouvert: false })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <label style={{ ...styles.label, color: '#2563eb', fontSize: '13px', margin: 0 }}>⚙️ Structure & Champs de la fiche :</label>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
                  {Array.isArray(champsPersonnalises) && champsPersonnalises.map((champ, index) => (
                    <div key={champ.id} style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', display: 'block', marginBottom: '4px' }}>ÉNONCÉ DU CHAMP #{index + 1}</label>
                          <input 
                            type="text" 
                            value={champ.label} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setChampsPersonnalises(prev => prev.map(c => c.id === champ.id ? { ...c, label: val } : c));
                            }}
                            style={{ ...styles.inputStyle, padding: '10px 12px', fontSize: '13px', fontWeight: '800', backgroundColor: '#f8fafc' }}
                          />
                        </div>

                        {champsPersonnalises.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => setChampASupprimer(champ.id)}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', fontWeight: '900', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', flexShrink: 0, marginTop: '16px' }}
                          >
                            −
                          </button>
                        )}
                      </div>

                      <div>
                        <label style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', display: 'block', marginBottom: '4px' }}>CONTENU</label>
                        <textarea 
                          onClick={() => {
                            setChampEnEditionPleinEcran({
                              id: champ.id,
                              label: champ.label,
                              valeurTemporaire: (modalAssistant.valeursChamps && modalAssistant.valeursChamps[champ.id]) || ''
                            });
                          }}
                          readOnly
                          value={(modalAssistant.valeursChamps && modalAssistant.valeursChamps[champ.id]) || ''}
                          style={{ ...styles.inputStyle, height: '65px', resize: 'none', backgroundColor: '#fdfdfd', fontSize: '12px', cursor: 'pointer', color: '#334155' }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  type="button" 
                  onClick={() => {
                    const newId = `champ_${Date.now()}`;
                    setChampsPersonnalises(prev => [...(Array.isArray(prev) ? prev : []), { id: newId, label: 'Nouveau champ', type: 'textarea' }]);
                    showToast("➕ Champ ajouté !");
                  }} 
                  className="bouton bouton-succes"
                  style={{ width: '100%', marginBottom: '10px' }}
                >
                  + Ajouter un champ
                </button>
              </div>

              <form onSubmit={gererValidationAssistant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {modalAssistant.niveauCible === 'programme_annuel' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre du programme annuel</label>
                      <input type="text" value={modalAssistant.titreProgramme} onChange={(e) => setModalAssistant({...modalAssistant, titreProgramme: e.target.value})} style={styles.inputStyle} required />
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      <label style={{ ...styles.label, marginBottom: '8px', color: '#0f172a' }}>🏫 Classes cibles :</label>
                      {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => {
                        const estCoche = Array.isArray(modalAssistant.classesCiblesCycle) && modalAssistant.classesCiblesCycle.includes(cl);
                        return (
                          <div key={cl} style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '6px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                              <input 
                                type="checkbox" 
                                checked={estCoche}
                                onChange={() => {
                                  const ciblesActuelles = Array.isArray(modalAssistant.classesCiblesCycle) ? modalAssistant.classesCiblesCycle : [];
                                  const updated = estCoche ? ciblesActuelles.filter(c => c !== cl) : [...ciblesActuelles, cl];
                                  setModalAssistant(prev => ({ ...prev, classesCiblesCycle: updated }));
                                }} 
                              />
                              Classe {cl}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {modalAssistant.niveauCible === 'cycle' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre du cycle</label>
                      <input type="text" value={modalAssistant.titreCycle} onChange={(e) => setModalAssistant({...modalAssistant, titreCycle: e.target.value})} style={styles.inputStyle} required />
                    </div>
                    <div>
                      <label style={styles.label}>Compétence visée</label>
                      <input type="text" value={modalAssistant.competenceCycle} onChange={(e) => setModalAssistant({...modalAssistant, competenceCycle: e.target.value})} style={styles.inputStyle} />
                    </div>
                  </>
                )}

                {modalAssistant.niveauCible === 'lecon' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre de la leçon</label>
                      <input type="text" value={modalAssistant.titreLecon} onChange={(e) => setModalAssistant({...modalAssistant, titreLecon: e.target.value})} style={styles.inputStyle} required />
                    </div>
                    <div>
                      <label style={styles.label}>Nombre de séances</label>
                      <input type="number" min="1" value={modalAssistant.nombreSeancesLecon} onChange={(e) => setModalAssistant({...modalAssistant, nombreSeancesLecon: e.target.value})} style={styles.inputStyle} required />
                    </div>
                  </>
                )}

                {modalAssistant.niveauCible === 'seance' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre de la séance</label>
                      <input type="text" value={modalAssistant.titreSeance} onChange={(e) => setModalAssistant({...modalAssistant, titreSeance: e.target.value})} style={styles.inputStyle} required />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalAssistant({ ...modalAssistant, ouvert: false })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Valider & Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalEdition.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>✏️ Modifier {modalEdition.type}</h3>
              <form onSubmit={sauvegarderEdition} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {modalEdition.donnees && Object.entries(modalEdition.donnees).map(([key, val]) => (
                  <div key={key}>
                    <label style={styles.label}>{key.toUpperCase()}</label>
                    <input 
                      type="text" 
                      value={val || ''} 
                      onChange={(e) => setModalEdition(prev => ({ ...prev, donnees: { ...(prev.donnees || {}), [key]: e.target.value } }))} 
                      style={styles.inputStyle} 
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalEdition({ ouvert: false, type: null, cycleId: null, leconId: null, seanceId: null, donnees: {} })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalConsulterReutiliser.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>👁️ Consulter, Modifier & Réutiliser</h3>
                <button onClick={() => setModalConsulterReutiliser({ ouvert: false, item: null, donneesModifiees: {}, classesSelectionnees: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <form onSubmit={executerConsultationEtReutilisation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.label}>Titre de la fiche / séance</label>
                  <input 
                    type="text" 
                    value={(modalConsulterReutiliser.donneesModifiees && modalConsulterReutiliser.donneesModifiees.nom) || ''} 
                    onChange={(e) => setModalConsulterReutiliser(prev => ({ ...prev, donneesModifiees: { ...(prev.donneesModifiees || {}), nom: e.target.value } }))} 
                    style={styles.inputStyle} 
                    required 
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalConsulterReutiliser({ ouvert: false, item: null, donneesModifiees: {}, classesSelectionnees: [], datesParClasse: {} })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer & Réutiliser</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ONGLET : PROGRAMME ANNUEL */}
        {activeTab === 'cycles' && (
          <div>
            {!classeSelectionneeVue ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Programme Annuel & Gestion par Classe</h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Cliquez sur une classe pour consulter son programme annuel.</p>
                  </div>
                  {modeSansAffiliation && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder="Nom de votre nouvelle classe..." 
                        value={nouvelleClasseLibre} 
                        onChange={(e) => setNouvelleClasseLibre(e.target.value)}
                        style={{ ...styles.inputStyle, width: '220px' }}
                      />
                      <button onClick={() => {
                        if (!nouvelleClasseLibre.trim()) return;
                        setClassesSansAffiliation(prev => [...(Array.isArray(prev) ? prev : []), nouvelleClasseLibre.trim()]);
                        setNouvelleClasseLibre('');
                        showToast("Classe libre ajoutée avec succès !");
                      }} className="bouton bouton-principal">+ Ajouter</button>
                    </div>
                  )}
                </div>

                <div style={styles.grilleClasses}>
                  {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => {
                    const progExiste = programmesClasses && !!programmesClasses[cl];
                    return (
                      <div key={cl} style={styles.carteClasseItem}>
                        <div onClick={() => { setClasseSelectionneeVue(cl); if (!progExiste) initialiserProgrammeClasse(cl); }} style={{ cursor: 'pointer' }}>
                          <span style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>🏫 {cl}</span>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 12px 0' }}>
                            {progExiste && programmesClasses[cl]?.cycles ? `${programmesClasses[cl].cycles.length} cycle(s) au programme` : 'Cliquez pour initialiser'}
                          </p>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb' }}>Ouvrir le programme →</span>
                        </div>

                        {/* BOUTON SUPPRESSION CLASSE SÉCURISÉ PAR MODALE */}
                        {modeSansAffiliation && (
                          <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '8px', textAlign: 'right' }}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalConfirmation({
                                  ouvert: true,
                                  titre: '⚠️ Supprimer cette classe ?',
                                  message: `Voulez-vous vraiment supprimer la classe "${cl}" ? Cette action est irréversible.`,
                                  actionCallback: () => supprimerClasseLibre(cl)
                                });
                              }} 
                              className="bouton bouton-danger"
                              style={{ padding: '6px 10px', fontSize: '11px' }}
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <button onClick={() => setClasseSelectionneeVue(null)} className="bouton bouton-secondaire" style={{ marginBottom: '8px' }}>← Retour aux classes</button>
                    <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Programme : <span style={{ color: '#2563eb' }}>{classeSelectionneeVue}</span></h2>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => telechargerProgrammeAnnuelPDF(programmesClasses?.[classeSelectionneeVue], classeSelectionneeVue)} className="bouton bouton-secondaire">
                      📥 Télécharger Programme PDF
                    </button>
                    <button onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'programme_annuel', titreProgramme: `Prog. ${classeSelectionneeVue}`, cyclesProgramme: [{ id: Date.now(), titre: 'Cycle 1', duree: '3 semaines', nbLecons: 2 }], classesCiblesCycle: [classeSelectionneeVue] })} className="bouton" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: '#ffffff' }}>
                      📊 Créer le programme annuel
                    </button>
                    <button onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'cycle' })} className="bouton bouton-principal">
                      + Créer un Cycle Multi-écoles
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {programmesClasses?.[classeSelectionneeVue]?.cycles && Array.isArray(programmesClasses[classeSelectionneeVue].cycles) && programmesClasses[classeSelectionneeVue].cycles.map(cycle => {
                    const estCycleOuvert = !!cyclesOuverts[cycle.id];
                    return (
                      <div key={cycle.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '20px', borderLeft: '6px solid #2563eb', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }} onClick={() => toggleCycle(cycle.id)}>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: '#2563eb' }}>{estCycleOuvert ? '▼' : '▶'}</span>
                            <div>
                              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0' }}>📁 {cycle.titre}</h3>
                              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                                <strong>Compétence :</strong> {cycle.competence} | 
                                <strong>Durée :</strong> {cycle.dureeEstimee ? `${cycle.dureeEstimee}` : `Du ${cycle.dateDebut} au ${cycle.dateFin}`}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button onClick={() => telechargerCyclePDF(cycle)} className="bouton bouton-succes" style={{ padding: '6px 10px', fontSize: '11px' }}>📥 Cycle PDF</button>
                            <button onClick={() => ouvrirModalEdition('cycle', cycle.id)} className="bouton bouton-secondaire" style={{ padding: '6px 10px', fontSize: '11px' }}>✏️ Modifier</button>
                            <button onClick={() => setModalDuplicationIntelligente({ ouvert: true, itemSource: cycle, typeSource: 'cycle', classesCibles: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '6px 10px', fontSize: '11px', color: '#2563eb' }}>⚡ Dupliquer</button>
                            {cycle.statut !== 'Terminé' && (
                              <button onClick={() => marquerCycleTermine(cycle.id)} className="bouton bouton-succes" style={{ padding: '6px 10px', fontSize: '11px' }}>🏆 Terminer</button>
                            )}
                            <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', backgroundColor: cycle.statut === 'Terminé' ? '#dcfce7' : '#e0f2fe', color: cycle.statut === 'Terminé' ? '#166534' : '#0369a1' }}>{cycle.statut}</span>
                          </div>
                        </div>

                        {estCycleOuvert && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', paddingLeft: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#334155', margin: 0 }}>📖 Leçons de ce cycle :</h4>
                              <button onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'lecon', cycleIdCible: cycle.id })} className="bouton bouton-secondaire" style={{ padding: '4px 10px', fontSize: '11px', color: '#2563eb' }}>
                                + Créer une Leçon
                              </button>
                            </div>

                            {Array.isArray(cycle.lecons) && cycle.lecons.map(lecon => {
                              const estLeconOuverte = !!leconsOuvertes[lecon.id];
                              return (
                                <div key={lecon.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '14px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }} onClick={() => toggleLecon(lecon.id)}>
                                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#2563eb' }}>{estLeconOuverte ? '▼' : '▶'}</span>
                                      <h5 style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                                        {lecon.titre} <span style={{ fontSize: '11px', color: '#64748b' }}>(Séances : {lecon.nombreSeancesPrevues})</span>
                                      </h5>
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                      <button onClick={() => telechargerLeconPDF(lecon, cycle)} className="bouton bouton-principal" style={{ padding: '4px 8px', fontSize: '10px' }}>📥 Leçon PDF</button>
                                      <button onClick={() => ouvrirModalEdition('lecon', cycle.id, lecon.id)} className="bouton bouton-secondaire" style={{ padding: '4px 8px', fontSize: '10px' }}>✏️ Modifier</button>
                                      {lecon.statut !== 'Terminée' && (
                                        <button onClick={() => marquerLeconTerminee(cycle.id, lecon.id)} className="bouton bouton-succes" style={{ padding: '4px 8px', fontSize: '10px' }}>🏁 Terminer</button>
                                      )}
                                      <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: lecon.statut === 'Terminée' ? '#dcfce7' : '#fef3c7', color: lecon.statut === 'Terminée' ? '#166534' : '#92400e' }}>{lecon.statut}</span>
                                    </div>
                                  </div>

                                  {estLeconOuverte && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px', paddingLeft: '10px' }}>
                                      {Array.isArray(lecon.seances) && lecon.seances.map(seance => (
                                        <div key={seance.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                                          <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                                              <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '11px' }}>Séance #{seance.numero}</span>
                                              <strong style={{ fontSize: '12px', color: '#0f172a' }}>{seance.titre}</strong>
                                              <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>📅 {seance.date}</span>
                                              {seance.soumisAuCenseur && <span style={{ fontSize: '9px', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 4px', borderRadius: '4px', fontWeight: '800' }}>✓ Envoyé</span>}
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <button onClick={() => ouvrirModalEdition('seance', cycle.id, lecon.id, seance.id)} className="bouton bouton-secondaire" style={{ padding: '4px 8px', fontSize: '10px' }}>✏️ Modifier</button>
                                            <button onClick={() => telechargerFicheSeancePDF(seance, lecon, cycle)} className="bouton bouton-principal" style={{ padding: '4px 8px', fontSize: '10px' }}>📥 Séance PDF</button>
                                            
                                            {!modeSansAffiliation && !seance.soumisAuCenseur && (
                                              <button onClick={() => soumettreAuCenseur('seance', cycle.id, lecon.id, seance.id)} className="bouton bouton-succes" style={{ padding: '4px 8px', fontSize: '10px' }}>
                                                🚀 Envoyé
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))}

                                      <div style={{ marginTop: '6px' }}>
                                        <button onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'seance', cycleIdCible: cycle.id, leconIdCible: lecon.id })} className="bouton bouton-secondaire" style={{ fontSize: '11px', width: '100%', borderStyle: 'dashed', padding: '8px' }}>
                                          + Ajouter une nouvelle séance
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ONGLET : BIBLIOTHÈQUE */}
        {activeTab === 'bibliotheque' && (
          <div style={styles.cardWide}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Bibliothèque & Base de Données Permanente</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Filtrez par année et par classe pour rechercher, télécharger et réutiliser vos fiches.</p>
            </div>

            <div style={styles.bibliothequeFilterBox}>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.labelFiltre}>Année</label>
                <select value={filtreBiblioAnnee} onChange={(e) => setFiltreBiblioAnnee(e.target.value)} style={styles.inputStyle}>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.labelFiltre}>Classe</label>
                <select value={filtreBiblioClasse} onChange={(e) => setFiltreBiblioClasse(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes les classes</option>
                  {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => <option key={cl} value={cl}>{cl}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 240px' }}>
                <label style={styles.labelFiltre}>Recherche</label>
                <input type="text" placeholder="Titre, habileté..." value={filtreBiblioTexte} onChange={(e) => setFiltreBiblioTexte(e.target.value)} style={styles.inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              {bibliothequeFiltree.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Aucune fiche trouvée.</p>
              ) : (
                bibliothequeFiltree.map(b => (
                  <div key={b.id} style={styles.itemRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{b.classe}</span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{b.nom}</strong>
                      </div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Cycle : {b.cycleAssocie} | Leçon : {b.leconAssociee}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => telechargerFicheSeancePDF(b, { titre: b.leconAssociee }, { titre: b.cycleAssocie })} className="bouton bouton-principal" style={{ padding: '6px 12px', fontSize: '12px' }}>📥 Télécharger</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ONGLET : RAPPORTS DE SÉANCE */}
        {activeTab === 'rapports' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>📝 Rapports de Séance Transmis</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Historique de vos comptes-rendus envoyés au censeur.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!Array.isArray(rapportsSeances) || rapportsSeances.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Aucun rapport transmis.</p>
              ) : (
                rapportsSeances.map(r => (
                  <div key={r.id} style={styles.itemRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                          Classes: {Array.isArray(r.classesCibles) ? r.classesCibles.join(', ') : ''}
                        </span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{r.seanceTitre}</strong>
                      </div>
                      <p style={{ fontSize: '13px', color: '#334155', margin: '4px 0' }}><strong>Compte rendu :</strong> {r.contenuRapport}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ONGLET : ÉCOLES & BOUTON QUITTER L'ÉTABLISSEMENT */}
        {activeTab === 'affiliation' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>🏫 Gestion des Établissements & Demandes de Départ</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Initiez une demande de départ (soumise au visa du censeur) ou demandez une affiliation.</p>
              </div>
              <button onClick={() => setModalAffiliation(true)} className="bouton bouton-succes">
                + Demander une affiliation
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {!Array.isArray(affiliations) || affiliations.length === 0 ? (
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#94a3b8' }}>Aucune école affiliée pour le moment.</p>
              ) : (
                affiliations.map(aff => {
                  const demandeEnCours = Array.isArray(demandesDepart) ? demandesDepart.find(d => d.ecoleId === aff.id && d.statut.includes('En attente')) : null;
                  return (
                    <div key={aff.id} style={styles.itemRow}>
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '14px' }}>{aff.ecole}</strong> <span style={{ color: '#64748b', fontSize: '12px' }}>({aff.statut})</span><br/>
                        <small style={{ color: '#64748b', fontSize: '12px' }}>Classes : <strong>{Array.isArray(aff.classes) ? aff.classes.join(', ') : ''}</strong></small>
                        {demandeEnCours && (
                          <div style={{ marginTop: '4px' }}>
                            <span style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                              ⏳ Demande de départ en cours (Visa censeur requis)
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        {!demandeEnCours ? (
                          <button onClick={() => setModalDepart({ ouvert: true, ecoleId: aff.id, ecoleNom: aff.ecole, motif: '' })} className="bouton bouton-danger" style={{ padding: '8px 14px', fontSize: '12px', fontWeight: '800' }}>
                            🚪 Quitter l'établissement
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>En attente de visa...</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b', paddingBottom: '40px', overflowX: 'hidden', boxSizing: 'border-box', width: '100%' },
  darkNavbar: { backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderBottom: '1px solid #1e293b', position: 'sticky', top: '0', zIndex: 100, width: '100%', boxSizing: 'border-box' },
  mainContentBody: { padding: '20px 12px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  cardWide: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  grilleClasses: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px', width: '100%', boxSizing: 'border-box' },
  carteClasseItem: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', boxSizing: 'border-box' },
  bibliothequeFilterBox: { display: 'flex', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap', boxSizing: 'border-box' },
  labelFiltre: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '12px', boxSizing: 'border-box', width: '100%', flexWrap: 'wrap' },
  label: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  inputStyle: { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
  toastSuccess: { backgroundColor: '#0f172a', color: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', fontWeight: '700', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  navbarTeacherClickableBlock: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '10px', border: '1px solid #334155', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box' },
  avatarNavbarContainer: { width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #475569', flexShrink: 0 },
  avatarNavbarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarNavbarPlaceholder: { fontSize: '14px', color: '#94a3b8' },
  navbarTeacherInfo: { display: 'flex', flexDirection: 'column' },
  notificationDropdown: { position: 'absolute', top: '42px', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', width: '280px', maxWidth: '90vw', zIndex: 110, padding: '10px', boxSizing: 'border-box' },
  dropdownHeader: { padding: '6px 8px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', marginBottom: '6px' },
  notifItem: { backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', fontSize: '11px', marginBottom: '4px', border: '1px solid #f1f5f9', cursor: 'pointer' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '6px 10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' },
  fondModale: { position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000', padding: '12px', boxSizing: 'border-box' },
  pastilleAlerte: { backgroundColor: '#ef4444', color: 'white', padding: '1px 4px', borderRadius: '999px', fontSize: '9px', fontWeight: '800', position: 'absolute', top: '-4px', right: '-4px' },
  burgerBtn: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '10px', fontSize: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' },
  burgerDropdown: { position: 'absolute', top: '42px', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', width: '220px', maxWidth: '85vw', zIndex: 120, padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }
};
