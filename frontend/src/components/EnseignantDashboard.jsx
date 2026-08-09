import React, { useState, useMemo, useRef, useEffect } from 'react';

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

  // --- MENU BURGER FLUIDE ---
  const [menuBurgerOuvert, setMenuBurgerOuvert] = useState(false);
  const menuBurgerRef = useRef(null);

  // --- MODALE DE CONFIRMATION DE DÉCONNEXION ---
  const [modalDeconnexion, setModalDeconnexion] = useState(false);

  // --- SÉCURITÉ : MOT DE PASSE (MODIFIÉ DEPUIS LE PROFIL) ---
  const [modalSecurite, setModalSecurite] = useState(false);
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');

  // --- RAPPORTS DE SÉANCE ---
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

  const quitterEcole = (idAff) => {
    const updated = Array.isArray(affiliations) ? affiliations.filter(a => a.id !== idAff) : [];
    setAffiliations(updated);
    if (updated.length === 0) {
      setModeSansAffiliation(true);
      showToast("⚠️ Passage en mode sans affiliation.");
    } else {
      showToast("⚠️ Affiliation rompue avec cet établissement.");
    }
  };

  const accepterProposition = (prop) => {
    if (!prop) return;
    const nouvelleAff = {
      id: Date.now(),
      ecole: prop.ecole,
      statut: 'Validée',
      classes: prop.classes || []
    };
    setAffiliations(prev => [...(Array.isArray(prev) ? prev : []), nouvelleAff]);
    setPropositionsCenseur(prev => Array.isArray(prev) ? prev.filter(p => p.id !== prop.id) : []);
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
              setTimeout(function() {
                window.print(); 
              }, 300);
            }
          </script>
        </body>
      </html>
    `);
    fenetreImpression.document.close();
    showToast(`📥 Document "${titreEntite}" prêt à l'impression / téléchargement !`);
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

  const telechargerProgrammeAnnuelPDF = (progClasse, classeNom) => {
    let htmlContent = '<h3 style="color: #0f172a; font-size: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Programme Annuel Complet</h3>';
    if (progClasse && Array.isArray(progClasse.cycles)) {
      progClasse.cycles.forEach(cy => {
        htmlContent += `<div style="margin-top: 15px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc;">`;
        htmlContent += `<h4 style="margin: 0 0 6px 0; color: #2563eb; font-size: 14px;">📁 ${cy.titre} (Du ${cy.dateDebut} au ${cy.dateFin})</h4>`;
        htmlContent += `<p style="margin: 0 0 8px 0; font-size: 12px;"><strong>Compétence :</strong> ${cy.competence}</p>`;
        if (Array.isArray(cy.lecons)) {
          cy.lecons.forEach(lc => {
            htmlContent += `<div style="margin-left: 10px; margin-top: 8px; border-top: 1px dashed #cbd5e1; paddingTop: 6px;">`;
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
          
          {/* BOUTON PROFIL COMPACT (HARMONISÉ) */}
          <div style={{ position: 'relative' }} ref={profilRef}>
            <button onClick={() => setProfilOuvert(!profilOuvert)} style={styles.navbarTeacherClickableBlockCompact}>
              <div style={styles.avatarNavbarContainerCompact}>
                {infosEnseignant.photoProfil ? <img src={infosEnseignant.photoProfil} alt="Profil" style={styles.avatarNavbarImg} /> : <div style={{ fontSize: '14px' }}>👤</div>}
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#ffffff' }}>{infosEnseignant.nom}</span>
            </button>

            {profilOuvert && (
              <div style={{ ...styles.dropdownAbsolu, left: 0 }}>
                <div style={styles.dropdownHeader}>Mon Compte Enseignant</div>
                <button type="button" onClick={() => { setFormProfil({ ...infosEnseignant }); setModalProfilOuvert(true); setProfilOuvert(false); }} style={styles.optionMenu}>⚙️ Modifier mon profil</button>
                <button type="button" onClick={() => { setModalSecurite(true); setProfilOuvert(false); }} style={styles.optionMenu}>🔒 Changer mot de passe</button>
                <button type="button" onClick={() => { setModalPromotion(true); setProfilOuvert(false); }} style={{ ...styles.optionMenu, color: '#8b5cf6', fontWeight: '800' }}>🎓 Devenir Censeur</button>
                <button type="button" onClick={() => { if (!modeSansAffiliation) { setModalPaiement(true); } else { setModeSansAffiliation(false); showToast("Mode sans affiliation désactivé."); } setProfilOuvert(false); }} style={{ ...styles.optionMenu, color: '#d97706', fontWeight: '800' }}>{modeSansAffiliation ? '🔄 Quitter mode libre' : '💳 Activer Mode Libre'}</button>
              </div>
            )}
          </div>

          {/* LOGO RECENTRÉ IDENTIQUE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '16px' }}>📖</span>
            <span style={{ fontWeight: '800', fontSize: '13px', color: '#ffffff', letterSpacing: '0.3px' }}>E-cahier !</span>
          </div>

          {/* DROITE : NOTIFICATIONS & BURGER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button onClick={() => setNotifOuvert(!notifOuvert)} style={styles.navDarkBtnCompact}>
                <span>🔔</span>
                {Array.isArray(notifications) && notifications.filter(n => !n.lu).length > 0 && <span style={styles.pastilleAlerte}>{notifications.filter(n => !n.lu).length}</span>}
              </button>
              {notifOuvert && (
                <div style={{ ...styles.dropdownAbsolu, right: 0, width: '280px' }}>
                  <div style={styles.dropdownHeader}>Notifications</div>
                  {Array.isArray(notifications) && notifications.map(n => (
                    <div key={n.id} style={styles.notifItem}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#334155' }}>{n.texte}</p>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                    </div>
                  ))}
                  {Array.isArray(propositionsCenseur) && propositionsCenseur.length > 0 && (
                    <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb' }}>Propositions d'affiliation :</span>
                      {propositionsCenseur.map(p => (
                        <div key={p.id} style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '8px', marginTop: '6px', fontSize: '12px', border: '1px solid #bfdbfe' }}>
                          <strong>{p.ecole}</strong> ({p.censeur})<br/>
                          <button onClick={() => accepterProposition(p)} className="bouton bouton-succes" style={{ padding: '4px 10px', fontSize: '11px', marginTop: '6px' }}>Accepter</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }} ref={menuBurgerRef}>
              <button onClick={() => setMenuBurgerOuvert(!menuBurgerOuvert)} style={styles.burgerBtnCompact}>☰</button>
              {menuBurgerOuvert && (
                <div style={{ ...styles.dropdownAbsolu, right: 0, width: '260px' }}>
                  <div style={styles.dropdownHeader}>Menu Enseignant</div>
                  <button type="button" onClick={() => { setActiveTab('cycles'); setMenuBurgerOuvert(false); }} style={styles.optionMenu}>📊 Programme Annuel</button>
                  <button type="button" onClick={() => { setActiveTab('bibliotheque'); setMenuBurgerOuvert(false); }} style={styles.optionMenu}>📁 Bibliothèque Permanente</button>
                  <button type="button" onClick={() => { setActiveTab('affiliation'); setMenuBurgerOuvert(false); }} style={styles.optionMenu}>🏫 Gestion des Écoles</button>
                  <button type="button" onClick={() => { setActiveTab('rapports'); setMenuBurgerOuvert(false); }} style={styles.optionMenu}>📝 Rapports de Séance</button>
                  <button type="button" onClick={() => { setModalAffiliation(true); setMenuBurgerOuvert(false); }} style={{ ...styles.optionMenu, color: '#16a34a', fontWeight: '800' }}>+ Demander Affiliation</button>
                  
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px' }}>
                    <button type="button" onClick={() => { setModalDeconnexion(true); setMenuBurgerOuvert(false); }} style={{ ...styles.optionMenu, color: '#ef4444', fontWeight: '900', textAlign: 'center' }}>🚪 Se déconnecter</button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      <main style={styles.mainContentBody}>
        {message && <div style={styles.toastSuccess}>{message}</div>}

        {modalDeconnexion && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🚪 Déconnexion</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Êtes-vous sûr de vouloir vous déconnecter ?</p>
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

        {champASupprimer && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '380px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>⚠️ Supprimer ce champ ?</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Action irréversible.</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setChampASupprimer(null)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={() => {
                  setChampsPersonnalises(prev => Array.isArray(prev) ? prev.filter(c => c.id !== champASupprimer) : []);
                  setChampASupprimer(null);
                  showToast("🗑️ Champ supprimé !");
                }} className="bouton bouton-danger">Supprimer</button>
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
                if (!ancienMdp || !nouveauMdp) { showToast("⚠️ Veuillez remplir tous les champs."); return; }
                showToast("🔒 Mot de passe modifié !");
                setModalSecurite(false);
                setAncienMdp('');
                setNouveauMdp('');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div><label style={styles.label}>Ancien mot de passe</label><input type="password" value={ancienMdp} onChange={e => setAncienMdp(e.target.value)} style={styles.inputStyle} required /></div>
                <div><label style={styles.label}>Nouveau mot de passe</label><input type="password" value={nouveauMdp} onChange={e => setNouveauMdp(e.target.value)} style={styles.inputStyle} required /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}><button type="button" onClick={() => setModalSecurite(false)} className="bouton bouton-secondaire">Annuler</button><button type="submit" className="bouton bouton-principal">Mettre à jour</button></div>
              </form>
            </div>
          </div>
        )}

        {modalPromotion && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🎓 Devenir Censeur</h3>
              <form onSubmit={envoyerDemandePromotionCenseur} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={styles.label}>Type d'évolution</label>
                  <select value={formPromotion.type} onChange={(e) => setFormPromotion({...formPromotion, type: e.target.value})} style={styles.inputStyle}>
                    <option value="interne">Évolution Interne</option>
                    <option value="externe">Évolution Externe (Mutation)</option>
                  </select>
                </div>
                {formPromotion.type === 'externe' && (
                  <div>
                    <label style={styles.label}>Établissement cible</label>
                    <input type="text" value={formPromotion.ecoleCible} onChange={(e) => setFormPromotion({...formPromotion, ecoleCible: e.target.value})} style={styles.inputStyle} required />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}><button type="button" onClick={() => setModalPromotion(false)} className="bouton bouton-secondaire">Annuler</button><button type="submit" className="bouton bouton-principal">Soumettre</button></div>
              </form>
            </div>
          </div>
        )}

        {modalRapport.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>📋 Soumettre un Rapport</h3>
              <form onSubmit={soumettreRapportSeance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div><label style={styles.label}>Séance concernée</label><input type="text" value={modalRapport.seanceTitre} onChange={e => setModalRapport({...modalRapport, seanceTitre: e.target.value})} style={styles.inputStyle} required /></div>
                <div><label style={styles.label}>Compte rendu / Difficultés</label><textarea value={modalRapport.contenuRapport} onChange={e => setModalRapport({...modalRapport, contenuRapport: e.target.value})} style={{ ...styles.inputStyle, height: '80px' }} required /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}><button type="button" onClick={() => setModalRapport({ ouvert: false, seanceTitre: '', ecolesCibles: [], classesCibles: [], motifReport: '', nouvelleDatePrevue: '', contenuRapport: '', difficultes: '' })} className="bouton bouton-secondaire">Annuler</button><button type="submit" className="bouton bouton-principal">Transmettre</button></div>
              </form>
            </div>
          </div>
        )}

        {modalDuplicationIntelligente.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>⚡ Duplication Intelligente</h3>
              <form onSubmit={executerDuplicationIntelligente} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.label}>Classes cibles :</label>
                  {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => (
                    <label key={cl} style={{ display: 'flex', gap: '8px', fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                      <input type="checkbox" checked={modalDuplicationIntelligente.classesCibles.includes(cl)} onChange={() => {
                        const updated = modalDuplicationIntelligente.classesCibles.includes(cl) ? modalDuplicationIntelligente.classesCibles.filter(c => c !== cl) : [...modalDuplicationIntelligente.classesCibles, cl];
                        setModalDuplicationIntelligente(prev => ({ ...prev, classesCibles: updated }));
                      }} /> {cl}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}><button type="button" onClick={() => setModalDuplicationIntelligente({ ouvert: false, itemSource: null, typeSource: '', classesCibles: [], datesParClasse: {} })} className="bouton bouton-secondaire">Annuler</button><button type="submit" className="bouton bouton-principal">Dupliquer</button></div>
              </form>
            </div>
          </div>
        )}

        {modalProfilOuvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>👤 Modifier mon profil</h3>
              <form onSubmit={handleEnregistrerProfil} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div><label style={styles.label}>Nom</label><input type="text" value={formProfil.nom} onChange={(e) => setFormProfil({...formProfil, nom: e.target.value})} style={styles.inputStyle} required /></div>
                <div><label style={styles.label}>Prénoms</label><input type="text" value={formProfil.prenoms} onChange={(e) => setFormProfil({...formProfil, prenoms: e.target.value})} style={styles.inputStyle} required /></div>
                <div><label style={styles.label}>Matière</label><input type="text" value={formProfil.matiere} onChange={(e) => setFormProfil({...formProfil, matiere: e.target.value})} style={styles.inputStyle} required /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}><button type="button" onClick={() => setModalProfilOuvert(false)} className="bouton bouton-secondaire">Annuler</button><button type="submit" className="bouton bouton-principal">Enregistrer</button></div>
              </form>
            </div>
          </div>
        )}

        {modalAffiliation && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🏫 Demande d'Affiliation</h3>
              <form onSubmit={soumettreDemandeAffiliation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div><label style={styles.label}>Nom de l'établissement</label><input type="text" value={nouvelleEcoleSaisie} onChange={(e) => setNouvelleEcoleSaisie(e.target.value)} style={styles.inputStyle} required /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}><button type="button" onClick={() => setModalAffiliation(false)} className="bouton bouton-secondaire">Annuler</button><button type="submit" className="bouton bouton-principal">Soumettre</button></div>
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
                <textarea autoFocus value={champEnEditionPleinEcran.valeurTemporaire} onChange={(e) => setChampEnEditionPleinEcran(prev => ({ ...prev, valeurTemporaire: e.target.value }))} style={{ ...styles.inputStyle, height: '45vh', resize: 'none', fontSize: '15px', padding: '16px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <button type="button" onClick={() => setChampEnEditionPleinEcran(null)} className="bouton bouton-secondaire">Annuler</button>
                <button type="button" onClick={() => {
                  setModalAssistant(prev => ({ ...prev, valeursChamps: { ...(prev.valeursChamps || {}), [champEnEditionPleinEcran.id]: champEnEditionPleinEcran.valeurTemporaire } }));
                  setChampEnEditionPleinEcran(null);
                  showToast("✨ Texte validé !");
                }} className="bouton bouton-succes" style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', padding: '10px 24px', fontWeight: '900', borderRadius: '12px', color: '#fff' }}>OK</button>
              </div>
            </div>
          </div>
        )}

        {/* ASSISTANT DE CRÉATION */}
        {modalAssistant.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>Assistant de Création</h3>
                <button onClick={() => setModalAssistant({ ...modalAssistant, ouvert: false })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                <label style={{ ...styles.label, color: '#2563eb', fontSize: '13px', marginBottom: '10px' }}>⚙️ Structure des Champs :</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                  {Array.isArray(champsPersonnalises) && champsPersonnalises.map((champ, index) => (
                    <div key={champ.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="text" value={champ.label} onChange={(e) => {
                        const val = e.target.value;
                        setChampsPersonnalises(prev => prev.map(c => c.id === champ.id ? { ...c, label: val } : c));
                      }} style={{ ...styles.inputStyle, padding: '8px' }} />
                      {champsPersonnalises.length > 1 && (
                        <button type="button" onClick={() => setChampASupprimer(champ.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '50%', width: '30px', height: '30px', fontWeight: '900', cursor: 'pointer' }}>−</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setChampsPersonnalises(prev => [...(Array.isArray(prev) ? prev : []), { id: `champ_${Date.now()}`, label: 'Nouveau champ', type: 'textarea' }])} className="bouton bouton-secondaire" style={{ fontSize: '12px' }}>+ Ajouter un champ</button>
              </div>

              <form onSubmit={gererValidationAssistant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {modalAssistant.niveauCible === 'programme_annuel' && (
                  <div>
                    <label style={styles.label}>Titre du programme</label>
                    <input type="text" value={modalAssistant.titreProgramme} onChange={(e) => setModalAssistant({...modalAssistant, titreProgramme: e.target.value})} style={styles.inputStyle} required />
                  </div>
                )}
                {modalAssistant.niveauCible === 'cycle' && (
                  <div>
                    <label style={styles.label}>Titre du cycle</label>
                    <input type="text" value={modalAssistant.titreCycle} onChange={(e) => setModalAssistant({...modalAssistant, titreCycle: e.target.value})} style={styles.inputStyle} required />
                  </div>
                )}
                {modalAssistant.niveauCible === 'lecon' && (
                  <div>
                    <label style={styles.label}>Titre de la leçon</label>
                    <input type="text" value={modalAssistant.titreLecon} onChange={(e) => setModalAssistant({...modalAssistant, titreLecon: e.target.value})} style={styles.inputStyle} required />
                  </div>
                )}
                {modalAssistant.niveauCible === 'seance' && (
                  <div>
                    <label style={styles.label}>Titre de la séance</label>
                    <input type="text" value={modalAssistant.titreSeance} onChange={(e) => setModalAssistant({...modalAssistant, titreSeance: e.target.value})} style={styles.inputStyle} required />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalAssistant({ ...modalAssistant, ouvert: false })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer</button>
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
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Programme Annuel & Classes</h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Choisissez une classe pour gérer ses programmes.</p>
                  </div>
                </div>

                <div style={styles.grilleClasses}>
                  {Array.isArray(classesActivesValidees) && classesActivesValidees.map(cl => {
                    const progExiste = programmesClasses && !!programmesClasses[cl];
                    return (
                      <div key={cl} onClick={() => { setClasseSelectionneeVue(cl); if (!progExiste) initialiserProgrammeClasse(cl); }} style={styles.carteClasseItem}>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>🏫 {cl}</span>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 12px 0' }}>
                          {progExiste && programmesClasses[cl]?.cycles ? `${programmesClasses[cl].cycles.length} cycle(s)` : 'Initialiser'}
                        </p>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb' }}>Ouvrir →</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <button onClick={() => setClasseSelectionneeVue(null)} className="bouton bouton-secondaire" style={{ marginBottom: '8px' }}>← Retour</button>
                    <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Classe : <span style={{ color: '#2563eb' }}>{classeSelectionneeVue}</span></h2>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => telechargerProgrammeAnnuelPDF(programmesClasses?.[classeSelectionneeVue], classeSelectionneeVue)} className="bouton bouton-secondaire">📥 PDF</button>
                    <button onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'programme_annuel', titreProgramme: `Prog. ${classeSelectionneeVue}`, cyclesProgramme: [{ id: Date.now(), titre: 'Cycle 1', duree: '3 semaines', nbLecons: 2 }], classesCiblesCycle: [classeSelectionneeVue] })} className="bouton bouton-principal">📊 Prog. Annuel</button>
                    <button onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'cycle' })} className="bouton bouton-principal">+ Cycle</button>
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
                              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Compétence : {cycle.competence}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => ouvrirModalEdition('cycle', cycle.id)} className="bouton bouton-secondaire" style={{ padding: '6px 10px', fontSize: '11px' }}>✏️ Modifier</button>
                            <button onClick={() => setModalDuplicationIntelligente({ ouvert: true, itemSource: cycle, typeSource: 'cycle', classesCibles: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '6px 10px', fontSize: '11px', color: '#2563eb' }}>⚡ Dupliquer</button>
                          </div>
                        </div>

                        {estCycleOuvert && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#334155', margin: 0 }}>📖 Leçons :</h4>
                              <button onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'lecon', cycleIdCible: cycle.id })} className="bouton bouton-secondaire" style={{ padding: '4px 10px', fontSize: '11px', color: '#2563eb' }}>+ Leçon</button>
                            </div>

                            {Array.isArray(cycle.lecons) && cycle.lecons.map(lecon => {
                              const estLeconOuverte = !!leconsOuvertes[lecon.id];
                              return (
                                <div key={lecon.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '14px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }} onClick={() => toggleLecon(lecon.id)}>
                                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#2563eb' }}>{estLeconOuverte ? '▼' : '▶'}</span>
                                      <h5 style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{lecon.titre}</h5>
                                    </div>
                                    <button onClick={() => ouvrirModalEdition('lecon', cycle.id, lecon.id)} className="bouton bouton-secondaire" style={{ padding: '4px 8px', fontSize: '10px' }}>✏️ Modifier</button>
                                  </div>

                                  {estLeconOuverte && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
                                      {Array.isArray(lecon.seances) && lecon.seances.map(seance => (
                                        <div key={seance.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                          <div>
                                            <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '11px' }}>Séance #{seance.numero}</span>
                                            <strong style={{ fontSize: '12px', color: '#0f172a', marginLeft: '6px' }}>{seance.titre}</strong>
                                          </div>
                                          <div style={{ display: 'flex', gap: '6px' }}>
                                            <button onClick={() => telechargerFicheSeancePDF(seance, lecon, cycle)} className="bouton bouton-principal" style={{ padding: '4px 8px', fontSize: '10px' }}>📥 PDF</button>
                                          </div>
                                        </div>
                                      ))}
                                      <button onClick={() => setModalAssistant({ ouvert: true, niveauCible: 'seance', cycleIdCible: cycle.id, leconIdCible: lecon.id })} className="bouton bouton-secondaire" style={{ fontSize: '11px', width: '100%', borderStyle: 'dashed', padding: '6px' }}>+ Séance</button>
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
            <div style={{ marginBottom: '20px' }}><h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Bibliothèque Permanente</h2></div>
            <div style={styles.bibliothequeFilterBox}>
              <div style={{ flex: '1 1 200px' }}><label style={styles.labelFiltre}>Recherche</label><input type="text" placeholder="Titre..." value={filtreBiblioTexte} onChange={(e) => setFiltreBiblioTexte(e.target.value)} style={styles.inputStyle} /></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              {bibliothequeFiltree.length === 0 ? <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Aucune fiche.</p> : bibliothequeFiltree.map(b => (
                <div key={b.id} style={styles.itemRow}>
                  <div><strong>{b.nom}</strong> ({b.classe})</div>
                  <button onClick={() => setModalConsulterReutiliser({ ouvert: true, item: b, donneesModifiees: { nom: b.nom, valeursChamps: b.valeursChamps || {} }, classesSelectionnees: [], datesParClasse: {} })} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '12px' }}>Réutiliser</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ONGLET : RAPPORTS */}
        {activeTab === 'rapports' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>📝 Rapports de Séance Transmis</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!Array.isArray(rapportsSeances) || rapportsSeances.length === 0 ? <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Aucun rapport transmis.</p> : rapportsSeances.map(r => (
                <div key={r.id} style={styles.itemRow}>
                  <div><strong>{r.seanceTitre}</strong> <span style={{ fontSize: '11px', color: '#64748b' }}>({r.date})</span><br/><p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>{r.contenuRapport}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ONGLET : AFFILIATION */}
        {activeTab === 'affiliation' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>🏫 Gestion des Écoles</h2>
              <button onClick={() => setModalAffiliation(true)} className="bouton bouton-succes">+ Demander une affiliation</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {affiliations.map(aff => (
                <div key={aff.id} style={styles.itemRow}>
                  <div><strong>{aff.ecole}</strong> ({aff.statut})</div>
                  <button onClick={() => quitterEcole(aff.id)} className="bouton bouton-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>Quitter</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b', paddingBottom: '40px' },
  darkNavbar: { backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderBottom: '1px solid #1e293b', position: 'sticky', top: '0', zIndex: 30 },
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
  
  navbarTeacherClickableBlockCompact: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', padding: '4px 10px', borderRadius: '10px', border: '1px solid #334155', cursor: 'pointer', textAlign: 'left' },
  avatarNavbarContainerCompact: { width: '26px', height: '26px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #475569', flexShrink: 0, color: '#94a3b8' },
  avatarNavbarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  navDarkBtnCompact: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '6px 10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' },
  burgerBtnCompact: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '10px', fontSize: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' },

  dropdownAbsolu: { position: 'absolute', top: '45px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', zIndex: 100, padding: '12px' },
  dropdownHeader: { padding: '6px 8px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' },
  optionMenu: { width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', color: '#334155', fontSize: '13px', fontWeight: '700', cursor: 'pointer', borderRadius: '8px', marginBottom: '4px' },
  notifItem: { backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px', fontSize: '12px', marginBottom: '6px', border: '1px solid #f1f5f9' },
  fondModale: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' },
  pastilleAlerte: { backgroundColor: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '999px', fontSize: '10px', fontWeight: '800' }
};
