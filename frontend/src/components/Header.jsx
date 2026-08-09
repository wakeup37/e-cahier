import React, { useState, useMemo, useRef, useEffect } from 'react';

// =========================================================================
// 1. SÉCURISATION MAXIMALE DES DONNÉES LOCALES (ANTI-CRASH)
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

export default function EnseignantDashboard() {
  
  // --- GESTION DES AFFILIATIONS MULTI-ÉTABLISSEMENTS ---
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

  const estAffiliationValidee = useMemo(() => {
    return affiliations.some(aff => aff.statut === 'Validée');
  }, [affiliations]);

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
      if (aff.statut === 'Validée') {
        aff.classes.forEach(cl => {
          if (!classes.includes(cl)) classes.push(cl);
        });
      }
    });
    return classes.length > 0 ? classes : ['6ème A', '6ème B'];
  }, [modeSansAffiliation, classesSansAffiliation, affiliations]);

  const [activeTab, setActiveTab] = useState('cycles');
  const [message, setMessage] = useState('');

  // --- MENU BURGER FLUIDE SUR LA BARRE NOIRE ---
  const [menuBurgerOuvert, setMenuBurgerOuvert] = useState(false);
  const menuBurgerRef = useRef(null);

  // --- MODALE DE CONFIRMATION DE DÉCONNEXION ---
  const [modalDeconnexion, setModalDeconnexion] = useState(false);

  // --- SÉCURITÉ : MOT DE PASSE OUBLIÉ & EMAIL / NUMÉRO DE TÉLÉPHONE ---
  const [modalSecurite, setModalSecurite] = useState(false);
  const [modeSecurite, setModeSecurite] = useState('mdp'); // 'mdp' ou 'oublie'
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [identifiantRecuperation, setIdentifiantRecuperation] = useState('');
  const [typeRecuperation, setTypeRecuperation] = useState('email'); // 'email' ou 'telephone'

  // --- RAPPORTS DE SÉANCE & SYSTÈME DE REPORT INTELLIGENT ---
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
    classe: '',
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
          cycles: [
            {
              id: 1,
              titre: 'Cycle 1 : Gymnastique au sol et coordination',
              competence: 'Traiter une situation de coordination motrice.',
              dateDebut: '2026-01-10',
              dateFin: '2026-02-28',
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
                      habilites: 'Savoir enrouler sa tête.',
                      contenus: 'Atelier sol matelas.',
                      exercices: 'Roulé-boulé.',
                      evaluations: 'Formative.',
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

  // --- MODÈLES DE CRÉATION DE SÉANCE ENREGISTRABLES ---
  const [modeleSeanceChoisi, setModeleSeanceChoisi] = useState(() => {
    return localStorage.getItem('app_enseignant_modele_seance') || 'standard';
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_modele_seance', modeleSeanceChoisi);
  }, [modeleSeanceChoisi]);

  const [modalAssistant, setModalAssistant] = useState({
    ouvert: false,
    niveauCible: 'cycle',
    cycleIdCible: null,
    leconIdCible: null,
    titreCycle: '',
    competenceCycle: '',
    dateDebutCycle: new Date().toISOString().split('T')[0],
    dateFinCycle: new Date().toISOString().split('T')[0],
    titreLecon: '',
    nombreSeancesLecon: '3',
    titreSeance: '',
    dateSeance: new Date().toISOString().split('T')[0],
    lieuSeance: '',
    habilites: '',
    contenus: '',
    exercices: '',
    evaluations: '',
    fichiersMultimedias: [],
    enCoursScan: false,
    fichierNom: ''
  });

  const [modalAIPreview, setModalAIPreview] = useState({
    ouvert: false,
    donneesExtraites: null,
    niveauCible: null
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

  // --- MODALE DE DUPLICATION INTELLIGENTE ---
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

  const executerDuplicationIntelligente = (e) => {
    e.preventDefault();
    const { itemSource, typeSource, classesCibles, datesParClasse } = modalDuplicationIntelligente;
    if (classesCibles.length === 0) {
      showToast("⚠️ Veuillez sélectionner au moins une classe cible.");
      return;
    }

    classesCibles.forEach(classeCible => {
      const dateCible = datesParClasse[classeCible] || new Date().toISOString().split('T')[0];
      if (!programmesClasses[classeCible]) {
        initialiserProgrammeClasse(classeCible);
      }
      const progCible = programmesClasses[classeCible] || { anneeScolaire: '2025-2026', cycles: [] };

      if (typeSource === 'cycle') {
        const nouveauCycle = {
          ...itemSource,
          id: Date.now() + Math.random(),
          titre: `${itemSource.titre} (Dupliqué - ${classeCible})`,
          lecons: itemSource.lecons.map(lc => ({
            ...lc,
            id: Date.now() + Math.random(),
            seances: lc.seances.map(sc => ({ ...sc, id: Date.now() + Math.random(), date: dateCible }))
          }))
        };
        setProgrammesClasses(prev => ({
          ...prev,
          [classeCible]: { ...progCible, cycles: [...progCible.cycles, nouveauCycle] }
        }));
      } else if (typeSource === 'lecon') {
        const nouvelleLecon = {
          ...itemSource,
          id: Date.now() + Math.random(),
          titre: `${itemSource.titre} (Dupliqué - ${classeCible})`,
          seances: itemSource.seances.map(sc => ({ ...sc, id: Date.now() + Math.random(), date: dateCible }))
        };
        setProgrammesClasses(prev => {
          let cyclesMaj = [...progCible.cycles];
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
            cyclesMaj[0].lecons.push(nouvelleLecon);
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
          let cyclesMaj = [...progCible.cycles];
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
            if (cyclesMaj[0].lecons.length === 0) {
              cyclesMaj[0].lecons.push({
                id: Date.now() + 1,
                titre: 'Leçon Générale',
                nombreSeancesPrevues: 3,
                statut: 'En cours',
                seances: [nouvelleSeance]
              });
            } else {
              cyclesMaj[0].lecons[0].seances.push(nouvelleSeance);
            }
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
    if (!modalRapport.seanceTitre || !modalRapport.contenuRapport) return;

    const nouveauRapport = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      ...modalRapport,
      enseignant: `${infosEnseignant.civilite} ${infosEnseignant.nom} ${infosEnseignant.prenoms}`
    };

    setRapportsSeances(prev => [nouveauRapport, ...prev]);
    setModalRapport({ ouvert: false, seanceTitre: '', classe: '', motifReport: '', nouvelleDatePrevue: '', contenuRapport: '', difficultes: '' });
    showToast("📤 Système de report de séance intelligent transmis au censeur avec succès !");
  };

  const initialiserProgrammeClasse = (classe) => {
    if (programmesClasses[classe]) return;
    setProgrammesClasses(prev => ({
      ...prev,
      [classe]: {
        anneeScolaire: '2025-2026',
        cycles: [
          {
            id: Date.now(),
            titre: 'Cycle 1 : (Cliquez sur modifier pour renommer)',
            competence: 'Compétence générale',
            dateDebut: '2026-01-10',
            dateFin: '2026-02-15',
            statut: 'En cours',
            soumisAuCenseur: false,
            lecons: []
          }
        ]
      }
    }));
    showToast(`Programme initialisé pour la classe ${classe} !`);
  };

  const gererValidationAssistant = (e) => {
    e.preventDefault();
    if (!classeSelectionneeVue) return;
    const progClasse = programmesClasses[classeSelectionneeVue];
    if (!progClasse) return;

    const { niveauCible, cycleIdCible, leconIdCible, titreCycle, competenceCycle, dateDebutCycle, dateFinCycle, titreLecon, nombreSeancesLecon, titreSeance, dateSeance, lieuSeance, habilites, contenus, exercices, evaluations, fichiersMultimedias } = modalAssistant;

    let nouveauxCycles = [...progClasse.cycles];

    if (niveauCible === 'cycle') {
      nouveauxCycles.push({
        id: Date.now(),
        titre: titreCycle || 'Nouveau Cycle',
        competence: competenceCycle || '',
        dateDebut: dateDebutCycle || '2026-01-01',
        dateFin: dateFinCycle || '2026-02-01',
        statut: 'En cours',
        soumisAuCenseur: false,
        lecons: [],
        modele: modeleSeanceChoisi
      });
      showToast("Cycle ajouté et modélisé !");
    } 
    else if (niveauCible === 'lecon') {
      nouveauxCycles = nouveauxCycles.map(c => {
        if (c.id === Number(cycleIdCible)) {
          return {
            ...c,
            lecons: [
              ...c.lecons,
              {
                id: Date.now(),
                titre: titreLecon || 'Nouvelle Leçon',
                nombreSeancesPrevues: parseInt(nombreSeancesLecon) || 3,
                statut: 'En cours',
                soumisAuCenseur: false,
                seances: [],
                modele: modeleSeanceChoisi
              }
            ]
          };
        }
        return c;
      });
      showToast("Leçon créée et modélisée !");
    } 
    else if (niveauCible === 'seance') {
      nouveauxCycles = nouveauxCycles.map(c => {
        if (c.id === Number(cycleIdCible)) {
          return {
            ...c,
            lecons: c.lecons.map(l => {
              if (l.id === Number(leconIdCible)) {
                const nouvelleSeance = {
                  id: Date.now(),
                  numero: l.seances.length + 1,
                  titre: titreSeance || 'Séance pédagogique',
                  date: dateSeance || new Date().toISOString().split('T')[0],
                  lieu: lieuSeance || 'Gymnase',
                  habilites, contenus, exercices, evaluations,
                  fichiersMultimedias: fichiersMultimedias || [],
                  statut: 'En cours',
                  soumisAuCenseur: false,
                  modele: modeleSeanceChoisi
                };
                setBibliotheque(prev => [...prev, {
                  id: Date.now(),
                  type: 'seance',
                  nom: nouvelleSeance.titre,
                  niveau: '6ème',
                  classe: classeSelectionneeVue,
                  anneeScolaire: '2025-2026',
                  date: nouvelleSeance.date,
                  cycleAssocie: c.titre,
                  leconAssociee: l.titre,
                  habilites, contenus, exercices, evaluations,
                  fichiersMultimedias: fichiersMultimedias || [],
                  modele: modeleSeanceChoisi
                }]);

                return { ...l, seances: [...l.seances, nouvelleSeance] };
              }
              return l;
            })
          };
        }
        return c;
      });
      showToast("Séance créée et modélisée !");
    }

    setProgrammesClasses({
      ...programmesClasses,
      [classeSelectionneeVue]: { ...progClasse, cycles: nouveauxCycles }
    });

    setModalAssistant({
      ouvert: false, niveauCible: 'programme', cycleIdCible: null, leconIdCible: null,
      titreCycle: '', competenceCycle: '', dateDebutCycle: '', dateFinCycle: '',
      titreLecon: '', nombreSeancesLecon: '3', titreSeance: '',
      dateSeance: new Date().toISOString().split('T')[0], lieuSeance: '',
      habilites: '', contenus: '', exercices: '', evaluations: '', fichiersMultimedias: [], enCoursScan: false, fichierNom: ''
    });
  };

  const executerConsultationEtReutilisation = (e) => {
    e.preventDefault();
    const { item, donneesModifiees, classesSelectionnees, datesParClasse } = modalConsulterReutiliser;
    if (classesSelectionnees.length === 0) {
      showToast("⚠️ Veuillez sélectionner au moins une classe cible.");
      return;
    }

    classesSelectionnees.forEach(classeCible => {
      const dateAttribuee = datesParClasse[classeCible] || new Date().toISOString().split('T')[0];
      
      if (!programmesClasses[classeCible]) {
        initialiserProgrammeClasse(classeCible);
      }

      const progCible = programmesClasses[classeCible] || { anneeScolaire: '2025-2026', cycles: [] };

      const nouvelleSeanceReutilisee = {
        id: Date.now() + Math.random(),
        numero: 1,
        titre: donneesModifiees.nom || item.nom,
        date: dateAttribuee,
        lieu: 'Gymnase',
        habilites: donneesModifiees.habilites || item.habilites,
        contenus: donneesModifiees.contenus || item.contenus,
        exercices: donneesModifiees.exercices || item.exercices,
        evaluations: donneesModifiees.evaluations || item.evaluations,
        fichiersMultimedias: item.fichiersMultimedias || [],
        statut: 'En cours',
        soumisAuCenseur: false,
        modele: item.modele || 'standard'
      };

      setProgrammesClasses(prev => {
        let cyclesCible = [...progCible.cycles];
        if (cyclesCible.length === 0) {
          cyclesCible.push({
            id: Date.now(),
            titre: donneesModifiees.cycleAssocie || item.cycleAssocie || 'Cycle Général',
            competence: 'Compétence',
            dateDebut: '2026-01-01',
            dateFin: '2026-06-30',
            statut: 'En cours',
            lecons: [{
              id: Date.now() + 1,
              titre: donneesModifiees.leconAssociee || item.leconAssociee || 'Leçon Générale',
              nombreSeancesPrevues: 3,
              statut: 'En cours',
              seances: [nouvelleSeanceReutilisee]
            }]
          });
        } else {
          cyclesCible[0].lecons[0].seances.push(nouvelleSeanceReutilisee);
        }
        return { ...prev, [classeCible]: { ...progCible, cycles: cyclesCible } };
      });
    });

    showToast("♻️ Fiche réutilisée avec succès !");
    setModalConsulterReutiliser({ ouvert: false, item: null, donneesModifiees: {}, classesSelectionnees: [], datesParClasse: {} });
  };

  const soumettreAuCenseur = (type, cycleId, leconId = null, seanceId = null) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog) return;

    const cyclesMaj = prog.cycles.map(c => {
      if (c.id === cycleId) {
        if (type === 'programme' || type === 'cycle') return { ...c, soumisAuCenseur: true };
        return {
          ...c,
          lecons: c.lecons.map(l => {
            if (l.id === leconId) {
              if (type === 'lecon') return { ...l, soumisAuCenseur: true };
              return {
                ...l,
                seances: l.seances.map(s => s.id === seanceId ? { ...s, soumisAuCenseur: true } : s)
              };
            }
            return l;
          })
        };
      }
      return c;
    });

    setProgrammesClasses({ ...programmesClasses, [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🚀 Élément envoyé au censeur !");
  };

  const marquerLeconTerminee = (cycleId, leconId) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog) return;
    const cyclesMaj = prog.cycles.map(c => c.id === cycleId ? {
      ...c,
      lecons: c.lecons.map(l => l.id === leconId ? { ...l, statut: 'Terminée' } : l)
    } : c);
    setProgrammesClasses({ ...programmesClasses, [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🏁 Leçon terminée !");
  };

  const marquerCycleTermine = (cycleId) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog) return;
    const cyclesMaj = prog.cycles.map(c => c.id === cycleId ? { ...c, statut: 'Terminé' } : c);
    setProgrammesClasses({ ...programmesClasses, [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🏆 Cycle terminé !");
  };

  const ouvrirModalEdition = (type, cycleId, leconId = null, seanceId = null) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog) return;
    const cycle = prog.cycles.find(c => c.id === cycleId);
    if (!cycle) return;

    let donnees = {};
    if (type === 'cycle') donnees = { titre: cycle.titre, competence: cycle.competence, dateDebut: cycle.dateDebut, dateFin: cycle.dateFin };
    else if (type === 'lecon') {
      const lecon = cycle.lecons.find(l => l.id === leconId);
      if (lecon) donnees = { titre: lecon.titre, nombreSeancesPrevues: lecon.nombreSeancesPrevues };
    } else if (type === 'seance') {
      const lecon = cycle.lecons.find(l => l.id === leconId);
      const seance = lecon?.seances.find(s => s.id === seanceId);
      if (seance) donnees = { titre: seance.titre, date: seance.date, lieu: seance.lieu, habilites: seance.habilites, contenus: seance.contenus, exercices: seance.exercices, evaluations: seance.evaluations };
    }

    setModalEdition({ ouvert: true, type, cycleId, leconId, seanceId, donnees });
  };

  const sauvegarderEdition = (e) => {
    e.preventDefault();
    const { type, cycleId, leconId, seanceId, donnees } = modalEdition;
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog) return;

    const cyclesMaj = prog.cycles.map(c => {
      if (c.id === cycleId) {
        if (type === 'cycle') return { ...c, ...donnees };
        return {
          ...c,
          lecons: c.lecons.map(l => {
            if (l.id === leconId) {
              if (type === 'lecon') return { ...l, ...donnees };
              return {
                ...l,
                seances: l.seances.map(s => s.id === seanceId ? { ...s, ...donnees } : s)
              };
            }
            return l;
          })
        };
      }
      return c;
    });

    setProgrammesClasses({ ...programmesClasses, [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    setModalEdition({ ouvert: false, type: null, cycleId: null, leconId: null, seanceId: null, donnees: {} });
    showToast("✅ Modification enregistrée !");
  };

  const quitterEcole = (idAff) => {
    const updated = affiliations.filter(a => a.id !== idAff);
    setAffiliations(updated);
    if (updated.length === 0) {
      setModeSansAffiliation(true);
      showToast("⚠️ Passage en mode sans affiliation.");
    } else {
      showToast("⚠️ Affiliation rompue avec cet établissement.");
    }
  };

  const accepterProposition = (prop) => {
    const nouvelleAff = {
      id: Date.now(),
      ecole: prop.ecole,
      statut: 'Validée',
      classes: prop.classes
    };
    setAffiliations(prev => [...prev, nouvelleAff]);
    setPropositionsCenseur(prev => prev.filter(p => p.id !== prop.id));
    setModeSansAffiliation(false);
    showToast(`✅ Affiliation acceptée pour ${prop.ecole} !`);
  };

  const soumettreDemandeAffiliation = (e) => {
    e.preventDefault();
    if (!nouvelleEcoleSaisie.trim()) return;

    const nouvelleAff = {
      id: Date.now(),
      ecole: nouvelleEcoleSaisie,
      statut: 'En attente',
      classes: nouvellesClassesSaisies.split(',').map(c => c.trim())
    };

    setAffiliations(prev => [...prev, nouvelleAff]);
    setModalAffiliation(false);
    setNouvelleEcoleSaisie('');
    showToast("🚀 Demande d'affiliation transmise au censeur !");
  };

  const telechargerPDFEntite = (titreEntite, sousTitre, contenuTableau) => {
    const fenetreImpression = window.open('', '_blank');
    fenetreImpression.document.write(`
      <html>
        <head>
          <title>${titreEntite}</title>
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
            <h2>RÉPUBLIQUE DE CÔTE D'IVOIRE - MINISTÈRE DE L'ÉDUCATION NATIONALE</h2>
            <p>Document Pédagogique Officiel - ${infosEnseignant.etablissementSaisi}</p>
          </div>
          <div class="meta">
            <p><strong>Enseignant(e) :</strong> ${infosEnseignant.civilite} ${infosEnseignant.nom} ${infosEnseignant.prenoms} (${infosEnseignant.matiere})</p>
            <p><strong>Classe :</strong> ${classeSelectionneeVue || 'Toutes'} | <strong>Type :</strong> ${titreEntite}</p>
            <p><strong>Détails :</strong> ${sousTitre}</p>
          </div>
          ${contenuTableau}
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    fenetreImpression.document.close();
    showToast(`📥 Document "${titreEntite}" téléchargé en PDF !`);
  };

  const telechargerFicheSeancePDF = (seance, lecon, cycle) => {
    const html = `
      <table>
        <tr><th>🎯 Habilités Visées</th><td>${seance.habilites}</td></tr>
        <tr><th>📚 Contenus Pédagogiques</th><td>${seance.contenus}</td></tr>
        <tr><th>⚡ Exercices d'Application</th><td>${seance.exercices}</td></tr>
        <tr><th>📝 Modalités d'Évaluation</th><td>${seance.evaluations}</td></tr>
        ${seance.fichiersMultimedias?.length ? `<tr><th>📎 Fichiers Multimedias</th><td>${seance.fichiersMultimedias.join(', ')}</td></tr>` : ''}
      </table>
    `;
    telechargerPDFEntite(`Fiche de Séance - ${seance.titre}`, `Cycle: ${cycle.titre} | Leçon: ${lecon.titre}`, html);
  };

  const telechargerProgrammeAnnuelPDF = (progClasse, classeNom) => {
    let htmlContent = '<h3>Programme Annuel Complet</h3>';
    progClasse.cycles.forEach(cy => {
      htmlContent += `<h4 style="background:#e0f2fe; padding:8px; margin-top:15px;">📁 ${cy.titre} (Du ${cy.dateDebut} au ${cy.dateFin})</h4>`;
      htmlContent += `<p><strong>Compétence :</strong> ${cy.competence}</p>`;
      cy.lecons.forEach(lc => {
        htmlContent += `<p style="margin-left: 15px;"><strong>📖 Leçon :</strong> ${lc.titre}</p>`;
        lc.seances.forEach(sc => {
          htmlContent += `<p style="margin-left: 30px; font-size: 12px;">• Séance #${sc.numero}: ${sc.titre} (${sc.date})</p>`;
        });
      });
    });
    telechargerPDFEntite(`Programme Annuel - ${classeNom}`, `Année scolaire ${progClasse.anneeScolaire}`, htmlContent);
  };

  const bibliothequeFiltree = useMemo(() => {
    return bibliotheque.filter(b => {
      const matchAnnee = !filtreBiblioAnnee || b.anneeScolaire === filtreBiblioAnnee;
      const matchClasse = filtreBiblioClasse === 'TOUTES' || b.classe === filtreBiblioClasse;
      const matchTexte = !filtreBiblioTexte || 
                         b.nom.toLowerCase().includes(filtreBiblioTexte.toLowerCase()) ||
                         b.cycleAssocie?.toLowerCase().includes(filtreBiblioTexte.toLowerCase()) ||
                         b.leconAssociee?.toLowerCase().includes(filtreBiblioTexte.toLowerCase());
      return matchAnnee && matchClasse && matchTexte;
    });
  }, [bibliotheque, filtreBiblioAnnee, filtreBiblioClasse, filtreBiblioTexte]);

  return (
    <div style={styles.container}>
      <header style={styles.darkNavbar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          
          {/* SECTION PROFIL ÉPURÉE (E-CAHIER ! ET ESPACE ENSEIGNANT RETIRÉS DE LA BARRE) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }} ref={profilRef}>
              <button onClick={() => setProfilOuvert(!profilOuvert)} style={styles.navbarTeacherClickableBlock}>
                <div style={styles.avatarNavbarContainer}>
                  {infosEnseignant.photoProfil ? (
                    <img src={infosEnseignant.photoProfil} alt="Profil" style={styles.avatarNavbarImg} />
                  ) : (
                    <div style={styles.avatarNavbarPlaceholder}>👤</div>
                  )}
                </div>
                <div style={styles.navbarTeacherInfo}>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff' }}>
                    {infosEnseignant.civilite} {infosEnseignant.nom}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Espace Enseignant
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '6px' }}>{profilOuvert ? '▲' : '▼'}</span>
              </button>

              {profilOuvert && (
                <div style={styles.notificationDropdown}>
                  <div style={styles.dropdownHeader}>Mon Compte Enseignant</div>
                  <div style={{ padding: '10px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #e2e8f0', marginBottom: '6px', background: '#f8fafc', borderRadius: '8px' }}>
                    <strong>{infosEnseignant.civilite} {infosEnseignant.nom} {infosEnseignant.prenoms}</strong><br />
                    <span style={{ color: '#64748b', fontSize: '11px' }}>
                      {infosEnseignant.etablissementSaisi}<br />
                      <em>{infosEnseignant.matiere}</em>
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      setFormProfil({ ...infosEnseignant });
                      setModalProfilOuvert(true);
                      setProfilOuvert(false);
                    }} 
                    style={styles.optionMenu}
                  >
                    ⚙️ Modifier mon profil
                  </button>
                  <button 
                    onClick={() => {
                      setModalSecurite(true);
                      setProfilOuvert(false);
                    }} 
                    style={styles.optionMenu}
                  >
                    🔒 Sécurité & Mot de passe oublié
                  </button>
                  <button 
                    onClick={() => {
                      if (!modeSansAffiliation) {
                        setModalPaiement(true);
                      } else {
                        setModeSansAffiliation(false);
                        showToast("Mode sans affiliation désactivé.");
                      }
                      setProfilOuvert(false);
                    }} 
                    style={{ ...styles.optionMenu, color: '#d97706', fontWeight: '800' }}
                  >
                    {modeSansAffiliation ? '🔄 Quitter le mode sans affiliation' : '💳 Activer Mode Sans Affiliation (1 900 FCFA)'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* MENU BURGER & NOTIFICATIONS (SANS LE GROS BOUTON ROUGE DE DÉCONNEXION) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }} ref={menuBurgerRef}>
            
            {/* CLOCHE DE NOTIFICATION */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button onClick={() => setNotifOuvert(!notifOuvert)} style={styles.navDarkBtn}>
                <span>🔔</span>
                {notifications.filter(n => !n.lu).length > 0 && <span style={styles.pastilleAlerte}>{notifications.filter(n => !n.lu).length}</span>}
              </button>
              {notifOuvert && (
                <div style={styles.notificationDropdown}>
                  <div style={styles.dropdownHeader}>Notifications & Validations</div>
                  {notifications.map(n => (
                    <div key={n.id} style={styles.notifItem}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>{n.texte}</p>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                    </div>
                  ))}
                  {propositionsCenseur.length > 0 && (
                    <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb' }}>Propositions d'affiliation :</span>
                      {propositionsCenseur.map(p => (
                        <div key={p.id} style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '8px', marginTop: '6px', fontSize: '12px', border: '1px solid #bfdbfe' }}>
                          <strong>{p.ecole}</strong> ({p.censeur})<br/>
                          <button onClick={() => accepterProposition(p)} className="bouton bouton-succes" style={{ padding: '4px 10px', fontSize: '11px', marginTop: '6px' }}>Accepter l'affiliation</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BOUTON BURGER */}
            <button 
              onClick={() => setMenuBurgerOuvert(!menuBurgerOuvert)} 
              style={styles.burgerBtn}
              title="Menu des fonctionnalités"
            >
              ☰
            </button>

            {menuBurgerOuvert && (
              <div style={styles.burgerDropdown} className="anim-apparition">
                <div style={styles.dropdownHeader}>Menu de Navigation</div>
                <button onClick={() => { setActiveTab('cycles'); setMenuBurgerOuvert(false); }} style={styles.optionMenu}>📊 Programme Annuel</button>
                <button onClick={() => { setActiveTab('bibliotheque'); setMenuBurgerOuvert(false); }} style={styles.optionMenu}>📁 Bibliothèque Permanente</button>
                <button onClick={() => { setActiveTab('affiliation'); setMenuBurgerOuvert(false); }} style={styles.optionMenu}>🏫 Gestion des Écoles (Quitter / Affiliation)</button>
                <button onClick={() => { setActiveTab('rapports'); setMenuBurgerOuvert(false); }} style={styles.optionMenu}>📝 Rapports de Séance</button>
                <button onClick={() => { setModalAffiliation(true); setMenuBurgerOuvert(false); }} style={{ ...styles.optionMenu, color: '#16a34a', fontWeight: '800' }}>+ Demander une Affiliation</button>
                
                {/* DÉCONNEXION DANS LE MENU DÉROULANT */}
                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px' }}>
                  <button onClick={() => { setModalDeconnexion(true); setMenuBurgerOuvert(false); }} style={{ ...styles.optionMenu, color: '#ef4444', fontWeight: '900', textAlign: 'center' }}>
                    🚪 Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      <main style={styles.mainContentBody}>
        {message && <div style={styles.toastSuccess}>{message}</div>}

        {/* MODALE DE CONFIRMATION DE DÉCONNEXION */}
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

        {/* MODALE DE SÉCURITÉ & MOT DE PASSE OUBLIÉ */}
        {modalSecurite && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🔒 Sécurité & Mot de passe oublié</h3>
                <button onClick={() => setModalSecurite(false)} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button onClick={() => setModeSecurite('mdp')} className={`bouton ${modeSecurite === 'mdp' ? 'bouton-principal' : 'bouton-secondaire'}`} style={{ flex: 1 }}>Changer mot de passe</button>
                <button onClick={() => setModeSecurite('oublie')} className={`bouton ${modeSecurite === 'oublie' ? 'bouton-principal' : 'bouton-secondaire'}`} style={{ flex: 1 }}>Mot de passe oublié</button>
              </div>

              {modeSecurite === 'mdp' ? (
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
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!identifiantRecuperation.trim()) {
                    showToast("⚠️ Veuillez entrer votre email ou votre numéro de téléphone.");
                    return;
                  }
                  showToast(`✉️ Un code de réinitialisation sécurisé a été envoyé par ${typeRecuperation === 'email' ? 'e-mail' : 'SMS'} à ${identifiantRecuperation}.`);
                  setModalSecurite(false);
                  setIdentifiantRecuperation('');
                }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.4', margin: 0 }}>
                    Choisissez votre méthode de récupération pour réinitialiser votre mot de passe :
                  </p>
                  
                  <div style={{ display: 'flex', gap: '12px', margin: '4px 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                      <input type="radio" name="typeRecup" checked={typeRecuperation === 'email'} onChange={() => setTypeRecuperation('email')} /> Par E-mail
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                      <input type="radio" name="typeRecup" checked={typeRecuperation === 'telephone'} onChange={() => setTypeRecuperation('telephone')} /> Par Numéro de Téléphone (SMS)
                    </label>
                  </div>

                  <div>
                    <label style={styles.label}>{typeRecuperation === 'email' ? 'Adresse E-mail' : 'Numéro de Téléphone'}</label>
                    <input 
                      type={typeRecuperation === 'email' ? 'email' : 'tel'} 
                      placeholder={typeRecuperation === 'email' ? 'votre.email@prof.ci' : '+225 0700000000'} 
                      value={identifiantRecuperation} 
                      onChange={e => setIdentifiantRecuperation(e.target.value)} 
                      style={styles.inputStyle} 
                      required 
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setModalSecurite(false)} className="bouton bouton-secondaire">Annuler</button>
                    <button type="submit" className="bouton bouton-principal">Envoyer le code de réinitialisation</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MODALE DE RAPPORT DE SÉANCE & REPORT INTELLIGENT */}
        {modalRapport.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>📋 Système de Report de Séance Intelligent</h3>
                <button onClick={() => setModalRapport({ ouvert: false, seanceTitre: '', classe: '', motifReport: '', nouvelleDatePrevue: '', contenuRapport: '', difficultes: '' })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <form onSubmit={soumettreRapportSeance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.label}>Séance concernée</label>
                  <input type="text" placeholder="Ex: Séance d'initiation..." value={modalRapport.seanceTitre} onChange={e => setModalRapport({...modalRapport, seanceTitre: e.target.value})} style={styles.inputStyle} required />
                </div>
                <div>
                  <label style={styles.label}>Classe</label>
                  <select value={modalRapport.classe} onChange={e => setModalRapport({...modalRapport, classe: e.target.value})} style={styles.inputStyle} required>
                    <option value="">Sélectionner une classe</option>
                    {classesActivesValidees.map(cl => <option key={cl} value={cl}>{cl}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Motif du report</label>
                  <input type="text" placeholder="Ex: Intempéries, absence professeur, grève..." value={modalRapport.motifReport} onChange={e => setModalRapport({...modalRapport, motifReport: e.target.value})} style={styles.inputStyle} required />
                </div>
                <div>
                  <label style={styles.label}>📅 Nouvelle date de report prévue</label>
                  <input type="date" value={modalRapport.nouvelleDatePrevue} onChange={e => setModalRapport({...modalRapport, nouvelleDatePrevue: e.target.value})} style={styles.inputStyle} required />
                </div>
                <div>
                  <label style={styles.label}>Compte rendu / Observations</label>
                  <textarea placeholder="Détails complémentaires..." value={modalRapport.contenuRapport} onChange={e => setModalRapport({...modalRapport, contenuRapport: e.target.value})} style={{ ...styles.inputStyle, height: '60px', resize: 'vertical' }} required />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalRapport({ ouvert: false, seanceTitre: '', classe: '', motifReport: '', nouvelleDatePrevue: '', contenuRapport: '', difficultes: '' })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton" style={{ fontWeight: '800', backgroundColor: '#d97706', color: '#fff' }}>📤 Envoyer le report au censeur</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODALE DE DUPLICATION INTELLIGENTE */}
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
                  {classesActivesValidees.map(cl => {
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
                              value={modalDuplicationIntelligente.datesParClasse[cl] || ''} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setModalDuplicationIntelligente(prev => ({
                                  ...prev,
                                  datesParClasse: { ...prev.datesParClasse, [cl]: val }
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

        {/* MODALE DE PAIEMENT POUR LE MODE SANS AFFILIATION */}
        {modalPaiement && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>💳 Abonnement Mode Sans Affiliation</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                Définissez vos propres classes en toute autonomie. Montant : <strong>1 900 FCFA / mois</strong>.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <label style={styles.label}>Choisissez votre moyen de paiement :</label>
                
                <div onClick={() => setMethodePaiement('wave')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: methodePaiement === 'wave' ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
                  <div style={{ width: '42px', height: '42px', backgroundColor: '#0083ff', borderRadius: '10px', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '15px' }}>W</div>
                  <div style={{ flex: 1 }}><strong>Wave Mobile Money</strong><br/><small style={{ color: '#64748b' }}>Paiement instantané par QR code</small></div>
                </div>

                <div onClick={() => setMethodePaiement('orange')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: methodePaiement === 'orange' ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
                  <div style={{ width: '42px', height: '42px', backgroundColor: '#ff6600', borderRadius: '10px', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '12px' }}>OM</div>
                  <div style={{ flex: 1 }}><strong>Orange Money</strong><br/><small style={{ color: '#64748b' }}>Paiement sécurisé via code marchand</small></div>
                </div>

                <div onClick={() => setMethodePaiement('mtn')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: methodePaiement === 'mtn' ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
                  <div style={{ width: '42px', height: '42px', backgroundColor: '#ffcc00', borderRadius: '10px', color: '#1e293b', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '11px' }}>MTN</div>
                  <div style={{ flex: 1 }}><strong>MTN MoMo</strong><br/><small style={{ color: '#64748b' }}>Validation par code PIN</small></div>
                </div>

                <div onClick={() => setMethodePaiement('carte')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: methodePaiement === 'carte' ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
                  <div style={{ width: '42px', height: '42px', backgroundColor: '#0f172a', borderRadius: '10px', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '16px' }}>💳</div>
                  <div style={{ flex: 1 }}><strong>Visa / Mastercard</strong><br/><small style={{ color: '#64748b' }}>Paiement sécurisé par carte bancaire</small></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalPaiement(false)} className="bouton bouton-secondaire">Annuler</button>
                <button type="button" onClick={() => {
                  setModeSansAffiliation(true);
                  setModalPaiement(false);
                  showToast("💳 Paiement validé avec succès ! Mode Sans Affiliation activé.");
                }} className="bouton bouton-principal">Procéder (1 900 FCFA / mois)</button>
              </div>
            </div>
          </div>
        )}

        {modalAffiliation && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🏫 Demande d'Affiliation à une École</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.5' }}>
                Faites votre demande de rattachement ou envoyez une demande d'affiliation au censeur.
              </p>
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

        {/* ASSISTANT DE CRÉATION */}
        {modalAssistant.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>
                  {modalAssistant.niveauCible === 'cycle' && '✨ Créer un nouveau Cycle (Modélisable)'}
                  {modalAssistant.niveauCible === 'lecon' && '📖 Créer une nouvelle Leçon (Modélisable)'}
                  {modalAssistant.niveauCible === 'seance' && '📝 Créer une nouvelle Séance (Modélisable)'}
                </h3>
                <button onClick={() => setModalAssistant({ ...modalAssistant, ouvert: false })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              {/* SÉLECTION DU MODÈLE DE FICHE */}
              <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <label style={styles.label}>Modèle de fiche (Enregistrable et mémorisé) :</label>
                <select value={modeleSeanceChoisi} onChange={(e) => setModeleSeanceChoisi(e.target.value)} style={styles.inputStyle}>
                  <option value="standard">Modèle Standard (Ministère)</option>
                  <option value="EPS">Modèle EPS (Habiletés / Pratique)</option>
                  <option value="technologique">Modèle Technologique / Atelier</option>
                </select>
              </div>

              {/* UPLOAD FICHIERS MULTIMÉDIAS */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px dashed #cbd5e1', marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>📎 Uploader des fichiers multimédias (Images, PDF, Schémas...)</label>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,.pdf" 
                  onChange={(e) => {
                    const files = Array.from(e.target.files).map(f => f.name);
                    setModalAssistant(prev => ({ ...prev, fichiersMultimedias: files }));
                  }} 
                  style={{ fontSize: '12px' }} 
                />
                {modalAssistant.fichiersMultimedias?.length > 0 && (
                  <p style={{ fontSize: '11px', color: '#166534', marginTop: '4px', margin: 0 }}>
                    Fichiers joints : {modalAssistant.fichiersMultimedias.join(', ')}
                  </p>
                )}
              </div>

              <form onSubmit={gererValidationAssistant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {modalAssistant.niveauCible === 'cycle' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre du cycle ({modeleSeanceChoisi.toUpperCase()})</label>
                      <input type="text" placeholder="Ex: Cycle 1 : Gymnastique..." value={modalAssistant.titreCycle} onChange={(e) => setModalAssistant({...modalAssistant, titreCycle: e.target.value})} style={styles.inputStyle} required />
                    </div>
                    <div>
                      <label style={styles.label}>Compétence visée</label>
                      <input type="text" placeholder="Ex: Traiter une situation..." value={modalAssistant.competenceCycle} onChange={(e) => setModalAssistant({...modalAssistant, competenceCycle: e.target.value})} style={styles.inputStyle} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={styles.label}>📅 Date de début</label>
                        <input type="date" value={modalAssistant.dateDebutCycle} onChange={(e) => setModalAssistant({...modalAssistant, dateDebutCycle: e.target.value})} style={styles.inputStyle} required />
                      </div>
                      <div>
                        <label style={styles.label}>📅 Date de fin</label>
                        <input type="date" value={modalAssistant.dateFinCycle} onChange={(e) => setModalAssistant({...modalAssistant, dateFinCycle: e.target.value})} style={styles.inputStyle} required />
                      </div>
                    </div>
                  </>
                )}

                {modalAssistant.niveauCible === 'lecon' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre de la leçon ({modeleSeanceChoisi.toUpperCase()})</label>
                      <input type="text" placeholder="Ex: Leçon 1..." value={modalAssistant.titreLecon} onChange={(e) => setModalAssistant({...modalAssistant, titreLecon: e.target.value})} style={styles.inputStyle} required />
                    </div>
                    <div>
                      <label style={styles.label}>Nombre de séances prévues</label>
                      <input type="number" min="1" value={modalAssistant.nombreSeancesLecon} onChange={(e) => setModalAssistant({...modalAssistant, nombreSeancesLecon: e.target.value})} style={styles.inputStyle} required />
                    </div>
                  </>
                )}

                {modalAssistant.niveauCible === 'seance' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre de la séance ({modeleSeanceChoisi.toUpperCase()})</label>
                      <input type="text" placeholder="Ex: Séance 1..." value={modalAssistant.titreSeance} onChange={(e) => setModalAssistant({...modalAssistant, titreSeance: e.target.value})} style={styles.inputStyle} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={styles.label}>Date</label>
                        <input type="date" value={modalAssistant.dateSeance} onChange={(e) => setModalAssistant({...modalAssistant, dateSeance: e.target.value})} style={styles.inputStyle} required />
                      </div>
                      <div>
                        <label style={styles.label}>Lieu</label>
                        <input type="text" placeholder="Ex: Gymnase A" value={modalAssistant.lieuSeance} onChange={(e) => setModalAssistant({...modalAssistant, lieuSeance: e.target.value})} style={styles.inputStyle} />
                      </div>
                    </div>
                    <div>
                      <label style={styles.label}>🎯 Habilités</label>
                      <textarea value={modalAssistant.habilites} onChange={(e) => setModalAssistant({...modalAssistant, habilites: e.target.value})} style={{ ...styles.inputStyle, height: '60px', resize: 'vertical' }} />
                    </div>
                    <div>
                      <label style={styles.label}>📚 Contenus</label>
                      <textarea value={modalAssistant.contenus} onChange={(e) => setModalAssistant({...modalAssistant, contenus: e.target.value})} style={{ ...styles.inputStyle, height: '60px', resize: 'vertical' }} />
                    </div>
                    <div>
                      <label style={styles.label}>⚡ Exercices</label>
                      <textarea value={modalAssistant.exercices} onChange={(e) => setModalAssistant({...modalAssistant, exercices: e.target.value})} style={{ ...styles.inputStyle, height: '60px', resize: 'vertical' }} />
                    </div>
                    <div>
                      <label style={styles.label}>📝 Évaluations</label>
                      <textarea value={modalAssistant.evaluations} onChange={(e) => setModalAssistant({...modalAssistant, evaluations: e.target.value})} style={{ ...styles.inputStyle, height: '60px', resize: 'vertical' }} />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalAssistant({ ...modalAssistant, ouvert: false })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer</button>
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
                {Object.entries(modalEdition.donnees).map(([key, val]) => (
                  <div key={key}>
                    <label style={styles.label}>{key.toUpperCase()}</label>
                    <input 
                      type="text" 
                      value={val || ''} 
                      onChange={(e) => setModalEdition(prev => ({ ...prev, donnees: { ...prev.donnees, [key]: e.target.value } }))} 
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
                    value={modalConsulterReutiliser.donneesModifiees.nom || ''} 
                    onChange={(e) => setModalConsulterReutiliser(prev => ({ ...prev, donneesModifiees: { ...prev.donneesModifiees, nom: e.target.value } }))} 
                    style={styles.inputStyle} 
                    required 
                  />
                </div>
                <div>
                  <label style={styles.label}>🎯 Habilités</label>
                  <textarea 
                    value={modalConsulterReutiliser.donneesModifiees.habilites || ''} 
                    onChange={(e) => setModalConsulterReutiliser(prev => ({ ...prev, donneesModifiees: { ...prev.donneesModifiees, habilites: e.target.value } }))} 
                    style={{ ...styles.inputStyle, height: '60px' }} 
                  />
                </div>
                <div>
                  <label style={styles.label}>📚 Contenus</label>
                  <textarea 
                    value={modalConsulterReutiliser.donneesModifiees.contenus || ''} 
                    onChange={(e) => setModalConsulterReutiliser(prev => ({ ...prev, donneesModifiees: { ...prev.donneesModifiees, contenus: e.target.value } }))} 
                    style={{ ...styles.inputStyle, height: '60px' }} 
                  />
                </div>
                <div>
                  <label style={styles.label}>⚡ Exercices</label>
                  <textarea 
                    value={modalConsulterReutiliser.donneesModifiees.exercices || ''} 
                    onChange={(e) => setModalConsulterReutiliser(prev => ({ ...prev, donneesModifiees: { ...prev.donneesModifiees, exercices: e.target.value } }))} 
                    style={{ ...styles.inputStyle, height: '60px' }} 
                  />
                </div>
                <div>
                  <label style={styles.label}>📝 Évaluations</label>
                  <textarea 
                    value={modalConsulterReutiliser.donneesModifiees.evaluations || ''} 
                    onChange={(e) => setModalConsulterReutiliser(prev => ({ ...prev, donneesModifiees: { ...prev.donneesModifiees, evaluations: e.target.value } }))} 
                    style={{ ...styles.inputStyle, height: '60px' }} 
                  />
                </div>

                <div style={{ marginTop: '10px' }}>
                  <label style={{ ...styles.label, marginBottom: '8px' }}>Sélectionner les classes cibles et leurs dates :</label>
                  {classesActivesValidees.map(cl => {
                    const estSelectionne = modalConsulterReutiliser.classesSelectionnees.includes(cl);
                    return (
                      <div key={cl} style={{ border: '1px solid #e2e8f0', padding: '12px', borderRadius: '10px', backgroundColor: '#f8fafc', marginBottom: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>
                          <input 
                            type="checkbox" 
                            checked={estSelectionne} 
                            onChange={() => {
                              const updatedClasses = estSelectionne 
                                ? modalConsulterReutiliser.classesSelectionnees.filter(c => c !== cl)
                                : [...modalConsulterReutiliser.classesSelectionnees, cl];
                              setModalConsulterReutiliser(prev => ({ ...prev, classesSelectionnees: updatedClasses }));
                            }} 
                          />
                          {cl}
                        </label>
                        {estSelectionne && (
                          <div style={{ marginTop: '8px', marginLeft: '22px' }}>
                            <label style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Date pour la classe {cl} :</label>
                            <input 
                              type="date" 
                              value={modalConsulterReutiliser.datesParClasse[cl] || ''} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setModalConsulterReutiliser(prev => ({
                                  ...prev,
                                  datesParClasse: { ...prev.datesParClasse, [cl]: val }
                                }));
                              }} 
                              style={{ ...styles.inputStyle, padding: '8px 12px' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                        setClassesSansAffiliation(prev => [...prev, nouvelleClasseLibre.trim()]);
                        setNouvelleClasseLibre('');
                        showToast("Classe libre ajoutée avec succès !");
                      }} className="bouton bouton-principal">+ Ajouter</button>
                    </div>
                  )}
                </div>

                <div style={styles.grilleClasses}>
                  {classesActivesValidees.map(cl => {
                    const progExiste = !!programmesClasses[cl];
                    return (
                      <div key={cl} onClick={() => { setClasseSelectionneeVue(cl); if (!progExiste) initialiserProgrammeClasse(cl); }} style={styles.carteClasseItem}>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>🏫 {cl}</span>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 12px 0' }}>
                          {progExiste ? `${programmesClasses[cl].cycles.length} cycle(s) au programme` : 'Cliquez pour initialiser'}
                        </p>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb' }}>Ouvrir le programme →</span>
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
                    <button onClick={() => telechargerProgrammeAnnuelPDF(programmesClasses[classeSelectionneeVue], classeSelectionneeVue)} className="bouton bouton-secondaire">
                      📥 Télécharger PDF
                    </button>
                    {!modeSansAffiliation && (
                      <button onClick={() => soumettreAuCenseur('programme', null)} className="bouton bouton-succes">
                        🚀 Envoyer au Censeur
                      </button>
                    )}
                    <button onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'cycle' })} className="bouton bouton-principal">
                      + Créer un Cycle
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {(programmesClasses[classeSelectionneeVue]?.cycles || []).map(cycle => (
                    <div key={cycle.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', borderLeft: '6px solid #2563eb', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>📁 {cycle.titre}</h3>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}><strong>Compétence :</strong> {cycle.competence} | <strong>Durée :</strong> Du {cycle.dateDebut} au {cycle.dateFin}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <button onClick={() => ouvrirModalEdition('cycle', cycle.id)} className="bouton bouton-secondaire" style={{ padding: '6px 12px', fontSize: '12px' }}>✏️ Modifier</button>
                          <button onClick={() => setModalDuplicationIntelligente({ ouvert: true, itemSource: cycle, typeSource: 'cycle', classesCibles: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '6px 12px', fontSize: '12px', color: '#2563eb' }}>⚡ Dupliquer</button>
                          <button onClick={() => telechargerFicheSeancePDF({ titre: cycle.titre, date: cycle.dateDebut, lieu: 'N/A', habilites: cycle.competence, contenus: 'Cycle complet', exercices: 'N/A', evaluations: 'N/A' }, { titre: 'Cycle complet' }, cycle)} className="bouton bouton-principal" style={{ padding: '6px 12px', fontSize: '12px' }}>📥 Télécharger</button>
                          {!modeSansAffiliation && (
                            <button onClick={() => soumettreAuCenseur('cycle', cycle.id)} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '12px' }}>🚀 Envoyer</button>
                          )}
                          {cycle.statut !== 'Terminé' && (
                            <button onClick={() => marquerCycleTermine(cycle.id)} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '12px' }}>🏆 Terminer</button>
                          )}
                          <span style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', backgroundColor: cycle.statut === 'Terminé' ? '#dcfce7' : '#e0f2fe', color: cycle.statut === 'Terminé' ? '#166534' : '#0369a1' }}>{cycle.statut}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#334155', margin: 0 }}>Leçons de ce cycle :</h4>
                          <button onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'lecon', cycleIdCible: cycle.id })} className="bouton bouton-secondaire" style={{ padding: '6px 12px', fontSize: '12px', color: '#2563eb' }}>
                            + Créer une Leçon
                          </button>
                        </div>

                        {cycle.lecons.map(lecon => (
                          <div key={lecon.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                              <h5 style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                                📖 {lecon.titre} <span style={{ fontSize: '11px', color: '#64748b' }}>(Séances : {lecon.nombreSeancesPrevues})</span>
                              </h5>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => ouvrirModalEdition('lecon', cycle.id, lecon.id)} className="bouton bouton-secondaire" style={{ padding: '6px 10px', fontSize: '11px' }}>✏️ Modifier</button>
                                <button onClick={() => setModalDuplicationIntelligente({ ouvert: true, itemSource: lecon, typeSource: 'lecon', classesCibles: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '6px 10px', fontSize: '11px', color: '#2563eb' }}>⚡ Dupliquer</button>
                                <button onClick={() => telechargerFicheSeancePDF({ titre: lecon.titre, date: 'N/A', lieu: 'N/A', habilites: 'Leçon', contenus: 'Leçon complète', exercices: 'N/A', evaluations: 'N/A' }, lecon, cycle)} className="bouton bouton-principal" style={{ padding: '6px 10px', fontSize: '11px' }}>📥 Télécharger</button>
                                {!modeSansAffiliation && (
                                  <button onClick={() => soumettreAuCenseur('lecon', cycle.id, lecon.id)} className="bouton bouton-succes" style={{ padding: '6px 10px', fontSize: '11px' }}>🚀 Envoyer</button>
                                )}
                                {lecon.statut !== 'Terminée' && (
                                  <button onClick={() => marquerLeconTerminee(cycle.id, lecon.id)} className="bouton bouton-succes" style={{ padding: '6px 10px', fontSize: '11px' }}>🏁 Terminer</button>
                                )}
                                <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 8px', borderRadius: '6px', backgroundColor: lecon.statut === 'Terminée' ? '#dcfce7' : '#fef3c7', color: lecon.statut === 'Terminée' ? '#166534' : '#92400e' }}>{lecon.statut}</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '10px', marginTop: '10px' }}>
                              {lecon.seances.map(seance => (
                                <div key={seance.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                                      <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '12px' }}>Séance #{seance.numero}</span>
                                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{seance.titre}</strong>
                                      <span style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>📅 {seance.date}</span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                                      <strong>Habiletés :</strong> {seance.habilites} | <strong>Contenus :</strong> {seance.contenus}
                                    </p>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <button onClick={() => ouvrirModalEdition('seance', cycle.id, lecon.id, seance.id)} className="bouton bouton-secondaire" style={{ padding: '6px 10px', fontSize: '11px' }}>✏️ Modifier</button>
                                    <button onClick={() => setModalDuplicationIntelligente({ ouvert: true, itemSource: seance, typeSource: 'seance', classesCibles: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '6px 10px', fontSize: '11px', color: '#2563eb' }}>⚡ Dupliquer</button>
                                    <button onClick={() => telechargerFicheSeancePDF(seance, lecon, cycle)} className="bouton bouton-principal" style={{ padding: '6px 10px', fontSize: '11px' }}>📥 Télécharger</button>
                                    
                                    {/* BOUTON REPORT DE SÉANCE DANS CHAQUE FICHE */}
                                    <button onClick={() => setModalRapport({ ouvert: true, seanceTitre: seance.titre, classe: classeSelectionneeVue, motifReport: '', nouvelleDatePrevue: '', contenuRapport: '', difficultes: '' })} className="bouton" style={{ padding: '6px 10px', fontSize: '11px', backgroundColor: '#d97706', color: '#fff' }}>
                                      📋 Report de séance
                                    </button>

                                    {!modeSansAffiliation && (
                                      <button onClick={() => soumettreAuCenseur('seance', cycle.id, lecon.id, seance.id)} className="bouton bouton-succes" style={{ padding: '6px 10px', fontSize: '11px' }}>🚀 Envoyer</button>
                                    )}
                                  </div>
                                </div>
                              ))}

                              <div style={{ marginTop: '8px' }}>
                                <button onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'seance', cycleIdCible: cycle.id, leconIdCible: lecon.id })} className="bouton bouton-secondaire" style={{ fontSize: '12px', width: '100%', borderStyle: 'dashed', padding: '10px' }}>
                                  + Ajouter une nouvelle séance
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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
                  {classesActivesValidees.map(cl => <option key={cl} value={cl}>{cl}</option>)}
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
                      <button onClick={() => setModalConsulterReutiliser({
                        ouvert: true,
                        item: b,
                        donneesModifiees: { nom: b.nom, habilites: b.habilites, contenus: b.contenus, exercices: b.exercices, evaluations: b.evaluations },
                        classesSelectionnees: [],
                        datesParClasse: {}
                      })} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '12px' }}>👁️ Réutiliser</button>
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
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>📝 Rapports & Reports de Séance Transmis</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Historique de vos comptes-rendus et reports de séance envoyés au censeur.</p>
              </div>
              <button onClick={() => setModalRapport({ ouvert: true, seanceTitre: '', classe: '', motifReport: '', nouvelleDatePrevue: '', contenuRapport: '', difficultes: '' })} className="bouton bouton-principal">
                + Nouveau rapport de séance
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rapportsSeances.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Aucun rapport ni report de séance transmis pour l'instant.</p>
              ) : (
                rapportsSeances.map(r => (
                  <div key={r.id} style={styles.itemRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{r.classe}</span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{r.seanceTitre}</strong>
                        {r.motifReport && <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '800' }}>Report : {r.motifReport}</span>}
                        <span style={{ fontSize: '11px', color: '#64748b' }}>({r.date})</span>
                      </div>
                      {r.nouvelleDatePrevue && <p style={{ fontSize: '12px', color: '#2563eb', margin: '2px 0' }}><strong>Nouvelle date prévue :</strong> {r.nouvelleDatePrevue}</p>}
                      <p style={{ fontSize: '13px', color: '#334155', margin: '4px 0' }}><strong>Compte rendu :</strong> {r.contenuRapport}</p>
                      {r.difficultes && <p style={{ fontSize: '12px', color: '#b91c1c', margin: 0 }}><strong>Difficultés :</strong> {r.difficultes}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ONGLET : ÉCOLES & AFFILIATIONS */}
        {activeTab === 'affiliation' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>🏫 Gestion de vos Établissements & Affiliations</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Envoyez des demandes d'affiliation ou quittez un établissement.</p>
              </div>
              <button onClick={() => setModalAffiliation(true)} className="bouton bouton-succes">
                + Demander une affiliation
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {affiliations.length === 0 ? (
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#94a3b8' }}>Aucune école affiliée pour le moment (Mode sans affiliation actif).</p>
              ) : (
                affiliations.map(aff => (
                  <div key={aff.id} style={styles.itemRow}>
                    <div>
                      <strong style={{ color: '#0f172a', fontSize: '14px' }}>{aff.ecole}</strong> <span style={{ color: '#64748b', fontSize: '12px' }}>({aff.statut})</span><br/>
                      <small style={{ color: '#64748b', fontSize: '12px' }}>Classes : <strong>{aff.classes.join(', ')}</strong></small>
                    </div>
                    <div>
                      <button onClick={() => quitterEcole(aff.id)} className="bouton bouton-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        Quitter cette école
                      </button>
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
  container: { backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b', paddingBottom: '40px' },
  darkNavbar: { backgroundColor: '#0f172a', color: '#ffffff', padding: '16px 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderBottom: '1px solid #1e293b', position: 'sticky', top: '0', zIndex: 30 },
  mainContentBody: { padding: '30px 20px', maxWidth: '1200px', margin: '0 auto' },
  cardWide: { backgroundColor: '#ffffff', padding: '32px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
  grilleClasses: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginTop: '16px' },
  carteClasseItem: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'transform 0.2s ease' },
  bibliothequeFilterBox: { display: 'flex', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap' },
  labelFiltre: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '12px' },
  label: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  inputStyle: { width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
  toastSuccess: { backgroundColor: '#0f172a', color: '#f8fafc', padding: '14px 20px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', fontWeight: '700', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  navbarTeacherClickableBlock: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '12px', border: '1px solid #334155', cursor: 'pointer', textAlign: 'left' },
  avatarNavbarContainer: { width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #475569', flexShrink: 0 },
  avatarNavbarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarNavbarPlaceholder: { fontSize: '16px', color: '#94a3b8' },
  navbarTeacherInfo: { display: 'flex', flexDirection: 'column' },
  notificationDropdown: { position: 'absolute', top: '50px', left: 0, backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', width: '320px', zIndex: 100, padding: '12px' },
  dropdownHeader: { padding: '6px 8px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' },
  optionMenu: { width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', color: '#334155', fontSize: '13px', fontWeight: '700', cursor: 'pointer', borderRadius: '8px', marginBottom: '4px' },
  notifItem: { backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px', fontSize: '12px', marginBottom: '6px', border: '1px solid #f1f5f9', cursor: 'pointer' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 14px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
  fondModale: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' },
  pastilleAlerte: { backgroundColor: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '999px', fontSize: '10px', fontWeight: '800' },
  burgerBtn: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' },
  burgerDropdown: { position: 'absolute', top: '50px', right: 0, backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', width: '280px', zIndex: 120, padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }
};
