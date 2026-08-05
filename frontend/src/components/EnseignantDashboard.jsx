import React, { useState, useMemo, useRef, useEffect } from 'react';

export default function EnseignantDashboard() {
  // Étape du parcours : 'inscription', 'affiliation', 'dashboard'
  const [etapeParcours, setEtapeParcours] = useState('inscription');
  const [activeTab, setActiveTab] = useState('affiliation');
  const [message, setMessage] = useState('');

  // États pour les menus déroulants et clics extérieurs
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [notifOuvert, setNotifOuvert] = useState(false);
  const [profilOuvert, setProfilOuvert] = useState(false);

  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const profilRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOuvert(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOuvert(false);
      if (profilRef.current && !profilRef.current.contains(event.target)) setProfilOuvert(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formulaire d'inscription initial (Civilités + Matière + Statut)
  const [formInscription, setFormInscription] = useState({
    civilite: 'M.',
    nom: 'Kouassi',
    prenoms: 'Jean',
    dateNaissance: '1990-05-15',
    telephone: '+225 0700000000',
    ville: 'Abidjan',
    anciennete: '1 à 5 ans',
    matiere: 'Éducation Physique et Sportive (EPS)',
    secteurEnseignement: 'Public', // 'Public' ou 'Privé'
    typeStatutPublic: 'Titulaire', // 'Titulaire', 'En attente d’un matricule', 'Contractuel'
    numeroMatricule: 'MT-123456',
    email: 'jean.kouassi@ecole.edu',
    motDePasse: ''
  });

  const [notifications, setNotifications] = useState([
    { id: 1, type: 'validation', texte: 'Le censeur a validé le "Cycle 1 : Gymnastique au sol".', lu: false, date: 'Il y a 10 min' },
    { id: 2, type: 'retard', texte: 'Rappel : Retard de remplissage constaté sur la Séance 2 (Leçon 1).', lu: false, date: 'Il y a 2h' }
  ]);

  // --- RÉPERTOIRE OFFICIEL DES CLASSES ET ÉTABLISSEMENTS SYNCHRONISÉS (PAR LE CENSEUR) ---
  const [classesOfficiellesParEtablissement] = useState({
    'Lycée Moderne d’Abidjan': [
      { id: 1, nom: '6ème A', niveau: '6ème' },
      { id: 2, nom: '6ème B', niveau: '6ème' },
      { id: 3, nom: '5ème A', niveau: '5ème' },
      { id: 4, nom: '5ème B', niveau: '5ème' },
      { id: 5, nom: '4ème A', niveau: '4ème' },
      { id: 6, nom: '3ème A', niveau: '3ème' },
      { id: 7, nom: '2nde A', niveau: '2nde' },
      { id: 8, nom: '1ère C', niveau: '1ère' }
    ],
    'Le Mota': [
      { id: 101, nom: '6e 1', niveau: '6ème' },
      { id: 102, nom: '6e 2', niveau: '6ème' },
      { id: 103, nom: '5e 1', niveau: '5ème' },
      { id: 104, nom: '1re C1', niveau: '1ère' },
      { id: 105, nom: 'Terminale A', niveau: 'Terminale' }
    ],
    'Collège Privé Saint-Jean': [
      { id: 201, nom: '6ème 1', niveau: '6ème' },
      { id: 202, nom: '6ème 2', niveau: '6ème' },
      { id: 203, nom: '5ème 1', niveau: '5ème' },
      { id: 204, nom: '4ème 1', niveau: '4ème' }
    ]
  });

  // Informations de l'enseignant après inscription
  const [infosEnseignant, setInfosEnseignant] = useState({
    ...formInscription,
    photoProfil: '',
    etablissementSaisi: 'Lycée Moderne d’Abidjan',
    classesSelectionnees: ['6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '3ème A'],
    demandeSoumise: false,
    etablissementsDisponibles: ['Lycée Moderne d’Abidjan', 'Le Mota', 'Collège Privé Saint-Jean'],
    etablissementsSelectionnes: ['Lycée Moderne d’Abidjan']
  });

  const [modalProfilOuvert, setModalProfilOuvert] = useState(false);
  const [formProfil, setFormProfil] = useState({ ...infosEnseignant });

  const [listeClassesOuverte, setListeClassesOuverte] = useState(false);

  const classesDisponiblesPourEtablissement = useMemo(() => {
    const etabTrouve = Object.keys(classesOfficiellesParEtablissement).find(
      key => key.toLowerCase() === infosEnseignant.etablissementSaisi.toLowerCase()
    );
    if (etabTrouve) {
      return classesOfficiellesParEtablissement[etabTrouve];
    }
    return [];
  }, [infosEnseignant.etablissementSaisi, classesOfficiellesParEtablissement]);

  const classesDisponiblesActuelles = useMemo(() => {
    let resultat = [];
    infosEnseignant.etablissementsSelectionnes.forEach(etab => {
      const classesEtab = classesOfficiellesParEtablissement[etab] || [];
      classesEtab.forEach(clObj => {
        if (!resultat.includes(clObj.nom)) resultat.push(clObj.nom);
      });
    });
    return resultat.length > 0 ? resultat : infosEnseignant.classesSelectionnees;
  }, [infosEnseignant.etablissementsSelectionnes, infosEnseignant.classesSelectionnees, classesOfficiellesParEtablissement]);

  // --- GESTION DE LA CLASSE SÉLECTIONNÉE POUR LA VUE DÉTAILLÉE ---
  const [classeSelectionneeVue, setClasseSelectionneeVue] = useState(null);
  const [rechercheTexte, setRechercheTexte] = useState('');

  // --- FILTRES AVANCÉS DE LA BIBLIOTHÈQUE ---
  const [filtreBiblioTexte, setFiltreBiblioTexte] = useState('');
  const [filtreBiblioClasse, setFiltreBiblioClasse] = useState('TOUTES');
  const [filtreBiblioEcole, setFiltreBiblioEcole] = useState('TOUTES');
  const [filtreBiblioAnnee, setFiltreBiblioAnnee] = useState('2025-2026');
  const [filtreBiblioMois, setFiltreBiblioMois] = useState('TOUS');
  const [filtreBiblioTrimestre, setFiltreBiblioTrimestre] = useState('TOUS');

  // --- ÉTAT DU MODAL "RÉUTILISER" DEPUIS LA BIBLIOTHÈQUE ---
  const [modalReutiliser, setModalReutiliser] = useState({
    ouvert: false,
    itemSource: null,
    classesSelectionnees: [],
    datesParClasse: {}
  });

  const [modalSuppression, setModalSuppression] = useState({ ouvert: false, type: '', id: null, titre: '', cycleIdParent: null });

  // MODAL DE MODIFICATION D'UNE SÉANCE
  const [modalEditionSeance, setModalEditionSeance] = useState({
    ouvert: false,
    sourceOrigine: 'programme',
    cycleId: null,
    leconId: null,
    seanceId: null,
    biblioId: null,
    titre: '',
    date: '',
    lieu: '',
    habilites: '',
    contenus: '',
    exercices: '',
    evaluations: '',
    classesCibleesModification: []
  });

  // --- MODAL DE DUPLICATION OPTIMISÉ (MULTI-CLASSES & DATES SPÉCIFIQUES) ---
  const [modalDuplication, setModalDuplication] = useState({ 
    ouvert: false, 
    type: null, // 'cycle', 'lecon', 'seance'
    cycleId: null, 
    leconId: null, 
    itemSource: null, 
    classesSelectionnees: [], 
    datesParClasse: {} 
  });

  // MODAL UNIQUE DE CRÉATION EN CASCADE
  const [modalAssistant, setModalAssistant] = useState({
    ouvert: false,
    typeCible: 'cycle',
    cycleParentId: null,
    leconParenteId: null,
    titreCycle: '',
    titreCompetence: '',
    dureeCycle: '',
    niveau: '6ème',
    classesCiblees: [infosEnseignant.classesSelectionnees[0] || '6ème A'],
    activite: '',
    titreLecon: '',
    dureeLecon: '',
    nombreSeancesPrevues: '4',
    titreSeance: '',
    dateSeance: '',
    lieuSeance: '',
    habilitesSeance: '',
    contenusSeance: '',
    exercicesSeance: '',
    evaluationsSeance: '',
    fichierNom: '',
    enCoursScan: false
  });

  // Structure hiérarchique
  const [cycles, setCycles] = useState([
    {
      id: 1,
      titre: 'Cycle 1 : Gymnastique au sol et coordination',
      competence: 'Traiter une situation de coordination motrice.',
      duree: '4 Semaines',
      niveau: '6ème',
      classesCiblees: ['6ème A', '6ème B'],
      activite: 'Gymnastique au sol',
      statut: 'En cours',
      lecons: [
        {
          id: 101,
          titre: 'Leçon 1 : Maîtriser les équilibres et les roulements',
          duree: '2 Semaines',
          nombreSeances: 2,
          statut: 'En cours',
          seances: [
            { 
              id: 1001, 
              numero: 1, 
              titre: 'Séance d’initiation - Roulement avant', 
              date: '2026-03-10', 
              lieu: 'Gymnase A',
              habilites: 'Savoir enrouler sa tête et pousser sur ses jambes.',
              contenus: 'Atelier sol matelas : passage du groupé au renversé.',
              exercices: 'Roulé-boulé en ligne descendante par groupes de 4.',
              evaluations: 'Observation formative de la capacité à enrouler.',
              fichiers: [{ nom: 'schema_roulement.pdf', taille: '1.2 Mo' }],
              statut: 'En cours'
            }
          ]
        }
      ]
    }
  ]);

  // Bibliothèque enrichie
  const [bibliotheque, setBibliotheque] = useState([
    { 
      id: 1, 
      type: 'seance', 
      nom: 'Séance d’initiation - Roulement avant', 
      niveau: '6ème',
      classe: '6ème A',
      ecole: 'Lycée Moderne d’Abidjan',
      annee: '2025-2026',
      mois: '03',
      trimestre: 'Trimestre 2',
      cycleAssocie: 'Cycle 1 : Gymnastique au sol et coordination',
      cycleId: 1,
      leconId: 101,
      seanceId: 1001,
      taille: '1.2 Mo', 
      date: '2026-03-10', 
      contenuResume: 'Atelier sol matelas : passage du groupé au renversé.',
      habilites: 'Savoir enrouler sa tête et pousser sur ses jambes.',
      contenus: 'Atelier sol matelas : passage du groupé au renversé.',
      exercices: 'Roulé-boulé en ligne descendante par groupes de 4.',
      evaluations: 'Observation formative de la capacité à enrouler.'
    }
  ]);

  const [modalSelectionBiblio, setModalSelectionBiblio] = useState(false);

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleValidationInscription = (e) => {
    e.preventDefault();
    if (formInscription.secteurEnseignement === 'Public' && formInscription.typeStatutPublic === 'Titulaire' && !formInscription.numeroMatricule.trim()) {
      showToast("❌ Veuillez renseigner votre numéro matricule.");
      return;
    }
    setInfosEnseignant(prev => ({ ...prev, ...formInscription }));
    setEtapeParcours('affiliation');
    showToast("✅ Compte créé avec succès ! Veuillez maintenant procéder à l'affiliation.");
  };

  const getCompleterStatus = (s) => {
    const totalChamps = 4;
    let remplis = 0;
    if (s.habilites?.trim()) remplis++;
    if (s.contenus?.trim()) remplis++;
    if (s.exercices?.trim()) remplis++;
    if (s.evaluations?.trim()) remplis++;
    if (remplis === totalChamps) return { texte: 'Complet (100%)', couleur: '#166534', fond: '#dcfce7' };
    if (remplis > 0) return { texte: `Partiel (${Math.round((remplis/totalChamps)*100)}%)`, couleur: '#92400e', fond: '#fef3c7' };
    return { texte: 'Vide (0%)', couleur: '#991b1b', fond: '#fee2e2' };
  };

  const cyclesFiltres = useMemo(() => {
    return cycles.filter(c => {
      const matchClasseVue = !classeSelectionneeVue || c.classesCiblees.includes(classeSelectionneeVue);
      const matchTexte = c.titre.toLowerCase().includes(rechercheTexte.toLowerCase()) || 
                         c.activite.toLowerCase().includes(rechercheTexte.toLowerCase()) ||
                         c.competence.toLowerCase().includes(rechercheTexte.toLowerCase());
      return matchClasseVue && matchTexte;
    });
  }, [cycles, classeSelectionneeVue, rechercheTexte]);

  const bibliothequeFiltree = useMemo(() => {
    return bibliotheque.filter(b => {
      const matchTexte = b.nom.toLowerCase().includes(filtreBiblioTexte.toLowerCase()) ||
                         b.contenuResume.toLowerCase().includes(filtreBiblioTexte.toLowerCase()) ||
                         (b.habilites && b.habilites.toLowerCase().includes(filtreBiblioTexte.toLowerCase())) ||
                         (b.contenus && b.contenus.toLowerCase().includes(filtreBiblioTexte.toLowerCase()));
      
      const matchClasse = filtreBiblioClasse === 'TOUTES' || b.classe === filtreBiblioClasse;
      const matchEcole = filtreBiblioEcole === 'TOUTES' || b.ecole === filtreBiblioEcole;
      const matchAnnee = filtreBiblioAnnee === 'TOUTES' || b.annee === filtreBiblioAnnee;
      const matchMois = filtreBiblioMois === 'TOUS' || (b.date && b.date.split('-')[1] === filtreBiblioMois);
      const matchTrimestre = filtreBiblioTrimestre === 'TOUS' || b.trimestre === filtreBiblioTrimestre;

      return matchTexte && matchClasse && matchEcole && matchAnnee && matchMois && matchTrimestre;
    });
  }, [bibliotheque, filtreBiblioTexte, filtreBiblioClasse, filtreBiblioEcole, filtreBiblioAnnee, filtreBiblioMois, filtreBiblioTrimestre]);

  const gererSelectionClasseAffiliation = (nomClasse) => {
    if (infosEnseignant.classesSelectionnees.includes(nomClasse)) {
      setInfosEnseignant({
        ...infosEnseignant,
        classesSelectionnees: infosEnseignant.classesSelectionnees.filter(c => c !== nomClasse)
      });
    } else {
      setInfosEnseignant({
        ...infosEnseignant,
        classesSelectionnees: [...infosEnseignant.classesSelectionnees, nomClasse]
      });
    }
  };

  const soumettreAffiliation = (e) => {
    e.preventDefault();
    if (!infosEnseignant.etablissementSaisi.trim()) {
      showToast("Veuillez indiquer le nom de l'établissement.");
      return;
    }
    if (infosEnseignant.classesSelectionnees.length === 0) {
      showToast("Veuillez sélectionner au moins une classe en charge.");
      return;
    }

    setInfosEnseignant({ ...infosEnseignant, demandeSoumise: true });
    showToast("🚀 Demande d'affiliation transmise au Censeur/Direction avec succès !");
  };

  const handleEnregistrerProfil = (e) => {
    e.preventDefault();
    setInfosEnseignant({ ...formProfil });
    setModalProfilOuvert(false);
    showToast("Profil mis à jour avec succès !");
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

  const handleValiderAssistant = (e) => {
    e.preventDefault();
    const { typeCible, cycleParentId, leconParenteId, titreCycle, titreCompetence, dureeCycle, niveau, classesCiblees, activite, titreLecon, dureeLecon, nombreSeancesPrevues, titreSeance, dateSeance, lieuSeance, habilitesSeance, contenusSeance, exercicesSeance, evaluationsSeance } = modalAssistant;
    
    const classesFinales = classeSelectionneeVue ? [classeSelectionneeVue, ...classesCiblees.filter(c => c !== classeSelectionneeVue)] : classesCiblees;

    if (typeCible === 'cycle') {
      if (!titreCycle) { showToast("Veuillez renseigner le titre du cycle."); return; }
      const nouveauCycleId = Date.now();
      const nouveauCycleObj = {
        id: nouveauCycleId,
        titre: titreCycle,
        competence: titreCompetence || 'Compétence générale',
        duree: dureeCycle || 'Non spécifiée',
        niveau,
        classesCiblees: classesFinales.length > 0 ? classesFinales : [infosEnseignant.classesSelectionnees[0]],
        activite: activite || 'Activité physique',
        statut: 'En cours',
        lecons: []
      };
      setCycles([...cycles, nouveauCycleObj]);
      showToast("Cycle créé avec succès !");
    } 
    else if (typeCible === 'lecon') {
      if (!titreLecon) { showToast("Veuillez renseigner le titre de la leçon."); return; }
      const targetCycleId = cycleParentId || cycles[0]?.id;
      if (!targetCycleId) { showToast("Veuillez d'abord créer ou sélectionner un cycle."); return; }

      const nouvelleLeconId = Date.now();
      setCycles(cycles.map(c => c.id === Number(targetCycleId) ? {
        ...c,
        lecons: [...c.lecons, { id: nouvelleLeconId, titre: titreLecon, duree: dureeLecon || '1 Semaine', nombreSeances: parseInt(nombreSeancesPrevues) || 4, statut: 'En cours', seances: [] }]
      } : c));
      showToast("Leçon créée avec succès !");
    } 
    else if (typeCible === 'seance') {
      if (!titreSeance) { showToast("Veuillez renseigner le titre de la séance."); return; }
      const targetCycleId = cycleParentId || cycles[0]?.id;
      const cycleObj = cycles.find(c => c.id === Number(targetCycleId));
      if (!cycleObj) { showToast("Veuillez configurer un cycle."); return; }

      let targetLeconId = leconParenteId || cycleObj.lecons[0]?.id;
      if (!targetLeconId) { showToast("Veuillez d'abord créer une leçon dans ce cycle."); return; }

      const nouvelleSeanceId = Date.now();
      const dateDuJour = dateSeance || new Date().toISOString().split('T')[0];
      const moisExtrait = dateDuJour.split('-')[1];

      setCycles(cycles.map(c => {
        if (c.id === Number(targetCycleId)) {
          return {
            ...c,
            lecons: c.lecons.map(l => {
              if (l.id === Number(targetLeconId)) {
                return {
                  ...l,
                  seances: [...l.seances, {
                    id: nouvelleSeanceId,
                    numero: l.seances.length + 1,
                    titre: titreSeance,
                    date: dateDuJour,
                    lieu: lieuSeance || 'Non spécifié',
                    habilites: habilitesSeance || '',
                    contenus: contenusSeance || '',
                    exercices: exercicesSeance || '',
                    evaluations: evaluationsSeance || '',
                    fichiers: [{ nom: 'document_seance.pdf', taille: '0.9 Mo' }],
                    statut: 'En cours'
                  }]
                };
              }
              return l;
            })
          };
        }
        return c;
      }));

      const nouvelElementBiblio = {
        id: Date.now() + 1,
        type: 'seance',
        nom: titreSeance,
        niveau: cycleObj.niveau,
        classe: classeSelectionneeVue || cycleObj.classesCiblees[0] || '6ème A',
        ecole: infosEnseignant.etablissementSaisi || 'Lycée Moderne d’Abidjan',
        annee: '2025-2026',
        mois: moisExtrait,
        trimestre: 'Trimestre 2',
        cycleAssocie: cycleObj.titre,
        cycleId: Number(targetCycleId),
        leconId: Number(targetLeconId),
        seanceId: nouvelleSeanceId,
        taille: '1.2 Mo',
        date: dateDuJour,
        contenuResume: contenusSeance || 'Séance créée',
        habilites: habilitesSeance,
        contenus: contenusSeance,
        exercices: exercicesSeance,
        evaluations: evaluationsSeance
      };
      setBibliotheque(prev => [...prev, nouvelElementBiblio]);
      showToast("Séance créée et ajoutée à la bibliothèque avec succès !");
    }

    setModalAssistant({
      ouvert: false, typeCible: 'cycle', cycleParentId: null, leconParenteId: null,
      titreCycle: '', titreCompetence: '', dureeCycle: '', niveau: '6ème',
      classesCiblees: [infosEnseignant.classesSelectionnees[0]], activite: '',
      titreLecon: '', dureeLecon: '', nombreSeancesPrevues: '4',
      titreSeance: '', dateSeance: '', lieuSeance: '', habilitesSeance: '',
      contenusSeance: '', exercicesSeance: '', evaluationsSeance: '', fichierNom: '', enCoursScan: false
    });
  };

  const executerReutilisation = () => {
    const { itemSource, classesSelectionnees, datesParClasse } = modalReutiliser;
    if (classesSelectionnees.length === 0) {
      showToast("Veuillez sélectionner au moins une classe cible.");
      return;
    }

    classesSelectionnees.forEach(classeCible => {
      const dateAttribuee = datesParClasse[classeCible] || new Date().toISOString().split('T')[0];
      const moisExtrait = dateAttribuee.split('-')[1] || '03';
      const nouvelleSeanceId = Date.now() + Math.random();
      
      const targetCycleId = itemSource.cycleId || cycles[0]?.id;
      const targetLeconId = itemSource.leconId || cycles[0]?.lecons[0]?.id;
      const cycleObj = cycles.find(c => c.id === targetCycleId) || cycles[0];

      setCycles(prevCycles => {
        return prevCycles.map(c => {
          if (c.id === cycleObj.id) {
            return {
              ...c,
              classesCiblees: Array.from(new Set([...c.classesCiblees, classeCible])),
              lecons: c.lecons.map(l => {
                if (l.id === targetLeconId || l === c.lecons[0]) {
                  return {
                    ...l,
                    seances: [
                      ...l.seances,
                      {
                        id: nouvelleSeanceId,
                        numero: l.seances.length + 1,
                        titre: `${itemSource.nom} (${classeCible})`,
                        date: dateAttribuee,
                        lieu: 'Gymnase / Salle',
                        habilites: itemSource.habilites,
                        contenus: itemSource.contenus,
                        exercices: itemSource.exercices,
                        evaluations: itemSource.evaluations,
                        fichiers: [{ nom: 'document_seance.pdf', taille: '0.9 Mo' }],
                        statut: 'En cours'
                      }
                    ]
                  };
                }
                return l;
              })
            };
          }
          return c;
        });
      });

      const nouvelElementBiblio = {
        id: Date.now() + Math.random(),
        type: 'seance',
        nom: `${itemSource.nom} (${classeCible})`,
        niveau: itemSource.niveau || '6ème',
        classe: classeCible,
        ecole: infosEnseignant.etablissementSaisi || 'Lycée Moderne d’Abidjan',
        annee: '2025-2026',
        mois: moisExtrait,
        trimestre: 'Trimestre 2',
        cycleAssocie: cycleObj.titre,
        cycleId: cycleObj.id,
        leconId: targetLeconId,
        seanceId: nouvelleSeanceId,
        taille: '1.0 Mo',
        date: dateAttribuee,
        contenuResume: itemSource.contenus || 'Séance réutilisée',
        habilites: itemSource.habilites,
        contenus: itemSource.contenus,
        exercices: itemSource.exercices,
        evaluations: itemSource.evaluations
      };
      setBibliotheque(prev => [...prev, nouvelElementBiblio]);
    });

    showToast(`Séance réutilisée avec succès pour ${classesSelectionnees.length} classe(s) !`);
    setModalReutiliser({ ouvert: false, itemSource: null, classesSelectionnees: [], datesParClasse: {} });
  };

  const executerDuplicationOptimisee = () => {
    const { type, cycleId, leconId, itemSource, classesSelectionnees, datesParClasse } = modalDuplication;
    if (classesSelectionnees.length === 0) {
      showToast("Veuillez sélectionner au moins une classe cible.");
      return;
    }

    classesSelectionnees.forEach(classeCible => {
      const dateAttribuee = datesParClasse[classeCible] || new Date().toISOString().split('T')[0];
      const moisExtrait = dateAttribuee.split('-')[1] || '03';

      if (type === 'cycle') {
        const copieCycle = {
          ...itemSource,
          id: Date.now() + Math.random(),
          titre: `${itemSource.titre} (${classeCible})`,
          classesCiblees: [classeCible],
          lecons: itemSource.lecons.map(l => ({
            ...l,
            id: Date.now() + Math.random(),
            seances: l.seances.map(s => ({ ...s, id: Date.now() + Math.random(), date: dateAttribuee }))
          }))
        };
        setCycles(prev => [...prev, copieCycle]);
      } 
      else if (type === 'lecon') {
        const nouvelleLeconId = Date.now() + Math.random();
        setCycles(prevCycles => {
          return prevCycles.map(c => {
            if (c.id === cycleId) {
              return {
                ...c,
                classesCiblees: Array.from(new Set([...c.classesCiblees, classeCible])),
                lecons: [
                  ...c.lecons,
                  {
                    ...itemSource,
                    id: nouvelleLeconId,
                    titre: `${itemSource.titre} (${classeCible})`,
                    seances: itemSource.seances.map(s => ({ ...s, id: Date.now() + Math.random(), date: dateAttribuee }))
                  }
                ]
              };
            }
            return c;
          });
        });
      } 
      else if (type === 'seance') {
        const nouvelleSeanceId = Date.now() + Math.random();
        const cycleObj = cycles.find(c => c.id === cycleId);

        setCycles(prevCycles => {
          return prevCycles.map(c => {
            if (c.id === cycleId) {
              return {
                ...c,
                classesCiblees: Array.from(new Set([...c.classesCiblees, classeCible])),
                lecons: c.lecons.map(l => {
                  if (l.id === leconId) {
                    return {
                      ...l,
                      seances: [
                        ...l.seances,
                        {
                          ...itemSource,
                          id: nouvelleSeanceId,
                          numero: l.seances.length + 1,
                          titre: `${itemSource.titre} (${classeCible})`,
                          date: dateAttribuee,
                          statut: 'En cours'
                        }
                      ]
                    };
                  }
                  return l;
                })
              };
            }
            return c;
          });
        });

        const nouvelleBiblioItem = {
          id: Date.now() + Math.random(),
          type: 'seance',
          nom: `${itemSource.titre} (${classeCible})`,
          niveau: cycleObj ? cycleObj.niveau : '6ème',
          classe: classeCible,
          ecole: infosEnseignant.etablissementSaisi || 'Lycée Moderne d’Abidjan',
          annee: '2025-2026',
          mois: moisExtrait,
          trimestre: 'Trimestre 2',
          cycleAssocie: cycleObj ? cycleObj.titre : 'Cycle Général',
          cycleId: cycleId,
          leconId: leconId,
          seanceId: nouvelleSeanceId,
          taille: '1.0 Mo',
          date: dateAttribuee,
          contenuResume: itemSource.contenus || 'Séance dupliquée',
          habilites: itemSource.habilites,
          contenus: itemSource.contenus,
          exercices: itemSource.exercices,
          evaluations: itemSource.evaluations
        };
        setBibliotheque(prev => [...prev, nouvelleBiblioItem]);
      }
    });

    showToast(`Duplication réussie pour ${classesSelectionnees.length} classe(s) !`);
    setModalDuplication({ ouvert: false, type: null, cycleId: null, leconId: null, itemSource: null, classesSelectionnees: [], datesParClasse: {} });
  };

  const marquerSeanceTerminee = (cycleId, leconId, seanceId) => {
    setCycles(cycles.map(c => c.id === cycleId ? {
      ...c,
      lecons: c.lecons.map(l => l.id === leconId ? {
        ...l,
        seances: l.seances.map(s => s.id === seanceId ? { ...s, statut: 'Terminée' } : s)
      } : l)
    } : c));
    showToast("Séance marquée comme terminée !");
  };

  const marquerLeconTerminee = (cycleId, leconId) => {
    setCycles(cycles.map(c => c.id === cycleId ? {
      ...c,
      lecons: c.lecons.map(l => l.id === leconId ? { ...l, statut: 'Terminé', seances: l.seances.map(s => ({ ...s, statut: 'Terminée' })) } : l)
    } : c));
    showToast("Leçon terminée avec succès !");
  };

  const marquerCycleTermine = (cycleId) => {
    setCycles(cycles.map(c => c.id === cycleId ? {
      ...c,
      statut: 'Terminé',
      lecons: c.lecons.map(l => ({ ...l, statut: 'Terminé', seances: l.seances.map(s => ({ ...s, statut: 'Terminée' })) }))
    } : c));
    showToast("Cycle clôturé et terminé avec succès !");
  };

  const simulerScanFichierAssistant = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setModalAssistant(prev => ({ ...prev, fichierNom: file.name, enCoursScan: true }));

    setTimeout(() => {
      setModalAssistant(prev => ({
        ...prev,
        enCoursScan: false,
        titreSeance: `Séance extraite (${file.name.split('.')[0]})`,
        habilitesSeance: 'Maîtrise des fondamentaux et respect des consignes.',
        contenusSeance: 'Mise en place des ateliers pratiques et consignes de sécurité.',
        exercicesSeance: 'Exercices d’application en ateliers tournants.',
        evaluationsSeance: 'Grille d’observation formative.'
      }));
      showToast("Numérisation et extraction des données réussies !");
    }, 2000);
  };

  const importerDepuisBibliotheque = (elementBiblio) => {
    setModalAssistant(prev => ({
      ...prev,
      typeCible: 'seance',
      titreSeance: elementBiblio.nom,
      habilitesSeance: elementBiblio.habilites || '',
      contenusSeance: elementBiblio.contenus || '',
      exercicesSeance: elementBiblio.exercices || '',
      evaluationsSeance: elementBiblio.evaluations || ''
    }));
    setModalSelectionBiblio(false);
    showToast("Données de la séance chargées depuis la bibliothèque !");
  };

  const ouvrirEditionSeance = (cycleId, leconId, seance, source = 'programme', biblioId = null) => {
    const cycleTrouve = cycles.find(c => c.id === cycleId);
    const classesAssocieesCycle = cycleTrouve ? cycleTrouve.classesCiblees : [infosEnseignant.classesSelectionnees[0]];

    setModalEditionSeance({
      ouvert: true,
      sourceOrigine: source,
      cycleId,
      leconId,
      seanceId: seance.id,
      biblioId,
      titre: seance.titre,
      date: seance.date,
      lieu: seance.lieu || '',
      habilites: seance.habilites || '',
      contenus: seance.contenus || '',
      exercices: seance.exercices || '',
      evaluations: seance.evaluations || '',
      classesCibleesModification: [...classesAssocieesCycle]
    });
  };

  const sauvegarderEditionSeance = (e) => {
    e.preventDefault();
    const { cycleId, leconId, seanceId, biblioId, titre, date, lieu, habilites, contenus, exercices, evaluations, classesCibleesModification } = modalEditionSeance;

    setCycles(prevCycles => {
      return prevCycles.map(c => {
        if (c.id === cycleId) {
          return {
            ...c,
            lecons: c.lecons.map(l => {
              if (l.id === leconId) {
                return {
                  ...l,
                  seances: l.seances.map(s => {
                    if (s.id === seanceId) {
                      return { ...s, titre, date, lieu, habilites, contenus, exercices, evaluations };
                    }
                    return s;
                  })
                };
              }
              return l;
            })
          };
        }
        return c;
      });
    });

    if (classesCibleesModification.length > 0) {
      setCycles(prevCycles => {
        return prevCycles.map(c => {
          const correspondClasseCible = c.classesCiblees.some(cl => classesCibleesModification.includes(cl));
          if (correspondClasseCible) {
            return {
              ...c,
              classesCiblees: Array.from(new Set([...c.classesCiblees, ...classesCibleesModification])),
              lecons: c.lecons.map(l => ({
                ...l,
                seances: l.seances.map(s => {
                  if (s.id === seanceId || s.titre === titre) {
                    return { ...s, titre, habilites, contenus, exercices, evaluations, lieu };
                  }
                  return s;
                })
              }))
            };
          }
          return c;
        });
      });
    }

    setBibliotheque(prevBiblio => {
      return prevBiblio.map(b => {
        if ((biblioId && b.id === biblioId) || (b.seanceId === seanceId)) {
          return { ...b, nom: titre, habilites, contenus, exercices, evaluations, contenuResume: contenus || b.contenuResume };
        }
        return b;
      });
    });

    setModalEditionSeance({ ouvert: false, sourceOrigine: 'programme', cycleId: null, leconId: null, seanceId: null, biblioId: null, titre: '', date: '', lieu: '', habilites: '', contenus: '', exercices: '', evaluations: '', classesCibleesModification: [] });
    showToast("Séance modifiée avec succès et propagée !");
  };

  const confirmerSuppression = () => {
    const { type, id, cycleIdParent } = modalSuppression;
    if (type === 'cycle') {
      setCycles(cycles.filter(c => c.id !== id));
      showToast("Cycle supprimé.");
    } else if (type === 'lecon') {
      setCycles(cycles.map(c => c.id === cycleIdParent ? { ...c, lecons: c.lecons.filter(l => l.id !== id) } : c));
      showToast("Leçon supprimée.");
    }
    setModalSuppression({ ouvert: false, type: '', id: null, titre: '', cycleIdParent: null });
  };

  return (
    <div style={styles.container}>
      <style>{`
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        
        @keyframes apparition { from { opacity: 0; } to { opacity: 1; } }
        @keyframes glissement { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        
        .anim-apparition { animation: apparition 0.3s ease-out forwards; }
        .anim-modale { animation: glissement 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        .bouton { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: none; transition: all 0.2s ease; }
        .bouton-principal { background-color: #2563eb; color: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .bouton-principal:hover { background-color: #1d4ed8; transform: translateY(-1px); }
        
        .bouton-succes { background-color: #16a34a; color: white; }
        .bouton-succes:hover { background-color: #15803d; }
        
        .bouton-danger { background-color: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
        .bouton-danger:hover { background-color: #fecaca; }
        
        .bouton-secondaire { background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
        .bouton-secondaire:hover { background-color: #e2e8f0; color: #0f172a; }

        .champ-saisie { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; background-color: #fff; color: #1e293b; outline: none; transition: border-color 0.2s; }
        .champ-saisie:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); }
        
        .option-menu { width: 100%; text-align: left; padding: 10px 16px; background: transparent; border: none; color: #334155; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .option-menu:hover { background-color: #f1f5f9; color: #0f172a; padding-left: 20px; }
        .option-menu.actif { background-color: #e0f2fe; color: #0369a1; }
        
        .ligne-tableau { transition: background-color 0.2s; border-bottom: 1px solid #f1f5f9; }
        .ligne-tableau:hover { background-color: #f8fafc; }

        .fond-modale { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justifyContent: center; align-items: center; z-index: 1000; }
        .pastille-alerte { background-color: #ef4444; color: white; padding: 2px 6px; border-radius: 999px; font-size: 10px; font-weight: 700; }
      `}</style>

      {/* BARRE SUPÉRIEURE NOIRE (AFFICHÉE QUAND LE COMPTE EST CRÉÉ) */}
      {etapeParcours !== 'inscription' && (
        <header style={styles.darkNavbar}>
          <div style={styles.topBarMainRow}>
            <h1 style={styles.navbarAppTitle}>Cahier de Texte Pédagogique</h1>
          </div>

          <div style={styles.bottomBarRow}>
            {/* BLOC PROFIL CLIQUABLE */}
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
                  <span style={styles.navbarTeacherName}>{infosEnseignant.civilite} {infosEnseignant.nom} {infosEnseignant.prenoms}</span>
                  <span style={styles.navbarTeacherDetails}>
                    {infosEnseignant.ville} - {infosEnseignant.etablissementSaisi || 'Aucun établissement'} ({infosEnseignant.matiere})
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '4px' }}>{profilOuvert ? '▲' : '▼'}</span>
              </button>

              {profilOuvert && (
                <div style={{ ...styles.notificationDropdown, width: '280px', left: 0, top: '50px' }} className="anim-apparition">
                  <div style={styles.dropdownHeader}>Mon Compte & Établissement</div>
                  <div style={{ padding: '8px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #e2e8f0', marginBottom: '6px' }}>
                    <strong>{infosEnseignant.civilite} {infosEnseignant.nom} {infosEnseignant.prenoms}</strong><br />
                    <span style={{ color: '#64748b', fontSize: '11px' }}>
                      {infosEnseignant.ville} - {infosEnseignant.etablissementSaisi || 'Non rattaché'}<br />
                      <em>{infosEnseignant.matiere}</em>
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      setFormProfil({ ...infosEnseignant });
                      setModalProfilOuvert(true);
                      setProfilOuvert(false);
                    }} 
                    className="option-menu"
                  >
                    ⚙️ Modifier mon profil, civilités & matière
                  </button>
                </div>
              )}
            </div>

            <div style={styles.navActionsRight}>
              {/* MENU NAVIGATION */}
              <div style={{ position: 'relative' }} ref={menuRef}>
                <button onClick={() => setMenuOuvert(!menuOuvert)} style={styles.navDarkBtn}>
                  <span>⚙️ Navigation</span>
                  <span style={{ fontSize: '10px' }}>{menuOuvert ? '▲' : '▼'}</span>
                </button>
                {menuOuvert && (
                  <div style={styles.multitaskDropdown} className="anim-apparition">
                    <button onClick={() => { setActiveTab('affiliation'); setMenuOuvert(false); }} className={`option-menu ${activeTab === 'affiliation' ? 'actif' : ''}`}>🏫 Demande d'Affiliation</button>
                    <button onClick={() => { setActiveTab('cycles'); setMenuOuvert(false); }} className={`option-menu ${activeTab === 'cycles' ? 'actif' : ''}`}>📊 Mes Classes & Programmes</button>
                    <button onClick={() => { setActiveTab('bibliotheque'); setMenuOuvert(false); }} className={`option-menu ${activeTab === 'bibliotheque' ? 'actif' : ''}`}>📁 Bibliothèque & Base de Données</button>
                  </div>
                )}
              </div>

              {/* NOTIFICATIONS */}
              <div style={{ position: 'relative' }} ref={notifRef}>
                <button onClick={() => setNotifOuvert(!notifOuvert)} style={styles.navDarkBtn}>
                  <span>🔔 Notifications</span>
                  {notifications.filter(n => !n.lu).length > 0 && <span className="pastille-alerte">{notifications.filter(n => !n.lu).length}</span>}
                </button>
                {notifOuvert && (
                  <div style={styles.notificationDropdown} className="anim-apparition">
                    <div style={styles.dropdownHeader}>Suivi Censeur</div>
                    {notifications.map(n => (
                      <div key={n.id} style={styles.notifItem}>
                        <p style={{ margin: 0, fontSize: '12px', color: '#334155' }}>{n.texte}</p>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* CONTENU PRINCIPAL */}
      <main style={styles.mainContentBody}>
        {message && <div style={styles.toastSuccess} className="anim-apparition">{message}</div>}

        {/* --- ÉTAPE 1 : CRÉATION DU COMPTE INITIAL (CIVILITÉS + MATIÈRE + STATUT) --- */}
        {etapeParcours === 'inscription' && (
          <div style={{ maxWidth: '580px', margin: '20px auto', backgroundColor: '#ffffff', padding: '36px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }} className="anim-apparition">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '40px' }}>📝</span>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '10px 0 6px 0' }}>Création de Compte - Enseignant</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Renseignez vos civilités et votre matière enseignée pour configurer votre profil[span_3](start_span)[span_3](end_span).
              </p>
            </div>

            <form onSubmit={handleValidationInscription} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={styles.label}>Civilité</label>
                  <select value={formInscription.civilite} onChange={(e) => setFormInscription({...formInscription, civilite: e.target.value})} className="champ-saisie">
                    <option value="M.">M.</option>
                    <option value="Mme">Mme</option>
                    <option value="Dr">Dr</option>
                    <option value="Pr">Pr</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Nom</label>
                  <input type="text" value={formInscription.nom} onChange={(e) => setFormInscription({...formInscription, nom: e.target.value})} placeholder="Ex: Kouassi" className="champ-saisie" required />
                </div>
              </div>

              <div>
                <label style={styles.label}>Prénoms</label>
                <input type="text" value={formInscription.prenoms} onChange={(e) => setFormInscription({...formInscription, prenoms: e.target.value})} placeholder="Ex: Jean" className="champ-saisie" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={styles.label}>Date de naissance</label>
                  <input type="date" value={formInscription.dateNaissance} onChange={(e) => setFormInscription({...formInscription, dateNaissance: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label style={styles.label}>Téléphone / WhatsApp</label>
                  <input type="text" value={formInscription.telephone} onChange={(e) => setFormInscription({...formInscription, telephone: e.target.value})} placeholder="+225..." className="champ-saisie" required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={styles.label}>Matière enseignée</label>
                  <input type="text" value={formInscription.matiere} onChange={(e) => setFormInscription({...formInscription, matiere: e.target.value})} placeholder="Ex: Mathématiques, EPS..." className="champ-saisie" required />
                </div>
                <div>
                  <label style={styles.label}>Ancienneté</label>
                  <select value={formInscription.anciennete} onChange={(e) => setFormInscription({...formInscription, anciennete: e.target.value})} className="champ-saisie">
                    <option value="Moins d'un an">Moins d'un an</option>
                    <option value="1 à 5 ans">1 à 5 ans</option>
                    <option value="6 à 10 ans">6 à 10 ans</option>
                    <option value="Plus de 10 ans">Plus de 10 ans</option>
                  </select>
                </div>
              </div>

              {/* SECTION STATUT PUBLIC / PRIVÉ & MATRICULE */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={styles.label}>Secteur d'enseignement</label>
                  <select value={formInscription.secteurEnseignement} onChange={(e) => setFormInscription({...formInscription, secteurEnseignement: e.target.value})} className="champ-saisie">
                    <option value="Public">Public</option>
                    <option value="Privé">Privé</option>
                  </select>
                </div>

                {formInscription.secteurEnseignement === 'Public' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={styles.label}>Statut dans le Public</label>
                      <select value={formInscription.typeStatutPublic} onChange={(e) => setFormInscription({...formInscription, typeStatutPublic: e.target.value})} className="champ-saisie">
                        <option value="Titulaire">Titulaire (Avec Matricule)</option>
                        <option value="En attente de matricule">En attente d’un matricule</option>
                        <option value="Contractuel">Contractuel</option>
                      </select>
                    </div>

                    {formInscription.typeStatutPublic === 'Titulaire' && (
                      <div>
                        <label style={styles.label}>Numéro Matricule</label>
                        <input type="text" value={formInscription.numeroMatricule} onChange={(e) => setFormInscription({...formInscription, numeroMatricule: e.target.value})} placeholder="Ex: MT-XXXXXX" className="champ-saisie" required />
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '8px', backgroundColor: '#eef2f6', borderRadius: '6px', fontSize: '12px', color: '#334155', fontWeight: '600', textAlign: 'center' }}>
                    Statut enregistré : <span style={{ color: '#2563eb' }}>Privé</span>
                  </div>
                )}
              </div>

              <div>
                <label style={styles.label}>Email professionnel</label>
                <input type="email" value={formInscription.email} onChange={(e) => setFormInscription({...formInscription, email: e.target.value})} placeholder="nom@ecole.edu" className="champ-saisie" required />
              </div>

              <div>
                <label style={styles.label}>Mot de passe</label>
                <input type="password" value={formInscription.motDePasse} onChange={(e) => setFormInscription({...formInscription, motDePasse: e.target.value})} placeholder="••••••••" className="champ-saisie" required />
              </div>

              <button type="submit" className="bouton bouton-principal" style={{ marginTop: '10px', backgroundColor: '#2563eb', padding: '12px' }}>
                Valider mon inscription et continuer vers l'affiliation
              </button>
            </form>
          </div>
        )}

        {/* MODAL DE MODIFICATION D'UNE SÉANCE */}
        {modalEditionSeance.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '600px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-modale">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>✏️ Modifier la Séance & Propager</h3>
                <button onClick={() => setModalEditionSeance({ ouvert: false, sourceOrigine: 'programme', cycleId: null, leconId: null, seanceId: null, biblioId: null, titre: '', date: '', lieu: '', habilites: '', contenus: '', exercices: '', evaluations: '', classesCibleesModification: [] })} className="bouton bouton-secondaire" style={{ padding: '4px 8px' }}>✕</button>
              </div>
              <form onSubmit={sauvegarderEditionSeance} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={styles.label}>Titre de la séance</label>
                  <input type="text" value={modalEditionSeance.titre} onChange={(e) => setModalEditionSeance({...modalEditionSeance, titre: e.target.value})} className="champ-saisie" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>Date</label>
                    <input type="date" value={modalEditionSeance.date} onChange={(e) => setModalEditionSeance({...modalEditionSeance, date: e.target.value})} className="champ-saisie" />
                  </div>
                  <div>
                    <label style={styles.label}>Lieu de la séance</label>
                    <input type="text" placeholder="Ex: Gymnase, Stade..." value={modalEditionSeance.lieu} onChange={(e) => setModalEditionSeance({...modalEditionSeance, lieu: e.target.value})} className="champ-saisie" />
                  </div>
                </div>
                <div>
                  <label style={styles.label}>🎯 Habilités visées</label>
                  <textarea value={modalEditionSeance.habilites} onChange={(e) => setModalEditionSeance({...modalEditionSeance, habilites: e.target.value})} className="champ-saisie" style={{ height: '60px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={styles.label}>📚 Contenus pédagogiques</label>
                  <textarea value={modalEditionSeance.contenus} onChange={(e) => setModalEditionSeance({...modalEditionSeance, contenus: e.target.value})} className="champ-saisie" style={{ height: '60px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={styles.label}>⚡ Exercices</label>
                  <textarea value={modalEditionSeance.exercices} onChange={(e) => setModalEditionSeance({...modalEditionSeance, exercices: e.target.value})} className="champ-saisie" style={{ height: '60px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={styles.label}>📝 Évaluations</label>
                  <textarea value={modalEditionSeance.evaluations} onChange={(e) => setModalEditionSeance({...modalEditionSeance, evaluations: e.target.value})} className="champ-saisie" style={{ height: '60px', resize: 'vertical' }} />
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ ...styles.label, marginBottom: '8px', color: '#0f172a' }}>Propager aux autres classes :</label>
                  <div style={styles.checkboxGroup}>
                    {classesDisponiblesActuelles.map(cl => {
                      const estCoche = modalEditionSeance.classesCibleesModification.includes(cl);
                      return (
                        <label key={cl} style={styles.checkboxLabel}>
                          <input type="checkbox" checked={estCoche} onChange={() => {
                            const updated = estCoche ? modalEditionSeance.classesCibleesModification.filter(item => item !== cl) : [...modalEditionSeance.classesCibleesModification, cl];
                            setModalEditionSeance({...modalEditionSeance, classesCibleesModification: updated});
                          }} />
                          {cl}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalEditionSeance({ ouvert: false, sourceOrigine: 'programme', cycleId: null, leconId: null, seanceId: null, biblioId: null, titre: '', date: '', lieu: '', habilites: '', contenus: '', exercices: '', evaluations: '', classesCibleesModification: [] })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer & Propager</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL "RÉUTILISER" (MULTICLASSES + DATES INDIVIDUELLES) */}
        {modalReutiliser.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '540px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-modale">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>♻️ Réutiliser la séance : {modalReutiliser.itemSource?.nom}</h3>
                <button onClick={() => setModalReutiliser({ ouvert: false, itemSource: null, classesSelectionnees: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '4px 8px' }}>✕</button>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Sélectionnez les classes cibles et attribuez une date spécifique pour chacune d'elles.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <label style={styles.label}>Classes cibles :</label>
                {classesDisponiblesActuelles.map(cl => {
                  const estSelectionne = modalReutiliser.classesSelectionnees.includes(cl);
                  return (
                    <div key={cl} style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                        <input 
                          type="checkbox" 
                          checked={estSelectionne} 
                          onChange={() => {
                            const updatedClasses = estSelectionne 
                              ? modalReutiliser.classesSelectionnees.filter(c => c !== cl)
                              : [...modalReutiliser.classesSelectionnees, cl];
                            setModalReutiliser(prev => ({ ...prev, classesSelectionnees: updatedClasses }));
                          }} 
                        />
                        {cl}
                      </label>
                      {estSelectionne && (
                        <div style={{ marginTop: '8px', marginLeft: '22px' }}>
                          <label style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '4px' }}>Date pour la classe {cl} :</label>
                          <input 
                            type="date" 
                            value={modalReutiliser.datesParClasse[cl] || ''} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setModalReutiliser(prev => ({
                                ...prev,
                                datesParClasse: { ...prev.datesParClasse, [cl]: val }
                              }));
                            }} 
                            className="champ-saisie"
                            style={{ padding: '6px 10px' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setModalReutiliser({ ouvert: false, itemSource: null, classesSelectionnees: [], datesParClasse: {} })} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={executerReutilisation} className="bouton bouton-principal">Valider la réutilisation</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE MODIFICATION DU PROFIL (AVEC CIVILTÉS ET STATUT PUBLIC/PRIVÉ) */}
        {modalProfilOuvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '480px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-modale">
              <h3 style={{ margin: '0 0 14px 0', color: '#0f172a' }}>👤 Paramètres du Profil Enseignant</h3>
              
              <form onSubmit={handleEnregistrerProfil} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                    {formProfil.photoProfil ? (
                      <img src={formProfil.photoProfil} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '28px' }}>👤</span>
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>Photo (Fichier)</label>
                    <input type="file" accept="image/*" onChange={handleChangerPhotoProfil} style={{ fontSize: '11px', cursor: 'pointer' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>Civilité</label>
                    <select value={formProfil.civilite} onChange={(e) => setFormProfil({...formProfil, civilite: e.target.value})} className="champ-saisie">
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Dr">Dr</option>
                      <option value="Pr">Pr</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Nom</label>
                    <input type="text" value={formProfil.nom} onChange={(e) => setFormProfil({...formProfil, nom: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Prénoms</label>
                  <input type="text" value={formProfil.prenoms} onChange={(e) => setFormProfil({...formProfil, prenoms: e.target.value})} className="champ-saisie" required />
                </div>

                <div>
                  <label style={styles.label}>Ville</label>
                  <input type="text" value={formProfil.ville} onChange={(e) => setFormProfil({...formProfil, ville: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label style={styles.label}>Matière enseignée</label>
                  <input type="text" value={formProfil.matiere} onChange={(e) => setFormProfil({...formProfil, matiere: e.target.value})} className="champ-saisie" required />
                </div>

                {/* SECTION STATUT PUBLIC / PRIVÉ & MATRICULE */}
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>Secteur d'enseignement</label>
                    <select 
                      value={formProfil.secteurEnseignement} 
                      onChange={(e) => setFormProfil({...formProfil, secteurEnseignement: e.target.value})} 
                      className="champ-saisie"
                    >
                      <option value="Public">Public</option>
                      <option value="Privé">Privé</option>
                    </select>
                  </div>

                  {formProfil.secteurEnseignement === 'Public' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <label style={styles.label}>Statut dans le Public</label>
                        <select 
                          value={formProfil.typeStatutPublic} 
                          onChange={(e) => setFormProfil({...formProfil, typeStatutPublic: e.target.value})} 
                          className="champ-saisie"
                        >
                          <option value="Titulaire">Titulaire (Avec Matricule)</option>
                          <option value="En attente de matricule">En attente d’un matricule</option>
                          <option value="Contractuel">Contractuel</option>
                        </select>
                      </div>

                      {formProfil.typeStatutPublic === 'Titulaire' && (
                        <div>
                          <label style={styles.label}>Numéro Matricule</label>
                          <input 
                            type="text" 
                            value={formProfil.numeroMatricule} 
                            onChange={(e) => setFormProfil({...formProfil, numeroMatricule: e.target.value})} 
                            placeholder="Ex: MT-XXXXXX" 
                            className="champ-saisie" 
                            required 
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '8px', backgroundColor: '#eef2f6', borderRadius: '6px', fontSize: '12px', color: '#334155', fontWeight: '600', textAlign: 'center' }}>
                      Statut enregistré : <span style={{ color: '#2563eb' }}>Privé</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalProfilOuvert(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE SUPPRESSION */}
        {modalSuppression.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '400px' }} className="anim-modale">
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>⚠️ Confirmer la suppression</h3>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
                Voulez-vous supprimer : <strong>{modalSuppression.titre}</strong> ?
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setModalSuppression({ ouvert: false, type: '', id: null, titre: '', cycleIdParent: null })} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={confirmerSuppression} className="bouton bouton-danger">Confirmer</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE SÉLECTION DEPUIS LA BIBLIOTHÈQUE */}
        {modalSelectionBiblio && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '560px', maxHeight: '85vh', overflowY: 'auto' }} className="anim-modale">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>📚 Charger depuis la base de données</h3>
                <button onClick={() => setModalSelectionBiblio(false)} className="bouton bouton-secondaire" style={{ padding: '4px 8px' }}>✕</button>
              </div>
              <input type="text" placeholder="Filtrer la bibliothèque..." value={filtreBiblioTexte} onChange={(e) => setFiltreBiblioTexte(e.target.value)} className="champ-saisie" style={{ marginBottom: '12px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {bibliothequeFiltree.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '13px' }}>Aucun élément trouvé.</p>
                ) : (
                  bibliothequeFiltree.map(b => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ flex: 1, paddingRight: '10px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>{b.niveau}</span>
                          <strong style={{ fontSize: '13px', color: '#1e293b' }}>{b.nom}</strong>
                        </div>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Cycle : {b.cycleAssocie}</p>
                      </div>
                      <button onClick={() => importerDepuisBibliotheque(b)} className="bouton bouton-principal" style={{ padding: '6px 12px', fontSize: '12px' }}>Importer</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ASSISTANT DE CRÉATION EN CASCADE */}
        {modalAssistant.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '620px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-modale">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>
                  {modalAssistant.typeCible === 'cycle' && '✨ Créer un nouveau Cycle'}
                  {modalAssistant.typeCible === 'lecon' && '📖 Créer une nouvelle Leçon'}
                  {modalAssistant.typeCible === 'seance' && '📝 Créer une nouvelle Séance'}
                </h3>
                {modalAssistant.typeCible === 'seance' && (
                  <button type="button" onClick={() => setModalSelectionBiblio(true)} className="bouton bouton-secondaire" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                    📂 Importer depuis la Base
                  </button>
                )}
              </div>

              <form onSubmit={handleValiderAssistant} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={styles.label}>Niveau de création</label>
                  <select 
                    value={modalAssistant.typeCible} 
                    onChange={(e) => setModalAssistant({...modalAssistant, typeCible: e.target.value})} 
                    className="champ-saisie"
                  >
                    <option value="cycle">1. Cycle d'apprentissage</option>
                    <option value="lecon">2. Leçon</option>
                    <option value="seance">3. Séance</option>
                  </select>
                </div>

                {modalAssistant.typeCible === 'cycle' && (
                  <>
                    <div>
                      <label style={styles.label}>Titre du cycle</label>
                      <input type="text" placeholder="Ex: Cycle 1 : Gymnastique..." value={modalAssistant.titreCycle} onChange={(e) => setModalAssistant({...modalAssistant, titreCycle: e.target.value})} className="champ-saisie" required />
                    </div>
                    <div>
                      <label style={styles.label}>Compétence visée</label>
                      <input type="text" placeholder="Ex: Traiter une situation..." value={modalAssistant.titreCompetence} onChange={(e) => setModalAssistant({...modalAssistant, titreCompetence: e.target.value})} className="champ-saisie" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={styles.label}>Durée du cycle</label>
                        <input type="text" placeholder="Ex: 4 Semaines" value={modalAssistant.dureeCycle} onChange={(e) => setModalAssistant({...modalAssistant, dureeCycle: e.target.value})} className="champ-saisie" />
                      </div>
                      <div>
                        <label style={styles.label}>Niveau</label>
                        <select value={modalAssistant.niveau} onChange={(e) => setModalAssistant({...modalAssistant, niveau: e.target.value})} className="champ-saisie">
                          <option value="6ème">6ème</option>
                          <option value="5ème">5ème</option>
                          <option value="4ème">4ème</option>
                          <option value="3ème">3ème</option>
                          <option value="2nde">2nde</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={styles.label}>Classes ciblées {classeSelectionneeVue ? `(Pré-sélectionné : ${classeSelectionneeVue})` : ''}</label>
                      <div style={styles.checkboxGroup}>
                        {infosEnseignant.classesSelectionnees.map(c => (
                          <label key={c} style={styles.checkboxLabel}>
                            <input type="checkbox" checked={classeSelectionneeVue === c || modalAssistant.classesCiblees.includes(c)} onChange={() => {
                              const updated = modalAssistant.classesCiblees.includes(c) ? modalAssistant.classesCiblees.filter(item => item !== c) : [...modalAssistant.classesCiblees, c];
                              setModalAssistant({...modalAssistant, classesCiblees: updated});
                            }} />
                            {c}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {modalAssistant.typeCible === 'lecon' && (
                  <>
                    <div>
                      <label style={styles.label}>Sélectionner le Cycle parent</label>
                      <select value={modalAssistant.cycleParentId || cycles[0]?.id} onChange={(e) => setModalAssistant({...modalAssistant, cycleParentId: e.target.value})} className="champ-saisie">
                        {cycles.map(c => <option key={c.id} value={c.id}>{c.titre} ({c.niveau})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Titre de la leçon</label>
                      <input type="text" placeholder="Ex: Leçon 1 : Maîtriser les équilibres..." value={modalAssistant.titreLecon} onChange={(e) => setModalAssistant({...modalAssistant, titreLecon: e.target.value})} className="champ-saisie" required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={styles.label}>Durée de la leçon</label>
                        <input type="text" placeholder="Ex: 2 Semaines" value={modalAssistant.dureeLecon} onChange={(e) => setModalAssistant({...modalAssistant, dureeLecon: e.target.value})} className="champ-saisie" />
                      </div>
                      <div>
                        <label style={styles.label}>Nombre de séances prévues</label>
                        <input type="number" min="1" value={modalAssistant.nombreSeancesPrevues} onChange={(e) => setModalAssistant({...modalAssistant, nombreSeancesPrevues: e.target.value})} className="champ-saisie" />
                      </div>
                    </div>
                  </>
                )}

                {modalAssistant.typeCible === 'seance' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={styles.label}>Cycle parent</label>
                        <select value={modalAssistant.cycleParentId || cycles[0]?.id} onChange={(e) => setModalAssistant({...modalAssistant, cycleParentId: e.target.value})} className="champ-saisie">
                          {cycles.map(c => <option key={c.id} value={c.id}>{c.titre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={styles.label}>Leçon parente</label>
                        <select value={modalAssistant.leconParenteId || ''} onChange={(e) => setModalAssistant({...modalAssistant, leconParenteId: e.target.value})} className="champ-saisie">
                          {(cycles.find(c => c.id === Number(modalAssistant.cycleParentId || cycles[0]?.id))?.lecons || []).map(l => (
                            <option key={l.id} value={l.id}>{l.titre}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={styles.uploadBox}>
                      <label style={{ ...styles.label, textAlign: 'center', cursor: 'pointer', margin: 0 }}>
                        {modalAssistant.enCoursScan ? '🔄 Analyse intelligente...' : '📂 Uploader des fichiers multimédias (Images, PDF...)'}
                        <input type="file" accept="image/*,.pdf" onChange={simulerScanFichierAssistant} style={{ display: 'none' }} />
                      </label>
                      {modalAssistant.fichierNom && <span style={{ fontSize: '11px', color: '#166534', display: 'block', marginTop: '4px' }}>Fichier : {modalAssistant.fichierNom}</span>}
                    </div>

                    <div>
                      <label style={styles.label}>Titre de la séance</label>
                      <input type="text" placeholder="Ex: Séance 1 : Roulé-boulé..." value={modalAssistant.titreSeance} onChange={(e) => setModalAssistant({...modalAssistant, titreSeance: e.target.value})} className="champ-saisie" required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={styles.label}>Date de la séance</label>
                        <input type="date" value={modalAssistant.dateSeance} onChange={(e) => setModalAssistant({...modalAssistant, dateSeance: e.target.value})} className="champ-saisie" />
                      </div>
                      <div>
                        <label style={styles.label}>Lieu de la séance</label>
                        <input type="text" placeholder="Ex: Gymnase, Stade..." value={modalAssistant.lieuSeance} onChange={(e) => setModalAssistant({...modalAssistant, lieuSeance: e.target.value})} className="champ-saisie" />
                      </div>
                    </div>

                    <div>
                      <label style={styles.label}>🎯 Habiletés</label>
                      <textarea placeholder="Habiletés visées..." value={modalAssistant.habilitesSeance} onChange={(e) => setModalAssistant({...modalAssistant, habilitesSeance: e.target.value})} className="champ-saisie" style={{ height: '50px', resize: 'vertical' }} />
                    </div>
                    <div>
                      <label style={styles.label}>📚 Contenus</label>
                      <textarea placeholder="Contenus de la séance..." value={modalAssistant.contenusSeance} onChange={(e) => setModalAssistant({...modalAssistant, contenusSeance: e.target.value})} className="champ-saisie" style={{ height: '50px', resize: 'vertical' }} />
                    </div>
                    <div>
                      <label style={styles.label}>⚡ Exercices</label>
                      <textarea placeholder="Exercices d'application..." value={modalAssistant.exercicesSeance} onChange={(e) => setModalAssistant({...modalAssistant, exercicesSeance: e.target.value})} className="champ-saisie" style={{ height: '50px', resize: 'vertical' }} />
                    </div>
                    <div>
                      <label style={styles.label}>📝 Évaluations</label>
                      <textarea placeholder="Modalité d'évaluation..." value={modalAssistant.evaluationsSeance} onChange={(e) => setModalAssistant({...modalAssistant, evaluationsSeance: e.target.value})} className="champ-saisie" style={{ height: '50px', resize: 'vertical' }} />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setModalAssistant({ ouvert: false, typeCible: 'cycle', cycleParentId: null, leconParenteId: null, titreCycle: '', titreCompetence: '', dureeCycle: '', niveau: '6ème', classesCiblees: [infosEnseignant.classesSelectionnees[0]], activite: '', titreLecon: '', dureeLecon: '', nombreSeancesPrevues: '4', titreSeance: '', dateSeance: '', lieuSeance: '', habilitesSeance: '', contenusSeance: '', exercicesSeance: '', evaluationsSeance: '', fichierNom: '', enCoursScan: false })} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal">Créer l'élément</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- MODAL OPTIMISÉ DE DUPLICATION MULTI-CLASSES (CYCLE, LEÇON, SÉANCE) --- */}
        {modalDuplication.ouvert && (
          <div className="fond-modale anim-apparition">
            <div style={{ ...styles.modalCard, width: '520px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-modale">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>
                  📋 Dupliquer {modalDuplication.type === 'cycle' ? 'le Cycle' : modalDuplication.type === 'lecon' ? 'la Leçon' : 'la Séance'}
                </h3>
                <button onClick={() => setModalDuplication({ ouvert: false, type: null, cycleId: null, leconId: null, itemSource: null, classesSelectionnees: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '4px 8px' }}>✕</button>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Sélectionnez les classes cibles et définissez une date personnalisée pour chacune.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <label style={styles.label}>Classes cibles :</label>
                {infosEnseignant.classesSelectionnees.map(cl => {
                  const estSelectionne = modalDuplication.classesSelectionnees.includes(cl);
                  return (
                    <div key={cl} style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                        <input 
                          type="checkbox" 
                          checked={estSelectionne} 
                          onChange={() => {
                            const updatedClasses = estSelectionne 
                              ? modalDuplication.classesSelectionnees.filter(c => c !== cl)
                              : [...modalDuplication.classesSelectionnees, cl];
                            setModalDuplication(prev => ({ ...prev, classesSelectionnees: updatedClasses }));
                          }} 
                        />
                        {cl}
                      </label>
                      {estSelectionne && (
                        <div style={{ marginTop: '8px', marginLeft: '22px' }}>
                          <label style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '4px' }}>Date pour la classe {cl} :</label>
                          <input 
                            type="date" 
                            value={modalDuplication.datesParClasse[cl] || ''} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setModalDuplication(prev => ({
                                ...prev,
                                datesParClasse: { ...prev.datesParClasse, [cl]: val }
                              }));
                            }} 
                            className="champ-saisie"
                            style={{ padding: '6px 10px' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setModalDuplication({ ouvert: false, type: null, cycleId: null, leconId: null, itemSource: null, classesSelectionnees: [], datesParClasse: {} })} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={executerDuplicationOptimisee} className="bouton bouton-principal">Lancer la duplication</button>
              </div>
            </div>
          </div>
        )}

        {/* CONTENEUR ANIMÉ DES ONGLETS (AFFICHÉ QUAND L'INSCRIPTION EST VALIDÉE) */}
        {etapeParcours !== 'inscription' && (
          <div key={activeTab} className="anim-apparition">
            
            {/* ONGLET : DEMANDE D'AFFILIATION INTELLIGENTE */}
            {activeTab === 'affiliation' && (
              <div style={styles.cardAffiliation}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '28px' }}>📖</span>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '6px 0 2px 0' }}>E-cahier !</h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    Sélectionnez votre établissement et cochez vos classes dans la liste officielle configurée par le censeur.
                  </p>
                </div>

                {infosEnseignant.demandeSoumise ? (
                  <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                    <h3 style={{ color: '#166534', margin: '0 0 6px 0' }}>⏳ Demande transmise (En attente de validation)</h3>
                    <p style={{ fontSize: '13px', color: '#15803d', margin: '0 0 16px 0' }}>
                      Votre affiliation pour l'établissement <strong>{infosEnseignant.etablissementSaisi}</strong> avec les classes ({infosEnseignant.classesSelectionnees.join(', ')}) est en attente de validation par le censeur.
                    </p>
                    
                    {/* BOUTON DE SIMULATION DU VALIDATION PAR LE CENSEUR */}
                    <button 
                      onClick={() => {
                        setInfosEnseignant({ ...infosEnseignant, demandeSoumise: false });
                        setActiveTab('cycles'); // Redirige automatiquement vers l'espace de travail des classes !
                        showToast("🎉 Notification : Le censeur a validé votre affiliation ! Bienvenue sur votre espace.");
                      }} 
                      className="bouton bouton-succes" 
                      style={{ fontSize: '12px', marginBottom: '12px', width: '100%' }}
                    >
                      ⚡ [Simulation] Valider l'affiliation côté Censeur
                    </button>

                    <button onClick={() => setInfosEnseignant({...infosEnseignant, demandeSoumise: false})} className="bouton bouton-secondaire" style={{ fontSize: '12px', width: '100%' }}>
                      Modifier ma demande
                    </button>
                  </div>
                ) : (
                  <form onSubmit={soumettreAffiliation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* CHAMP INTELLIGENT 1 : ÉTABLISSEMENT AVEC AUTOCOMPLÉTION DYNAMIQUE */}
                    <div style={{ position: 'relative' }}>
                      <label style={styles.label}>Nom de l'établissement souhaité ({infosEnseignant.ville})</label>
                      <input 
                        type="text" 
                        value={infosEnseignant.etablissementSaisi} 
                        onChange={(e) => setInfosEnseignant({...infosEnseignant, etablissementSaisi: e.target.value})} 
                        placeholder="Tapez le nom de l'établissement..." 
                        className="champ-saisie" 
                        style={{ backgroundColor: '#fefce8' }}
                        required 
                      />

                      {/* Liste déroulante intelligente des établissements de la ville */}
                      {infosEnseignant.etablissementSaisi.trim() !== '' && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                          maxHeight: '160px',
                          overflowY: 'auto',
                          zIndex: 100,
                          marginTop: '4px'
                        }}>
                          {infosEnseignant.etablissementsDisponibles
                            .filter(etab => etab.toLowerCase().includes(infosEnseignant.etablissementSaisi.toLowerCase()))
                            .length === 0 ? (
                              <div style={{ padding: '10px 14px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                                Aucun établissement enregistré trouvé. Saisissez le nom exact.
                              </div>
                            ) : (
                              infosEnseignant.etablissementsDisponibles
                                .filter(etab => etab.toLowerCase().includes(infosEnseignant.etablissementSaisi.toLowerCase()))
                                .map((etabNom, index) => (
                                  <div 
                                    key={index}
                                    onClick={() => {
                                      setInfosEnseignant({ ...infosEnseignant, etablissementSaisi: etabNom, classesSelectionnees: [] });
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      fontSize: '13px',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid #f1f5f9',
                                      fontWeight: '500',
                                      color: '#1e293b'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                  >
                                    🏫 <strong>{etabNom}</strong>
                                  </div>
                                ))
                            )}
                        </div>
                      )}
                    </div>

                    {/* CHAMP INTELLIGENT 2 : SÉLECTION DES CLASSES CRÉÉES PAR LE CENSEUR */}
                    <div style={{ position: 'relative' }}>
                      <label style={styles.label}>Classes en charge (Synchronisées avec le Censeur)</label>
                      <div 
                        onClick={() => {
                          if (!infosEnseignant.etablissementSaisi.trim()) {
                            showToast("Veuillez d'abord sélectionner un établissement.");
                            return;
                          }
                          setListeClassesOuverte(!listeClassesOuverte);
                        }}
                        style={{ ...styles.champSaisieSimulation, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: infosEnseignant.etablissementSaisi ? '#ffffff' : '#f8fafc' }}
                      >
                        <span style={{ color: infosEnseignant.classesSelectionnees.length > 0 ? '#0f172a' : '#94a3b8' }}>
                          {infosEnseignant.classesSelectionnees.length > 0 
                            ? `${infosEnseignant.classesSelectionnees.length} classe(s) cochée(s)` 
                            : infosEnseignant.etablissementSaisi ? 'Cliquez pour afficher les classes de cet établissement...' : 'Sélectionnez d’abord un établissement ci-dessus'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{listeClassesOuverte ? '▲' : '▼'}</span>
                      </div>

                      {/* Liste déroulante des classes officielles par cases à cocher */}
                      {listeClassesOuverte && infosEnseignant.etablissementSaisi && (
                        <div style={styles.dropdownClassesContainer} className="anim-apparition">
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                            Classes officielles configurées ({infosEnseignant.etablissementSaisi}) :
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                            {classesDisponiblesPourEtablissement.length === 0 ? (
                              <div style={{ padding: '8px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                                Aucune classe n'a encore été configurée par le censeur pour cet établissement.
                              </div>
                            ) : (
                              classesDisponiblesPourEtablissement.map(cls => {
                                const nomClasse = cls.nom || cls;
                                const niveauClasse = cls.niveau || 'Général';
                                const estCoche = infosEnseignant.classesSelectionnees.includes(nomClasse);
                                return (
                                  <label key={cls.id || nomClasse} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', backgroundColor: estCoche ? '#e0f2fe' : '#ffffff', border: '1px solid #cbd5e1', fontSize: '12px', cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={estCoche}
                                      onChange={() => gererSelectionClasseAffiliation(nomClasse)}
                                    />
                                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <strong style={{ color: '#0f172a' }}>{nomClasse}</strong>
                                      <span style={{ fontSize: '10px', color: '#64748b' }}>Niveau {niveauClasse}</span>
                                    </div>
                                  </label>
                                );
                              })
                            )}
                          </div>
                          <div style={{ textAlign: 'right', marginTop: '8px' }}>
                            <button type="button" onClick={() => setListeClassesOuverte(false)} className="bouton bouton-principal" style={{ padding: '4px 10px', fontSize: '11px' }}>Valider la sélection</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CLASSES SÉLECTIONNÉES */}
                    <div>
                      <label style={styles.label}>Classes sélectionnées ({infosEnseignant.classesSelectionnees.length}) :</label>
                      <div style={styles.cadreClassesSelectionnees}>
                        {infosEnseignant.classesSelectionnees.length === 0 ? (
                          <span style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '12px' }}>Aucune classe ajoutée.</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {infosEnseignant.classesSelectionnees.map(cl => (
                              <span key={cl} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {cl}
                                <span style={{ cursor: 'pointer', fontSize: '10px', color: '#0284c7' }} onClick={() => gererSelectionClasseAffiliation(cl)}>✕</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button type="submit" className="bouton bouton-principal" style={{ width: '100%', backgroundColor: '#2563eb' }}>
                        Soumettre la demande au Censeur / Direction
                      </button>
                    </div>

                  </form>
                )}
              </div>
            )}

            {/* ONGLET 1 : ORGANISATION PAR CLASSES & PROGRESSION */}
            {activeTab === 'cycles' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {!classeSelectionneeVue ? (
                  <div>
                    <div style={{ marginBottom: '20px' }}>
                      <h2 style={styles.sectionTitle}>Mes Classes & Progression</h2>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                        Sélectionnez une classe ci-dessous pour visualiser sa progression, ses fiches remplies et ajouter de nouveaux contenus.
                      </p>
                    </div>

                    {/* GRILLE DES CARTES DE CLASSES DYNAMIQUES */}
                    <div style={styles.grilleClasses}>
                      {infosEnseignant.classesSelectionnees.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                          <p style={{ fontStyle: 'italic', color: '#94a3b8', margin: 0 }}>Aucune classe active pour le moment. Veuillez effectuer votre demande d'affiliation.</p>
                        </div>
                      ) : (
                        infosEnseignant.classesSelectionnees.map(cl => {
                          const cyclesClasses = cycles.filter(c => c.classesCiblees.includes(cl));
                          let totalSeancesClasse = 0;
                          let seancesTermineesClasse = 0;
                          cyclesClasses.forEach(c => {
                            c.lecons.forEach(l => {
                              l.seances.forEach(s => {
                                totalSeancesClasse++;
                                if (s.statut === 'Terminée') seancesTermineesClasse++;
                              });
                            });
                          });
                          const tauxProg = totalSeancesClasse > 0 ? Math.round((seancesTermineesClasse / totalSeancesClasse) * 100) : 0;

                          return (
                            <div 
                              key={cl} 
                              onClick={() => setClasseSelectionneeVue(cl)}
                              style={styles.carteClasseItem}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>🏫 {cl}</span>
                                <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                                  {cyclesClasses.length} cycle(s)
                                </span>
                              </div>
                              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>
                                Progression : <strong>{tauxProg}%</strong> ({seancesTermineesClasse}/{totalSeancesClasse} séances validées)
                              </p>
                              <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ width: `${tauxProg}%`, height: '100%', backgroundColor: '#2563eb', borderRadius: '999px' }}></div>
                              </div>
                              <div style={{ marginTop: '14px', textAlign: 'right' }}>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#2563eb' }}>Ouvrir le cahier →</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={() => setClasseSelectionneeVue(null)} className="bouton bouton-secondaire" style={{ padding: '6px 12px', fontSize: '12px' }}>
                          ← Retour aux classes
                        </button>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                          Progression de la classe : <span style={{ color: '#2563eb' }}>{classeSelectionneeVue}</span>
                        </h2>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setModalAssistant({ ouvert: true, typeCible: 'cycle', cycleParentId: null, leconParenteId: null, titreCycle: '', titreCompetence: '', dureeCycle: '', niveau: '6ème', classesCiblees: [classeSelectionneeVue], activite: '', titreLecon: '', dureeLecon: '', nombreSeancesPrevues: '4', titreSeance: '', dateSeance: '', lieuSeance: '', habilitesSeance: '', contenusSeance: '', exercicesSeance: '', evaluationsSeance: '', fichierNom: '', enCoursScan: false })} className="bouton bouton-principal">
                          + Ajouter un cycle ({classeSelectionneeVue})
                        </button>
                      </div>
                    </div>

                    {cyclesFiltres.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <p style={{ fontStyle: 'italic', color: '#94a3b8', margin: '0 0 14px 0' }}>Aucun cycle enregistré pour la classe {classeSelectionneeVue}.</p>
                        <button onClick={() => setModalAssistant({ ouvert: true, typeCible: 'cycle', cycleParentId: null, leconParenteId: null, titreCycle: '', titreCompetence: '', dureeCycle: '', niveau: '6ème', classesCiblees: [classeSelectionneeVue], activite: '', titreLecon: '', dureeLecon: '', nombreSeancesPrevues: '4', titreSeance: '', dateSeance: '', lieuSeance: '', habilitesSeance: '', contenusSeance: '', exercicesSeance: '', evaluationsSeance: '', fichierNom: '', enCoursScan: false })} className="bouton bouton-principal">
                          Créer le premier cycle pour {classeSelectionneeVue}
                        </button>
                      </div>
                    ) : (
                      cyclesFiltres.map(cycle => (
                        <div key={cycle.id} style={{ ...styles.cycleCard, borderLeft: cycle.statut === 'Terminé' ? '6px solid #16a34a' : '6px solid #2563eb' }}>
                          <div style={styles.cycleHeader}>
                            <div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={styles.badgeNiveau}>{cycle.niveau}</span>
                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', backgroundColor: cycle.statut === 'Terminé' ? '#dcfce7' : '#e0e7ff', color: cycle.statut === 'Terminé' ? '#166534' : '#3730a3' }}>
                                  Statut Cycle : {cycle.statut}
                                </span>
                              </div>
                              <h3 style={styles.cycleTitle}>{cycle.titre}</h3>
                              <p style={styles.cycleMeta}><strong>Compétence :</strong> {cycle.competence} | <strong>Durée :</strong> {cycle.duree} | <strong>Classes :</strong> {cycle.classesCiblees.join(', ')}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {cycle.statut !== 'Terminé' && (
                                <button onClick={() => marquerCycleTermine(cycle.id)} className="bouton bouton-succes" style={{ padding: '6px 10px', fontSize: '11px' }}>🏁 Terminer le cycle</button>
                              )}
                              <button onClick={() => setModalDuplication({ ouvert: true, type: 'cycle', cycleId: cycle.id, leconId: null, itemSource: cycle, classesSelectionnees: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '6px 10px', fontSize: '11px' }}>📋 Dupliquer</button>
                              <button onClick={() => setModalSuppression({ ouvert: true, type: 'cycle', id: cycle.id, titre: cycle.titre })} className="bouton bouton-danger" style={{ padding: '6px 10px', fontSize: '11px' }}>🗑️</button>
                            </div>
                          </div>

                          <div style={styles.leconContainer}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h4 style={styles.leconHeaderTitle}>Leçons du cycle :</h4>
                              <button onClick={() => setModalAssistant({ ouvert: true, typeCible: 'lecon', cycleParentId: cycle.id, leconParenteId: null, titreCycle: '', titreCompetence: '', dureeCycle: '', niveau: cycle.niveau, classesCiblees: cycle.classesCiblees, activite: cycle.activite, titreLecon: '', dureeLecon: '', nombreSeancesPrevues: '4', titreSeance: '', dateSeance: '', lieuSeance: '', habilitesSeance: '', contenusSeance: '', exercicesSeance: '', evaluationsSeance: '', fichierNom: '', enCoursScan: false })} style={{ background: 'transparent', color: '#2563eb', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}>
                                + Ajouter une leçon
                              </button>
                            </div>

                            {cycle.lecons.map(lecon => (
                              <div key={lecon.id} style={{ ...styles.leconCard, borderLeft: lecon.statut === 'Terminé' ? '4px solid #16a34a' : '4px solid #cbd5e1' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                  <div>
                                    <h5 style={styles.leconTitle}>{lecon.titre}</h5>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>Durée : {lecon.duree} | Statut : <strong>{lecon.statut}</strong></span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {lecon.statut !== 'Terminé' && (
                                      <>
                                        <button onClick={() => marquerLeconTerminee(cycle.id, lecon.id)} className="bouton bouton-succes" style={{ padding: '4px 8px', fontSize: '11px' }}>🏁 Terminer la leçon</button>
                                        <button onClick={() => setModalAssistant({ ouvert: true, typeCible: 'seance', cycleParentId: cycle.id, leconParenteId: lecon.id, titreCycle: '', titreCompetence: '', dureeCycle: '', niveau: cycle.niveau, classesCiblees: cycle.classesCiblees, activite: cycle.activite, titreLecon: '', dureeLecon: '', nombreSeancesPrevues: '4', titreSeance: '', dateSeance: '', lieuSeance: '', habilitesSeance: '', contenusSeance: '', exercicesSeance: '', evaluationsSeance: '', fichierNom: '', enCoursScan: false })} className="bouton bouton-principal" style={{ padding: '4px 10px', fontSize: '11px' }}>
                                          + Ajouter une séance
                                        </button>
                                      </>
                                    )}
                                    <button onClick={() => setModalDuplication({ ouvert: true, type: 'lecon', cycleId: cycle.id, leconId: lecon.id, itemSource: lecon, classesSelectionnees: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '4px 8px', fontSize: '11px' }}>📋 Dupliquer</button>
                                    <button onClick={() => setModalSuppression({ ouvert: true, type: 'lecon', id: lecon.id, titre: lecon.titre, cycleIdParent: cycle.id })} className="bouton bouton-danger" style={{ padding: '4px 8px', fontSize: '11px' }}>🗑️</button>
                                  </div>
                                </div>

                                <div style={styles.seanceList}>
                                  {lecon.seances.map(seance => {
                                    const compl = getCompleterStatus(seance);
                                    return (
                                      <div key={seance.id} style={styles.seanceCardDetail}>
                                        <div style={styles.seanceRowTop}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: '700', color: '#2563eb' }}>#{seance.numero}</span>
                                            <span style={{ fontWeight: '600' }}>{seance.titre}</span>
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>({seance.date} | {seance.lieu})</span>
                                            <span style={{ backgroundColor: compl.fond, color: compl.couleur, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>{compl.texte}</span>
                                            <span style={{ backgroundColor: seance.statut === 'Terminée' ? '#dcfce7' : '#fef3c7', color: seance.statut === 'Terminée' ? '#166534' : '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>{seance.statut}</span>
                                          </div>
                                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {seance.statut !== 'Terminée' && (
                                              <button onClick={() => marquerSeanceTerminee(cycle.id, lecon.id, seance.id)} className="bouton bouton-succes" style={{ padding: '4px 8px', fontSize: '11px' }}>
                                                Terminer la séance
                                              </button>
                                            )}
                                            <button onClick={() => setModalDuplication({ ouvert: true, type: 'seance', cycleId: cycle.id, leconId: lecon.id, itemSource: seance, classesSelectionnees: [], datesParClasse: {} })} className="bouton bouton-secondaire" style={{ padding: '4px 8px', fontSize: '11px' }}>📋 Dupliquer</button>
                                            <button onClick={() => ouvrirEditionSeance(cycle.id, lecon.id, seance, 'programme')} className="bouton bouton-secondaire" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', padding: '5px 10px', fontSize: '11px' }}>
                                              ✏️ Modifier & Propager
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>
            )}

            {/* ONGLET 2 : BIBLIOTHÈQUE & BASE DE DONNÉES AVEC FILTRES ET BOUTON "RÉUTILISER" */}
            {activeTab === 'bibliotheque' && (
              <div style={styles.cardWide}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.cardTitle}>Bibliothèque & Base de Données Pédagogique</h2>
                    <p style={styles.cardSubtitle}>Filtrez vos fiches et utilisez l'option "Réutiliser" pour les assigner rapidement à plusieurs classes avec des dates spécifiques.</p>
                  </div>
                </div>

                {/* BARRE DE FILTRES AVANCÉS DANS LA BIBLIOTHÈQUE */}
                <div style={styles.bibliothequeFilterBox}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={styles.labelFiltre}>Recherche par mot-clé</label>
                    <input type="text" placeholder="Titre, habiletés, contenus..." value={filtreBiblioTexte} onChange={(e) => setFiltreBiblioTexte(e.target.value)} className="champ-saisie" />
                  </div>

                  <div style={{ flex: '1 1 130px' }}>
                    <label style={styles.labelFiltre}>Classe</label>
                    <select value={filtreBiblioClasse} onChange={(e) => setFiltreBiblioClasse(e.target.value)} className="champ-saisie">
                      <option value="TOUTES">Toutes les classes</option>
                      {infosEnseignant.classesSelectionnees.map(cl => <option key={cl} value={cl}>{cl}</option>)}
                    </select>
                  </div>

                  <div style={{ flex: '1 1 160px' }}>
                    <label style={styles.labelFiltre}>École / Établissement</label>
                    <select value={filtreBiblioEcole} onChange={(e) => setFiltreBiblioEcole(e.target.value)} className="champ-saisie">
                      <option value="TOUTES">Toutes les écoles</option>
                      {infosEnseignant.etablissementsDisponibles.map(ec => <option key={ec} value={ec}>{ec}</option>)}
                    </select>
                  </div>

                  <div style={{ flex: '1 1 110px' }}>
                    <label style={styles.labelFiltre}>Année</label>
                    <select value={filtreBiblioAnnee} onChange={(e) => setFiltreBiblioAnnee(e.target.value)} className="champ-saisie">
                      <option value="TOUTES">Toutes</option>
                      <option value="2025-2026">2025-2026</option>
                      <option value="2026-2027">2026-2027</option>
                    </select>
                  </div>

                  <div style={{ flex: '1 1 120px' }}>
                    <label style={styles.labelFiltre}>Mois</label>
                    <select value={filtreBiblioMois} onChange={(e) => setFiltreBiblioMois(e.target.value)} className="champ-saisie">
                      <option value="TOUS">Tous les mois</option>
                      <option value="01">Janvier</option>
                      <option value="02">Février</option>
                      <option value="03">Mars</option>
                      <option value="04">Avril</option>
                      <option value="05">Mai</option>
                      <option value="06">Juin</option>
                      <option value="09">Septembre</option>
                      <option value="10">Octobre</option>
                      <option value="11">Novembre</option>
                      <option value="12">Décembre</option>
                    </select>
                  </div>

                  <div style={{ flex: '1 1 130px' }}>
                    <label style={styles.labelFiltre}>Trimestre</label>
                    <select value={filtreBiblioTrimestre} onChange={(e) => setFiltreBiblioTrimestre(e.target.value)} className="champ-saisie">
                      <option value="TOUS">Tous les trimestres</option>
                      <option value="Trimestre 1">Trimestre 1</option>
                      <option value="Trimestre 2">Trimestre 2</option>
                      <option value="Trimestre 3">Trimestre 3</option>
                    </select>
                  </div>
                </div>

                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.trHead}>
                        <th style={styles.th}>Classe / École</th>
                        <th style={styles.th}>Cycle & Période</th>
                        <th style={styles.th}>Séance (Ressource)</th>
                        <th style={styles.th}>Habiletés & Contenus</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bibliothequeFiltree.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic' }}>
                            Aucune séance ne correspond aux filtres sélectionnés.
                          </td>
                        </tr>
                      ) : (
                        bibliothequeFiltree.map(f => (
                          <tr key={f.id} className="ligne-tableau">
                            <td style={styles.td}>
                              <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', display: 'inline-block', marginBottom: '4px' }}>{f.classe}</span><br />
                              <span style={{ fontSize: '11px', color: '#64748b' }}>{f.ecole}</span>
                            </td>
                            <td style={{ ...styles.td, fontSize: '12px' }}>
                              <strong>{f.cycleAssocie}</strong><br />
                              <span style={{ color: '#4f46e5', fontWeight: '600', fontSize: '11px' }}>{f.annee} | {f.trimestre}</span>
                            </td>
                            <td style={styles.td}>
                              <strong>{f.nom}</strong><br />
                              <span style={{ fontSize: '11px', color: '#64748b' }}>Date : {f.date}</span>
                            </td>
                            <td style={{ ...styles.td, fontSize: '12px' }}>
                              <div><strong>Habiletés :</strong> {f.habilites || 'N/A'}</div>
                              <div><strong>Contenus :</strong> {f.contenus || 'N/A'}</div>
                            </td>
                            <td style={styles.td}>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button onClick={() => {
                                  const seanceSimulee = { id: f.seanceId || f.id, titre: f.nom, date: f.date, habilites: f.habilites, contenus: f.contenus, exercices: f.exercices, evaluations: f.evaluations };
                                  ouvrirEditionSeance(f.cycleId || cycles[0].id, f.leconId || cycles[0].lecons[0].id, seanceSimulee, 'bibliotheque', f.id);
                                }} className="bouton bouton-principal" style={{ padding: '6px 10px', fontSize: '11px' }}>
                                  ✏️ Modifier
                                </button>
                                <button onClick={() => setModalReutiliser({ ouvert: true, itemSource: f, classesSelectionnees: [], datesParClasse: {} })} className="bouton bouton-succes" style={{ padding: '6px 10px', fontSize: '11px' }}>
                                  ♻️ Réutiliser
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f1f5f9', minHeight: '100vh', color: '#1e293b' },
  darkNavbar: { backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 30px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' },
  topBarMainRow: { display: 'flex', alignItems: 'center' },
  navbarAppTitle: { fontSize: '18px', fontWeight: '700', margin: 0, color: '#ffffff' },
  bottomBarRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' },
  navbarTeacherClickableBlock: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', textAlign: 'left' },
  avatarNavbarContainer: { width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #475569', flexShrink: 0 },
  avatarNavbarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarNavbarPlaceholder: { fontSize: '16px', color: '#94a3b8' },
  navbarTeacherInfo: { display: 'flex', flexDirection: 'column' },
  navbarTeacherName: { fontSize: '12px', fontWeight: '700', color: '#ffffff' },
  navbarTeacherDetails: { fontSize: '10px', color: '#94a3b8' },
  navActionsRight: { display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
  mainContentBody: { padding: '30px', maxWidth: '1280px', margin: '0 auto', position: 'relative' },
  multitaskDropdown: { position: 'absolute', top: '44px', left: 0, backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', width: '280px', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '6px' },
  notificationDropdown: { position: 'absolute', top: '44px', right: 0, backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', width: '300px', zIndex: 100, padding: '10px' },
  dropdownHeader: { padding: '4px 8px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
  notifItem: { backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '12px', marginBottom: '4px' },
  toastSuccess: { backgroundColor: '#1e293b', color: '#f8fafc', padding: '14px 22px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', fontWeight: '600', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 },
  grilleClasses: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' },
  carteClasseItem: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s ease' },
  cycleCard: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)', marginBottom: '16px' },
  cycleHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' },
  badgeNiveau: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' },
  cycleTitle: { fontSize: '17px', fontWeight: '700', color: '#0f172a', margin: '6px 0 4px 0' },
  cycleMeta: { fontSize: '13px', color: '#64748b', margin: 0 },
  leconContainer: { marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' },
  leconHeaderTitle: { fontSize: '14px', fontWeight: '700', color: '#475569', margin: 0 },
  leconCard: { backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '10px', border: '1px solid #e2e8f0' },
  leconTitle: { fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 },
  seanceList: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' },
  seanceCardDetail: { backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' },
  seanceRowTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
  cardAffiliation: { backgroundColor: '#ffffff', padding: '32px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)', maxWidth: '540px', margin: '20px auto' },
  cardWide: { backgroundColor: '#ffffff', padding: '32px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' },
  labelFiltre: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' },
  bibliothequeFilterBox: { display: 'flex', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap' },
  uploadBox: { backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' },
  checkboxGroup: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', backgroundColor: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' },
  checkboxLabel: { fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '500', color: '#334155' },
  modalCard: { backgroundColor: '#ffffff', padding: '26px', borderRadius: '14px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  tableContainer: { marginTop: '16px', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' },
  trHead: { borderBottom: '2px solid #e2e8f0', color: '#475569' },
  th: { padding: '12px 14px', fontWeight: '600', fontSize: '13px' },
  td: { padding: '14px', color: '#334155' },
  champSaisieSimulation: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' },
  dropdownClassesContainer: { position: 'absolute', top: '72px', left: 0, right: 0, backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', border: '1px solid #cbd5e1', padding: '10px', zIndex: 50 },
  cadreClassesSelectionnees: { width: '100%', minHeight: '44px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center' }
};
