import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from '../components/Header'; // Importation du Header centralisé et responsive

export default function EnseignantDashboard() {
  
  // --- GESTION DES AFFILIATIONS MULTI-ÉTABLISSEMENTS (AVEC BLINDAGE) ---
  const [affiliations, setAffiliations] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('app_enseignant_affiliations'));
      if (Array.isArray(stored)) return stored;
    } catch {}
    return [
      { id: 1, ecole: 'Lycée Moderne d’Abidjan', statut: 'Validée', classes: ['6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '3ème A'] }
    ];
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_affiliations', JSON.stringify(affiliations));
  }, [affiliations]);

  const estAffiliationValidee = useMemo(() => {
    return (affiliations || []).some(aff => aff && aff.statut === 'Validée');
  }, [affiliations]);

  // Mode sans affiliation
  const [modeSansAffiliation, setModeSansAffiliation] = useState(() => {
    return localStorage.getItem('app_enseignant_mode_sans_aff') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_mode_sans_aff', modeSansAffiliation);
  }, [modeSansAffiliation]);

  const [classesSansAffiliation, setClassesSansAffiliation] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('app_enseignant_classes_libres'));
      if (Array.isArray(stored)) return stored;
    } catch {}
    return ['Classe Autonome 1', 'Classe Autonome 2'];
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_classes_libres', JSON.stringify(classesSansAffiliation));
  }, [classesSansAffiliation]);

  const [nouvelleClasseLibre, setNouvelleClasseLibre] = useState('');

  // Liste globale de toutes les écoles validées de l'enseignant
  const ecolesActivesValidees = useMemo(() => {
    if (modeSansAffiliation) return ['Mode Autonome (Sans Affiliation)'];
    let ecoles = [];
    (affiliations || []).forEach(aff => {
      if (aff && aff.statut === 'Validée' && !ecoles.includes(aff.ecole)) {
        ecoles.push(aff.ecole);
      }
    });
    return ecoles.length > 0 ? ecoles : ['Lycée Moderne d’Abidjan'];
  }, [modeSansAffiliation, affiliations]);

  // Récupérer les classes d'une école spécifique
  const getClassesParEcole = (ecoleNom) => {
    if (modeSansAffiliation) return classesSansAffiliation || [];
    const aff = (affiliations || []).find(a => a && a.ecole === ecoleNom && a.statut === 'Validée');
    return (aff && Array.isArray(aff.classes)) ? aff.classes : ['6ème A', '6ème B'];
  };

  const classesActivesValidees = useMemo(() => {
    if (modeSansAffiliation) return classesSansAffiliation || [];
    let classes = [];
    (affiliations || []).forEach(aff => {
      if (aff && aff.statut === 'Validée' && Array.isArray(aff.classes)) {
        aff.classes.forEach(cl => {
          if (!classes.includes(cl)) classes.push(cl);
        });
      }
    });
    return classes.length > 0 ? classes : ['6ème A', '6ème B'];
  }, [modeSansAffiliation, classesSansAffiliation, affiliations]);

  const [activeTab, setActiveTab] = useState('cycles');
  const [message, setMessage] = useState('');

  // --- PROPOSITIONS D'AFFILIATION ENTRANTES ---
  const [propositionsCenseur, setPropositionsCenseur] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('app_enseignant_propositions'));
      if (Array.isArray(stored)) return stored;
    } catch {}
    return [{ id: 99, ecole: 'Collège Moderne les Élites', classes: ['4ème 2', '3ème B'], censeur: 'M. Touré' }];
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_propositions', JSON.stringify(propositionsCenseur));
  }, [propositionsCenseur]);

  const [modalPaiement, setModalPaiement] = useState(false);
  const [methodePaiement, setMethodePaiement] = useState('wave');

  const [modalConfirmationQuitter, setModalConfirmationQuitter] = useState({
    ouvert: false,
    affiliationId: null,
    ecoleNom: ''
  });

  // --- MODALES POUR LE REPORT DE SÉANCES ---
  const [modalReportSeance, setModalReportSeance] = useState({
    ouvert: false,
    seanceId: null,
    seanceTitre: '',
    ecolesClassesCibles: [],
    date: new Date().toISOString().split('T')[0],
    motif: '',
    fichiersJoints: []
  });

  const [modalReportMultiple, setModalReportMultiple] = useState({
    ouvert: false,
    ecolesClassesSelectionnees: [],
    date: new Date().toISOString().split('T')[0],
    motif: '',
    fichiersJoints: []
  });

  // Suivi des séances reportées
  const [seancesReportees, setSeancesReportees] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('app_enseignant_seances_reportees'));
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) return stored;
    } catch {}
    return {};
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_seances_reportees', JSON.stringify(seancesReportees));
  }, [seancesReportees]);

  // --- NOTIFICATIONS ---
  const [notifications, setNotifications] = useState([
    { id: 1, texte: 'Votre demande d’affiliation pour le Lycée Moderne a été validée.', date: 'Aujourd\'hui', lu: false },
    { id: 2, texte: 'Proposition d’affiliation reçue de la part du Collège Moderne les Élites.', date: 'Hier', lu: false }
  ]);
  const [notifOuvert, setNotifOuvert] = useState(false);
  const notifRef = useRef(null);

  // --- INFOS PROFIL ENSEIGNANT ---
  const [infosEnseignant, setInfosEnseignant] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('app_enseignant_profil'));
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) return stored;
    } catch {}
    return {
      civilite: 'M.', nom: 'Kouassi', prenoms: 'Jean', ville: 'Abidjan', matiere: 'Éducation Physique et Sportive (EPS)', photoProfil: '', etablissementSaisi: 'Lycée Moderne d’Abidjan', classesSelectionneesEnCours: ['6ème A', '6ème B']
    };
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_profil', JSON.stringify(infosEnseignant));
  }, [infosEnseignant]);

  const [modalProfilOuvert, setModalProfilOuvert] = useState(false);
  const [formProfil, setFormProfil] = useState({ ...(infosEnseignant || {}) });

  const notifRefArea = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOuvert(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation multi-écoles et classes
  const [ecoleSelectionneeVue, setEcoleSelectionneeVue] = useState(null);
  const [classeSelectionneeVue, setClasseSelectionneeVue] = useState(null);

  // --- BIBLIOTHÈQUE PERMANENTE ---
  const [bibliotheque, setBibliotheque] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('app_enseignant_bibliotheque_permanente'));
      if (Array.isArray(stored)) return stored;
    } catch {}
    return [];
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

  // --- PROGRAMME ANNUEL STRUCTURÉ PAR ÉCOLE & CLASSE ---
  const [programmesClasses, setProgrammesClasses] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('app_enseignant_programmes_classes'));
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) return stored;
    } catch {}
    return {
      'Lycée Moderne d’Abidjan - 6ème A': {
        anneeScolaire: '2025-2026',
        cycles: [
          {
            id: 1, titre: 'Cycle 1 : Gymnastique au sol et coordination', competence: 'Traiter une situation de coordination motrice.', dateDebut: '2026-01-10', dateFin: '2026-02-28', statut: 'En cours', soumisAuCenseur: false, champsPersonnalises: [],
            lecons: [
              {
                id: 101, titre: 'Leçon 1 : Maîtriser les équilibres et roulements', nombreSeancesPrevues: 2, statut: 'En cours', soumisAuCenseur: false, champsPersonnalises: [],
                seances: [
                  { id: 1001, numero: 1, titre: 'Séance d’initiation - Roulement avant', date: '2026-03-10', lieu: 'Gymnase A', habilites: 'Savoir enrouler sa tête.', contenus: 'Atelier sol matelas.', exercices: 'Roulé-boulé.', evaluations: 'Formative.', statut: 'En cours', soumisAuCenseur: false, fichiersMultimedias: [], champsPersonnalises: [] }
                ]
              }
            ]
          }
        ]
      }
    };
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_programmes_classes', JSON.stringify(programmesClasses));
  }, [programmesClasses]);

  // --- MÉMORISATION DU MODÈLE DE FICHE PAR L'ENSEIGNANT ---
  const [modeleFiche, setModeleFiche] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('app_enseignant_modele_fiche'));
      if (stored && typeof stored === 'object') return stored;
    } catch {}
    return {
      champsDefaut: { habilites: true, contenus: true, exercices: true, evaluations: true },
      champsPersoLabels: []
    };
  });

  useEffect(() => {
    localStorage.setItem('app_enseignant_modele_fiche', JSON.stringify(modeleFiche));
  }, [modeleFiche]);

  // --- ASSISTANT UNIFIÉ (FORMULAIRES & IA / SCAN) ---
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
    champsPersonnalises: [], 
    enCoursScan: false,
    fichierNom: '',
    ecolesClassesCibles: [],
    datesParClassePerso: {}
  });

  const [modalAIPreview, setModalAIPreview] = useState({
    ouvert: false, donneesExtraites: null, niveauCible: null
  });

  const [modalEdition, setModalEdition] = useState({
    ouvert: false, type: null, cycleId: null, leconId: null, seanceId: null, donnees: {}
  });

  const [modalAffiliation, setModalAffiliation] = useState(false);
  const [nouvelleEcoleSaisie, setNouvelleEcoleSaisie] = useState('');
  const [codeOuProviseur, setCodeOuProviseur] = useState('');
  const [nouvellesClassesSaisies, setNouvellesClassesSaisies] = useState('6ème A, 5ème A');

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  // Gestion de la déconnexion
  const handleLogout = () => {
    localStorage.removeItem('app_enseignant_profil');
    showToast("🚪 Déconnexion réussie.");
  };

  const handleEnregistrerProfil = (e) => {
    e.preventDefault();
    setInfosEnseignant({ ...formProfil });
    setModalProfilOuvert(false);
    showToast("✅ Profil et photo mis à jour avec succès !");
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

  const initialiserProgrammeClasse = (cleUnique) => {
    if (programmesClasses && programmesClasses[cleUnique]) return;
    setProgrammesClasses(prev => ({
      ...prev,
      [cleUnique]: {
        anneeScolaire: '2025-2026',
        cycles: [
          {
            id: Date.now(), titre: 'Cycle 1 : (Cliquez sur modifier pour renommer)', competence: 'Compétence générale', dateDebut: '2026-01-10', dateFin: '2026-02-15', statut: 'En cours', soumisAuCenseur: false, champsPersonnalises: [], lecons: []
          }
        ]
      }
    }));
    showToast(`Programme annuel initialisé pour ${cleUnique} !`);
  };

  const gererValidationAssistant = (e) => {
    e.preventDefault();
    const { niveauCible, cycleIdCible, leconIdCible, titreCycle, competenceCycle, dateDebutCycle, dateFinCycle, titreLecon, nombreSeancesLecon, titreSeance, lieuSeance, habilites, contenus, exercices, evaluations, fichiersMultimedias, ecolesClassesCibles, datesParClassePerso, champsPersonnalises } = modalAssistant;

    const classesCochees = Object.keys(datesParClassePerso || {});
    const ciblesFinales = classesCochees.length > 0 ? classesCochees : ((ecolesClassesCibles || []).length > 0 ? ecolesClassesCibles : (classeSelectionneeVue ? [classeSelectionneeVue] : []));

    if (ciblesFinales.length === 0) {
      showToast("⚠️ Veuillez sélectionner au moins une classe/école cible.");
      return;
    }

    let nouveauxProgrammes = { ...programmesClasses };

    ciblesFinales.forEach(cleClasse => {
      if (!nouveauxProgrammes[cleClasse]) {
        nouveauxProgrammes[cleClasse] = { anneeScolaire: '2025-2026', cycles: [] };
      }

      let progClasse = nouveauxProgrammes[cleClasse];
      let nouveauxCycles = [...(progClasse.cycles || [])];
      const dateSpecifique = (datesParClassePerso && datesParClassePerso[cleClasse]) || dateDebutCycle || new Date().toISOString().split('T')[0];

      if (niveauCible === 'cycle') {
        nouveauxCycles.push({
          id: Date.now() + Math.random(), titre: titreCycle || 'Nouveau Cycle', competence: competenceCycle || '', dateDebut: dateSpecifique, dateFin: dateFinCycle || '2026-02-01', statut: 'En cours', soumisAuCenseur: false, champsPersonnalises: champsPersonnalises || [], lecons: []
        });
      } 
      else if (niveauCible === 'lecon') {
        nouveauxCycles = nouveauxCycles.map(c => {
          if (c.id === Number(cycleIdCible)) {
            return {
              ...c,
              lecons: [...(c.lecons || []), { id: Date.now() + Math.random(), titre: titreLecon || 'Nouvelle Leçon', nombreSeancesPrevues: parseInt(nombreSeancesLecon) || 3, statut: 'En cours', soumisAuCenseur: false, champsPersonnalises: champsPersonnalises || [], seances: [] }]
            };
          }
          return c;
        });
      } 
      else if (niveauCible === 'seance') {
        nouveauxCycles = nouveauxCycles.map(c => {
          if (c.id === Number(cycleIdCible)) {
            return {
              ...c,
              lecons: (c.lecons || []).map(l => {
                if (l.id === Number(leconIdCible)) {
                  const nouvelleSeance = {
                    id: Date.now() + Math.random(), numero: (l.seances || []).length + 1, titre: titreSeance || 'Séance pédagogique', date: dateSpecifique, lieu: lieuSeance || 'Gymnase', habilites, contenus, exercices, evaluations, fichiersMultimedias: fichiersMultimedias || [], champsPersonnalises: champsPersonnalises || [], statut: 'En cours', soumisAuCenseur: false
                  };
                  setBibliotheque(prev => [...(prev || []), { id: Date.now() + Math.random(), type: 'seance', nom: nouvelleSeance.titre, niveau: '6ème', classe: cleClasse, anneeScolaire: '2025-2026', date: dateSpecifique, cycleAssocie: c.titre, leconAssociee: l.titre, habilites, contenus, exercices, evaluations, champsPersonnalises: champsPersonnalises || [], fichiersMultimedias: fichiersMultimedias || [] }]);
                  return { ...l, seances: [...(l.seances || []), nouvelleSeance] };
                }
                return l;
              })
            };
          }
          return c;
        });
      }
      nouveauxProgrammes[cleClasse] = { ...progClasse, cycles: nouveauxCycles };
    });

    setProgrammesClasses(nouveauxProgrammes);
    showToast(`🚀 Élément créé et dupliqué avec succès pour ${ciblesFinales.length} cible(s) !`);

    setModalAssistant(prev => ({
      ...prev, ouvert: false, niveauCible: 'programme', cycleIdCible: null, leconIdCible: null, titreCycle: '', competenceCycle: '', dateDebutCycle: '', dateFinCycle: '', titreLecon: '', nombreSeancesLecon: '3', titreSeance: '', dateSeance: new Date().toISOString().split('T')[0], lieuSeance: '', habilites: '', contenus: '', exercices: '', evaluations: '', fichiersMultimedias: [], champsPersonnalises: [], enCoursScan: false, fichierNom: '', ecolesClassesCibles: [], datesParClassePerso: {}
    }));
  };

  const executerConsultationEtReutilisation = (e) => {
    e.preventDefault();
    const { item, donneesModifiees, classesSelectionnees, datesParClasse } = modalConsulterReutiliser;
    if ((classesSelectionnees || []).length === 0) {
      showToast("Veuillez sélectionner au moins une classe cible.");
      return;
    }

    (classesSelectionnees || []).forEach(classeCible => {
      const dateAttribuee = (datesParClasse && datesParClasse[classeCible]) || new Date().toISOString().split('T')[0];
      if (!programmesClasses[classeCible]) initialiserProgrammeClasse(classeCible);

      const progCible = programmesClasses[classeCible] || { anneeScolaire: '2025-2026', cycles: [] };
      const nouvelleSeanceReutilisee = {
        id: Date.now() + Math.random(), numero: 1, titre: donneesModifiees?.nom || item?.nom || '', date: dateAttribuee, lieu: 'Gymnase', habilites: donneesModifiees?.habilites || item?.habilites || '', contenus: donneesModifiees?.contenus || item?.contenus || '', exercices: donneesModifiees?.exercices || item?.exercices || '', evaluations: donneesModifiees?.evaluations || item?.evaluations || '', fichiersMultimedias: item?.fichiersMultimedias || [], champsPersonnalises: item?.champsPersonnalises || [], statut: 'En cours', soumisAuCenseur: false
      };

      setProgrammesClasses(prev => {
        let cyclesCible = [...(progCible.cycles || [])];
        if (cyclesCible.length === 0) {
          cyclesCible.push({ id: Date.now(), titre: donneesModifiees?.cycleAssocie || item?.cycleAssocie || 'Cycle Général', competence: 'Compétence', dateDebut: '2026-01-01', dateFin: '2026-06-30', statut: 'En cours', lecons: [{ id: Date.now() + 1, titre: donneesModifiees?.leconAssociee || item?.leconAssociee || 'Leçon Générale', nombreSeancesPrevues: 3, statut: 'En cours', seances: [nouvelleSeanceReutilisee] }] });
        } else {
          if (!cyclesCible[0].lecons) cyclesCible[0].lecons = [];
          if (cyclesCible[0].lecons.length === 0) {
            cyclesCible[0].lecons.push({ id: Date.now() + 1, titre: 'Leçon Générale', nombreSeancesPrevues: 3, statut: 'En cours', seances: [nouvelleSeanceReutilisee] });
          } else {
            if (!cyclesCible[0].lecons[0].seances) cyclesCible[0].lecons[0].seances = [];
            cyclesCible[0].lecons[0].seances.push(nouvelleSeanceReutilisee);
          }
        }
        return { ...prev, [classeCible]: { ...progCible, cycles: cyclesCible } };
      });
    });

    showToast("♻️ Fiche consultée, modifiée et réutilisée avec succès dans les classes ciblées !");
    setModalConsulterReutiliser({ ouvert: false, item: null, donneesModifiees: {}, classesSelectionnees: [], datesParClasse: {} });
  };

  const soumettreReportSeance = (e) => {
    e.preventDefault();
    const { seanceId, seanceTitre, ecolesClassesCibles, date, motif, fichiersJoints } = modalReportSeance;
    if ((ecolesClassesCibles || []).length === 0 || !motif || !date) {
      showToast("⚠️ Veuillez sélectionner les classes cibles, la date et le motif.");
      return;
    }

    try {
      const rapportsReportsExistants = JSON.parse(localStorage.getItem('app_censeur_rapports_reports')) || [];
      const nouveauxRapports = (ecolesClassesCibles || []).map(cleUnique => {
        const [ecole, classe] = cleUnique.split(' - ');
        return {
          id: Date.now() + Math.random(),
          enseignant: `${infosEnseignant?.civilite || ''} ${infosEnseignant?.nom || ''} ${infosEnseignant?.prenoms || ''}`,
          matiere: infosEnseignant?.matiere || 'EPS',
          ecole: ecole,
          classe: classe || cleUnique,
          seance: seanceTitre || 'Séance non spécifiée',
          date: date,
          motif: motif,
          fichiersJoints: fichiersJoints || [],
          dateSoumission: new Date().toLocaleDateString()
        };
      });

      localStorage.setItem('app_censeur_rapports_reports', JSON.stringify([...nouveauxRapports, ...rapportsReportsExistants]));
      
      setSeancesReportees(prev => ({
        ...prev,
        [seanceId]: { date, motif }
      }));
    } catch (err) {}

    setModalReportSeance(prev => ({ ...prev, ouvert: false, seanceId: null, seanceTitre: '', ecolesClassesCibles: [], date: new Date().toISOString().split('T')[0], motif: '', fichiersJoints: [] }));
    showToast("📤 Séance reportée transmise avec succès au censeur !");
  };

  const soumettreReportMultiple = (e) => {
    e.preventDefault();
    const { ecolesClassesSelectionnees, date, motif, fichiersJoints } = modalReportMultiple;
    if ((ecolesClassesSelectionnees || []).length === 0 || !motif || !date) {
      showToast("⚠️ Veuillez sélectionner au moins une classe, une date et un motif.");
      return;
    }

    try {
      const rapportsReportsExistants = JSON.parse(localStorage.getItem('app_censeur_rapports_reports')) || [];
      const nouveauxRapports = (ecolesClassesSelectionnees || []).map(cleUnique => {
        const [ecole, classe] = cleUnique.split(' - ');
        return {
          id: Date.now() + Math.random(),
          enseignant: `${infosEnseignant?.civilite || ''} ${infosEnseignant?.nom || ''} ${infosEnseignant?.prenoms || ''}`,
          matiere: infosEnseignant?.matiere || 'EPS',
          ecole: ecole,
          classe: classe || cleUnique,
          seance: 'Journée de cours complète (Séances multiples manquées)',
          date: date,
          motif: motif,
          fichiersJoints: fichiersJoints || [],
          dateSoumission: new Date().toLocaleDateString()
        };
      });
      localStorage.setItem('app_censeur_rapports_reports', JSON.stringify([...nouveauxRapports, ...rapportsReportsExistants]));
    } catch (err) {}

    setModalReportMultiple(prev => ({ ...prev, ouvert: false, ecolesClassesSelectionnees: [], date: new Date().toISOString().split('T')[0], motif: '', fichiersJoints: [] }));
    showToast("📤 Rapports de séances multiples transmis avec succès au censeur !");
  };

  const soumettreAuCenseur = (type, cycleId, leconId = null, seanceId = null) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !prog.cycles) return;
    const cyclesMaj = (prog.cycles || []).map(c => {
      if (c.id === cycleId) {
        if (type === 'programme' || type === 'cycle') return { ...c, soumisAuCenseur: true };
        return {
          ...c,
          lecons: (c.lecons || []).map(l => {
            if (l.id === leconId) {
              if (type === 'lecon') return { ...l, soumisAuCenseur: true };
              return { ...l, seances: (l.seances || []).map(s => s.id === seanceId ? { ...s, soumisAuCenseur: true } : s) };
            }
            return l;
          })
        };
      }
      return c;
    });
    setProgrammesClasses({ ...programmesClasses, [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🚀 Élément envoyé avec succès au censeur pour validation !");
  };

  const marquerLeconTerminee = (cycleId, leconId) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !prog.cycles) return;
    const cyclesMaj = (prog.cycles || []).map(c => c.id === cycleId ? { ...c, lecons: (c.lecons || []).map(l => l.id === leconId ? { ...l, statut: 'Terminée' } : l) } : c);
    setProgrammesClasses({ ...programmesClasses, [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🏁 Leçon marquée comme terminée ! Vous pouvez en créer une nouvelle.");
  };

  const marquerCycleTermine = (cycleId) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !prog.cycles) return;
    const cyclesMaj = (prog.cycles || []).map(c => c.id === cycleId ? { ...c, statut: 'Terminé' } : c);
    setProgrammesClasses({ ...programmesClasses, [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    showToast("🏆 Cycle clôturé et terminé avec succès !");
  };

  const ouvrirModalEdition = (type, cycleId, leconId = null, seanceId = null) => {
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !prog.cycles) return;
    const cycle = (prog.cycles || []).find(c => c.id === cycleId);
    if (!cycle) return;

    let donnees = {};
    if (type === 'cycle') donnees = { titre: cycle.titre || '', competence: cycle.competence || '', dateDebut: cycle.dateDebut || '', dateFin: cycle.dateFin || '' };
    else if (type === 'lecon') {
      const lecon = (cycle.lecons || []).find(l => l.id === leconId);
      if (lecon) donnees = { titre: lecon.titre || '', nombreSeancesPrevues: lecon.nombreSeancesPrevues || 3 };
    } else if (type === 'seance') {
      const lecon = (cycle.lecons || []).find(l => l.id === leconId);
      const seance = (lecon?.seances || []).find(s => s.id === seanceId);
      if (seance) donnees = { titre: seance.titre || '', date: seance.date || '', lieu: seance.lieu || '', habilites: seance.habilites || '', contenus: seance.contenus || '', exercices: seance.exercices || '', evaluations: seance.evaluations || '' };
    }
    setModalEdition({ ouvert: true, type, cycleId, leconId, seanceId, donnees });
  };

  const sauvegarderEdition = (e) => {
    e.preventDefault();
    const { type, cycleId, leconId, seanceId, donnees } = modalEdition;
    const prog = programmesClasses[classeSelectionneeVue];
    if (!prog || !prog.cycles) return;

    const cyclesMaj = (prog.cycles || []).map(c => {
      if (c.id === cycleId) {
        if (type === 'cycle') return { ...c, ...donnees };
        return {
          ...c,
          lecons: (c.lecons || []).map(l => {
            if (l.id === leconId) {
              if (type === 'lecon') return { ...l, ...donnees };
              return { ...l, seances: (l.seances || []).map(s => s.id === seanceId ? { ...s, ...donnees } : s) };
            }
            return l;
          })
        };
      }
      return c;
    });

    setProgrammesClasses({ ...programmesClasses, [classeSelectionneeVue]: { ...prog, cycles: cyclesMaj } });
    setModalEdition({ ouvert: false, type: null, cycleId: null, leconId: null, seanceId: null, donnees: {} });
    showToast("✅ Modification enregistrée avec succès !");
  };

  const confirmerQuitterEcole = () => {
    const idAff = modalConfirmationQuitter.affiliationId;
    const updated = (affiliations || []).filter(a => a && a.id !== idAff);
    setAffiliations(updated);
    setModalConfirmationQuitter({ ouvert: false, affiliationId: null, ecoleNom: '' });
    if (updated.length === 0) {
      setModeSansAffiliation(true);
      showToast("⚠️ Vous n'avez plus d'écoles affiliées. Passage automatique en mode sans affiliation (payant).");
    } else {
      showToast("⚠️ Vous avez rompu votre affiliation avec cet établissement.");
    }
  };

  const accepterProposition = (prop) => {
    const nouvelleAff = { id: Date.now(), ecole: prop.ecole, statut: 'Validée', classes: prop.classes || [] };
    setAffiliations(prev => [...(prev || []), nouvelleAff]);
    setPropositionsCenseur(prev => (prev || []).filter(p => p && p.id !== prop.id));
    setModeSansAffiliation(false);
    showToast(`✅ Proposition d'affiliation acceptée pour ${prop.ecole} !`);
  };

  const soumettreDemandeAffiliation = (e) => {
    e.preventDefault();
    if (!nouvelleEcoleSaisie.trim()) return;
    const nouvelleAff = { 
      id: Date.now(), 
      ecole: nouvelleEcoleSaisie.trim(), 
      codeOuProviseur: codeOuProviseur.trim(), 
      statut: 'En attente', 
      classes: (nouvellesClassesSaisies || '').split(',').map(c => c.trim()).filter(Boolean) 
    };
    setAffiliations(prev => [...(prev || []), nouvelleAff]);
    setModalAffiliation(false);
    setNouvelleEcoleSaisie('');
    setCodeOuProviseur('');
    showToast("🚀 Demande d'affiliation transmise au censeur de l'école !");
  };

  const ajouterClasseLibre = (e) => {
    e.preventDefault();
    if (!nouvelleClasseLibre.trim()) return;
    if (!(classesSansAffiliation || []).includes(nouvelleClasseLibre.trim())) {
      setClassesSansAffiliation(prev => [...(prev || []), nouvelleClasseLibre.trim()]);
      setNouvelleClasseLibre('');
      showToast("✅ Nouvelle classe autonome ajoutée !");
    } else {
      showToast("⚠️ Cette classe existe déjà.");
    }
  };

  const supprimerClasseLibre = (classe) => {
    setClassesSansAffiliation(prev => (prev || []).filter(c => c !== classe));
    showToast(`❌ Classe ${classe} supprimée.`);
  };

  const telechargerPDFEntite = (titreEntite, sousTitre, contenuTableau) => {
    const fenetreImpression = window.open('', '_blank');
    if (!fenetreImpression) {
      showToast("⚠️ Votre navigateur bloque les pop-up. Veuillez les autoriser pour télécharger.");
      return;
    }
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
            <p>Document Pédagogique Officiel - ${ecoleSelectionneeVue || infosEnseignant?.etablissementSaisi || ''}</p>
          </div>
          <div class="meta">
            <p><strong>Enseignant(e) :</strong> ${infosEnseignant?.civilite || ''} ${infosEnseignant?.nom || ''} ${infosEnseignant?.prenoms || ''} (${infosEnseignant?.matiere || ''})</p>
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
    let customFieldsHtml = '';
    (seance?.champsPersonnalises || []).forEach(cp => {
      customFieldsHtml += `<tr><th>🏷️ ${cp.label || 'Champ personnalisé'}</th><td>${cp.valeur || 'N/A'}</td></tr>`;
    });

    const html = `<table>
      ${seance?.habilites !== undefined && seance?.habilites !== '' ? `<tr><th>🎯 Habilités Visées</th><td>${seance?.habilites}</td></tr>` : ''}
      ${seance?.contenus !== undefined && seance?.contenus !== '' ? `<tr><th>📚 Contenus Pédagogiques</th><td>${seance?.contenus}</td></tr>` : ''}
      ${seance?.exercices !== undefined && seance?.exercices !== '' ? `<tr><th>⚡ Exercices d'Application</th><td>${seance?.exercices}</td></tr>` : ''}
      ${seance?.evaluations !== undefined && seance?.evaluations !== '' ? `<tr><th>📝 Modalités d'Évaluation</th><td>${seance?.evaluations}</td></tr>` : ''}
      ${customFieldsHtml}
    </table>`;
    telechargerPDFEntite(`Fiche de Séance - ${seance?.titre || 'Séance'}`, `Cycle: ${cycle?.titre || 'N/A'} | Leçon: ${lecon?.titre || 'N/A'}`, html);
  };

  const telechargerProgrammeAnnuelPDF = (progClasse, classeNom) => {
    let htmlContent = '<h3>Programme Annuel Complet</h3>';
    (progClasse?.cycles || []).forEach(cy => {
      htmlContent += `<h4 style="background:#e0f2fe; padding:8px; margin-top:15px;">📁 ${cy?.titre || ''} (Du ${cy?.dateDebut || ''} au ${cy?.dateFin || ''})</h4><p><strong>Compétence :</strong> ${cy?.competence || ''}</p>`;
      (cy.lecons || []).forEach(lc => {
        htmlContent += `<p style="margin-left: 15px;"><strong>📖 Leçon :</strong> ${lc?.titre || ''}</p>`;
        (lc.seances || []).forEach(sc => {
          htmlContent += `<p style="margin-left: 30px; font-size: 12px;">• Séance #${sc?.numero || ''}: ${sc?.titre || ''} (${sc?.date || ''})</p>`;
        });
      });
    });
    telechargerPDFEntite(`Programme Annuel - ${classeNom}`, `Année scolaire ${progClasse?.anneeScolaire || '2025-2026'}`, htmlContent);
  };

  const bibliothequeFiltree = useMemo(() => {
    return (bibliotheque || []).filter(b => {
      if (!b) return false;
      const matchAnnee = !filtreBiblioAnnee || b.anneeScolaire === filtreBiblioAnnee;
      const matchClasse = filtreBiblioClasse === 'TOUTES' || b.classe === filtreBiblioClasse;
      const matchTexte = !filtreBiblioTexte || (b.nom && b.nom.toLowerCase().includes(filtreBiblioTexte.toLowerCase())) || (b.cycleAssocie && b.cycleAssocie.toLowerCase().includes(filtreBiblioTexte.toLowerCase())) || (b.leconAssociee && b.leconAssociee.toLowerCase().includes(filtreBiblioTexte.toLowerCase()));
      return matchAnnee && matchClasse && matchTexte;
    });
  }, [bibliotheque, filtreBiblioAnnee, filtreBiblioClasse, filtreBiblioTexte]);

  return (
    <div style={styles.container}>
      <style>{`
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        @keyframes apparition { from { opacity: 0; } to { opacity: 1; } }
        @keyframes glissement { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .anim-apparition { animation: apparition 0.3s ease-out forwards; }
        .anim-modale { animation: glissement 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .bouton { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: none; transition: all 0.2s ease; }
        .bouton-principal { background-color: #2563eb; color: white; }
        .bouton-principal:hover { background-color: #1d4ed8; }
        .bouton-succes { background-color: #16a34a; color: white; }
        .bouton-succes:hover { background-color: #15803d; }
        .bouton-danger { background-color: #ef4444; color: white; }
        .bouton-danger:hover { background-color: #dc2626; }
        .bouton-secondaire { background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
        .bouton-secondaire:hover { background-color: #e2e8f0; color: #0f172a; }
        .champ-saisie { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; background-color: #fff; color: #1e293b; outline: none; }
        .champ-saisie:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); }
        .option-menu { width: 100%; text-align: left; padding: 10px 16px; background: transparent; border: none; color: #334155; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .option-menu:hover { background-color: #f1f5f9; color: #0f172a; padding-left: 20px; }
        .option-menu.actif { background-color: #e0f2fe; color: #0369a1; }
        .fond-modale { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
      `}</style>

      {/* COMPOSANT HEADER CENTRALISÉ ET RESPONSIVE */}
      <Header 
        title="E-cahier !" 
        roleName={`Espace Enseignant - ${ecoleSelectionneeVue || infosEnseignant?.etablissementSaisi || 'Enseignant'}`} 
        onLogout={handleLogout} 
      />

      {/* BARRE DE NAVIGATION SECONDAIRE / ACTIONS ENSEIGNANT */}
      <div style={{ backgroundColor: '#1e293b', padding: '10px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('cycles')} className={`bouton ${activeTab === 'cycles' ? 'bouton-principal' : 'bouton-secondaire'}`}>📊 Programme Annuel & Leçons</button>
          <button onClick={() => setActiveTab('bibliotheque')} className={`bouton ${activeTab === 'bibliotheque' ? 'bouton-principal' : 'bouton-secondaire'}`}>📁 Bibliothèque & Réutilisation</button>
          <button onClick={() => setActiveTab('affiliation')} className={`bouton ${activeTab === 'affiliation' ? 'bouton-principal' : 'bouton-secondaire'}`}>🏫 Gestion des Écoles</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setModalReportMultiple(prev => ({ ...prev, ouvert: true, ecolesClassesSelectionnees: [], date: new Date().toISOString().split('T')[0], motif: '', fichiersJoints: [] }))} className="bouton bouton-danger" style={{ padding: '7px 12px', fontSize: '11px' }}>⏰ Reports multiples</button>
          <button onClick={() => setModalAffiliation(true)} className="bouton bouton-succes" style={{ padding: '7px 12px', fontSize: '11px' }}>+ Demande d'Affiliation</button>
          
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button onClick={() => setNotifOuvert(!notifOuvert)} style={styles.navDarkBtn}>
              <span>🔔 Notifs</span>
              {(notifications || []).filter(n => n && !n.lu).length > 0 && <span className="pastille-alerte">{(notifications || []).filter(n => n && !n.lu).length}</span>}
            </button>
            {notifOuvert && (
              <div style={styles.notificationDropdown} className="anim-apparition">
                <div style={styles.dropdownHeader}>Notifications & Validations</div>
                {(notifications || []).map(n => n ? (
                  <div key={n.id} style={styles.notifItem}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#334155' }}>{n.texte}</p>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                  </div>
                ) : null)}
                {(propositionsCenseur || []).length > 0 && (
                  <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb' }}>Propositions d'affiliation :</span>
                    {(propositionsCenseur || []).map(p => p ? (
                      <div key={p.id} style={{ backgroundColor: '#eff6ff', padding: '6px', borderRadius: '4px', marginTop: '4px', fontSize: '12px' }}>
                        <strong>{p.ecole}</strong> ({p.censeur})<br/>
                        <button onClick={() => accepterProposition(p)} className="bouton bouton-succes" style={{ padding: '2px 6px', fontSize: '10px', marginTop: '4px' }}>Accepter l'affiliation</button>
                      </div>
                    ) : null)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <main style={styles.mainContentBody}>
        {message && <div style={styles.toastSuccess} className="anim-apparition">{message}</div>}

        {/* MODAL DE CONFIRMATION POUR QUITTER L'ÉCOLE */}
        {modalConfirmationQuitter.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '420px', textAlign: 'center' }} className="anim-modale">
              <h3 style={{ margin: '0 0 10px 0', color: '#991b1b' }}>⚠️ Quitter l'établissement</h3>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
                Êtes-vous sûr de vouloir <strong>quitter l'établissement {modalConfirmationQuitter.ecoleNom}</strong> ? Cette action rompura votre affiliation.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalConfirmationQuitter({ ouvert: false, affiliationId: null, ecoleNom: '' })} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={confirmerQuitterEcole} className="bouton bouton-danger">Oui, quitter l'école</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE REPORT DE SÉANCE UNIQUE */}
        {modalReportSeance.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '500px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-modale">
              <h3 style={{ margin: '0 0 10px 0', color: '#991b1b' }}>⏰ Déclarer un Report de Séance</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Indiquez les détails de la séance qui n'a pas pu avoir lieu. Cela sera transmis directement au censeur.
              </p>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                  Sélectionner les classes et écoles concernées par ce report :
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '140px', overflowY: 'auto' }}>
                  {(ecolesActivesValidees || []).map(ecole => {
                    const classesEcole = getClassesParEcole(ecole) || [];
                    return (
                      <div key={ecole} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                        <strong style={{ fontSize: '12px', color: '#2563eb' }}>🏫 {ecole}</strong>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px', paddingLeft: '10px' }}>
                          {classesEcole.map(cl => {
                            const cleUnique = `${ecole} - ${cl}`;
                            const estCoche = (modalReportSeance.ecolesClassesCibles || []).includes(cleUnique);
                            return (
                              <label key={cleUnique} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                                <input 
                                  type="checkbox" 
                                  checked={estCoche}
                                  onChange={(e) => {
                                    const updated = e.target.checked 
                                      ? [...(modalReportSeance.ecolesClassesCibles || []), cleUnique]
                                      : (modalReportSeance.ecolesClassesCibles || []).filter(item => item !== cleUnique);
                                    setModalReportSeance(prev => ({ ...prev, ecolesClassesCibles: updated }));
                                  }}
                                />
                                {cl}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={soumettreReportSeance} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={styles.label}>Séance / Titre</label>
                  <input type="text" value={modalReportSeance.seanceTitre} onChange={(e) => setModalReportSeance(prev => ({...prev, seanceTitre: e.target.value}))} className="champ-saisie" required />
                </div>
                <div>
                  <label style={styles.label}>Date de la séance manquée</label>
                  <input type="date" value={modalReportSeance.date} onChange={(e) => setModalReportSeance(prev => ({...prev, date: e.target.value}))} className="champ-saisie" required />
                </div>
                <div>
                  <label style={styles.label}>Motif du report</label>
                  <textarea placeholder="Ex: Intempéries, absence justifiée, grève..." value={modalReportSeance.motif} onChange={(e) => setModalReportSeance(prev => ({...prev, motif: e.target.value}))} className="champ-saisie" style={{ height: '70px' }} required />
                </div>

                <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>📎 Pièces jointes (Photos, PDF, Certificats médicaux...)</label>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*,.pdf" 
                    onChange={(e) => {
                      const files = Array.from(e.target.files).map(f => f.name);
                      setModalReportSeance(prev => ({ ...prev, fichiersJoints: files }));
                    }} 
                    style={{ fontSize: '11px' }} 
                  />
                  {(modalReportSeance.fichiersJoints || []).length > 0 && (
                    <p style={{ fontSize: '11px', color: '#166534', marginTop: '4px', margin: 0 }}>
                      Fichiers joints : {(modalReportSeance.fichiersJoints || []).join(', ')}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalReportSeance(prev => ({ ...prev, ouvert: false, seanceId: null, seanceTitre: '', ecolesClassesCibles: [], motif: '', fichiersJoints: [] }))} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-danger">Transmettre la séance reportée</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE REPORT DE SÉANCES MULTIPLES */}
        {modalReportMultiple.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '500px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-modale">
              <h3 style={{ margin: '0 0 10px 0', color: '#991b1b' }}>⏰ Déclarer des Reports de Séances Multiples</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Si vous avez manqué une journée complète, sélectionnez les classes et écoles impactées.</p>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                  Classes concernées :
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '140px', overflowY: 'auto' }}>
                  {(ecolesActivesValidees || []).map(ecole => {
                    const classesEcole = getClassesParEcole(ecole) || [];
                    return (
                      <div key={ecole} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                        <strong style={{ fontSize: '12px', color: '#2563eb' }}>🏫 {ecole}</strong>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px', paddingLeft: '10px' }}>
                          {classesEcole.map(cl => {
                            const cleUnique = `${ecole} - ${cl}`;
                            const estCoche = (modalReportMultiple.ecolesClassesSelectionnees || []).includes(cleUnique);
                            return (
                              <label key={cleUnique} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                                <input 
                                  type="checkbox" 
                                  checked={estCoche}
                                  onChange={(e) => {
                                    const updated = e.target.checked 
                                      ? [...(modalReportMultiple.ecolesClassesSelectionnees || []), cleUnique]
                                      : (modalReportMultiple.ecolesClassesSelectionnees || []).filter(item => item !== cleUnique);
                                    setModalReportMultiple(prev => ({ ...prev, ecolesClassesSelectionnees: updated }));
                                  }}
                                />
                                {cl}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={soumettreReportMultiple} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={styles.label}>Date de la journée manquée</label>
                  <input type="date" value={modalReportMultiple.date} onChange={(e) => setModalReportMultiple(prev => ({...prev, date: e.target.value}))} className="champ-saisie" required />
                </div>
                <div>
                  <label style={styles.label}>Motif du report global</label>
                  <textarea placeholder="Ex: Absence pour raison médicale, intempéries..." value={modalReportMultiple.motif} onChange={(e) => setModalReportMultiple(prev => ({...prev, motif: e.target.value}))} className="champ-saisie" style={{ height: '70px' }} required />
                </div>

                <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>📎 Pièces jointes (Photos, PDF, Certificats médicaux...)</label>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*,.pdf" 
                    onChange={(e) => {
                      const files = Array.from(e.target.files).map(f => f.name);
                      setModalReportMultiple(prev => ({ ...prev, fichiersJoints: files }));
                    }} 
                    style={{ fontSize: '11px' }} 
                  />
                  {(modalReportMultiple.fichiersJoints || []).length > 0 && (
                    <p style={{ fontSize: '11px', color: '#166534', marginTop: '4px', margin: 0 }}>
                      Fichiers joints : {(modalReportMultiple.fichiersJoints || []).join(', ')}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalReportMultiple(prev => ({ ...prev, ouvert: false, ecolesClassesSelectionnees: [], motif: '', fichiersJoints: [] }))} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-danger">Transmettre les rapports multiples</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL MODIFICATION PROFIL & PHOTO */}
        {modalProfilOuvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '480px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-modale">
              <h3 style={{ margin: '0 0 14px 0', color: '#0f172a' }}>👤 Paramètres du Profil & Photo</h3>
              <form onSubmit={handleEnregistrerProfil} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                    {formProfil?.photoProfil ? (
                      <img src={formProfil.photoProfil} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '28px' }}>👤</span>
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>Photo de profil (Fichier)</label>
                    <input type="file" accept="image/*" onChange={handleChangerPhotoProfil} style={{ fontSize: '11px', cursor: 'pointer' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>Civilité</label>
                    <select value={formProfil?.civilite || ''} onChange={(e) => setFormProfil({...formProfil, civilite: e.target.value})} className="champ-saisie">
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Dr">Dr</option>
                      <option value="Pr">Pr</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Nom</label>
                    <input type="text" value={formProfil?.nom || ''} onChange={(e) => setFormProfil({...formProfil, nom: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Prénoms</label>
                  <input type="text" value={formProfil?.prenoms || ''} onChange={(e) => setFormProfil({...formProfil, prenoms: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label style={styles.label}>Matière enseignée</label>
                  <input type="text" value={formProfil?.matiere || ''} onChange={(e) => setFormProfil({...formProfil, matiere: e.target.value})} className="champ-saisie" required />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalProfilOuvert(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL NOUVELLE DEMANDE D'AFFILIATION */}
        {modalAffiliation && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '460px' }} className="anim-modale">
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>🏫 Demande d'Affiliation à une École</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Vous avez un nouveau poste ou un rattachement en cours d'année ? Faites votre demande ci-dessous.</p>
              <form onSubmit={soumettreDemandeAffiliation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={styles.label}>Nom de l'établissement</label>
                  <input type="text" placeholder="Ex: Lycée Moderne..." value={nouvelleEcoleSaisie} onChange={(e) => setNouvelleEcoleSaisie(e.target.value)} className="champ-saisie" required />
                </div>
                <div>
                  <label style={styles.label}>Code de l'établissement ou Nom du Proviseur (Facultatif)</label>
                  <input type="text" placeholder="Ex: MENA-12345 ou M. Koffi Bernard" value={codeOuProviseur} onChange={(e) => setCodeOuProviseur(e.target.value)} className="champ-saisie" />
                </div>
                <div>
                  <label style={styles.label}>Classes concernées (séparées par des virgules)</label>
                  <input type="text" placeholder="Ex: 6ème A, 5ème B" value={nouvellesClassesSaisies} onChange={(e) => setNouvellesClassesSaisies(e.target.value)} className="champ-saisie" required />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalAffiliation(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Soumettre la demande</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ASSISTANT DE CRÉATION ET DUPLICATION MULTI-ÉCOLES */}
        {modalAssistant.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '680px', maxHeight: '95vh', overflowY: 'auto' }} className="anim-modale">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>
                  {modalAssistant.niveauCible === 'cycle' && '✨ Créer un Cycle (Duplication Multi-Écoles)'}
                  {modalAssistant.niveauCible === 'lecon' && '📖 Créer une Leçon (Duplication Multi-Écoles)'}
                  {modalAssistant.niveauCible === 'seance' && '📝 Créer une Séance (Duplication Multi-Écoles)'}
                </h3>
                <button onClick={() => setModalAssistant(prev => ({ ...prev, ouvert: false }))} className="bouton bouton-secondaire" style={{ padding: '4px 8px' }}>✕</button>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                  Sélectionnez les classes de vos établissements et définissez leur date respective :
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '160px', overflowY: 'auto' }}>
                  {(ecolesActivesValidees || []).map(ecole => {
                    const classesEcole = getClassesParEcole(ecole) || [];
                    return (
                      <div key={ecole} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                        <strong style={{ fontSize: '12px', color: '#2563eb' }}>🏫 Établissement : {ecole}</strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', paddingLeft: '10px' }}>
                          {classesEcole.map(cl => {
                            const cleUnique = `${ecole} - ${cl}`;
                            const estCoche = (modalAssistant.ecolesClassesCibles || []).includes(cleUnique);
                            return (
                              <div key={cleUnique} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', backgroundColor: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600', flex: 1 }}>
                                  <input 
                                    type="checkbox" 
                                    checked={estCoche}
                                    onChange={(e) => {
                                      const updatedCibles = e.target.checked 
                                        ? [...(modalAssistant.ecolesClassesCibles || []), cleUnique]
                                        : (modalAssistant.ecolesClassesCibles || []).filter(item => item !== cleUnique);
                                      
                                      let updatedDates = { ...(modalAssistant.datesParClassePerso || {}) };
                                      if (e.target.checked) updatedDates[cleUnique] = new Date().toISOString().split('T')[0];
                                      else delete updatedDates[cleUnique];

                                      setModalAssistant(prev => ({ ...prev, ecolesClassesCibles: updatedCibles, datesParClassePerso: updatedDates }));
                                    }}
                                  />
                                  {cl}
                                </label>
                                {estCoche && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '10px', color: '#64748b' }}>Date :</span>
                                    <input 
                                      type="date" 
                                      value={(modalAssistant.datesParClassePerso && modalAssistant.datesParClassePerso[cleUnique]) || new Date().toISOString().split('T')[0]}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setModalAssistant(prev => ({ ...prev, datesParClassePerso: { ...(prev.datesParClassePerso || {}), [cleUnique]: val } }));
                                      }}
                                      style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={gererValidationAssistant} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {modalAssistant.niveauCible === 'cycle' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre du cycle</label>
                      <input type="text" placeholder="Ex: Cycle 1 : Gymnastique..." value={modalAssistant.titreCycle || ''} onChange={(e) => setModalAssistant(prev => ({...prev, titreCycle: e.target.value}))} className="champ-saisie" required />
                    </div>
                    <div>
                      <label style={styles.label}>Compétence visée</label>
                      <input type="text" placeholder="Ex: Traiter une situation..." value={modalAssistant.competenceCycle || ''} onChange={(e) => setModalAssistant(prev => ({...prev, competenceCycle: e.target.value}))} className="champ-saisie" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={styles.label}>📅 Date de fin globale du cycle</label>
                        <input type="date" value={modalAssistant.dateFinCycle || ''} onChange={(e) => setModalAssistant(prev => ({...prev, dateFinCycle: e.target.value}))} className="champ-saisie" required />
                      </div>
                    </div>
                  </>
                )}

                {modalAssistant.niveauCible === 'lecon' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre de la leçon</label>
                      <input type="text" placeholder="Ex: Leçon 1 : Maîtriser les équilibres..." value={modalAssistant.titreLecon || ''} onChange={(e) => setModalAssistant(prev => ({...prev, titreLecon: e.target.value}))} className="champ-saisie" required />
                    </div>
                    <div>
                      <label style={styles.label}>Nombre de séances prévues</label>
                      <input type="number" min="1" value={modalAssistant.nombreSeancesLecon || '3'} onChange={(e) => setModalAssistant(prev => ({...prev, nombreSeancesLecon: e.target.value}))} className="champ-saisie" required />
                    </div>
                  </>
                )}

                {modalAssistant.niveauCible === 'seance' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre de la séance</label>
                      <input type="text" placeholder="Ex: Séance 1 : Roulé-boulé..." value={modalAssistant.titreSeance || ''} onChange={(e) => setModalAssistant(prev => ({...prev, titreSeance: e.target.value}))} className="champ-saisie" required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={styles.label}>Lieu</label>
                        <input type="text" placeholder="Ex: Gymnase A" value={modalAssistant.lieuSeance || ''} onChange={(e) => setModalAssistant(prev => ({...prev, lieuSeance: e.target.value}))} className="champ-saisie" />
                      </div>
                    </div>

                    {modeleFiche.champsDefaut.habilites && (
                      <div>
                        <label style={styles.label}>🎯 Habilités</label>
                        <textarea value={modalAssistant.habilites || ''} onChange={(e) => setModalAssistant(prev => ({...prev, habilites: e.target.value}))} className="champ-saisie" style={{ height: '45px' }} />
                      </div>
                    )}
                    {modeleFiche.champsDefaut.contenus && (
                      <div>
                        <label style={styles.label}>📚 Contenus</label>
                        <textarea value={modalAssistant.contenus || ''} onChange={(e) => setModalAssistant(prev => ({...prev, contenus: e.target.value}))} className="champ-saisie" style={{ height: '45px' }} />
                      </div>
                    )}
                    {modeleFiche.champsDefaut.exercices && (
                      <div>
                        <label style={styles.label}>⚡ Exercices</label>
                        <textarea value={modalAssistant.exercices || ''} onChange={(e) => setModalAssistant(prev => ({...prev, exercices: e.target.value}))} className="champ-saisie" style={{ height: '45px' }} />
                      </div>
                    )}
                    {modeleFiche.champsDefaut.evaluations && (
                      <div>
                        <label style={styles.label}>📝 Évaluations</label>
                        <textarea value={modalAssistant.evaluations || ''} onChange={(e) => setModalAssistant(prev => ({...prev, evaluations: e.target.value}))} className="champ-saisie" style={{ height: '45px' }} />
                      </div>
                    )}
                  </>
                )}

                <div style={{ marginTop: '14px', padding: '14px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>⚙️ Modéliser votre fiche (Champs sur-mesure)</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button" 
                        onClick={() => setModalAssistant(prev => ({
                          ...prev, 
                          champsPersonnalises: [...(prev.champsPersonnalises || []), { id: Date.now(), label: '', valeur: '' }]
                        }))} 
                        className="bouton bouton-secondaire" 
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        + Ajouter un champ
                      </button>
                    </div>
                  </div>

                  {(modalAssistant.champsPersonnalises || []).map((champ, index) => (
                    <div key={champ.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input 
                        type="text" 
                        placeholder="Nom du champ..." 
                        value={champ.label} 
                        onChange={(e) => {
                          const nouveauxChamps = [...(modalAssistant.champsPersonnalises || [])];
                          nouveauxChamps[index].label = e.target.value;
                          setModalAssistant(prev => ({ ...prev, champsPersonnalises: nouveauxChamps }));
                        }} 
                        className="champ-saisie" 
                        style={{ flex: 1, backgroundColor: '#f8fafc' }} 
                      />
                      <input 
                        type="text" 
                        placeholder="Valeur..." 
                        value={champ.valeur} 
                        onChange={(e) => {
                          const nouveauxChamps = [...(modalAssistant.champsPersonnalises || [])];
                          nouveauxChamps[index].valeur = e.target.value;
                          setModalAssistant(prev => ({ ...prev, champsPersonnalises: nouveauxChamps }));
                        }} 
                        className="champ-saisie" 
                        style={{ flex: 2 }} 
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          const nouveauxChamps = (modalAssistant.champsPersonnalises || []).filter((_, i) => i !== index);
                          setModalAssistant(prev => ({ ...prev, champsPersonnalises: nouveauxChamps }));
                        }} 
                        className="bouton bouton-danger" 
                        style={{ padding: '4px 8px' }}
                      >✕</button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalAssistant(prev => ({ ...prev, ouvert: false }))} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer & Dupliquer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL MODIFICATION (ÉDITION) */}
        {modalEdition.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '500px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-modale">
              <h3 style={{ margin: '0 0 14px 0', color: '#0f172a' }}>✏️ Modifier {modalEdition.type}</h3>
              <form onSubmit={sauvegarderEdition} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(modalEdition.donnees || {}).map(([key, val]) => (
                  <div key={key}>
                    <label style={styles.label}>{key.toUpperCase()}</label>
                    <input 
                      type="text" 
                      value={val || ''} 
                      onChange={(e) => setModalEdition(prev => ({ ...prev, donnees: { ...(prev.donnees || {}), [key]: e.target.value } }))} 
                      className="champ-saisie" 
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalEdition({ ouvert: false, type: null, cycleId: null, leconId: null, seanceId: null, donnees: {} })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CONSULTER ET RÉUTILISER */}
        {modalConsulterReutiliser.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '560px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-modale">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>👁️ Consulter, Modifier & Réutiliser la Fiche</h3>
                <button onClick={() => setModalConsulterReutiliser({ ouvert: false, item: null, donneesModifiees: {}, classesSelectionnees: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '4px 8px' }}>✕</button>
              </div>
              <form onSubmit={executerConsultationEtReutilisation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={styles.label}>Titre de la fiche / séance</label>
                  <input type="text" value={modalConsulterReutiliser.donneesModifiees?.nom || ''} onChange={(e) => setModalConsulterReutiliser(prev => ({ ...prev, donneesModifiees: { ...(prev.donneesModifiees || {}), nom: e.target.value } }))} className="champ-saisie" required />
                </div>
                <div>
                  <label style={styles.label}>🎯 Habilités</label>
                  <textarea value={modalConsulterReutiliser.donneesModifiees?.habilites || ''} onChange={(e) => setModalConsulterReutiliser(prev => ({ ...prev, donneesModifiees: { ...(prev.donneesModifiees || {}), habilites: e.target.value } }))} className="champ-saisie" style={{ height: '60px' }} />
                </div>
                <div>
                  <label style={styles.label}>📚 Contenus</label>
                  <textarea value={modalConsulterReutiliser.donneesModifiees?.contenus || ''} onChange={(e) => setModalConsulterReutiliser(prev => ({ ...prev, donneesModifiees: { ...(prev.donneesModifiees || {}), contenus: e.target.value } }))} className="champ-saisie" style={{ height: '60px' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
                  <button type="button" onClick={() => setModalConsulterReutiliser({ ouvert: false, item: null, donneesModifiees: {}, classesSelectionnees: [], datesParClasse: {} })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer & Réutiliser</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ONGLET PRINCIPAL : PROGRAMME ANNUEL PAR ÉCOLE & CLASSE */}
        {activeTab === 'cycles' && (
          <div>
            {!ecoleSelectionneeVue ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Sélectionnez un Établissement</h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Choisissez une école pour consulter et gérer les programmes et fiches pédagogiques qui lui sont rattachés.</p>
                  </div>
                </div>

                <div style={styles.grilleClasses}>
                  {(ecolesActivesValidees || []).map(ecole => (
                    <div key={ecole} onClick={() => setEcoleSelectionneeVue(ecole)} style={styles.carteClasseItem}>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>🏫 {ecole}</span>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 14px 0' }}>
                        Classes affiliées : {(getClassesParEcole(ecole) || []).join(', ')}
                      </p>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#2563eb' }}>Voir les fiches de cette école →</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : !classeSelectionneeVue ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <button onClick={() => setEcoleSelectionneeVue(null)} className="bouton bouton-secondaire" style={{ marginBottom: '8px' }}>← Retour aux écoles</button>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Établissement : <span style={{ color: '#2563eb' }}>{ecoleSelectionneeVue}</span></h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Sélectionnez une classe pour accéder à son programme annuel.</p>
                  </div>
                </div>

                <div style={styles.grilleClasses}>
                  {(getClassesParEcole(ecoleSelectionneeVue) || []).map(cl => {
                    const cleUnique = `${ecoleSelectionneeVue} - ${cl}`;
                    const progExiste = !!(programmesClasses && programmesClasses[cleUnique]);
                    return (
                      <div key={cl} onClick={() => { setClasseSelectionneeVue(cleUnique); if (!progExiste) initialiserProgrammeClasse(cleUnique); }} style={styles.carteClasseItem}>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>🏫 Classe {cl}</span>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 12px 0' }}>
                          {progExiste ? `${(programmesClasses[cleUnique]?.cycles || []).length} cycle(s) au programme` : 'Cliquez pour initialiser'}
                        </p>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#2563eb' }}>Ouvrir le programme →</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <button onClick={() => setClasseSelectionneeVue(null)} className="bouton bouton-secondaire" style={{ marginBottom: '8px' }}>← Retour aux classes de {ecoleSelectionneeVue}</button>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Programme : <span style={{ color: '#2563eb' }}>{classeSelectionneeVue}</span></h2>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => telechargerProgrammeAnnuelPDF(programmesClasses[classeSelectionneeVue], classeSelectionneeVue)} className="bouton bouton-secondaire">
                      📥 Télécharger Programme (PDF)
                    </button>
                    {!modeSansAffiliation && (
                      <button onClick={() => soumettreAuCenseur('programme', null)} className="bouton bouton-succes">
                        🚀 Envoyer au Censeur
                      </button>
                    )}
                    <button onClick={() => setModalAssistant(prev => ({ 
                      ...prev, ouvert: true, niveauCible: 'cycle', ecolesClassesCibles: [classeSelectionneeVue],
                      champsPersonnalises: modeleFiche.champsPersoLabels.map((label, i) => ({ id: Date.now() + i, label, valeur: '' }))
                    }))} className="bouton bouton-principal">
                      + Créer un Cycle (Multi-Écoles)
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {((programmesClasses && programmesClasses[classeSelectionneeVue]?.cycles) || []).map(cycle => (
                    <div key={cycle.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', borderLeft: '6px solid #2563eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                        <div>
                          <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>📁 {cycle.titre}</h3>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}><strong>Compétence :</strong> {cycle.competence} | <strong>Durée :</strong> Du {cycle.dateDebut} au {cycle.dateFin}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button onClick={() => ouvrirModalEdition('cycle', cycle.id)} className="bouton bouton-secondaire" style={{ padding: '6px 10px', fontSize: '11px' }}>✏️ Modifier</button>
                          <button onClick={() => telechargerFicheSeancePDF({ titre: cycle.titre, date: cycle.dateDebut, lieu: 'N/A', habilites: cycle.competence, contenus: 'Cycle complet', exercices: 'N/A', evaluations: 'N/A', champsPersonnalises: cycle.champsPersonnalises || [] }, { titre: 'Cycle complet' }, cycle)} className="bouton bouton-principal" style={{ padding: '6px 10px', fontSize: '11px' }}>📥 Télécharger</button>
                          {!modeSansAffiliation && (
                            <button onClick={() => soumettreAuCenseur('cycle', cycle.id)} className="bouton bouton-succes" style={{ padding: '6px 10px', fontSize: '11px' }}>🚀 Envoyer</button>
                          )}
                          {cycle.statut !== 'Terminé' && (
                            <button onClick={() => marquerCycleTermine(cycle.id)} className="bouton bouton-succes" style={{ padding: '6px 10px', fontSize: '11px' }}>🏆 Terminer</button>
                          )}
                          <span style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', backgroundColor: cycle.statut === 'Terminé' ? '#dcfce7' : '#e0f2fe', color: cycle.statut === 'Terminé' ? '#166534' : '#0369a1' }}>{cycle.statut} {cycle.soumisAuCenseur ? '(Envoyé)' : ''}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', margin: 0 }}>Leçons de ce cycle :</h4>
                          <button onClick={() => setModalAssistant(prev => ({ 
                            ...prev, ouvert: true, niveauCible: 'lecon', cycleIdCible: cycle.id, ecolesClassesCibles: [classeSelectionneeVue],
                            champsPersonnalises: modeleFiche.champsPersoLabels.map((label, i) => ({ id: Date.now() + i, label, valeur: '' }))
                          }))} className="bouton bouton-secondaire" style={{ padding: '6px 12px', fontSize: '11px', color: '#2563eb' }}>
                            + Créer une Leçon
                          </button>
                        </div>

                        {(cycle.lecons || []).map(lecon => (
                          <div key={lecon.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                              <h5 style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                📖 {lecon.titre} <span style={{ fontSize: '11px', color: '#64748b' }}>(Séances prévues : {lecon.nombreSeancesPrevues})</span>
                              </h5>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => ouvrirModalEdition('lecon', cycle.id, lecon.id)} className="bouton bouton-secondaire" style={{ padding: '4px 8px', fontSize: '11px' }}>✏️ Modifier</button>
                                <button onClick={() => telechargerFicheSeancePDF({ titre: lecon.titre, date: 'N/A', lieu: 'N/A', habilites: 'Leçon', contenus: 'Leçon complète', exercices: 'N/A', evaluations: 'N/A', champsPersonnalises: lecon.champsPersonnalises || [] }, lecon, cycle)} className="bouton bouton-principal" style={{ padding: '4px 8px', fontSize: '11px' }}>📥 Télécharger</button>
                                {!modeSansAffiliation && (
                                  <button onClick={() => soumettreAuCenseur('lecon', cycle.id, lecon.id)} className="bouton bouton-succes" style={{ padding: '4px 8px', fontSize: '11px' }}>🚀 Envoyer</button>
                                )}
                                {lecon.statut !== 'Terminée' && (
                                  <button onClick={() => marquerLeconTerminee(cycle.id, lecon.id)} className="bouton bouton-succes" style={{ padding: '4px 8px', fontSize: '11px' }}>🏁 Terminer</button>
                                )}
                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: lecon.statut === 'Terminée' ? '#dcfce7' : '#fef3c7', color: lecon.statut === 'Terminée' ? '#166534' : '#92400e' }}>{lecon.statut} {lecon.soumisAuCenseur ? '(Envoyé)' : ''}</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '10px', marginTop: '10px' }}>
                              {(lecon.seances || []).map(seance => {
                                const estReportee = !!(seancesReportees && seancesReportees[seance.id]);
                                return (
                                  <div key={seance.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: '700', color: '#2563eb' }}>Séance #{seance.numero}</span>
                                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{seance.titre}</strong>
                                        <span style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>📅 {seance.date}</span>
                                      </div>
                                      <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0' }}>
                                        <em>Hiérarchie :</em> <strong>{cycle.titre}</strong> ➔ <strong>{lecon.titre}</strong>
                                      </p>

                                      <div style={{ marginTop: '6px', paddingLeft: '4px', borderLeft: '2px solid #e2e8f0' }}>
                                        {seance.habilites && <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0' }}><strong>Habiletés :</strong> {seance.habilites}</p>}
                                        {seance.contenus && <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0' }}><strong>Contenus :</strong> {seance.contenus}</p>}
                                        {seance.exercices && <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0' }}><strong>Exercices :</strong> {seance.exercices}</p>}
                                        {seance.evaluations && <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0' }}><strong>Évaluations :</strong> {seance.evaluations}</p>}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                      <button onClick={() => ouvrirModalEdition('seance', cycle.id, lecon.id, seance.id)} className="bouton bouton-secondaire" style={{ padding: '6px 10px', fontSize: '11px' }}>✏️ Modifier</button>
                                      <button onClick={() => telechargerFicheSeancePDF(seance, lecon, cycle)} className="bouton bouton-principal" style={{ padding: '6px 10px', fontSize: '11px' }}>📥 Télécharger</button>
                                      
                                      <button 
                                        onClick={() => setModalReportSeance(prev => ({ ...prev, ouvert: true, seanceId: seance.id, seanceTitre: seance.titre, ecolesClassesCibles: [classeSelectionneeVue], date: seance.date, motif: '', fichiersJoints: [] }))} 
                                        className={estReportee ? "bouton bouton-succes" : "bouton bouton-danger"} 
                                        style={{ padding: '6px 10px', fontSize: '11px' }}
                                      >
                                        {estReportee ? "📤 Transmettre la séance reportée" : "⏰ Reporter"}
                                      </button>

                                      {!modeSansAffiliation && (
                                        <button onClick={() => soumettreAuCenseur('seance', cycle.id, lecon.id, seance.id)} className="bouton bouton-succes" style={{ padding: '6px 10px', fontSize: '11px' }}>🚀 Envoyer</button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              <div style={{ marginTop: '8px' }}>
                                <button onClick={() => setModalAssistant(prev => ({ 
                                  ...prev, ouvert: true, niveauCible: 'seance', cycleIdCible: cycle.id, leconIdCible: lecon.id, ecolesClassesCibles: [classeSelectionneeVue],
                                  champsPersonnalises: modeleFiche.champsPersoLabels.map((label, i) => ({ id: Date.now() + i, label, valeur: '' }))
                                }))} className="bouton bouton-secondaire" style={{ fontSize: '11px', width: '100%', borderStyle: 'dashed' }}>
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
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Bibliothèque & Base de Données Permanente</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Filtrez par année et par classe pour rechercher, télécharger, consulter et réutiliser vos fiches.</p>
              </div>
            </div>

            <div style={styles.bibliothequeFilterBox}>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.labelFiltre}>Année Scolaire</label>
                <select value={filtreBiblioAnnee} onChange={(e) => setFiltreBiblioAnnee(e.target.value)} className="champ-saisie">
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.labelFiltre}>Classe</label>
                <select value={filtreBiblioClasse} onChange={(e) => setFiltreBiblioClasse(e.target.value)} className="champ-saisie">
                  <option value="TOUTES">Toutes les classes</option>
                  {(classesActivesValidees || []).map(cl => <option key={cl} value={cl}>{cl}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 240px' }}>
                <label style={styles.labelFiltre}>Recherche</label>
                <input type="text" placeholder="Titre, habileté..." value={filtreBiblioTexte} onChange={(e) => setFiltreBiblioTexte(e.target.value)} className="champ-saisie" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              {(bibliothequeFiltree || []).length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Aucune fiche trouvée.</p>
              ) : (
                (bibliothequeFiltree || []).map(b => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>{b.classe}</span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{b.nom}</strong>
                      </div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Cycle : {b.cycleAssocie} | Leçon : {b.leconAssociee}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => telechargerFicheSeancePDF(b, { titre: b.leconAssociee }, { titre: b.cycleAssocie })} className="bouton bouton-principal" style={{ padding: '6px 12px', fontSize: '11px' }}>📥 Télécharger</button>
                      <button onClick={() => setModalConsulterReutiliser({
                        ouvert: true,
                        item: b,
                        donneesModifiees: { nom: b.nom, habilites: b.habilites, contenus: b.contenus, exercices: b.exercices, evaluations: b.evaluations },
                        classesSelectionnees: [],
                        datesParClasse: {}
                      })} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '11px' }}>👁️ Consulter et Réutiliser</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ONGLET : GESTION DES ÉCOLES & AFFILIATIONS */}
        {activeTab === 'affiliation' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px 0' }}>Gestion de vos Établissements & Affiliations</h2>
            
            {modeSansAffiliation && (
              <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fefce8', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <h3 style={{ fontSize: '15px', color: '#92400e', marginTop: 0, marginBottom: '12px' }}>🛠️ Vos Classes Autonomes (Mode Sans Affiliation)</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                  {(classesSansAffiliation || []).map(cl => (
                    <span key={cl} style={{ backgroundColor: '#fde68a', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                      {cl}
                      <button onClick={() => supprimerClasseLibre(cl)} style={{ border: 'none', background: 'transparent', color: '#b45309', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>✕</button>
                    </span>
                  ))}
                  {(classesSansAffiliation || []).length === 0 && <span style={{ fontSize: '12px', color: '#b45309' }}>Aucune classe autonome configurée.</span>}
                </div>
                <form onSubmit={ajouterClasseLibre} style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" value={nouvelleClasseLibre} onChange={(e) => setNouvelleClasseLibre(e.target.value)} placeholder="Nom de la nouvelle classe (ex: Terminale D)..." className="champ-saisie" style={{ flex: 1, borderColor: '#fcd34d' }} />
                  <button type="submit" className="bouton bouton-succes">Ajouter</button>
                </form>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(affiliations || []).length === 0 ? (
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#94a3b8' }}>Aucune école affiliée pour le moment (Mode sans affiliation actif).</p>
              ) : (
                (affiliations || []).map(aff => aff ? (
                  <div key={aff.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <strong>{aff.ecole}</strong> ({aff.statut})<br/>
                      <small style={{ color: '#64748b' }}>Classes : {(aff.classes || []).join(', ')}</small>
                    </div>
                    <div>
                      <button onClick={() => setModalConfirmationQuitter({ ouvert: true, affiliationId: aff.id, ecoleNom: aff.ecole })} className="bouton bouton-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>
                        Quitter cette école
                      </button>
                    </div>
                  </div>
                ) : null)
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
  mainContentBody: { padding: '30px', maxWidth: '1280px', margin: '0 auto', position: 'relative' },
  notificationDropdown: { position: 'absolute', top: '44px', right: 0, backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', width: '300px', zIndex: 100, padding: '10px' },
  dropdownHeader: { padding: '4px 8px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
  notifItem: { backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '12px', marginBottom: '4px' },
  toastSuccess: { backgroundColor: '#1e293b', color: '#f8fafc', padding: '14px 22px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: '600', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  grilleClasses: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '16px' },
  carteClasseItem: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s ease' },
  cardWide: { backgroundColor: '#ffffff', padding: '32px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' },
  modalCard: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '14px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' },
  labelFiltre: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' },
  bibliothequeFilterBox: { display: 'flex', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
  pastille-alerte: { backgroundColor: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '999px', fontSize: '10px', fontWeight: '700' }
};
