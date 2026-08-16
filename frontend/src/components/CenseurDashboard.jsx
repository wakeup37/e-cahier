import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './AppRouter';

const SERIES_SECOND_CYCLE = [
  { code: 'A', label: 'A — Littéraire', type: 'GENERAL' },
  { code: 'B', label: 'B — Sciences Économiques et Sociales', type: 'GENERAL' },
  { code: 'C', label: 'C — Scientifique (Maths-Physique)', type: 'GENERAL' },
  { code: 'D', label: 'D — Scientifique (Maths-SVT)', type: 'GENERAL' },
  { code: 'E', label: 'E — Mathématiques et Techniques', type: 'GENERAL' },
  { code: 'F1', label: 'F1 — Construction / Fabrication Mécanique', type: 'TECHNIQUE' },
  { code: 'F2', label: 'F2 — Électronique', type: 'TECHNIQUE' },
  { code: 'F3', label: 'F3 — Électrotechnique', type: 'TECHNIQUE' },
  { code: 'F4', label: 'F4 — Génie Civil', type: 'TECHNIQUE' },
  { code: 'G1', label: 'G1 — Techniques Administratives et Bureautique', type: 'TECHNIQUE' },
  { code: 'G2', label: 'G2 — Techniques Quantitatives', type: 'TECHNIQUE' },
  { code: 'G3', label: 'G3 — Techniques Commerciales', type: 'TECHNIQUE' },
  { code: 'H1', label: 'H1 — Informatique (option 1)', type: 'TECHNIQUE' },
  { code: 'H2', label: 'H2 — Informatique (option 2)', type: 'TECHNIQUE' },
];

const NIVEAUX_PREMIER_CYCLE = ['6ème', '5ème', '4ème', '3ème'];
const NIVEAUX_SECOND_CYCLE = ['Seconde', 'Première', 'Terminale'];
const TOUS_NIVEAUX = [...NIVEAUX_PREMIER_CYCLE, ...NIVEAUX_SECOND_CYCLE];

export default function CenseurDashboard() {
  const [chargementInitial, setChargementInitial] = useState(true);
  const [userId, setUserId] = useState(null);
  const [affiliationCenseur, setAffiliationCenseur] = useState(null);
  const [anneeActiveId, setAnneeActiveId] = useState(null);

  const [personnesEnLigne, setPersonnesEnLigne] = useState([]);
  
  useEffect(() => {
    if (!affiliationCenseur?.etablissement_id) return;
    try {
      const topic = `presence-etablissement-${affiliationCenseur.etablissement_id}`;
      const interval = setInterval(() => {
        try {
          const canal = supabase.getChannels().find(c => c.topic === `realtime:${topic}`);
          if (canal) {
            const etat = canal.presenceState();
            setPersonnesEnLigne(Object.values(etat).flat());
          }
        } catch (e) {
          console.warn("Erreur lecture présence", e);
        }
      }, 3000);
      return () => clearInterval(interval);
    } catch (err) {
      console.warn("Erreur initialisation présence", err);
    }
  }, [affiliationCenseur?.etablissement_id]);

  const envoyerNotification = async (destinataireUserId, type, message, lienCible, etablissementId) => {
    if (!destinataireUserId) return { error: null };
    const { error } = await supabase.from('notifications').insert({
      user_id: destinataireUserId,
      type,
      payload_json: { message, lien_cible: lienCible, etablissement_id: etablissementId },
      canaux: ['in_app'],
    });
    if (error) console.error('envoyerNotification a échoué :', error);
    return { error };
  };

  useEffect(() => {
    if (!userId) return;
    const canal = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new;
        setNotificationsCenseur(prev => [{
          id: n.id,
          texte: n.payload_json?.message || '',
          date: new Date(n.created_at).toLocaleDateString(),
          lu: false,
          lienCible: n.payload_json?.lien_cible,
        }, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [userId]);

  const marquerNotificationLue = async (notif) => {
    setActiveTab(notif.lienCible || 'visa');
    setNotifCenseurOuvert(false);
    await supabase.from('notifications').update({ lue_at: new Date().toISOString() }).eq('id', notif.id);
    setNotificationsCenseur(prev => prev.filter(x => x.id !== notif.id));
  };

  const [infosCenseur, setInfosCenseur] = useState({
    civilite: 'M.', nom: '', prenoms: '', etablissement: '', role: 'Censeur Pédagogique', niveauCharge: 'Tous Niveaux', photoProfil: '', statutCompte: 'Actif', emailSecurite: '', telephone: ''
  });

  const [modalProfilCenseurOuvert, setModalProfilCenseurOuvert] = useState(false);
  const [formProfilCenseur, setFormProfilCenseur] = useState({ ...infosCenseur });
  const [profilCenseurOuvert, setProfilCenseurOuvert] = useState(false);
  const profilCenseurRef = useRef(null);

  // État unifié pour le changement de mot de passe (intégré directement dans le profil)
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [emailSaisiChangement, setEmailSaisiChangement] = useState('');

  const [menuBurgerCenseurOuvert, setMenuBurgerCenseurOuvert] = useState(false);
  const menuBurgerCenseurRef = useRef(null);
  const [modalDeconnexion, setModalDeconnexion] = useState(false);

  const [modalConfirmation, setModalConfirmation] = useState({
    ouvert: false, titre: '', message: '', actionCallback: null
  });

  const [ecoleConfigGlobale, setEcoleConfigGlobale] = useState({
    nomEcole: '', typeEtablissement: '', codeEtablissement: '', situationGeo: '',
    anneeScolaire: '', nombreEleves: '', nombreEnseignants: '', anneeOuverte: true, typeEnseignement: 'GENERAL'
  });

  const [programmesClasses, setProgrammesClasses] = useState({});
  const [notificationsCenseur, setNotificationsCenseur] = useState([]);
  const [notifCenseurOuvert, setNotifCenseurOuvert] = useState(false);
  const notifCenseurRef = useRef(null);

  const [archiveEcole, setArchiveEcole] = useState([]);
  const [personnelAdministratifManuel, setPersonnelAdministratifManuel] = useState([]);
  const [demandePromotion, setDemandePromotion] = useState(null);
  const [demandesAffiliationEnseignants, setDemandesAffiliationEnseignants] = useState([]);
  const [demandeDepartCenseurEnCours, setDemandeDepartCenseurEnCours] = useState(false);
  const [modalDepartCenseurOuvert, setModalDepartCenseurOuvert] = useState(false);
  const [motifDepartCenseur, setMotifDepartCenseur] = useState('');
  const [classesEtablissement, setClassesEtablissement] = useState([]);
  const [enseignantsParClasse, setEnseignantsParClasse] = useState({});
  const [matieresDisponibles, setMatieresDisponibles] = useState([]);
  const [demandesAttributionsRecues, setDemandesAttributionsRecues] = useState([]);
  
  // États pour le générateur de classes en lot unifié
  const [nouveauLotNiveau, setNouveauLotNiveau] = useState('');
  const [nouveauLotNombre, setNouveauLotNombre] = useState('');
  const [nouveauLotStyle, setNouveauLotStyle] = useState('alphabetique');
  const [nouveauLotSeparateur, setNouveauLotSeparateur] = useState(' ');

  const [niveauSecondCycle, setNiveauSecondCycle] = useState('Seconde');
  const [seriesChoisiesSecondCycle, setSeriesChoisiesSecondCycle] = useState({});
  const [separateurSecondCycle, setSeparateurSecondCycle] = useState(' ');
  const [lotNiveauxMultiples, setLotNiveauxMultiples] = useState([{ niveau: '', nombre: '', style: 'alphabetique' }]);
  
  // Formulaire d'attribution unifié multi-classes / multi-matières
  const [formAttribution, setFormAttribution] = useState({ enseignantId: '', classesIds: [], matiereIdsChoisies: [] });

  const [enseignantChoisiProgression, setEnseignantChoisiProgression] = useState('');
  const [programmeProgressionCharge, setProgrammeProgressionCharge] = useState({});
  const [chargementProgression, setChargementProgression] = useState(false);
  const [cyclesOuvertsProgression, setCyclesOuvertsProgression] = useState({});
  const toggleCycleProgression = (cycleId) => setCyclesOuvertsProgression(prev => ({ ...prev, [cycleId]: !prev[cycleId] }));
  const [matiereProgrammeOuverte, setMatiereProgrammeOuverte] = useState(null);
  const [brouillonProgrammeMatiere, setBrouillonProgrammeMatiere] = useState({ niveaux: [], series: [] });
  const [documentsEtablissement, setDocumentsEtablissement] = useState([]);
  const [nomNouveauFichier, setNomNouveauFichier] = useState('');
  const [categorieNouveauFichier, setCategorieNouveauFichier] = useState('Administratif');
  const [fichierSelectionneObj, setFichierSelectionneObj] = useState(null);
  const [uploadEnCours, setUploadEnCours] = useState(false);

  const [activeTab, setActiveTab] = useState('visa');
  const [message, setMessage] = useState('');

  const [classesOuvertesVisa, setClassesOuvertesVisa] = useState({});
  const toggleClasseVisa = (classeNom) => setClassesOuvertesVisa(prev => ({ ...prev, [classeNom]: !prev[classeNom] }));
  const [classesOuvertesArchive, setClassesOuvertesArchive] = useState({});
  const toggleClasseArchive = (classeNom) => setClassesOuvertesArchive(prev => ({ ...prev, [classeNom]: !prev[classeNom] }));

  const [filtreArchiveClasse, setFiltreArchiveClasse] = useState('TOUTES');
  const [filtreArchiveMatiere, setFiltreArchiveMatiere] = useState('TOUTES');
  const [filtreArchiveAnnee, setFiltreArchiveAnnee] = useState('TOUTES');
  const [filtreArchiveTexte, setFiltreArchiveTexte] = useState('');
  const [filtreProfClasse, setFiltreProfClasse] = useState('TOUTES');

  const [modalConsultation, setModalConsultation] = useState({ ouvert: false, element: null });

  const [nouveauAdminNom, setNouveauAdminNom] = useState('');
  const [nouveauAdminRole, setNouveauAdminRole] = useState('Éducateur');
  const [nouveauAdminMatricule, setNouveauAdminMatricule] = useState('');
  const [nouveauAdminContact, setNouveauAdminContact] = useState('');
  const [nouveauAdminEmail, setNouveauAdminEmail] = useState('');

  const [profsSelectionnesRappel, setProfsSelectionnesRappel] = useState([]);

  const showToast = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 8000); };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profilCenseurRef.current && !profilCenseurRef.current.contains(event.target)) setProfilCenseurOuvert(false);
      if (notifCenseurRef.current && !notifCenseurRef.current.contains(event.target)) setNotifCenseurOuvert(false);
      if (menuBurgerCenseurRef.current && !menuBurgerCenseurRef.current.contains(event.target)) setMenuBurgerCenseurOuvert(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const chargerTout = async () => {
    const { data: { user }, error: erreurUser } = await supabase.auth.getUser();
    if (erreurUser || !user) {
      showToast("⚠️ Session expirée, veuillez vous reconnecter.");
      setChargementInitial(false);
      return;
    }
    setUserId(user.id);

    const { data: profil } = await supabase
      .from('utilisateurs_profils')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: affiliation, error: erreurAffiliation } = await supabase
      .from('affiliations_etablissement')
      .select('*, etablissements(*)')
      .eq('user_id', user.id)
      .eq('role', 'CENSEUR')
      .eq('statut', 'ACTIVE')
      .maybeSingle();

    if (erreurAffiliation || !affiliation) {
      setChargementInitial(false);
      return;
    }
    setAffiliationCenseur(affiliation);
    const etablissementId = affiliation.etablissement_id;
    const etab = affiliation.etablissements;

    if (profil) {
      setInfosCenseur(prev => ({
        ...prev,
        nom: profil.nom,
        prenoms: profil.prenom,
        etablissement: etab?.nom || '',
        emailSecurite: user.email,
        telephone: profil.telephone || '',
      }));
      setFormProfilCenseur(prev => ({ ...prev, nom: profil.nom, prenoms: profil.prenom, etablissement: etab?.nom || '', telephone: profil.telephone || '' }));
    }

    const { data: annee } = await supabase
      .from('annees_scolaires')
      .select('*')
      .eq('etablissement_id', etablissementId)
      .eq('est_active', true)
      .maybeSingle();
    setAnneeActiveId(annee?.id || null);

    const { data: demandesEnseignantsBrutes } = await supabase
      .from('demandes_affiliation')
      .select('id, user_id, role_demande, created_at')
      .eq('etablissement_id', etablissementId)
      .eq('role_demande', 'ENSEIGNANT')
      .eq('statut', 'EN_ATTENTE')
      .order('created_at', { ascending: true });
      
    let demandesEnseignants = demandesEnseignantsBrutes || [];
    if (demandesEnseignants.length > 0) {
      const idsDemandeurs = [...new Set(demandesEnseignants.map(d => d.user_id))];
      const { data: profilsDemandeurs } = await supabase
        .from('utilisateurs_profils')
        .select('user_id, nom, prenom')
        .in('user_id', idsDemandeurs);
      const profilParId = {};
      (profilsDemandeurs || []).forEach(p => { profilParId[p.user_id] = p; });
      demandesEnseignants = demandesEnseignants.map(d => ({ ...d, utilisateurs_profils: profilParId[d.user_id] || null }));
    }
    
    const demandesEnseignantsDedupliquees = [];
    const usersDejaVus = new Set();
    demandesEnseignants.forEach(d => {
      if (usersDejaVus.has(d.user_id)) return;
      usersDejaVus.add(d.user_id);
      demandesEnseignantsDedupliquees.push(d);
    });
    setDemandesAffiliationEnseignants(demandesEnseignantsDedupliquees);

    const { data: demandeDepartExistante } = await supabase
      .from('demandes_depart')
      .select('id')
      .eq('user_id', user.id)
      .eq('statut', 'EN_ATTENTE')
      .maybeSingle();
    setDemandeDepartCenseurEnCours(!!demandeDepartExistante);

    setEcoleConfigGlobale({
      nomEcole: etab?.nom || '',
      typeEtablissement: etab?.visibilite === 'PRIVE' ? 'Privé' : 'Public',
      codeEtablissement: etab?.code || '',
      situationGeo: [etab?.ville, etab?.pays].filter(Boolean).join(', '),
      anneeScolaire: annee?.intitule || '',
      nombreEleves: etab?.parametres_json?.nombreEleves || '',
      nombreEnseignants: etab?.parametres_json?.nombreEnseignants || '',
      anneeOuverte: annee?.est_active ?? true,
      typeEnseignement: etab?.parametres_json?.typeEnseignement || 'GENERAL',
    });

    const { data: affiliationsEnseignantsBrutes } = await supabase
      .from('affiliations_etablissement')
      .select('id, user_id')
      .eq('etablissement_id', etablissementId)
      .eq('role', 'ENSEIGNANT')
      .eq('statut', 'ACTIVE');

    let affiliationsEnseignants = affiliationsEnseignantsBrutes || [];
    if (affiliationsEnseignants.length > 0) {
      const idsEnseignants = [...new Set(affiliationsEnseignants.map(a => a.user_id))];
      const { data: profilsEnseignants } = await supabase
        .from('utilisateurs_profils')
        .select('user_id, nom, prenom, telephone')
        .in('user_id', idsEnseignants);
      const profilEnseignantParId = {};
      (profilsEnseignants || []).forEach(p => { profilEnseignantParId[p.user_id] = p; });
      affiliationsEnseignants = affiliationsEnseignants.map(a => ({ ...a, utilisateurs_profils: profilEnseignantParId[a.user_id] || null }));
    }

    const { data: matieresEnseignants } = await supabase
      .from('matieres_enseignant')
      .select('user_id, matiere_id, matieres(nom, niveaux_applicables, series_applicables)')
      .eq('etablissement_id', etablissementId);

    const { data: attributions } = await supabase
      .from('attributions_classes')
      .select('enseignant_id, matiere_id, matieres(nom), classes(nom)')
      .eq('etablissement_id', etablissementId)
      .eq('annee_scolaire_id', annee?.id || '00000000-0000-0000-0000-000000000000');

    const profsAvecClasses = (affiliationsEnseignants || []).map(a => {
      const attrsDeCetEnseignant = (attributions || []).filter(at => at.enseignant_id === a.user_id);
      const matieresProfil = (matieresEnseignants || [])
        .filter(m => m.user_id === a.user_id)
        .map(m => ({ id: m.matiere_id, nom: m.matieres?.nom, niveauxApplicables: m.matieres?.niveaux_applicables || [], seriesApplicables: m.matieres?.series_applicables || [] }))
        .filter(m => m.nom);
      return {
        id: a.id,
        userId: a.user_id,
        nomComplet: `${a.utilisateurs_profils?.prenom || ''} ${a.utilisateurs_profils?.nom || ''}`.trim(),
        matiere: attrsDeCetEnseignant[0]?.matieres?.nom || matieresProfil.map(m => m.nom).join(', ') || 'Non définie',
        matieresProfil,
        classes: attrsDeCetEnseignant.map(at => at.classes?.nom).filter(Boolean),
        matricule: 'N/A',
        contact: a.utilisateurs_profils?.telephone || 'Non défini',
        email: 'N/A',
      };
    });

    const nomsEnseignants = {};
    (affiliationsEnseignants || []).forEach(a => {
      nomsEnseignants[a.user_id] = `${a.utilisateurs_profils?.prenom || ''} ${a.utilisateurs_profils?.nom || ''}`.trim() || 'Enseignant';
    });
    const groupeParClasse = {};
    (attributions || []).forEach(at => {
      const classeNom = at.classes?.nom;
      if (!classeNom) return;
      if (!groupeParClasse[classeNom]) groupeParClasse[classeNom] = [];
      groupeParClasse[classeNom].push({
        enseignant: nomsEnseignants[at.enseignant_id] || 'Inconnu',
        matiere: at.matieres?.nom || 'Non définie',
      });
    });
    setEnseignantsParClasse(groupeParClasse);
    setListeProfesseursEtablissementBrute(profsAvecClasses);

    if (annee?.id) {
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, nom, niveau, serie')
        .eq('etablissement_id', etablissementId)
        .eq('annee_scolaire_id', annee.id)
        .is('deleted_at', null)
        .order('nom', { ascending: true });
      setClassesEtablissement(classesData || []);

      const { data: demandesAttrib } = await supabase
        .from('demandes_attributions_classes')
        .select('id, enseignant_id, classe_id, classe_nom_propose, matiere_id, etablissement_id, annee_scolaire_id, created_at, classes(nom), matieres(nom), utilisateurs_profils:enseignant_id(nom, prenom)')
        .eq('etablissement_id', etablissementId)
        .eq('statut', 'EN_ATTENTE')
        .order('created_at', { ascending: true });
      setDemandesAttributionsRecues((demandesAttrib || []).map(d => ({ ...d, nomClasseEdite: d.classes?.nom || d.classe_nom_propose || '' })));
    }

    const { data: matieresData } = await supabase.from('matieres').select('id, nom, niveaux_applicables, series_applicables').order('nom', { ascending: true });
    setMatieresDisponibles(matieresData || []);

    const { data: documentsData } = await supabase
      .from('documents_etablissement')
      .select('id, titre, categorie, created_at, versions_document!fk_doc_version_courante(fichiers_metadonnees(cle_stockage, taille_octets))')
      .eq('etablissement_id', etablissementId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setDocumentsEtablissement((documentsData || []).map(d => ({
      ...d,
      cle_stockage: d.versions_document?.fichiers_metadonnees?.cle_stockage,
      taille_octets: d.versions_document?.fichiers_metadonnees?.taille_octets,
    })));

    const { data: personnel } = await supabase
      .from('personnel')
      .select('*')
      .eq('etablissement_id', etablissementId);
    setPersonnelAdministratifManuel((personnel || []).map(p => ({
      id: p.id, nomComplet: `${p.prenom} ${p.nom}`.trim(), role: p.fonction,
      matricule: 'N/A', contact: p.telephone || 'N/A', email: p.email || 'N/A',
    })));

    const { data: demande } = await supabase
      .from('demandes_changement_role')
      .select('*')
      .eq('user_id', user.id)
      .eq('etablissement_id', etablissementId)
      .eq('role_demande', 'CHEF')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (demande) {
      setDemandePromotion({
        date: new Date(demande.created_at).toLocaleDateString(),
        type: 'interne',
        ecoleCible: etab?.nom || '',
        statut: demande.statut === 'EN_ATTENTE' ? 'En attente de validation' : demande.statut,
      });
    }

    const { data: seances, error: erreurSeances } = await supabase
      .from('seances')
      .select(`
        id, date_prevue, statut, contenu_json,
        statut_visa, envoyee_at, visee_at, observation_visa,
        classes ( nom ),
        lecons (
          id, titre,
          cycles (
            id, titre, competence,
            programmes_annuels ( titre, proprietaire_user_id, matieres(nom),
              utilisateurs_profils:proprietaire_user_id (nom, prenom) )
          )
        )
      `)
      .in('statut', ['ENVOYEE', 'RECUE']);

    if (erreurSeances) {
      console.error('Erreur chargement séances (onglet Visa) :', erreurSeances);
      showToast("⚠️ Erreur de chargement des fiches à viser : " + erreurSeances.message);
    }

    const groupe = {};
    (seances || []).forEach((sc, index) => {
      const classeNom = sc.classes?.nom || 'Classe inconnue';
      const cycle = sc.lecons?.cycles;
      const programme = cycle?.programmes_annuels;
      
      if (!groupe[classeNom]) {
        groupe[classeNom] = {
          enseignant: `${programme?.utilisateurs_profils?.prenom || ''} ${programme?.utilisateurs_profils?.nom || ''}`.trim() || 'Inconnu',
          enseignantUserId: programme?.proprietaire_user_id || null,
          matiere: programme?.matieres?.nom || 'Non définie',
          anneeScolaire: annee?.intitule || '',
          cycles: [],
        };
      }
      let cy = groupe[classeNom].cycles.find(c => c.id === cycle?.id);
      if (!cy) {
        cy = { id: cycle?.id, titre: cycle?.titre || '', competence: cycle?.competence || '', lecons: [] };
        groupe[classeNom].cycles.push(cy);
      }
      let lc = cy.lecons.find(l => l.id === sc.lecons?.id);
      if (!lc) {
        lc = {
          id: sc.lecons?.id, titre: sc.lecons?.titre || '', seances: [],
          statutVisa: sc.lecons?.statut_visa || 'NON_ENVOYEE',
          observationVisa: sc.lecons?.observation_visa || '',
        };
        cy.lecons.push(lc);
      }
      lc.seances.push({
        id: sc.id,
        numero: index + 1,
        titre: sc.contenu_json?.titre || 'Séance',
        date: sc.date_prevue,
        viseParCenseur: sc.statut === 'VISEE',
        habilites: sc.contenu_json?.habilites || '',
        contenus: sc.contenu_json?.contenus || '',
        exercices: sc.contenu_json?.exercices || '',
      });
    });
    setProgrammesClasses(groupe);

    const { data: archive } = await supabase
      .from('bibliotheque_etablissement')
      .select('id, titre, created_at, contenu_snapshot_json, annee_scolaire_id, annees_scolaires(intitule), utilisateurs_profils:auteur_user_id (nom, prenom)')
      .eq('etablissement_id', etablissementId)
      .order('created_at', { ascending: false });

    setArchiveEcole((archive || []).map(a => ({
      id: a.id,
      enseignant: `${a.utilisateurs_profils?.prenom || ''} ${a.utilisateurs_profils?.nom || ''}`.trim(),
      matiere: a.contenu_snapshot_json?.matiere || 'Non définie',
      classe: a.contenu_snapshot_json?.classe || 'Général',
      titre: a.titre,
      anneeScolaire: a.annees_scolaires?.intitule || '',
      dateValidation: new Date(a.created_at).toLocaleDateString(),
      details: a.contenu_snapshot_json,
    })));

    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .is('lue_at', null)
      .order('created_at', { ascending: false });
    setNotificationsCenseur((notifs || []).map(n => ({
      id: n.id,
      texte: n.payload_json?.message || '',
      date: new Date(n.created_at).toLocaleDateString(),
      lu: false,
      lienCible: n.payload_json?.lien_cible,
    })));

    setChargementInitial(false);
  };

  useEffect(() => { chargerTout(); }, []);

  const [listeProfesseursEtablissementBrute, setListeProfesseursEtablissementBrute] = useState([]);
  const listeProfesseursEtablissement = listeProfesseursEtablissementBrute;

  const handleEnregistrerProfilCenseur = async (e) => {
    e.preventDefault();
    if (!userId) return;
    const { error } = await supabase
      .from('utilisateurs_profils')
      .update({ nom: formProfilCenseur.nom, prenom: formProfilCenseur.prenoms, telephone: formProfilCenseur.telephone || null })
      .eq('user_id', userId);
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    setInfosCenseur({ ...formProfilCenseur });
    setModalProfilCenseurOuvert(false);
    showToast("✅ Profil mis à jour !");
  };

  const handleChangerPhotoProfil = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormProfilCenseur(prev => ({ ...prev, photoProfil: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const [inputCodeEtablissementCenseur, setInputCodeEtablissementCenseur] = useState('');
  const [envoiDemandeRejoindreEnCours, setEnvoiDemandeRejoindreEnCours] = useState(false);
  const [nouvelleInvitationEnseignantEmail, setNouvelleInvitationEnseignantEmail] = useState('');

  const genererTokenInvitation = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  const envoyerInvitationEnseignant = async (e) => {
    e.preventDefault();
    if (!nouvelleInvitationEnseignantEmail.trim() || !affiliationCenseur) return;

    const { error } = await supabase
      .from('invitations')
      .insert({
        etablissement_id: affiliationCenseur.etablissement_id,
        invite_par_user_id: userId,
        email: nouvelleInvitationEnseignantEmail.trim().toLowerCase(),
        role_propose: 'ENSEIGNANT',
        token: genererTokenInvitation(),
        expire_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (error) { showToast("⚠️ Erreur d'envoi de l'invitation : " + error.message); return; }

    setNouvelleInvitationEnseignantEmail('');
    showToast(`📨 Invitation envoyée !`);
  };

  const approuverDemandeAffiliationEnseignant = async (demande) => {
    if (!affiliationCenseur) return;
    const { error: erreurAff } = await supabase.from('affiliations_etablissement').insert({
      user_id: demande.user_id,
      etablissement_id: affiliationCenseur.etablissement_id,
      role: 'ENSEIGNANT',
      statut: 'ACTIVE',
      date_debut: new Date().toISOString().slice(0, 10),
    });
    if (erreurAff) { showToast("⚠️ Erreur : " + erreurAff.message); return; }

    const { error: erreurMaj } = await supabase
      .from('demandes_affiliation')
      .update({ statut: 'ACCEPTEE', traite_par_user_id: userId, traite_at: new Date().toISOString() })
      .eq('user_id', demande.user_id)
      .eq('etablissement_id', affiliationCenseur.etablissement_id)
      .eq('role_demande', 'ENSEIGNANT')
      .eq('statut', 'EN_ATTENTE');
    if (erreurMaj) {
      showToast("⚠️ Affiliation créée, mais la demande n'a pas pu être clôturée : " + erreurMaj.message);
      return;
    }

    await envoyerNotification(
      demande.user_id, 'DEMANDE_AFFILIATION_ACCEPTEE',
      `✅ Votre demande pour rejoindre l'établissement en tant qu'enseignant a été acceptée !`,
      'affiliation', affiliationCenseur.etablissement_id
    );

    setDemandesAffiliationEnseignants(prev => prev.filter(d => d.user_id !== demande.user_id));
    showToast("✅ Demande approuvée, l'enseignant a maintenant accès à l'établissement !");
  };

  const refuserDemandeAffiliationEnseignant = async (demande) => {
    const { error } = await supabase
      .from('demandes_affiliation')
      .update({ statut: 'REFUSEE', traite_par_user_id: userId, traite_at: new Date().toISOString() })
      .eq('user_id', demande.user_id)
      .eq('etablissement_id', affiliationCenseur.etablissement_id)
      .eq('role_demande', 'ENSEIGNANT')
      .eq('statut', 'EN_ATTENTE');
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }

    await envoyerNotification(
      demande.user_id, 'DEMANDE_AFFILIATION_REFUSEE',
      `❌ Votre demande pour rejoindre l'établissement en tant qu'enseignant a été refusée.`,
      'affiliation', affiliationCenseur.etablissement_id
    );

    setDemandesAffiliationEnseignants(prev => prev.filter(d => d.user_id !== demande.user_id));
    showToast("❌ Demande refusée.");
  };

  const soumettreDemandeDepartCenseur = async (e) => {
    e.preventDefault();
    if (!userId || !affiliationCenseur) return;

    const { error } = await supabase
      .from('demandes_depart')
      .insert({
        user_id: userId,
        etablissement_id: affiliationCenseur.etablissement_id,
        affiliation_id: affiliationCenseur.id,
        role_demandeur: 'CENSEUR',
        motif: motifDepartCenseur.trim() || null,
      });

    if (error) { showToast("⚠️ Erreur : " + error.message); return; }

    setDemandeDepartCenseurEnCours(true);
    setModalDepartCenseurOuvert(false);
    setMotifDepartCenseur('');
    showToast("📤 Demande de départ transmise au chef d'établissement pour validation !");
  };

  const creerClassesEnLot = async (e) => {
    e.preventDefault();
    if (!affiliationCenseur || !anneeActiveId) { showToast("⚠️ Aucune année scolaire active."); return; }
    const niveau = nouveauLotNiveau.trim();
    const nombre = parseInt(nouveauLotNombre, 10);
    if (!niveau || !nombre || nombre < 1) { showToast("⚠️ Veuillez compléter le niveau et le nombre de classes."); return; }
    
    const suffixes = nouveauLotStyle === 'alphabetique'
      ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, nombre).split('')
      : Array.from({ length: nombre }, (_, i) => String(i + 1));
      
    const noms = suffixes.map(suf => `${niveau}${nouveauLotSeparateur}${suf}`);

    const lignes = noms.map(nom => ({
      etablissement_id: affiliationCenseur.etablissement_id,
      annee_scolaire_id: anneeActiveId,
      nom,
      niveau: niveau,
    }));

    const { error } = await supabase
      .from('classes')
      .upsert(lignes, { onConflict: 'etablissement_id,annee_scolaire_id,nom', ignoreDuplicates: true });

    if (error) { showToast("⚠️ Erreur : " + error.message); return; }

    const { data: classesRafraichies } = await supabase
      .from('classes')
      .select('id, nom, niveau, serie')
      .eq('etablissement_id', affiliationCenseur.etablissement_id)
      .eq('annee_scolaire_id', anneeActiveId)
      .is('deleted_at', null)
      .order('nom', { ascending: true });
    setClassesEtablissement(classesRafraichies || []);

    setNouveauLotNiveau(''); setNouveauLotNombre('');
    showToast(`✅ ${noms.length} classe(s) créée(s) pour "${niveau}" !`);
  };

  const genererNomsSecondCycle = () => {
    const items = [];
    Object.entries(seriesChoisiesSecondCycle).forEach(([code, nombreBrut]) => {
      if (nombreBrut === undefined || nombreBrut === '') return;
      const nombre = parseInt(nombreBrut, 10) || 1;
      if (nombre <= 1) {
        items.push({ nom: `${niveauSecondCycle}${separateurSecondCycle}${code}`, serie: code });
      } else {
        for (let i = 1; i <= nombre; i++) items.push({ nom: `${niveauSecondCycle}${separateurSecondCycle}${code}${i}`, serie: code });
      }
    });
    return items;
  };

  const creerClassesSecondCycle = async (e) => {
    e.preventDefault();
    if (!affiliationCenseur || !anneeActiveId) { showToast("⚠️ Aucune année scolaire active."); return; }
    const items = genererNomsSecondCycle();
    if (items.length === 0) { showToast("⚠️ Choisissez au moins une série avec un nombre de classes."); return; }

    const lignes = items.map(({ nom, serie }) => ({
      etablissement_id: affiliationCenseur.etablissement_id,
      annee_scolaire_id: anneeActiveId,
      nom,
      niveau: niveauSecondCycle,
      serie,
    }));

    const { error } = await supabase
      .from('classes')
      .upsert(lignes, { onConflict: 'etablissement_id,annee_scolaire_id,nom', ignoreDuplicates: true });

    if (error) { showToast("⚠️ Erreur : " + error.message); return; }

    const { data: classesRafraichies } = await supabase
      .from('classes')
      .select('id, nom, niveau, serie')
      .eq('etablissement_id', affiliationCenseur.etablissement_id)
      .eq('annee_scolaire_id', anneeActiveId)
      .is('deleted_at', null)
      .order('nom', { ascending: true });
    setClassesEtablissement(classesRafraichies || []);

    setSeriesChoisiesSecondCycle({});
    showToast(`✅ ${items.length} classe(s) créée(s) pour ${niveauSecondCycle} !`);
  };

  const trouverOuCreerMatiere = async (nomMatiere) => {
    const nom = nomMatiere.trim();
    if (!nom) return null;
    const existante = matieresDisponibles.find(m => m.nom.toLowerCase() === nom.toLowerCase());
    if (existante) return existante.id;
    const { data: nouvelle, error } = await supabase.from('matieres').insert({ nom }).select().single();
    if (error) {
      const { data: relue } = await supabase.from('matieres').select('id').eq('nom', nom).maybeSingle();
      if (relue) return relue.id;
      showToast("⚠️ Erreur matière : " + error.message);
      return null;
    }
    setMatieresDisponibles(prev => [...prev, nouvelle]);
    return nouvelle.id;
  };

  const matieresPourClasse = (classeOuClasses) => matieresDisponibles;

  const enregistrerProgrammeMatiere = async (matiereId, niveaux, series) => {
    const { data, error } = await supabase
      .from('matieres')
      .update({ niveaux_applicables: niveaux, series_applicables: series })
      .eq('id', matiereId)
      .select('id, nom, niveaux_applicables, series_applicables')
      .single();
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    setMatieresDisponibles(prev => prev.map(m => m.id === matiereId ? data : m));
    setMatiereProgrammeOuverte(null);
    showToast(`✅ Programme mis à jour pour "${data.nom}" !`);
  };

  const ouvrirProgrammeMatiere = (matiere) => {
    setMatiereProgrammeOuverte(matiere.id);
    setBrouillonProgrammeMatiere({
      niveaux: matiere.niveaux_applicables || [],
      series: matiere.series_applicables || [],
    });
  };

  const [nouvelleMatiereNomCatalogue, setNouvelleMatiereNomCatalogue] = useState('');
  const [matiereEnRenommage, setMatiereEnRenommage] = useState({ id: null, nom: '' });

  const ajouterMatiereAuCatalogue = async (e) => {
    e.preventDefault();
    const id = await trouverOuCreerMatiere(nouvelleMatiereNomCatalogue);
    if (id) {
      setNouvelleMatiereNomCatalogue('');
      showToast("✅ Matière ajoutée au catalogue !");
    }
  };

  const renommerMatiere = async (e) => {
    e.preventDefault();
    if (!matiereEnRenommage.nom.trim()) return;
    const { data, error } = await supabase
      .from('matieres')
      .update({ nom: matiereEnRenommage.nom.trim() })
      .eq('id', matiereEnRenommage.id)
      .select('id, nom, niveaux_applicables, series_applicables')
      .single();
    if (error) {
      if (error.code === '23505') showToast("⚠️ Une matière porte déjà ce nom.");
      else showToast("⚠️ Erreur : " + error.message);
      return;
    }
    setMatieresDisponibles(prev => prev.map(m => m.id === data.id ? data : m));
    setMatiereEnRenommage({ id: null, nom: '' });
    showToast("✅ Matière renommée !");
  };

  // Attribution multi-classes / multi-matières optimisée (Fiche Professeur)
  const attribuerClasseDirectement = async (e) => {
    e.preventDefault();
    if (!formAttribution.enseignantId || formAttribution.classesIds.length === 0 || !affiliationCenseur || !anneeActiveId) {
      showToast("⚠️ Merci de choisir l'enseignant et au moins une classe.");
      return;
    }
    if (formAttribution.matiereIdsChoisies.length === 0) {
      showToast("⚠️ Merci de cocher au moins une matière.");
      return;
    }
    const matiereIds = formAttribution.matiereIdsChoisies;

    const lignes = [];
    formAttribution.classesIds.forEach(classeId => {
      matiereIds.forEach(matiereId => {
        lignes.push({
          enseignant_id: formAttribution.enseignantId,
          classe_id: classeId,
          etablissement_id: affiliationCenseur.etablissement_id,
          annee_scolaire_id: anneeActiveId,
          matiere_id: matiereId,
        });
      });
    });

    const { error } = await supabase.from('attributions_classes').insert(lignes);
    if (error) {
      if (error.code === '23505') showToast("⚠️ Une ou plusieurs de ces attributions existent déjà.");
      else showToast("⚠️ Erreur : " + error.message);
      return;
    }
    showToast(`✅ ${lignes.length} attribution(s) créée(s) avec succès !`);

    await envoyerNotification(
      formAttribution.enseignantId, 'CLASSE_ATTRIBUEE',
      `🏫 On vous a attribué ${lignes.length} attribution(s) de classe/matière`,
      'cycles', affiliationCenseur.etablissement_id
    );

    setFormAttribution({ enseignantId: '', classesIds: [], matiereIdsChoisies: [] });
    chargerTout();
  };

  const [modalGererClasses, setModalGererClasses] = useState({ ouvert: false, prof: null, attributions: [] });
  const [formAjoutAttribution, setFormAjoutAttribution] = useState({ classeId: '', matiereIdsChoisies: [] });

  const ouvrirGestionClasses = async (prof) => {
    const { data } = await supabase
      .from('attributions_classes')
      .select('id, classe_id, matiere_id, classes(nom), matieres(nom)')
      .eq('enseignant_id', prof.userId)
      .eq('etablissement_id', affiliationCenseur.etablissement_id)
      .eq('annee_scolaire_id', anneeActiveId || '00000000-0000-0000-0000-000000000000');
    setModalGererClasses({ ouvert: true, prof, attributions: data || [] });
    setFormAjoutAttribution({ classeId: '', matiereIdsChoisies: [] });
  };

  const retirerAttributionEnseignant = (attribution) => {
    setModalConfirmation({
      ouvert: true,
      titre: 'Retirer cette classe ?',
      message: `Retirer "${attribution.classes?.nom}" (${attribution.matieres?.nom}) de la liste de ${modalGererClasses.prof?.nomComplet} ?`,
      actionCallback: async () => {
        const { error } = await supabase.from('attributions_classes').delete().eq('id', attribution.id);
        if (error) { showToast("⚠️ Erreur : " + error.message); return; }
        setModalGererClasses(prev => ({ ...prev, attributions: prev.attributions.filter(a => a.id !== attribution.id) }));
        chargerTout();
        showToast("🗑️ Classe retirée.");
      },
    });
  };

  const ajouterAttributionEnseignant = async (e) => {
    e.preventDefault();
    if (!formAjoutAttribution.classeId || !modalGererClasses.prof) {
      showToast("⚠️ Merci de choisir une classe.");
      return;
    }
    if (formAjoutAttribution.matiereIdsChoisies.length === 0) {
      showToast("⚠️ Merci de cocher au moins une matière.");
      return;
    }
    const matiereIds = formAjoutAttribution.matiereIdsChoisies;

    const lignes = matiereIds.map(matiereId => ({
      enseignant_id: modalGererClasses.prof.userId,
      classe_id: formAjoutAttribution.classeId,
      etablissement_id: affiliationCenseur.etablissement_id,
      annee_scolaire_id: anneeActiveId,
      matiere_id: matiereId,
    }));

    const { data: nouvelles, error } = await supabase.from('attributions_classes').insert(lignes).select('id, classe_id, matiere_id, classes(nom), matieres(nom)');

    if (error) {
      if (error.code === '23505') showToast("⚠️ Une ou plusieurs de ces attributions existent déjà.");
      else showToast("⚠️ Erreur : " + error.message);
      return;
    }
    setModalGererClasses(prev => ({ ...prev, attributions: [...prev.attributions, ...(nouvelles || [])] }));

    for (const nouvelle of (nouvelles || [])) {
      await envoyerNotification(
        modalGererClasses.prof.userId, 'CLASSE_ATTRIBUEE',
        `🏫 On vous a attribué la classe "${nouvelle.classes?.nom}" en ${nouvelle.matieres?.nom}`,
        'cycles', affiliationCenseur.etablissement_id
      );
    }

    setFormAjoutAttribution({ classeId: '', matiereIdsChoisies: [] });
    chargerTout();
    showToast(`✅ ${lignes.length} matière(s) ajoutée(s) !`);
  };

  // Traitement d'une proposition avec possibilité de modifier le nom de classe ou la matière avant acceptation
  const [modalEditionProposition, setModalEditionProposition] = useState({ ouvert: false, demande: null, classeNomModifie: '', matiereIdModifie: '' });

  const approuverDemandeAttribution = async (demande) => {
    let classeId = demande.classe_id;
    const nomFinal = (demande.nomClasseEdite || demande.classe_nom_propose || '').trim();

    if (!classeId) {
      if (!nomFinal) { showToast("⚠️ Merci d'indiquer le nom de la classe avant d'accepter."); return; }

      const { data: classeExistante } = await supabase
        .from('classes')
        .select('id')
        .eq('etablissement_id', demande.etablissement_id)
        .eq('annee_scolaire_id', demande.annee_scolaire_id)
        .eq('nom', nomFinal)
        .maybeSingle();

      if (classeExistante) {
        classeId = classeExistante.id;
      } else {
        const { data: nouvelleClasse, error: erreurClasse } = await supabase
          .from('classes')
          .insert({ etablissement_id: demande.etablissement_id, annee_scolaire_id: demande.annee_scolaire_id, nom: nomFinal })
          .select()
          .single();
        if (erreurClasse) { showToast("⚠️ Erreur création classe : " + erreurClasse.message); return; }
        classeId = nouvelleClasse.id;
        setClassesEtablissement(prev => [...prev, nouvelleClasse].sort((a, b) => a.nom.localeCompare(b.nom)));
      }
    }

    const { error } = await supabase
      .from('demandes_attributions_classes')
      .update({ statut: 'ACCEPTEE', traitee_par_user_id: userId, classe_id: classeId })
      .eq('id', demande.id);
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }

    await envoyerNotification(
      demande.enseignant_id, 'PROPOSITION_ACCEPTEE',
      `✅ Votre proposition de classe "${nomFinal}" a été acceptée !`,
      'cycles', demande.etablissement_id
    );

    setDemandesAttributionsRecues(prev => prev.filter(d => d.id !== demande.id));
    showToast("✅ Proposition acceptée et enregistrée !");
    chargerTout();
  };

  const refuserDemandeAttribution = (demande, description) => {
    setModalConfirmation({
      ouvert: true,
      titre: 'Refuser cette proposition ?',
      message: `Refuser la proposition de ${description} ?`,
      actionCallback: async () => {
        const { error } = await supabase
          .from('demandes_attributions_classes')
          .update({ statut: 'REFUSEE', traitee_par_user_id: userId })
          .eq('id', demande.id);
        if (error) { showToast("⚠️ Erreur : " + error.message); return; }

        await envoyerNotification(
          demande.enseignant_id, 'PROPOSITION_REFUSEE',
          `❌ Votre proposition de classe a été refusée.`,
          'cycles', demande.etablissement_id
        );

        setDemandesAttributionsRecues(prev => prev.filter(d => d.id !== demande.id));
        showToast("❌ Proposition refusée.");
      },
    });
  };

  const soumettreDemandeRejoindre = async (e) => {
    e.preventDefault();
    if (!inputCodeEtablissementCenseur.trim() || !userId) return;
    if (envoiDemandeRejoindreEnCours) return;
    setEnvoiDemandeRejoindreEnCours(true);

    const { data: etablissementCible, error: erreurRecherche } = await supabase
      .from('etablissements').select('id, nom').eq('code', inputCodeEtablissementCenseur.trim()).maybeSingle();

    if (erreurRecherche || !etablissementCible) {
      showToast("⚠️ Aucun établissement trouvé avec ce code.");
      setEnvoiDemandeRejoindreEnCours(false);
      return;
    }

    const { data: demandeExistante } = await supabase
      .from('demandes_affiliation')
      .select('id')
      .eq('user_id', userId)
      .eq('etablissement_id', etablissementCible.id)
      .eq('role_demande', 'CENSEUR')
      .eq('statut', 'EN_ATTENTE')
      .maybeSingle();

    if (demandeExistante) {
      showToast("⚠️ Une demande est déjà en attente pour cet établissement.");
      setEnvoiDemandeRejoindreEnCours(false);
      return;
    }

    const { error } = await supabase
      .from('demandes_affiliation')
      .insert({ user_id: userId, etablissement_id: etablissementCible.id, role_demande: 'CENSEUR' });

    if (error) {
      if (error.code === '23505') {
        showToast("⚠️ Une demande est déjà en attente pour cet établissement.");
      } else {
        showToast("⚠️ Erreur : " + error.message);
      }
      setEnvoiDemandeRejoindreEnCours(false);
      return;
    }

    showToast(`📨 Demande envoyée pour "${etablissementCible.nom}". En attente d'approbation du chef.`);
    setEnvoiDemandeRejoindreEnCours(false);
  };

  const envoyerDemandePromotion = async (e) => {
    e.preventDefault();
    if (!userId || !affiliationCenseur) return;

    if (formPromotion.type === 'interne') {
      const { error } = await supabase
        .from('demandes_changement_role')
        .insert({
          user_id: userId,
          etablissement_id: affiliationCenseur.etablissement_id,
          role_actuel: 'CENSEUR',
          role_demande: 'CHEF',
        });
      if (error) { showToast("⚠️ Erreur : " + error.message); return; }
      setDemandePromotion({ date: new Date().toLocaleDateString(), type: 'interne', ecoleCible: infosCenseur.etablissement, statut: 'En attente de validation' });
      showToast("🚀 Demande d'évolution vers le poste de Proviseur envoyée !");
      return;
    }

    const { data: etablissementCible, error: erreurRecherche } = await supabase
      .from('etablissements')
      .select('id, nom')
      .ilike('nom', formPromotion.ecoleCible.trim())
      .maybeSingle();

    if (erreurRecherche || !etablissementCible) {
      showToast("⚠️ Établissement cible introuvable. Vérifiez le nom exact.");
      return;
    }

    const { error: erreurDemande } = await supabase
      .from('demandes_affiliation')
      .insert({ user_id: userId, etablissement_id: etablissementCible.id, role_demande: 'CHEF' });

    if (erreurDemande) { showToast("⚠️ Erreur : " + erreurDemande.message); return; }
    setDemandePromotion({ date: new Date().toLocaleDateString(), type: 'externe', ecoleCible: etablissementCible.nom, statut: 'En attente de validation' });
    showToast("🚀 Demande de mutation envoyée !");
  };

  const viserEtArchiverSeance = async (classeKey, cycleId, leconId, seanceAViser) => {
    const prog = programmesClasses[classeKey];
    if (!prog || !affiliationCenseur) return;

    const { error: erreurVisa } = await supabase
      .from('seances')
      .update({ statut: 'VISEE', visee_par_user_id: userId, visee_at: new Date().toISOString() })
      .eq('id', seanceAViser.id);

    if (erreurVisa) { showToast("⚠️ Erreur de visa : " + erreurVisa.message); return; }

    const { error: erreurArchive } = await supabase
      .from('bibliotheque_etablissement')
      .insert({
        etablissement_id: affiliationCenseur.etablissement_id,
        annee_scolaire_id: anneeActiveId,
        seance_origine_id: seanceAViser.id,
        auteur_user_id: userId,
        titre: seanceAViser.titre,
        contenu_snapshot_json: { matiere: prog.matiere, classe: classeKey, ...seanceAViser },
      });

    if (erreurArchive) { showToast("⚠️ Visa enregistré, mais erreur d'archivage : " + erreurArchive.message); }

    if (prog.enseignantUserId) {
      await envoyerNotification(
        prog.enseignantUserId, 'FICHE_VISEE',
        `✅ Votre séance "${seanceAViser.titre}" (${classeKey}) a été visée par le censeur`,
        'cycles', affiliationCenseur.etablissement_id
      );
    }

    showToast(`✅ Séance visée et archivée !`);
    chargerTout();
  };

  const viserLecon = async (leconId, enseignantUserId, leconTitre) => {
    const { error } = await supabase
      .from('lecons')
      .update({ statut_visa: 'VISEE', visee_par_user_id: userId, visee_at: new Date().toISOString() })
      .eq('id', leconId);
    if (error) { showToast("⚠️ Erreur de visa : " + error.message); return; }
    
    await envoyerNotification(
      enseignantUserId,
      'SUCCESS',
      `Votre fiche de leçon "${leconTitre}" a été visée par le censeur.`,
      'cycles',
      affiliationCenseur.etablissement_id
    );

    showToast("✅ Fiche de leçon visée !");
    chargerTout();
  };

  const retournerLecon = (leconId, enseignantUserId, leconTitre) => {
    setModalConfirmation({
      ouvert: true,
      titre: 'Retourner cette fiche de leçon ?',
      message: "L'enseignant devra la corriger avant de pouvoir la renvoyer. Une notification lui sera envoyée.",
      actionCallback: async () => {
        const { error } = await supabase
          .from('lecons')
          .update({ statut_visa: 'RETOURNEE', visee_par_user_id: userId, visee_at: new Date().toISOString() })
          .eq('id', leconId);
        if (error) { showToast("⚠️ Erreur : " + error.message); return; }
        
        await envoyerNotification(
          enseignantUserId,
          'ALERT',
          `⚠️ Votre fiche de leçon "${leconTitre}" a été retournée par le censeur pour corrections.`,
          'cycles',
          affiliationCenseur.etablissement_id
        );

        showToast("↩️ Fiche de leçon retournée à l'enseignant.");
        chargerTout();
      },
    });
  };

  const telechargerPDFArchive = (item) => {
    const fenetre = window.open('', '_blank');
    if (!fenetre) return;
    fenetre.document.write(
      '<html><head><title>Fiche - ' + item.titre + '</title><style>body{font-family:Arial;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:10px;text-align:left;}</style></head>' +
      '<body><h2>ARCHIVE PÉDAGOGIQUE OFFICIELLE</h2><p><strong>Enseignant :</strong> ' + item.enseignant + ' | <strong>Classe :</strong> ' + item.classe + '</p><p><strong>Titre :</strong> ' + item.titre + '</p>' +
      '<table><tr><th>Contenus</th><td>' + (item.details?.contenus || 'Voir plateforme') + '</td></tr></table>' +
      '<script>window.onload=function(){window.print();window.close();}</script></body></html>'
    );
    fenetre.document.close();
  };

  const fichesPedagogiquesEcole = useMemo(() => archiveEcole, [archiveEcole]);

  const classesArchiveDisponibles = useMemo(() => {
    return [...new Set(fichesPedagogiquesEcole.map(f => f.classe).filter(Boolean))].sort();
  }, [fichesPedagogiquesEcole]);
  const matieresArchiveDisponibles = useMemo(() => {
    return [...new Set(fichesPedagogiquesEcole.map(f => f.matiere).filter(Boolean))].sort();
  }, [fichesPedagogiquesEcole]);
  const anneesArchiveDisponibles = useMemo(() => {
    return [...new Set(fichesPedagogiquesEcole.map(f => f.anneeScolaire).filter(Boolean))].sort().reverse();
  }, [fichesPedagogiquesEcole]);

  const fichesFiltrees = useMemo(() => {
    const texte = filtreArchiveTexte.trim().toLowerCase();
    return fichesPedagogiquesEcole.filter(fiche => {
      const matchMat = filtreArchiveMatiere === 'TOUTES' || fiche.matiere === filtreArchiveMatiere;
      const matchCl = filtreArchiveClasse === 'TOUTES' || fiche.classe === filtreArchiveClasse;
      const matchAnnee = filtreArchiveAnnee === 'TOUTES' || fiche.anneeScolaire === filtreArchiveAnnee;
      const matchTexte = !texte || (fiche.titre || '').toLowerCase().includes(texte) || (fiche.enseignant || '').toLowerCase().includes(texte);
      return matchMat && matchCl && matchAnnee && matchTexte;
    });
  }, [fichesPedagogiquesEcole, filtreArchiveMatiere, filtreArchiveClasse, filtreArchiveAnnee, filtreArchiveTexte]);

  const fichesParClasse = useMemo(() => {
    const groupes = {};
    fichesFiltrees.forEach(fiche => {
      const classe = fiche.classe || 'Sans classe';
      if (!groupes[classe]) groupes[classe] = [];
      groupes[classe].push(fiche);
    });
    return Object.entries(groupes).sort(([a], [b]) => a.localeCompare(b));
  }, [fichesFiltrees]);

  const nombreFichesTotalEnAttente = useMemo(() => {
    return Object.values(programmesClasses || {}).reduce((total, prog) =>
      total + (prog.cycles || []).reduce((sousTotal, cy) =>
        sousTotal + (cy.lecons || []).reduce((s, lc) =>
          s + (lc.seances || []).filter(sc => !sc.viseParCenseur).length, 0), 0), 0);
  }, [programmesClasses]);

  const apercuLotClasses = (() => {
    const niveau = nouveauLotNiveau.trim();
    if (!niveau) return [];
    const nombre = parseInt(nouveauLotNombre, 10);
    if (!nombre || nombre < 1) return [];
    const suffixes = nouveauLotStyle === 'alphabetique'
      ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, nombre).split('')
      : Array.from({ length: nombre }, (_, i) => String(i + 1));
    return suffixes.map(suf => `${niveau}${nouveauLotSeparateur}${suf}`);
  })();

  const seriesSecondCycleFiltrees = useMemo(() => {
    const type = ecoleConfigGlobale.typeEnseignement || 'GENERAL';
    if (type === 'MIXTE') return SERIES_SECOND_CYCLE;
    return SERIES_SECOND_CYCLE.filter(s => s.type === type);
  }, [ecoleConfigGlobale.typeEnseignement]);

  const professeursFiltres = useMemo(() => {
    return listeProfesseursEtablissement.filter(prof => {
      const matchCl = filtreProfClasse === 'TOUTES' || (Array.isArray(prof.classes) && prof.classes.includes(filtreProfClasse));
      return matchCl;
    });
  }, [listeProfesseursEtablissement, filtreProfClasse]);

  if (chargementInitial) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff' }}>
        Chargement de votre espace...
      </div>
    );
  }

  if (!affiliationCenseur) {
    return (
      <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', boxSizing: 'border-box' }}>
          <h2 style={{ color: '#0f172a', marginBottom: '8px', textAlign: 'center', fontSize: '22px', fontWeight: '800' }}>Espace Censeur</h2>
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '24px', lineHeight: '1.5' }}>
            Entrez le code de l'établissement que vous souhaitez rejoindre. Votre demande sera soumise au chef d'établissement pour approbation.
          </p>
          {message && <div style={{ ...styles.toastSuccess, marginBottom: '16px' }}>{message}</div>}
          <form onSubmit={soumettreDemandeRejoindre} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={styles.label}>Code de l'établissement</label>
              <input type="text" placeholder="Ex: LYCMOD-A1B2" value={inputCodeEtablissementCenseur} onChange={(e) => setInputCodeEtablissementCenseur(e.target.value)} style={styles.inputStyle} required />
            </div>
            <button type="submit" className="bouton bouton-principal" style={{ marginTop: '6px' }} disabled={envoiDemandeRejoindreEnCours}>{envoiDemandeRejoindreEnCours ? 'Envoi...' : 'Envoyer la demande'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.darkNavbar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '8px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }} ref={profilCenseurRef}>
            <button onClick={() => setProfilCenseurOuvert(!profilCenseurOuvert)} style={styles.navbarTeacherClickableBlock}>
              <div style={styles.avatarNavbarContainer}>
                {infosCenseur.photoProfil ? (
                  <img src={infosCenseur.photoProfil} alt="Profil" style={styles.avatarNavbarImg} />
                ) : (
                  <div style={styles.avatarNavbarPlaceholder}>👤</div>
                )}
              </div>
              <div style={styles.navbarTeacherInfo}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '100%' }}>
                  {infosCenseur.civilite} {infosCenseur.nom}
                </span>
                <span style={{ fontSize: '9px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase' }}>
                  Censeur
                </span>
              </div>
              <span style={{ fontSize: '9px', color: '#94a3b8', marginLeft: '2px' }}>{profilCenseurOuvert ? '▲' : '▼'}</span>
            </button>

            {profilCenseurOuvert && (
              <div style={{ ...styles.notificationDropdown, left: 0, right: 'auto' }}>
                <div style={styles.dropdownHeader}>Mon Compte Censeur</div>
                <div style={{ padding: '10px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #e2e8f0', marginBottom: '6px', background: '#f8fafc', borderRadius: '8px' }}>
                  <strong>{infosCenseur.civilite} {infosCenseur.nom} {infosCenseur.prenoms}</strong><br />
                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                    {infosCenseur.etablissement}<br />
                    <em>{infosCenseur.role}</em>
                  </span>
                </div>
                <button onClick={() => { setFormProfilCenseur({ ...infosCenseur }); setModalProfilCenseurOuvert(true); setProfilCenseurOuvert(false); }} className="bouton-option">
                  ⚙️ Mon Profil & Sécurité
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.08)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <span style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px' }}>E-cahier !</span>
            <span style={{ fontSize: '12px' }}>📖</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }} ref={notifCenseurRef}>
              <button onClick={() => setNotifCenseurOuvert(!notifCenseurOuvert)} style={styles.navDarkBtn}>
                <span>🔔</span>{(notificationsCenseur || []).length > 0 && <span style={styles.pastilleAlerte}>{(notificationsCenseur || []).length}</span>}
              </button>
              {notifCenseurOuvert && (
                <div style={{ ...styles.notificationDropdown, right: 0, left: 'auto' }}>
                  <div style={styles.dropdownHeader}>Notifications</div>
                  {(notificationsCenseur || []).length === 0 ? (
                    <p style={{ fontSize: '11px', color: '#94a3b8', padding: '8px', fontStyle: 'italic' }}>Aucune nouvelle notification.</p>
                  ) : (
                    (notificationsCenseur || []).map(n => (
                      <div key={n.id} onClick={() => marquerNotificationLue(n)} style={styles.notifItem}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#334155' }}>{n.texte}</p><span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }} ref={menuBurgerCenseurRef}>
              <button onClick={() => setMenuBurgerCenseurOuvert(!menuBurgerCenseurOuvert)} style={styles.burgerBtn}>☰</button>
              {menuBurgerCenseurOuvert && (
                <div style={{ ...styles.burgerDropdown, right: 0, left: 'auto' }} className="anim-apparition">
                  <div style={styles.dropdownHeader}>Menu Censeur</div>
                  <button onClick={() => { setActiveTab('visa'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option" style={{color: '#2563eb', fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span>✍️ Visa & File d'Attente</span>
                    {nombreFichesTotalEnAttente > 0 && (
                      <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: '900', padding: '1px 7px', borderRadius: '999px' }}>{nombreFichesTotalEnAttente}</span>
                    )}
                  </button>
                  <button onClick={() => { setActiveTab('fichiers_pedagogiques'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">📚 Archives Pédagogiques</button>
                  <button onClick={() => { setActiveTab('progression'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">📊 Programme & Progression</button>
                  <button onClick={() => { setActiveTab('professeurs'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">👨‍🏫 Annuaire Personnel</button>
                  <button onClick={() => { setActiveTab('classes'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">🏫 Classes & Attributions</button>
                  <button onClick={() => { setActiveTab('documents'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">📤 Documents d'Établissement</button>
                  <button onClick={() => { setActiveTab('suivi'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">⏰ Suivi & Rappels</button>
                  <button onClick={() => { setActiveTab('profil_ecole'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option">🏛️ Profil Établissement</button>
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '6px 0', paddingTop: '6px' }}>
                    <button onClick={() => { setActiveTab('evolution'); setMenuBurgerCenseurOuvert(false); }} className="bouton-option" style={{ color: '#8b5cf6', fontWeight: '800' }}>🎓 Évolution de carrière</button>
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                    <button onClick={() => { setModalDeconnexion(true); setMenuBurgerCenseurOuvert(false); }} className="bouton-option" style={{ color: '#ef4444', fontWeight: '900', textAlign: 'center' }}>🚪 Se déconnecter</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

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

        {modalGererClasses.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>✏️ Classes de {modalGererClasses.prof?.nomComplet}</h3>
                <button onClick={() => setModalGererClasses({ ouvert: false, prof: null, attributions: [] })} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>Modifiable à tout moment — corrige une erreur d'attribution sans repasser par une demande.</p>

              {modalGererClasses.attributions.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px', marginBottom: '14px' }}>Aucune classe attribuée pour l'instant.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {modalGererClasses.attributions.map(attribution => (
                    <div key={attribution.id} style={{ ...styles.itemRow, backgroundColor: '#f8fafc' }}>
                      <span style={{ fontSize: '13px' }}><strong>{attribution.classes?.nom}</strong> — {attribution.matieres?.nom}</span>
                      <button onClick={() => retirerAttributionEnseignant(attribution)} className="bouton bouton-danger" style={{ fontSize: '11px', padding: '4px 8px' }}>Retirer</button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={ajouterAttributionEnseignant} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <select value={formAjoutAttribution.classeId} onChange={(e) => setFormAjoutAttribution({ ...formAjoutAttribution, classeId: e.target.value, matiereIdsChoisies: [] })} style={styles.inputStyle} required>
                  <option value="">— Classe —</option>
                  {classesEtablissement.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
                {(() => {
                  const classeChoisie = classesEtablissement.find(c => c.id === formAjoutAttribution.classeId);
                  const matieresProposees = matieresPourClasse(classeChoisie ? [classeChoisie] : []);
                  return (
                    <div>
                      {matieresProposees.length === 0 ? (
                        <p style={{ fontSize: '11px', color: '#991b1b', margin: 0 }}>Aucune matière au catalogue ne correspond à cette classe.</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                          {matieresProposees.map(m => {
                            const estCochee = formAjoutAttribution.matiereIdsChoisies.includes(m.id);
                            return (
                              <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', padding: '5px 8px', borderRadius: '8px', backgroundColor: estCochee ? '#f0fdf4' : '#f8fafc', cursor: 'pointer', fontSize: '11px', fontWeight: '700', color: estCochee ? '#166534' : '#334155' }}>
                                <input
                                  type="checkbox"
                                  checked={estCochee}
                                  onChange={() => {
                                    const updated = estCochee ? formAjoutAttribution.matiereIdsChoisies.filter(id => id !== m.id) : [...formAjoutAttribution.matiereIdsChoisies, m.id];
                                    setFormAjoutAttribution({ ...formAjoutAttribution, matiereIdsChoisies: updated });
                                  }}
                                />
                                📚 {m.nom}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <button type="submit" className="bouton bouton-principal" style={{ alignSelf: 'flex-start' }}>+ Ajouter</button>
              </form>
            </div>
          </div>
        )}

        {modalConfirmation.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '380px', textAlign: 'center', maxHeight: '85vh', overflowY: 'auto' }}>
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

        {modalDepartCenseurOuvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '420px', maxHeight: '85vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#991b1b', fontSize: '18px', fontWeight: '800' }}>Motif de départ</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>Ce motif sera visible par le chef d'établissement qui traitera votre demande.</p>
              <form onSubmit={soumettreDemandeDepartCenseur}>
                <textarea
                  value={motifDepartCenseur}
                  onChange={(e) => setMotifDepartCenseur(e.target.value)}
                  style={{ ...styles.inputStyle, minHeight: '80px', resize: 'vertical', marginBottom: '14px' }}
                  placeholder="Expliquez brièvement la raison de votre départ..."
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => { setModalDepartCenseurOuvert(false); setMotifDepartCenseur(''); }} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-danger">Envoyer la demande</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalDeconnexion && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px', textAlign: 'center', maxHeight: '85vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🚪 Déconnexion</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Voulez-vous vraiment vous déconnecter ?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalDeconnexion(false)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={async () => { setModalDeconnexion(false); await supabase.auth.signOut(); window.location.reload(); }} className="bouton bouton-danger">Oui</button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE PROFIL & SÉCURITÉ UNIFIÉE */}
        {modalProfilCenseurOuvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>👤 Mon Profil & Sécurité</h3>
                <button onClick={() => setModalProfilCenseurOuvert(false)} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>
              
              <form onSubmit={handleEnregistrerProfilCenseur} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid #cbd5e1', flexShrink: 0 }}>
                    {formProfilCenseur.photoProfil ? (
                      <img src={formProfilCenseur.photoProfil} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    <select value={formProfilCenseur.civilite} onChange={(e) => setFormProfilCenseur({...formProfilCenseur, civilite: e.target.value})} style={styles.inputStyle}>
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Dr">Dr</option>
                      <option value="Pr">Pr</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Nom</label>
                    <input type="text" value={formProfilCenseur.nom} onChange={(e) => setFormProfilCenseur({...formProfilCenseur, nom: e.target.value})} style={styles.inputStyle} required />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Prénoms</label>
                  <input type="text" value={formProfilCenseur.prenoms} onChange={(e) => setFormProfilCenseur({...formProfilCenseur, prenoms: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div>
                  <label style={styles.label}>Téléphone</label>
                  <input type="tel" placeholder="+225 XX XX XX XX XX" value={formProfilCenseur.telephone || ''} onChange={(e) => setFormProfilCenseur({...formProfilCenseur, telephone: e.target.value})} style={styles.inputStyle} />
                </div>

                <div>
                  <label style={styles.label}>Rôle pédagogique</label>
                  <input type="text" value={formProfilCenseur.role} onChange={(e) => setFormProfilCenseur({...formProfilCenseur, role: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div>
                  <label style={styles.label}>Nom de l'établissement</label>
                  <input type="text" value={formProfilCenseur.etablissement} onChange={(e) => setFormProfilCenseur({...formProfilCenseur, etablissement: e.target.value})} style={styles.inputStyle} required />
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '6px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>🔒 Sécurité & Connexion</h4>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <label style={styles.label}>Changer l'email</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="email" placeholder="nouvel-email@exemple.com" value={emailSaisiChangement} onChange={e => setEmailSaisiChangement(e.target.value)} style={styles.inputStyle} />
                      <button type="button" onClick={async () => {
                        if (!emailSaisiChangement.trim()) return;
                        const { error } = await supabase.auth.updateUser({ email: emailSaisiChangement.trim() });
                        if (error) { showToast("⚠️ Erreur : " + error.message); return; }
                        showToast("📧 Lien de confirmation envoyé au nouvel email.");
                        setEmailSaisiChangement('');
                      }} className="bouton bouton-secondaire" style={{ flexShrink: 0 }}>Mettre à jour</button>
                    </div>
                  </div>

                  <div>
                    <label style={styles.label}>Nouveau mot de passe</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="password" placeholder="••••••••" value={nouveauMdp} onChange={e => setNouveauMdp(e.target.value)} style={styles.inputStyle} />
                      <button type="button" onClick={async () => {
                        if (!nouveauMdp) { showToast("⚠️ Saisissez un mot de passe."); return; }
                        const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
                        if (error) { showToast("⚠️ Erreur : " + error.message); return; }
                        showToast("🔒 Mot de passe modifié !");
                        setNouveauMdp('');
                      }} className="bouton bouton-secondaire" style={{ flexShrink: 0 }}>Modifier</button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalProfilCenseurOuvert(false)} className="bouton bouton-secondaire">Fermer</button>
                  <button type="submit" className="bouton bouton-principal">Enregistrer le profil</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalConsultation.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>👁️ Consultation de la Fiche</h3>
                <button onClick={() => setModalConsultation({ ouvert: false, element: null })} className="bouton bouton-secondaire">✕</button>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: 0, color: '#0f172a', fontSize: '15px' }}><strong>{modalConsultation.element?.titre}</strong></p>
                <div style={{ height: '1px', backgroundColor: '#cbd5e1', margin: '8px 0' }}></div>
                <p style={{ margin: 0 }}><strong>Habilités :</strong> {modalConsultation.element?.habilites}</p>
                <p style={{ margin: 0 }}><strong>Contenus :</strong> {modalConsultation.element?.contenus}</p>
                <p style={{ margin: 0 }}><strong>Exercices :</strong> {modalConsultation.element?.exercices}</p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET 1 : VISA & FILE D'ATTENTE */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'visa' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>✍️ Validation & File d'attente des Fiches</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Sélectionnez une classe pour dérouler. Les fiches visées disparaissent et vont aux archives.</p>
              </div>
            </div>

            {Object.keys(programmesClasses || {}).length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', textAlign: 'center', padding: '30px' }}>Aucune fiche soumise pour le moment.</p>
            ) : (
              Object.entries(programmesClasses || {}).map(([classeNom, prog]) => {
                
                const hasPendingSeances = (prog.cycles || []).some(cy => 
                  (cy.lecons || []).some(lc => 
                    (lc.seances || []).some(sc => !sc.viseParCenseur)
                  )
                );

                const nombreFichesEnAttente = (prog.cycles || []).reduce((total, cy) =>
                  total + (cy.lecons || []).reduce((sousTotal, lc) =>
                    sousTotal + (lc.seances || []).filter(sc => !sc.viseParCenseur).length, 0), 0);

                if (!hasPendingSeances) return null;

                const isClasseOuverte = classesOuvertesVisa[classeNom];

                return (
                  <div key={classeNom} style={{ marginBottom: '16px', border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                    <button 
                      onClick={() => toggleClasseVisa(classeNom)}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: isClasseOuverte ? '#e0f2fe' : '#f8fafc', border: 'none', cursor: 'pointer', outline: 'none' }}
                    >
                      <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '15px', fontWeight: '800' }}>🏫 Classe : {classeNom}</h3>
                          <span style={{ fontSize: '12px', color: '#475569' }}>Matière : {prog.matiere || 'EPS'} | Enseignant : <strong>{prog.enseignant || 'Inconnu'}</strong></span>
                        </div>
                        {nombreFichesEnAttente > 0 && (
                          <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: '900', padding: '2px 8px', borderRadius: '999px', flexShrink: 0 }}>
                            +{nombreFichesEnAttente} fiche{nombreFichesEnAttente > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '16px', color: '#2563eb' }}>{isClasseOuverte ? '▲' : '▼'}</span>
                    </button>

                    {isClasseOuverte && (
                      <div style={{ padding: '16px', backgroundColor: '#ffffff' }}>
                        {(prog.cycles || []).map(cy => (
                          <div key={cy.id} style={{ marginBottom: '12px' }}>
                            {(cy.lecons || []).map(lc => (
                              <div key={lc.id}>
                                {(lc.statutVisa === 'ENVOYEE' || lc.statutVisa === 'RECUE') && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', backgroundColor: '#eff6ff', padding: '12px 16px', borderRadius: '10px', marginBottom: '8px', borderLeft: '4px solid #2563eb' }}>
                                    <div>
                                      <span style={{ fontSize: '10px', color: '#1e3a8a', textTransform: 'uppercase', fontWeight: '800' }}>📖 Fiche de leçon — {cy.titre}{cy.competence ? ` (${cy.competence})` : ''}</span>
                                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{lc.titre}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button onClick={() => retournerLecon(lc.id, prog.enseignantUserId, lc.titre)} className="bouton bouton-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>↩️ Retourner</button>
                                      <button onClick={() => viserLecon(lc.id, prog.enseignantUserId, lc.titre)} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '12px' }}>✍️ Viser la leçon</button>
                                    </div>
                                  </div>
                                )}
                                {([...(lc.seances || [])])
                                  .filter(sc => !sc.viseParCenseur)
                                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                                  .map(sc => (
                                    <div key={sc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '10px', marginBottom: '8px', borderLeft: '4px solid #f59e0b' }}>
                                      <div>
                                        <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>{cy.titre} ➔ {lc.titre}</span>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Séance #{sc.numero} : {sc.titre}</p>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>📅 Date : {sc.date}</span>
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setModalConsultation({ ouvert: true, element: sc })} className="bouton bouton-secondaire" style={{ padding: '6px 12px', fontSize: '12px' }}>👁️ Consulter</button>
                                        <button onClick={() => viserEtArchiverSeance(classeNom, cy.id, lc.id, sc)} className="bouton bouton-succes" style={{ padding: '6px 12px', fontSize: '12px' }}>✍️ Viser & Archiver</button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET 2 : ARCHIVES PÉDAGOGIQUES */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'fichiers_pedagogiques' && (
          <div style={styles.cardWide}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>📚 Archives Pédagogiques Permanentes</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Retrouvez ici toutes les fiches validées et archivées.</p>
            </div>

            <div style={styles.bibliothequeFilterBox}>
              <div style={{ flex: '2 1 220px' }}>
                <label style={styles.labelFiltre}>Recherche (titre de fiche ou enseignant)</label>
                <input type="text" placeholder="Ex : révisions, Kouassi..." value={filtreArchiveTexte} onChange={(e) => setFiltreArchiveTexte(e.target.value)} style={styles.inputStyle} />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.labelFiltre}>Année scolaire</label>
                <select value={filtreArchiveAnnee} onChange={(e) => setFiltreArchiveAnnee(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes</option>
                  {anneesArchiveDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.labelFiltre}>Classe</label>
                <select value={filtreArchiveClasse} onChange={(e) => setFiltreArchiveClasse(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes</option>
                  {classesArchiveDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.labelFiltre}>Matière</label>
                <select value={filtreArchiveMatiere} onChange={(e) => setFiltreArchiveMatiere(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes</option>
                  {matieresArchiveDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {fichesFiltrees.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', textAlign: 'center', padding: '30px' }}>Aucune fiche archivée trouvée.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {fichesParClasse.map(([classe, fiches]) => {
                  const estOuverte = !!classesOuvertesArchive[classe];
                  return (
                    <div key={classe} style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                      <button
                        onClick={() => toggleClasseArchive(classe)}
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', backgroundColor: estOuverte ? '#e0f2fe' : '#f8fafc', border: 'none', cursor: 'pointer', outline: 'none' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>🏫 {classe}</span>
                          <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700' }}>{fiches.length} fiche{fiches.length > 1 ? 's' : ''}</span>
                        </span>
                        <span style={{ fontSize: '16px', color: '#2563eb' }}>{estOuverte ? '▲' : '▼'}</span>
                      </button>

                      {estOuverte && (
                        <div style={{ padding: '14px 16px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {fiches.map((fiche, index) => (
                            <div key={index} style={styles.itemRow}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{fiche.matiere || 'Matière'}</span>
                                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{fiche.titre}</strong>
                                </div>
                                <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Enseignant : <strong>{fiche.enseignant}</strong> | Archivé le : {fiche.dateValidation}</p>
                              </div>
                              <div>
                                <button onClick={() => telechargerPDFArchive(fiche)} className="bouton bouton-principal" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#0f172a' }}>📥 Télécharger (PDF)</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET : PROGRAMME & PROGRESSION */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'progression' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>📊 Programme & Progression</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Consultez le programme annuel de chaque enseignant, sa progression, et transmettez un rapport au chef d'établissement.</p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET : ANNUAIRE & PERSONNEL */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'professeurs' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>👨‍🏫 Annuaire Détaillé du Personnel</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Gérez le corps professoral et ajoutez manuellement le personnel d'encadrement.</p>
              </div>
            </div>

            <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1e3a8a', marginBottom: '12px' }}>📨 Inviter un enseignant par email</h3>
              <form onSubmit={envoyerInvitationEnseignant} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="email" placeholder="email@exemple.com" value={nouvelleInvitationEnseignantEmail} onChange={(e) => setNouvelleInvitationEnseignantEmail(e.target.value)} style={{ ...styles.inputStyle, flex: '2 1 220px', margin: 0 }} required />
                <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }}>Envoyer l'invitation</button>
              </form>
            </div>

            {demandesAffiliationEnseignants.length > 0 && (
              <div style={{ backgroundColor: '#fefce8', padding: '16px', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#854d0e', marginBottom: '12px' }}>👥 Demandes d'affiliation d'enseignants en attente</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {demandesAffiliationEnseignants.map(demande => (
                    <div key={demande.id} style={styles.itemRow}>
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                          {demande.utilisateurs_profils?.prenom} {demande.utilisateurs_profils?.nom}
                        </strong>
                        <br /><small>Souhaite rejoindre en tant qu'enseignant</small>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => approuverDemandeAffiliationEnseignant(demande)} className="bouton bouton-succes">Approuver</button>
                        <button
                          onClick={() => setModalConfirmation({
                            ouvert: true,
                            titre: '⚠️ Refuser cette demande ?',
                            message: `Voulez-vous vraiment refuser la demande de ${demande.utilisateurs_profils?.prenom} ${demande.utilisateurs_profils?.nom} ?`,
                            actionCallback: () => refuserDemandeAffiliationEnseignant(demande),
                          })}
                          className="bouton bouton-danger"
                        >Refuser</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET : CLASSES & ATTRIBUTIONS (REFONTE ERGONOMIQUE MAJEURE) */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'classes' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '4px' }}>🏫 Pilotage des Classes & Attributions Professeurs</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
              Espace unifié : créez vos structures de classes en lot et associez aux enseignants leurs multiples matières et classes en toute fluidité.
            </p>

            {!anneeActiveId && (
              <p style={{ fontSize: '13px', color: '#991b1b', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '10px', marginBottom: '20px' }}>⚠️ Aucune année scolaire active — le chef doit d'abord en ouvrir une.</p>
            )}

            {/* --- BLOC 1 : CRÉATION VISUELLE DES CLASSES EN LOT --- */}
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', marginBottom: '28px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>⚡ Générateur Rapide de Classes par Niveau</h3>
              <p style={{ fontSize: '12px', color: '#475569', marginBottom: '16px' }}>
                Générez d'un coup un lot de classes homogènes (ex: 6ème A, 6ème B, 6ème C...).
              </p>

              <form onSubmit={creerClassesEnLot} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={styles.label}>Niveau</label>
                  <input type="text" placeholder="ex. 6ème" value={nouveauLotNiveau} onChange={(e) => setNouveauLotNiveau(e.target.value)} style={styles.inputStyle} required disabled={!anneeActiveId} />
                </div>
                <div style={{ flex: '1 1 120px' }}>
                  <label style={styles.label}>Nombre</label>
                  <input type="number" min="1" max="26" placeholder="ex. 4" value={nouveauLotNombre} onChange={(e) => setNouveauLotNombre(e.target.value)} style={styles.inputStyle} required disabled={!anneeActiveId} />
                </div>
                <div style={{ flex: '1 1 160px' }}>
                  <label style={styles.label}>Suffixes</label>
                  <select value={nouveauLotStyle} onChange={(e) => setNouveauLotStyle(e.target.value)} style={styles.inputStyle} disabled={!anneeActiveId}>
                    <option value="alphabetique">Alphabétique (A, B, C...)</option>
                    <option value="numerique">Numérique (1, 2, 3...)</option>
                  </select>
                </div>
                <button type="submit" className="bouton bouton-principal" disabled={!anneeActiveId}>Générer les classes</button>
              </form>

              {apercuLotClasses.length > 0 && (
                <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#e0f2fe', borderRadius: '8px', fontSize: '12px', color: '#0369a1', fontWeight: '700' }}>
                  Aperçu de la création : {apercuLotClasses.join(', ')}
                </div>
              )}
            </div>

            {/* --- BLOC 2 : ATTRIBUTION MULTI-MATIÈRES & MULTI-CLASSES PAR PROFESSEUR --- */}
            <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '16px', border: '1px solid #bfdbfe', marginBottom: '28px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a', marginBottom: '8px' }}>🎯 Fiche d'Attribution Enseignant (Multi-Classes & Multi-Matières)</h3>
              <p style={{ fontSize: '12px', color: '#475569', marginBottom: '16px' }}>
                Sélectionnez un enseignant, cochez les classes cibles, puis sélectionnez les matières qu'il y enseigne d'un seul coup.
              </p>

              <form onSubmit={attribuerClasseDirectement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.label}>1. Choisir l'enseignant</label>
                  <select value={formAttribution.enseignantId} onChange={(e) => setFormAttribution({ ...formAttribution, enseignantId: e.target.value })} style={styles.inputStyle} required disabled={!anneeActiveId}>
                    <option value="">— Sélectionner un professeur —</option>
                    {listeProfesseursEtablissement.map(p => <option key={p.userId} value={p.userId}>{p.nomComplet} ({p.matiere})</option>)}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>2. Cocher les classes cibles</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '140px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px' }}>
                    {classesEtablissement.length === 0 ? (
                      <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', margin: 0 }}>Aucune classe disponible. Créez-en d'abord ci-dessus.</p>
                    ) : (
                      classesEtablissement.map(c => {
                        const estCoche = formAttribution.classesIds.includes(c.id);
                        return (
                          <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '8px', backgroundColor: estCoche ? '#dbeafe' : '#f8fafc', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                            <input
                              type="checkbox" checked={estCoche}
                              onChange={() => {
                                const updated = estCoche ? formAttribution.classesIds.filter(id => id !== c.id) : [...formAttribution.classesIds, c.id];
                                setFormAttribution({ ...formAttribution, classesIds: updated });
                              }}
                              disabled={!anneeActiveId}
                            />
                            🏫 {c.nom}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <label style={styles.label}>3. Cocher les matières enseignées sur ces classes</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '160px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px' }}>
                    {matieresDisponibles.length === 0 ? (
                      <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', margin: 0 }}>Aucune matière au catalogue.</p>
                    ) : (
                      matieresDisponibles.map(m => {
                        const estCochee = formAttribution.matiereIdsChoisies.includes(m.id);
                        return (
                          <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '8px', backgroundColor: estCochee ? '#dcfce7' : '#f8fafc', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: estCochee ? '#166534' : '#334155' }}>
                            <input
                              type="checkbox" checked={estCochee}
                              onChange={() => {
                                const updated = estCochee ? formAttribution.matiereIdsChoisies.filter(id => id !== m.id) : [...formAttribution.matiereIdsChoisies, m.id];
                                setFormAttribution({ ...formAttribution, matiereIdsChoisies: updated });
                              }}
                              disabled={!anneeActiveId}
                            />
                            📚 {m.nom}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="submit" className="bouton bouton-principal" disabled={!anneeActiveId}>Valider et enregistrer les attributions</button>
                </div>
              </form>
            </div>

            {/* --- BLOC 3 : TRAITEMENT DES PROPOSITIONS D'ENSEIGNANTS AVEC FLEXIBILITÉ --- */}
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>📥 Propositions des enseignants en attente</h3>
            {demandesAttributionsRecues.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px' }}>Aucune proposition en attente.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {demandesAttributionsRecues.map(demande => {
                  const nomEnseignant = `${demande.utilisateurs_profils?.prenom || ''} ${demande.utilisateurs_profils?.nom || ''}`.trim() || 'Enseignant';
                  const estNouvelleClasse = !demande.classe_id;
                  const description = `${nomEnseignant} — ${demande.nomClasseEdite || 'classe'} (${demande.matieres?.nom || 'matière'})`;
                  return (
                    <div key={demande.id} style={styles.itemRow}>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <strong style={{ fontSize: '13px' }}>{nomEnseignant}</strong>
                        {estNouvelleClasse && (
                          <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>NOUVELLE CLASSE PROPOSÉE</span>
                        )}
                        <p style={{ fontSize: '12px', color: '#475569', margin: '6px 0 0 0' }}>
                          Matière demandée : <strong>{demande.matieres?.nom || 'matière'}</strong>
                        </p>
                        <div style={{ marginTop: '6px' }}>
                          <label style={{ ...styles.label, fontSize: '10px' }}>Ajuster le nom de la classe avant validation :</label>
                          <input
                            type="text"
                            value={demande.nomClasseEdite}
                            onChange={(e) => setDemandesAttributionsRecues(prev => prev.map(d => d.id === demande.id ? { ...d, nomClasseEdite: e.target.value } : d))}
                            style={{ ...styles.inputStyle, maxWidth: '240px' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <button onClick={() => approuverDemandeAttribution(demande)} className="bouton bouton-succes">Valider & Assigner</button>
                        <button onClick={() => refuserDemandeAttribution(demande, description)} className="bouton bouton-danger">Refuser</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET : DOCUMENTS D'ÉTABLISSEMENT */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'documents' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>📤 Documents d'Établissement</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Uploadez les documents officiels, administratifs ou pédagogiques de l'établissement.</p>
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET : SUIVI & RAPPELS MANUELS */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'suivi' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>⏰ Suivi & Rappels Manuels</h2>
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET : PROFIL ÉCOLE */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'profil_ecole' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>🏛️ Carte d'Identité & Administration</h2>
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------ */}
        {/* ONGLET : ÉVOLUTION DE CARRIÈRE */}
        {/* ------------------------------------------------------------------------------------------------ */}
        {activeTab === 'evolution' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>🎓 Évolution de Carrière : Devenir Proviseur</h2>
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
  bibliothequeFilterBox: { display: 'flex', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap', boxSizing: 'border-box' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '12px', boxSizing: 'border-box', width: '100%', flexWrap: 'wrap' },
  label: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  labelFiltre: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  inputStyle: { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
  toastSuccess: { backgroundColor: '#0f172a', color: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', fontWeight: '700', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  navbarTeacherClickableBlock: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '10px', border: '1px solid #334155', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box', minWidth: 0, maxWidth: '48vw', flexShrink: 1 },
  avatarNavbarContainer: { width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #475569', flexShrink: 0 },
  avatarNavbarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarNavbarPlaceholder: { fontSize: '14px', color: '#94a3b8' },
  navbarTeacherInfo: { display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
  notificationDropdown: { position: 'absolute', top: '42px', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', width: '280px', maxWidth: '90vw', zIndex: 110, padding: '10px', boxSizing: 'border-box' },
  dropdownHeader: { padding: '6px 8px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', marginBottom: '6px' },
  notifItem: { backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', fontSize: '11px', marginBottom: '4px', border: '1px solid #f1f5f9', cursor: 'pointer' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '6px 10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' },
  fondModale: { position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000', padding: '12px', boxSizing: 'border-box' },
  pastilleAlerte: { backgroundColor: '#ef4444', color: 'white', padding: '1px 4px', borderRadius: '999px', fontSize: '9px', fontWeight: '800', position: 'absolute', top: '-4px', right: '-4px' },
  burgerBtn: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '10px', fontSize: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' },
  burgerDropdown: { position: 'absolute', top: '42px', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', width: '220px', maxWidth: '85vw', zIndex: 120, padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }
};
