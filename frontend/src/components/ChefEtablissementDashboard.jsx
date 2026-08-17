import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './AppRouter';

const safeGetArray = (key, defaultArr = []) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultArr;
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed : defaultArr;
  } catch { return defaultArr; }
};

export default function ChefEtablissementDashboard() {

  // --- ÉTATS GLOBAUX ---
  const [chargementInitial, setChargementInitial] = useState(true);
  // [NOUVEAU] Protection anti-double-clic générique — un seul état partagé
  // (clé = nom de l'action) plutôt qu'une variable par bouton.
  const [actionsEnCours, setActionsEnCours] = useState({});
  const debuterAction = (cle) => setActionsEnCours(prev => ({ ...prev, [cle]: true }));
  const terminerAction = (cle) => setActionsEnCours(prev => ({ ...prev, [cle]: false }));
  const [userId, setUserId] = useState(null);
  const [affiliationChef, setAffiliationChef] = useState(null);
  const [ecoleConfig, setEcoleConfig] = useState(null);
  const [modeSetup, setModeSetup] = useState('CHOIX');

  const [inputNomEcole, setInputNomEcole] = useState('');
  const [inputTypeEtablissement, setInputTypeEtablissement] = useState('public');
  const [inputTypeEnseignement, setInputTypeEnseignement] = useState('GENERAL');
  const [inputCodeEtablissement, setInputCodeEtablissement] = useState('');
  const [inputSituationGeo, setInputSituationGeo] = useState('');
  const [inputAnneeScolaire, setInputAnneeScolaire] = useState('2025-2026');
  const [inputNombreEleves, setInputNombreEleves] = useState('450');
  const [inputNombreEnseignants, setInputNombreEnseignants] = useState('25');
  const [inputEmailRecuperation, setInputEmailRecuperation] = useState('');
  // [NOUVEAU] Empêche l'envoi de plusieurs demandes identiques en cas de
  // clics multiples — voir handleConnecterEcole.
  const [envoiDemandeConnecterEnCours, setEnvoiDemandeConnecterEnCours] = useState(false);

  const [infosChef, setInfosChef] = useState({
    civilite: 'M.', nom: '', prenoms: '', etablissement: '', role: 'Chef d\u2019Établissement', photoProfil: '', emailSecurite: '', telephone: ''
  });

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
  const [formEcoleEdition, setFormEcoleEdition] = useState({});

  const [demandesAffiliationRecues, setDemandesAffiliationRecues] = useState([]);
  const [demandesDepartRecues, setDemandesDepartRecues] = useState([]);
  const [invitationsEnvoyees, setInvitationsEnvoyees] = useState([]);
  const [anneeActive, setAnneeActive] = useState(null);
  const [inputNouvelleAnneeIntitule, setInputNouvelleAnneeIntitule] = useState('');
  const [nouvelleInvitationEmail, setNouvelleInvitationEmail] = useState('');
  const [nouvelleInvitationRole, setNouvelleInvitationRole] = useState('CENSEUR');

  // =========================================================================
  // NOTIFICATIONS (cloche) — mêmes principes que CenseurDashboard.jsx :
  // chargement des non lues au démarrage + abonnement Realtime pour une
  // réception instantanée, sans recharger la page.
  // =========================================================================
  const [notificationsChef, setNotificationsChef] = useState([]);
  const [notifChefOuvert, setNotifChefOuvert] = useState(false);
  const notifChefRef = useRef(null);

  // [NOUVEAU] Petit "ding" généré directement (Web Audio API) — pas besoin
  // d'héberger de fichier son. Joué côté RÉCEPTEUR quand une notification
  // arrive en temps réel (pas côté émetteur).
  const jouerSonNotification = () => {
    try {
      const AudioContextClasse = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClasse) return;
      const ctx = new AudioContextClasse();
      const oscillateur = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillateur.type = 'sine';
      oscillateur.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      oscillateur.connect(gain);
      gain.connect(ctx.destination);
      oscillateur.start();
      oscillateur.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Son de notification indisponible :', e);
    }
  };

  // [NOUVEAU] Bandeau de notification système — visible même si l'onglet
  // e-cahier n'est pas au premier plan, tant qu'il reste ouvert quelque
  // part (pas si l'onglet/l'appli est complètement fermé).
  const afficherNotificationSysteme = (texte, lienCible) => {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const notif = new Notification('E-cahier !', { body: texte, icon: '/favicon.ico' });
      notif.onclick = () => {
        window.focus();
        if (lienCible) setActiveTab(lienCible);
        notif.close();
      };
    } catch (e) {
      console.warn('Notification système indisponible :', e);
    }
  };

  const envoyerNotification = async (destinataireUserId, type, message, lienCible, etablissementId) => {
    if (!destinataireUserId) return;
    await supabase.from('notifications').insert({
      user_id: destinataireUserId,
      type,
      payload_json: { message, lien_cible: lienCible, etablissement_id: etablissementId },
      canaux: ['in_app'],
    });
  };

  // [OPTIMISÉ] Envoie une notification à TOUS les membres actifs de
  // l'établissement, SAUF l'auteur de l'action lui-même — utilisé pour
  // l'ouverture/fermeture d'année. Avant : une insertion Supabase par membre,
  // en série (300 membres = 300 allers-retours réseau à la queue leu leu).
  // Maintenant : toutes les lignes construites d'un coup, puis une seule
  // requête .insert() avec le tableau complet — Postgres les insère en une
  // seule opération, quel que soit le nombre de membres.
  const envoyerNotificationATousLesMembres = async (etablissementId, type, message, lienCible) => {
    const { data: membres } = await supabase
      .from('affiliations_etablissement')
      .select('user_id')
      .eq('etablissement_id', etablissementId)
      .eq('statut', 'ACTIVE');
    const lignes = (membres || [])
      .filter(m => m.user_id !== userId)
      .map(m => ({
        user_id: m.user_id,
        type,
        payload_json: { message, lien_cible: lienCible, etablissement_id: etablissementId },
        canaux: ['in_app'],
      }));
    if (lignes.length === 0) return;
    await supabase.from('notifications').insert(lignes);
  };

  useEffect(() => {
    if (!userId) return;
    const canal = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new;
        setNotificationsChef(prev => [{
          id: n.id,
          texte: n.payload_json?.message || '',
          date: new Date(n.created_at).toLocaleDateString(),
          lu: false,
          lienCible: n.payload_json?.lien_cible,
        }, ...prev]);
        jouerSonNotification();
        afficherNotificationSysteme(n.payload_json?.message || 'Nouvelle notification', n.payload_json?.lien_cible);
        // [NOUVEAU] Recharge automatiquement les données dès qu'une
        // notification arrive — évite d'avoir à rafraîchir la page
        // manuellement pour voir les changements faits par quelqu'un d'autre.
        chargerDonnees();
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [userId]);

  const marquerNotificationLue = async (notif) => {
    if (notif.lienCible) setActiveTab(notif.lienCible);
    setNotifChefOuvert(false);
    await supabase.from('notifications').update({ lue_at: new Date().toISOString() }).eq('id', notif.id);
    setNotificationsChef(prev => prev.filter(x => x.id !== notif.id));
  };

  const [documentsEtablissement, setDocumentsEtablissement] = useState([]);
  const [nomNouveauFichier, setNomNouveauFichier] = useState('');
  const [categorieNouveauFichier, setCategorieNouveauFichier] = useState('Administratif');
  const [fichierSelectionneObj, setFichierSelectionneObj] = useState(null);
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [nombreClassesReel, setNombreClassesReel] = useState(0);
  const [nombreCenseursActifs, setNombreCenseursActifs] = useState(0);
  const [listeProfesseursEtablissementBrute, setListeProfesseursEtablissementBrute] = useState([]);
  const [personnelAdministratifManuel, setPersonnelAdministratifManuel] = useState([]);
  const [nouveauAdminNom, setNouveauAdminNom] = useState('');
  const [nouveauAdminRole, setNouveauAdminRole] = useState('Éducateur');
  const [nouveauAdminMatricule, setNouveauAdminMatricule] = useState('');
  const [nouveauAdminContact, setNouveauAdminContact] = useState('');
  const [nouveauAdminEmail, setNouveauAdminEmail] = useState('');
  const [activeTab, setActiveTab] = useState('profil_ecole');
  const [filtreProfMatiere, setFiltreProfMatiere] = useState('TOUTES');
  const [filtreProfNiveau, setFiltreProfNiveau] = useState('TOUS');
  const [filtreProfClasse, setFiltreProfClasse] = useState('TOUTES');

  const [modalConfirmationGenerique, setModalConfirmationGenerique] = useState({
    ouvert: false, titre: '', message: '', necessiteMotif: false, motif: '', onConfirmer: null,
  });
  const demanderConfirmation = ({ titre, message, necessiteMotif = false, onConfirmer }) => {
    setModalConfirmationGenerique({ ouvert: true, titre, message, necessiteMotif, motif: '', onConfirmer });
  };
  const [emailSaisiChangement, setEmailSaisiChangement] = useState('');

  const [message, setMessage] = useState('');
  const showToast = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  // =========================================================================
  // CHARGEMENT INITIAL
  // =========================================================================
  const chargerDonnees = async () => {
      const { data: { user }, error: erreurUser } = await supabase.auth.getUser();
      if (erreurUser || !user) {
        showToast("⚠️ Session expirée, veuillez vous reconnecter.");
        setChargementInitial(false);
        return;
      }
      setUserId(user.id);

      // [OPTIMISÉ] Ces deux requêtes ne dépendent que de l'utilisateur
      // connecté — aucune raison de s'attendre l'une l'autre.
      const [
        { data: profil, error: erreurProfil },
        { data: affiliation, error: erreurAffiliation },
      ] = await Promise.all([
        supabase.from('utilisateurs_profils').select('*').eq('user_id', user.id).single(),
        supabase.from('affiliations_etablissement').select('*, etablissements(*)').eq('user_id', user.id).eq('role', 'CHEF').eq('statut', 'ACTIVE').maybeSingle(),
      ]);

      if (erreurProfil) {
        showToast("⚠️ Impossible de charger le profil : " + erreurProfil.message);
      } else if (profil) {
        setInfosChef(prev => ({ ...prev, nom: profil.nom, prenoms: profil.prenom, emailSecurite: user.email, telephone: profil.telephone || '' }));
        setFormProfilChef(prev => ({ ...prev, nom: profil.nom, prenoms: profil.prenom, telephone: profil.telephone || '' }));
      }

      if (erreurAffiliation) {
        showToast("⚠️ Erreur de chargement de l'établissement : " + erreurAffiliation.message);
      } else if (affiliation) {
        setAffiliationChef(affiliation);
        setEcoleConfig(affiliation.etablissements);
        setFormEcoleEdition(affiliation.etablissements);
        setInfosChef(prev => ({ ...prev, etablissement: affiliation.etablissements?.nom }));

        // [CORRIGÉ] on récupère désormais l'erreur : si la lecture des
        // demandes d'affiliation ne remonte rien, on veut savoir si c'est
        // parce qu'il n'y en a réellement aucune, ou si une policy RLS
        // bloque la lecture (cas typique : la demande a bien été créée par
        // l'enseignant/le censeur, mais reste invisible ici faute de policy
        // SELECT pour le rôle CHEF).
        // [CORRIGÉ] La jointure automatique "utilisateurs_profils!user_id(...)"
        // continuait à échouer avec la même erreur d'ambiguïté malgré le
        // hint — au lieu de continuer à chercher la bonne syntaxe
        // PostgREST, on récupère les profils séparément et on les rattache
        // nous-mêmes pour les deux requêtes ci-dessous (demandes
        // d'affiliation ET demandes de départ). Ça élimine complètement le
        // risque d'ambiguïté de relation, quelle qu'en soit la cause exacte.
        const rattacherProfils = async (lignes, colonneUserId = 'user_id') => {
          if (!lignes || lignes.length === 0) return lignes || [];
          const ids = [...new Set(lignes.map(l => l[colonneUserId]))];
          const { data: profils } = await supabase
            .from('utilisateurs_profils')
            .select('user_id, nom, prenom')
            .in('user_id', ids);
          const profilParId = {};
          (profils || []).forEach(p => { profilParId[p.user_id] = p; });
          return lignes.map(l => ({ ...l, utilisateurs_profils: profilParId[l[colonneUserId]] || null }));
        };

        const etablissementId = affiliation.etablissement_id;

        // [OPTIMISÉ] Toutes ces requêtes ne dépendent que de etablissementId
        // (ou de user.id) — aucune n'a besoin de l'année scolaire active ou
        // des résultats d'une autre requête de ce groupe. Elles partent
        // donc toutes en même temps plutôt qu'à la queue leu leu.
        const [
          { data: demandesBrutes, error: erreurDemandesAffiliation },
          { data: departsBrutes },
          { data: invitationsEnvoyeesData },
          { data: anneeActiveData },
          { data: affiliationsEnseignantsBrutes },
          { data: personnelData },
          { data: censeursActifsData },
          { data: documentsData },
          { data: fichesData },
          { data: notifs },
        ] = await Promise.all([
          supabase.from('demandes_affiliation').select('id, user_id, role_demande, created_at').eq('etablissement_id', etablissementId).eq('statut', 'EN_ATTENTE').order('created_at', { ascending: true }),
          supabase.from('demandes_depart').select('id, user_id, role_demandeur, motif, created_at').eq('etablissement_id', etablissementId).eq('statut', 'EN_ATTENTE').order('created_at', { ascending: true }),
          supabase.from('invitations').select('id, email, role_propose, statut, created_at').eq('etablissement_id', etablissementId).order('created_at', { ascending: false }),
          supabase.from('annees_scolaires').select('*').eq('etablissement_id', etablissementId).eq('est_active', true).maybeSingle(),
          supabase.from('affiliations_etablissement').select('id, user_id').eq('etablissement_id', etablissementId).eq('role', 'ENSEIGNANT').eq('statut', 'ACTIVE'),
          supabase.from('personnel').select('*').eq('etablissement_id', etablissementId),
          supabase.from('affiliations_etablissement').select('id').eq('etablissement_id', etablissementId).eq('role', 'CENSEUR').eq('statut', 'ACTIVE'),
          supabase.from('documents_etablissement').select('id, titre, categorie, created_at, versions_document!fk_doc_version_courante(fichiers_metadonnees(cle_stockage, taille_octets))').eq('etablissement_id', etablissementId).is('deleted_at', null).order('created_at', { ascending: false }),
          supabase.from('bibliotheque_etablissement').select('id, titre, created_at, contenu_snapshot_json, annee_scolaire_id, annees_scolaires(intitule), utilisateurs_profils:auteur_user_id (nom, prenom)').eq('etablissement_id', etablissementId).order('created_at', { ascending: false }),
          supabase.from('notifications').select('*').eq('user_id', user.id).is('lue_at', null).order('created_at', { ascending: false }),
        ]);

        if (erreurDemandesAffiliation) {
          console.error('Erreur chargement demandes d\'affiliation :', erreurDemandesAffiliation);
          showToast("⚠️ Erreur de chargement des demandes d'affiliation : " + erreurDemandesAffiliation.message);
        }
        setAnneeActive(anneeActiveData || null);

        // [OPTIMISÉ] Ces requêtes dépendent des résultats de la vague
        // précédente (ids de demandeurs/enseignants, annee.id) — deuxième
        // vague obligée d'attendre la première, mais toujours en parallèle
        // entre elles.
        const [
          demandesAvecProfils,
          departsAvecProfils,
          { data: classesData },
          { data: attributionsData },
          { data: profilsEnseignants },
        ] = await Promise.all([
          rattacherProfils(demandesBrutes),
          rattacherProfils(departsBrutes),
          supabase.from('classes').select('id').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeActiveData?.id || '00000000-0000-0000-0000-000000000000').is('deleted_at', null),
          supabase.from('attributions_classes').select('enseignant_id, matieres(nom), classes(nom)').eq('etablissement_id', etablissementId).eq('annee_scolaire_id', anneeActiveData?.id || '00000000-0000-0000-0000-000000000000'),
          (affiliationsEnseignantsBrutes || []).length > 0
            ? supabase.from('utilisateurs_profils').select('user_id, nom, prenom, telephone').in('user_id', [...new Set((affiliationsEnseignantsBrutes || []).map(a => a.user_id))])
            : Promise.resolve({ data: [] }),
        ]);

        // [NOUVEAU] Sécurité supplémentaire : même si des doublons existent
        // déjà en base (créés avant le correctif anti-doublon), on n'affiche
        // qu'une seule fois chaque personne pour un même rôle demandé.
        const demandesDedupliquees = [];
        const clesDejaVues = new Set();
        demandesAvecProfils.forEach(d => {
          const cle = `${d.user_id}|${d.role_demande}`;
          if (clesDejaVues.has(cle)) return;
          clesDejaVues.add(cle);
          demandesDedupliquees.push(d);
        });
        setDemandesAffiliationRecues(demandesDedupliquees);
        setDemandesDepartRecues(departsAvecProfils);
        setInvitationsEnvoyees(invitationsEnvoyeesData || []);
        setNombreClassesReel((classesData || []).length);

        const profilEnseignantParId = {};
        (profilsEnseignants || []).forEach(p => { profilEnseignantParId[p.user_id] = p; });
        const affiliationsEnseignants = (affiliationsEnseignantsBrutes || []).map(a => ({ ...a, utilisateurs_profils: profilEnseignantParId[a.user_id] || null }));

        const profsAvecClasses = (affiliationsEnseignants || []).map(a => {
          const attrsDeCetEnseignant = (attributionsData || []).filter(at => at.enseignant_id === a.user_id);
          return {
            affiliationId: a.id,
            userId: a.user_id,
            nomComplet: `${a.utilisateurs_profils?.prenom || ''} ${a.utilisateurs_profils?.nom || ''}`.trim() || 'Enseignant',
            matiere: attrsDeCetEnseignant[0]?.matieres?.nom || 'Non définie',
            classes: attrsDeCetEnseignant.map(at => at.classes?.nom).filter(Boolean),
            contact: a.utilisateurs_profils?.telephone || 'Non défini',
          };
        });
        setListeProfesseursEtablissementBrute(profsAvecClasses);

        setPersonnelAdministratifManuel((personnelData || []).map(p => ({
          id: p.id, nomComplet: `${p.prenom} ${p.nom}`.trim(), role: p.fonction,
          matricule: 'N/A', contact: p.telephone || 'N/A', email: p.email || 'N/A',
        })));

        setNombreCenseursActifs((censeursActifsData || []).length);

        setDocumentsEtablissement((documentsData || []).map(d => ({
          ...d,
          cle_stockage: d.versions_document?.fichiers_metadonnees?.cle_stockage,
          taille_octets: d.versions_document?.fichiers_metadonnees?.taille_octets,
        })));

        // Bibliothèque pédagogique de l'établissement — même source que
        // l'onglet Archives Pédagogiques du censeur (bibliotheque_etablissement),
        // remplace l'ancienne lecture localStorage qui ne recevait plus rien.
        setFichesPedagogiquesEcole((fichesData || []).map(f => ({
          id: f.id,
          enseignant: `${f.utilisateurs_profils?.prenom || ''} ${f.utilisateurs_profils?.nom || ''}`.trim(),
          matiere: f.contenu_snapshot_json?.matiere || 'Non définie',
          classe: f.contenu_snapshot_json?.classe || 'Général',
          titre: f.titre,
          anneeScolaire: f.annees_scolaires?.intitule || '',
          dateValidation: new Date(f.created_at).toLocaleDateString(),
          details: f.contenu_snapshot_json,
        })));

        // Notifications non lues (cloche)
        setNotificationsChef((notifs || []).map(n => ({
          id: n.id,
          texte: n.payload_json?.message || '',
          date: new Date(n.created_at).toLocaleDateString(),
          lu: false,
          lienCible: n.payload_json?.lien_cible,
        })));
      }

      setChargementInitial(false);
  };

  useEffect(() => {
    chargerDonnees();
  }, []);
  // [CORRIGÉ] Les navigateurs bloquent silencieusement la demande de
  // permission (et le son) si elle n'est pas déclenchée par une vraie
  // interaction de l'utilisateur — un useEffect au montage ne compte pas.
  // On la déclenche donc au premier clic réel sur la page, qui débloque en
  // même temps le son (AudioContext) pour le reste de la session.
  useEffect(() => {
    const debloquerAuPremierClic = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      try {
        const AudioContextClasse = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClasse) {
          const ctx = new AudioContextClasse();
          if (ctx.state === 'suspended') ctx.resume();
        }
      } catch (e) { /* pas grave, le son sera juste indisponible */ }
      document.removeEventListener('click', debloquerAuPremierClic);
    };
    document.addEventListener('click', debloquerAuPremierClic);
    return () => document.removeEventListener('click', debloquerAuPremierClic);
  }, []);

  // =========================================================================
  // CRÉATION / CONNEXION À UN ÉTABLISSEMENT
  // =========================================================================
  const handleCreerEcole = async (e) => {
    e.preventDefault();
    if (!inputNomEcole.trim()) { showToast("⚠️ Veuillez entrer un nom valide."); return; }
    if (!userId) { showToast("⚠️ Session invalide, reconnectez-vous."); return; }
    if (actionsEnCours['creerEcole']) return;
    debuterAction('creerEcole');

    const nouvelEtablissementId = crypto.randomUUID();

    const { error: erreurEtab } = await supabase
      .from('etablissements')
      .insert({
        id: nouvelEtablissementId,
        code: inputCodeEtablissement.trim() || `ETAB-${Date.now()}`,
        nom: inputNomEcole.trim(),
        pays: inputSituationGeo.trim() || null,
        visibilite: inputTypeEtablissement === 'prive' ? 'PRIVE' : 'PUBLIC',
        parametres_json: {
          nombreEleves: inputNombreEleves,
          nombreEnseignants: inputNombreEnseignants,
          typeEnseignement: inputTypeEnseignement,
        },
      });

    if (erreurEtab) {
      if (erreurEtab.code === '23505') {
        showToast("⚠️ Ce code établissement est déjà utilisé, choisissez-en un autre.");
      } else {
        showToast("⚠️ Erreur création établissement : " + erreurEtab.message);
      }
      terminerAction('creerEcole');
      return;
    }

    const { error: erreurAnnee } = await supabase
      .from('annees_scolaires')
      .insert({
        etablissement_id: nouvelEtablissementId,
        intitule: inputAnneeScolaire.trim() || '2025-2026',
        est_active: true,
      });

    if (erreurAnnee) {
      showToast("⚠️ Établissement créé, mais erreur sur l'année scolaire : " + erreurAnnee.message);
    }

    const { error: erreurAffiliation } = await supabase
      .from('affiliations_etablissement')
      .insert({
        user_id: userId,
        etablissement_id: nouvelEtablissementId,
        role: 'CHEF',
        statut: 'ACTIVE',
        date_debut: new Date().toISOString().slice(0, 10),
      });

    if (erreurAffiliation) {
      if (erreurAffiliation.code === '23505') {
        showToast("⚠️ Vous êtes déjà chef actif d'un autre établissement. Un chef ne peut diriger qu'un seul établissement à la fois.");
      } else {
        showToast("⚠️ Erreur d'affiliation : " + erreurAffiliation.message);
      }
      terminerAction('creerEcole');
      return;
    }

    const { data: etabRelu } = await supabase
      .from('etablissements').select('*').eq('id', nouvelEtablissementId).single();

    setAffiliationChef({ etablissement_id: nouvelEtablissementId });
    setEcoleConfig(etabRelu);
    setFormEcoleEdition(etabRelu);
    setInfosChef(prev => ({ ...prev, etablissement: etabRelu?.nom }));
    showToast("🏫 Établissement créé !");
    terminerAction('creerEcole');
  };

  const handleConnecterEcole = async (e) => {
    e.preventDefault();
    if (!inputNomEcole.trim() || !inputCodeEtablissement.trim()) {
      showToast("⚠️ Nom et code établissement requis.");
      return;
    }
    if (!userId) { showToast("⚠️ Session invalide, reconnectez-vous."); return; }
    if (envoiDemandeConnecterEnCours) return;
    setEnvoiDemandeConnecterEnCours(true);

    const { data: etablissementCible, error: erreurRecherche } = await supabase
      .from('etablissements')
      .select('id, nom')
      .eq('code', inputCodeEtablissement.trim())
      .maybeSingle();

    if (erreurRecherche || !etablissementCible) {
      showToast("⚠️ Aucun établissement trouvé avec ce code.");
      setEnvoiDemandeConnecterEnCours(false);
      return;
    }

    // [NOUVEAU] Vérifie qu'aucune demande identique n'est déjà en attente
    // avant d'en créer une nouvelle — évite les doublons (plusieurs clics
    // sur le bouton) qui obligeaient ensuite un autre chef/censeur à
    // traiter la même personne plusieurs fois.
    const { data: demandeExistante } = await supabase
      .from('demandes_affiliation')
      .select('id')
      .eq('user_id', userId)
      .eq('etablissement_id', etablissementCible.id)
      .eq('role_demande', 'CHEF')
      .eq('statut', 'EN_ATTENTE')
      .maybeSingle();

    if (demandeExistante) {
      showToast("⚠️ Une demande est déjà en attente pour cet établissement.");
      setEnvoiDemandeConnecterEnCours(false);
      return;
    }

    const { error: erreurDemande } = await supabase
      .from('demandes_affiliation')
      .insert({
        user_id: userId,
        etablissement_id: etablissementCible.id,
        role_demande: 'CHEF',
      });

    if (erreurDemande) {
      if (erreurDemande.code === '23505') showToast("⚠️ Une demande est déjà en attente pour cet établissement.");
      else showToast("⚠️ Erreur d'envoi de la demande : " + erreurDemande.message);
      setEnvoiDemandeConnecterEnCours(false);
      return;
    }

    showToast(`📨 Demande envoyée pour "${etablissementCible.nom}". En attente d'approbation.`);
    setEnvoiDemandeConnecterEnCours(false);
    setModeSetup('CHOIX');
  };

  const handleEnregistrerCarteEcole = async (e) => {
    e.preventDefault();
    if (!ecoleConfig?.id || actionsEnCours['enregistrerCarte']) return;
    debuterAction('enregistrerCarte');

    const { data: etablissementMaj, error } = await supabase
      .from('etablissements')
      .update({
        nom: formEcoleEdition.nom,
        code: formEcoleEdition.code,
        adresse: formEcoleEdition.adresse || null,
        ville: formEcoleEdition.ville || null,
        pays: formEcoleEdition.pays || null,
        visibilite: formEcoleEdition.visibilite || 'PRIVE',
        logo_url: formEcoleEdition.logo_url || null,
        parametres_json: {
          ...(formEcoleEdition.parametres_json || {}),
          nombreEleves: formEcoleEdition.parametres_json?.nombreEleves || '',
          nombreEnseignants: formEcoleEdition.parametres_json?.nombreEnseignants || '',
          anneeCreation: formEcoleEdition.parametres_json?.anneeCreation || '',
          typeEnseignement: formEcoleEdition.parametres_json?.typeEnseignement || 'GENERAL',
        },
      })
      .eq('id', ecoleConfig.id)
      .select()
      .single();

    if (error) {
      showToast("⚠️ Erreur de mise à jour : " + error.message);
      terminerAction('enregistrerCarte');
      return;
    }

    setEcoleConfig(etablissementMaj);
    setModeEditionEcole(false);
    showToast("✅ Carte d'identité de l'établissement mise à jour !");
    terminerAction('enregistrerCarte');
  };

  const handleEnregistrerProfilChef = async (e) => {
    e.preventDefault();
    if (!userId || actionsEnCours['enregistrerProfilChef']) return;
    debuterAction('enregistrerProfilChef');

    const { error } = await supabase
      .from('utilisateurs_profils')
      .update({
        nom: formProfilChef.nom,
        prenom: formProfilChef.prenoms,
        telephone: formProfilChef.telephone || null,
      })
      .eq('user_id', userId);

    if (error) {
      showToast("⚠️ Erreur de mise à jour du profil : " + error.message);
      terminerAction('enregistrerProfilChef');
      return;
    }

    setInfosChef({ ...formProfilChef });
    setModalProfilChefOuvert(false);
    showToast("✅ Profil mis à jour avec succès !");
    terminerAction('enregistrerProfilChef');
  };

  // =========================================================================
  // TOUS LES AUTRES HOOKS (memos + effect) — DOIVENT être avant tout return
  // conditionnel.
  // =========================================================================
  const listeProfesseursEtablissement = listeProfesseursEtablissementBrute;

  const [fichesPedagogiquesEcole, setFichesPedagogiquesEcole] = useState([]);

  const professeursFiltres = useMemo(() => {
    return listeProfesseursEtablissement.filter(prof => {
      const matchMat = filtreProfMatiere === 'TOUTES' || prof.matiere === filtreProfMatiere;
      const matchNiv = filtreProfNiveau === 'TOUS' || (prof.niveau && prof.niveau.includes(filtreProfNiveau));
      const matchCl = filtreProfClasse === 'TOUTES' || (prof.classes && prof.classes.includes(filtreProfClasse));
      return matchMat && matchNiv && matchCl;
    });
  }, [listeProfesseursEtablissement, filtreProfMatiere, filtreProfNiveau, filtreProfClasse]);

  const [filtreFichesTexte, setFiltreFichesTexte] = useState('');
  const [filtreFichesClasse, setFiltreFichesClasse] = useState('TOUTES');
  const [filtreFichesMatiere, setFiltreFichesMatiere] = useState('TOUTES');
  const [filtreFichesAnnee, setFiltreFichesAnnee] = useState('TOUTES');

  const classesFichesDisponibles = useMemo(() => [...new Set(fichesPedagogiquesEcole.map(f => f.classe).filter(Boolean))].sort(), [fichesPedagogiquesEcole]);
  const matieresFichesDisponibles = useMemo(() => [...new Set(fichesPedagogiquesEcole.map(f => f.matiere).filter(Boolean))].sort(), [fichesPedagogiquesEcole]);
  const anneesFichesDisponibles = useMemo(() => [...new Set(fichesPedagogiquesEcole.map(f => f.anneeScolaire).filter(Boolean))].sort().reverse(), [fichesPedagogiquesEcole]);

  const fichesFiltrees = useMemo(() => {
    const texte = filtreFichesTexte.trim().toLowerCase();
    return fichesPedagogiquesEcole.filter(fiche => {
      const matchMat = filtreFichesMatiere === 'TOUTES' || fiche.matiere === filtreFichesMatiere;
      const matchCl = filtreFichesClasse === 'TOUTES' || fiche.classe === filtreFichesClasse;
      const matchAnnee = filtreFichesAnnee === 'TOUTES' || fiche.anneeScolaire === filtreFichesAnnee;
      const matchTexte = !texte || (fiche.titre || '').toLowerCase().includes(texte) || (fiche.enseignant || '').toLowerCase().includes(texte);
      return matchMat && matchCl && matchAnnee && matchTexte;
    });
  }, [fichesPedagogiquesEcole, filtreFichesMatiere, filtreFichesClasse, filtreFichesAnnee, filtreFichesTexte]);

  const fichesPedagogiquesParClasse = useMemo(() => {
    const groupes = {};
    fichesFiltrees.forEach(fiche => {
      const classe = fiche.classe || 'Sans classe';
      if (!groupes[classe]) groupes[classe] = [];
      groupes[classe].push(fiche);
    });
    return Object.entries(groupes).sort(([a], [b]) => a.localeCompare(b));
  }, [fichesFiltrees]);
  const [classesOuvertesFiches, setClassesOuvertesFiches] = useState({});
  const toggleClasseFiches = (classeNom) => setClassesOuvertesFiches(prev => ({ ...prev, [classeNom]: !prev[classeNom] }));

  const statistiquesReseau = useMemo(() => ({
    totalClasses: nombreClassesReel,
    totalPersonnesConnectees: 1 + nombreCenseursActifs + listeProfesseursEtablissement.length + personnelAdministratifManuel.length,
  }), [nombreClassesReel, nombreCenseursActifs, listeProfesseursEtablissement.length, personnelAdministratifManuel.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profilChefRef.current && !profilChefRef.current.contains(event.target)) setProfilChefOuvert(false);
      if (notifChefRef.current && !notifChefRef.current.contains(event.target)) setNotifChefOuvert(false);
      if (menuBurgerChefRef.current && !menuBurgerChefRef.current.contains(event.target)) setMenuBurgerChefOuvert(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- "En ligne maintenant" : lit le canal de présence déjà alimenté par
  // AppRouter.jsx — SANS jamais le recréer ni le re-souscrire (sinon
  // Supabase renvoie "cannot add presence callbacks after subscribe()" et
  // l'écran devient blanc). On relit juste son état à intervalle régulier.
  const [personnesEnLigne, setPersonnesEnLigne] = useState([]);
  useEffect(() => {
    if (!ecoleConfig?.id) return;
    const topic = `presence-etablissement-${ecoleConfig.id}`;
    const interval = setInterval(() => {
      const canal = supabase.getChannels().find(c => c.topic === `realtime:${topic}`);
      if (canal) {
        const etat = canal.presenceState();
        setPersonnesEnLigne(Object.values(etat).flat());
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [ecoleConfig?.id]);

  // --- Écran de chargement — maintenant APRÈS tous les hooks ci-dessus ---
  if (chargementInitial) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff' }}>
        Chargement de votre espace...
      </div>
    );
  }

  // [CORRIGÉ] Sur mobile, window.open('', '_blank') ouvrait un vrai nouvel
  // onglet, obligeant à repasser par le sélecteur d'onglets du navigateur
  // pour revenir à l'app. Remplacé par un iframe invisible qui imprime dans
  // le même onglet — aucune navigation, aucune perte de focus.
  const telechargerDocumentPDF = (titre, contenuHTML) => {
    const documentComplet = `
      <html>
        <head>
          <title>${titre}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #1e293b; padding: 20px; margin: 0; }
            .pdf-container { max-width: 800px; margin: 0 auto; }
            .pdf-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }
            h1 { margin: 0; font-size: 20px; color: #0f172a; }
            p { margin: 8px 0; font-size: 14px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="pdf-container">
            <div class="pdf-header"><h1>${titre}</h1></div>
            <div class="pdf-content">${contenuHTML}</div>
          </div>
        </body>
      </html>
    `;

    const iframeImpression = document.createElement('iframe');
    iframeImpression.style.position = 'fixed';
    iframeImpression.style.right = '0';
    iframeImpression.style.bottom = '0';
    iframeImpression.style.width = '0';
    iframeImpression.style.height = '0';
    iframeImpression.style.border = '0';
    document.body.appendChild(iframeImpression);

    const docIframe = iframeImpression.contentWindow.document;
    docIframe.open();
    docIframe.write(documentComplet);
    docIframe.close();

    setTimeout(() => {
      iframeImpression.contentWindow.focus();
      iframeImpression.contentWindow.print();
      setTimeout(() => { if (iframeImpression.parentNode) document.body.removeChild(iframeImpression); }, 1000);
    }, 300);

    showToast(`📥 Document "${titre}" prêt !`);
  };

  const executerActionAnneeScolaire = async () => {
    const { actionType } = modalConfirmationActionAnnee;
    if (!affiliationChef?.etablissement_id || actionsEnCours['actionAnnee']) return;
    debuterAction('actionAnnee');
    const etablissementId = affiliationChef.etablissement_id;

    if (actionType === 'ouvrir') {
      if (!inputNouvelleAnneeIntitule.trim()) {
        showToast("⚠️ Merci d'indiquer l'intitulé de la nouvelle année (ex. 2026-2027).");
        terminerAction('actionAnnee');
        return;
      }
      if (anneeActive?.id) {
        const { error: erreurFermeture } = await supabase
          .from('annees_scolaires')
          .update({ est_active: false })
          .eq('id', anneeActive.id);
        if (erreurFermeture) {
          showToast("⚠️ Erreur lors de la clôture de l'année précédente : " + erreurFermeture.message);
          terminerAction('actionAnnee');
          return;
        }
      }

      const { data: nouvelleAnnee, error: erreurOuverture } = await supabase
        .from('annees_scolaires')
        .insert({ etablissement_id: etablissementId, intitule: inputNouvelleAnneeIntitule.trim(), est_active: true })
        .select()
        .single();

      if (erreurOuverture) {
        showToast("⚠️ Erreur à l'ouverture : " + erreurOuverture.message);
        terminerAction('actionAnnee');
        return;
      }

      setAnneeActive(nouvelleAnnee);
      setInputNouvelleAnneeIntitule('');
      showToast(`🚀 Année "${nouvelleAnnee.intitule}" ouverte !`);

      await envoyerNotificationATousLesMembres(
        etablissementId, 'ANNEE_OUVERTE',
        `🚀 La nouvelle année scolaire "${nouvelleAnnee.intitule}" est ouverte !`,
        'profil_ecole'
      );

    } else if (actionType === 'fermer') {
      if (!anneeActive?.id) { terminerAction('actionAnnee'); return; }
      const intituleFerme = anneeActive.intitule;
      const { error } = await supabase
        .from('annees_scolaires')
        .update({ est_active: false })
        .eq('id', anneeActive.id);

      if (error) {
        showToast("⚠️ Erreur lors de la clôture : " + error.message);
        terminerAction('actionAnnee');
        return;
      }
      setAnneeActive(null);
      showToast("🔒 Année scolaire clôturée. Le bilan a été généré automatiquement.");

      await envoyerNotificationATousLesMembres(
        etablissementId, 'ANNEE_FERMEE',
        `🔒 L'année scolaire "${intituleFerme}" a été clôturée. Le bilan est disponible.`,
        'profil_ecole'
      );
    }
    setModalConfirmationActionAnnee({ ouvert: false, actionType: null });
    terminerAction('actionAnnee');
  };


  const ajouterPersonnelAdministratif = async (e) => {
    e.preventDefault();
    if (!nouveauAdminNom.trim() || !affiliationChef?.etablissement_id || actionsEnCours['ajouterPersonnelChef']) return;
    debuterAction('ajouterPersonnelChef');

    const [prenom, ...resteNom] = nouveauAdminNom.trim().split(' ');
    const nom = resteNom.join(' ') || prenom;

    const { data: nouveau, error } = await supabase
      .from('personnel')
      .insert({
        etablissement_id: affiliationChef.etablissement_id,
        prenom, nom, fonction: nouveauAdminRole,
        email: nouveauAdminEmail.trim() || null,
        telephone: nouveauAdminContact.trim() || null,
      })
      .select()
      .single();

    if (error) { showToast("⚠️ Erreur : " + error.message); terminerAction('ajouterPersonnelChef'); return; }

    setPersonnelAdministratifManuel(prev => [...prev, {
      id: nouveau.id, nomComplet: nouveauAdminNom.trim(), role: nouveauAdminRole,
      matricule: nouveauAdminMatricule.trim() || 'N/A', contact: nouveauAdminContact.trim() || 'N/A', email: nouveauAdminEmail.trim() || 'N/A',
    }]);
    setNouveauAdminNom(''); setNouveauAdminMatricule(''); setNouveauAdminContact(''); setNouveauAdminEmail('');
    showToast("✅ Personnel administratif ajouté !");
    terminerAction('ajouterPersonnelChef');
  };

  const supprimerPersonnelAdministratif = (id, nomComplet) => {
    demanderConfirmation({
      titre: 'Retirer ce membre du personnel ?',
      message: `Êtes-vous sûr de vouloir retirer ${nomComplet} du personnel administratif ?`,
      necessiteMotif: false,
      onConfirmer: async () => {
        if (actionsEnCours[`suppPersonnelChef_${id}`]) return;
        debuterAction(`suppPersonnelChef_${id}`);
        const { error } = await supabase.from('personnel').delete().eq('id', id);
        if (error) { showToast("⚠️ Erreur : " + error.message); terminerAction(`suppPersonnelChef_${id}`); return; }
        setPersonnelAdministratifManuel(prev => prev.filter(p => p.id !== id));
        showToast("🗑️ Membre retiré.");
        terminerAction(`suppPersonnelChef_${id}`);
      },
    });
  };

  const retirerEnseignant = (affiliationId, nomComplet) => {
    demanderConfirmation({
      titre: `Retirer ${nomComplet} de l'établissement ?`,
      message: "Cette action met fin à son affiliation active. Elle recevra une notification. Merci d'indiquer le motif.",
      necessiteMotif: true,
      onConfirmer: async (motif) => {
        if (!motif || !motif.trim()) { showToast("⚠️ Le motif est obligatoire pour un retrait."); return; }
        if (actionsEnCours[`retirerEns_${affiliationId}`]) return;
        debuterAction(`retirerEns_${affiliationId}`);
        const prof = listeProfesseursEtablissementBrute.find(p => p.affiliationId === affiliationId);
        const { error } = await supabase
          .from('affiliations_etablissement')
          .update({ statut: 'TERMINEE', date_fin: new Date().toISOString().slice(0, 10), permissions_override_json: { motif_retrait: motif.trim() } })
          .eq('id', affiliationId);
        if (error) { showToast("⚠️ Erreur : " + error.message); terminerAction(`retirerEns_${affiliationId}`); return; }

        if (prof?.userId) {
          await envoyerNotification(
            prof.userId, 'AFFILIATION_TERMINEE',
            `🚪 Vous avez été retiré(e) de l'établissement "${ecoleConfig?.nom}". Motif : ${motif.trim()}`,
            'affiliation', affiliationChef.etablissement_id
          );
        }

        setListeProfesseursEtablissementBrute(prev => prev.filter(p => p.affiliationId !== affiliationId));
        showToast(`🗑️ ${nomComplet} a été retiré(e) de l'établissement. Notification envoyée.`);
        terminerAction(`retirerEns_${affiliationId}`);
      },
    });
  };

  const regenererCodeEtablissement = () => {
    demanderConfirmation({
      titre: 'Régénérer le code établissement ?',
      message: "L'ancien code ne fonctionnera plus pour rejoindre l'établissement. Toute personne avec l'ancien code devra recevoir le nouveau.",
      necessiteMotif: false,
      onConfirmer: async () => {
        if (actionsEnCours['regenererCode']) return;
        debuterAction('regenererCode');
        const nouveauCode = 'ECH-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
        const { data: etabMaj, error } = await supabase
          .from('etablissements')
          .update({ code: nouveauCode })
          .eq('id', ecoleConfig.id)
          .select()
          .single();
        if (error) { showToast("⚠️ Erreur : " + error.message); terminerAction('regenererCode'); return; }
        setEcoleConfig(etabMaj);
        setFormEcoleEdition(prev => ({ ...prev, code: nouveauCode }));
        showToast(`✅ Nouveau code établissement : ${nouveauCode}`);
        terminerAction('regenererCode');
      },
    });
  };

  const handleChangerEmailConnexion = async (e) => {
    e.preventDefault();
    if (!emailSaisiChangement.trim() || actionsEnCours['changerEmail']) return;
    debuterAction('changerEmail');
    const { error } = await supabase.auth.updateUser({ email: emailSaisiChangement.trim() });
    if (error) { showToast("⚠️ Erreur : " + error.message); terminerAction('changerEmail'); return; }
    showToast("📧 Vérifiez votre boîte mail : un lien de confirmation a été envoyé au nouvel email.");
    setEmailSaisiChangement('');
    terminerAction('changerEmail');
  };

  const uploaderFichierAdministratifreel = async (e) => {
    e.preventDefault();
    if (!nomNouveauFichier.trim() || !fichierSelectionneObj || !affiliationChef?.etablissement_id || !userId) {
      showToast("⚠️ Merci de choisir un fichier et de lui donner un nom.");
      return;
    }
    setUploadEnCours(true);
    const etablissementId = affiliationChef.etablissement_id;
    const cheminStockage = `${etablissementId}/${Date.now()}-${fichierSelectionneObj.name}`;

    const { error: erreurStorage } = await supabase.storage
      .from('documents-etablissements')
      .upload(cheminStockage, fichierSelectionneObj);
    if (erreurStorage) { showToast("⚠️ Erreur d'envoi du fichier : " + erreurStorage.message); setUploadEnCours(false); return; }

    const { data: fichierMeta, error: erreurMeta } = await supabase
      .from('fichiers_metadonnees')
      .insert({
        type_proprietaire: 'ETABLISSEMENT', proprietaire_id: etablissementId, etablissement_id: etablissementId,
        categorie: categorieNouveauFichier, cle_stockage: cheminStockage,
        type_mime: fichierSelectionneObj.type, taille_octets: fichierSelectionneObj.size,
      })
      .select().single();
    if (erreurMeta) { showToast("⚠️ Erreur métadonnées : " + erreurMeta.message); setUploadEnCours(false); return; }

    const { data: document, error: erreurDoc } = await supabase
      .from('documents_etablissement')
      .insert({ etablissement_id: etablissementId, categorie: categorieNouveauFichier, titre: nomNouveauFichier.trim(), auteur_user_id: userId })
      .select().single();
    if (erreurDoc) { showToast("⚠️ Erreur document : " + erreurDoc.message); setUploadEnCours(false); return; }

    const { data: version, error: erreurVersion } = await supabase
      .from('versions_document')
      .insert({ document_id: document.id, numero_version: 1, fichier_id: fichierMeta.id, auteur_user_id: userId })
      .select().single();
    if (erreurVersion) { showToast("⚠️ Erreur version : " + erreurVersion.message); setUploadEnCours(false); return; }

    await supabase.from('documents_etablissement').update({ version_courante_id: version.id }).eq('id', document.id);

    setDocumentsEtablissement(prev => [{ ...document, taille_octets: fichierMeta.taille_octets, cle_stockage: cheminStockage }, ...prev]);
    setNomNouveauFichier(''); setFichierSelectionneObj(null);
    setUploadEnCours(false);
    showToast("📎 Fichier stocké avec succès !");
  };

  const telechargerDocumentEtablissement = async (doc) => {
    const { data, error } = await supabase.storage.from('documents-etablissements').createSignedUrl(doc.cle_stockage, 60);
    if (error) { showToast("⚠️ Erreur : " + error.message); return; }
    window.open(data.signedUrl, '_blank');
  };

  const approuverDemande = (demande) => {
    if (!affiliationChef || actionsEnCours[`appro_${demande.id}`]) return;

    // [NOUVEAU] Un établissement n'a qu'un seul chef actif à la fois —
    // approuver une demande de CHEF signifie donc être remplacé(e)
    // immédiatement. Confirmation explicite obligatoire avant de continuer,
    // avec un message clair sur ce que ça implique.
    if (demande.role_demande === 'CHEF') {
      demanderConfirmation({
        titre: '⚠️ Vous allez être remplacé(e)',
        message: `En approuvant, ${demande.utilisateurs_profils?.prenom || ''} ${demande.utilisateurs_profils?.nom || ''} deviendra chef(fe) de cet établissement à votre place. Vous perdrez immédiatement votre accès ici en tant que chef, et devrez créer ou rejoindre un autre établissement. Continuer ?`,
        necessiteMotif: false,
        onConfirmer: () => finaliserApprobationDemande(demande),
      });
      return;
    }

    finaliserApprobationDemande(demande);
  };

  const finaliserApprobationDemande = async (demande) => {
    if (!affiliationChef || actionsEnCours[`appro_${demande.id}`]) return;
    debuterAction(`appro_${demande.id}`);
    const { error: erreurAff } = await supabase.from('affiliations_etablissement').insert({
      user_id: demande.user_id,
      etablissement_id: affiliationChef.etablissement_id,
      role: demande.role_demande,
      statut: 'ACTIVE',
      date_debut: new Date().toISOString().slice(0, 10),
    });
    if (erreurAff) { showToast("⚠️ Erreur : " + erreurAff.message); terminerAction(`appro_${demande.id}`); return; }

    // [CORRIGÉ] Si la même personne a envoyé sa demande plusieurs fois
    // (double-clic, etc.), il ne faut créer qu'UNE seule affiliation (fait
    // ci-dessus) mais clôturer TOUS ses doublons encore en attente pour ce
    // même rôle — sinon les autres réapparaissent comme s'il s'agissait
    // d'une personne différente à traiter.
    const { error: erreurMaj } = await supabase
      .from('demandes_affiliation')
      .update({ statut: 'ACCEPTEE', traite_par_user_id: userId, traite_at: new Date().toISOString() })
      .eq('user_id', demande.user_id)
      .eq('etablissement_id', affiliationChef.etablissement_id)
      .eq('role_demande', demande.role_demande)
      .eq('statut', 'EN_ATTENTE');
    if (erreurMaj) {
      showToast("⚠️ Affiliation créée, mais la demande n'a pas pu être clôturée : " + erreurMaj.message);
      terminerAction(`appro_${demande.id}`);
      return;
    }

    // [NOUVEAU] Une promotion en CENSEUR ne doit laisser à la personne
    // qu'un seul établissement actif — on ferme toutes ses autres
    // affiliations ENSEIGNANT, où qu'elles soient, pour ne garder que la
    // nouvelle affiliation censeur qu'on vient de créer.
    if (demande.role_demande === 'CENSEUR') {
      await supabase
        .from('affiliations_etablissement')
        .update({ statut: 'TERMINEE', date_fin: new Date().toISOString().slice(0, 10) })
        .eq('user_id', demande.user_id)
        .eq('role', 'ENSEIGNANT')
        .eq('statut', 'ACTIVE');
    }

    // [NOUVEAU] Une promotion en CHEF remplace l'ancien chef — on ferme SA
    // PROPRE affiliation de chef sur cet établissement (la confirmation
    // pour ce remplacement a déjà été obtenue dans approuverDemande).
    if (demande.role_demande === 'CHEF' && affiliationChef.id) {
      await supabase
        .from('affiliations_etablissement')
        .update({ statut: 'TERMINEE', date_fin: new Date().toISOString().slice(0, 10) })
        .eq('id', affiliationChef.id);
    }

    await envoyerNotification(
      demande.user_id, 'DEMANDE_AFFILIATION_ACCEPTEE',
      `✅ Votre demande pour rejoindre l'établissement en tant que ${demande.role_demande.toLowerCase()} a été acceptée !`,
      demande.role_demande === 'ENSEIGNANT' ? 'affiliation' : 'profil_ecole', affiliationChef.etablissement_id
    );

    setDemandesAffiliationRecues(prev => prev.filter(d => d.user_id !== demande.user_id));
    showToast("✅ Demande approuvée, la personne a maintenant accès à l'établissement !");
    terminerAction(`appro_${demande.id}`);

    // [NOUVEAU] Si c'était une demande de CHEF, l'utilisateur courant vient
    // de perdre son propre accès à cet établissement — on le fait ressortir
    // vers l'écran de choix d'établissement en rechargeant la page (même
    // mécanisme que la déconnexion), plutôt que de le laisser sur un
    // dashboard auquel il n'a plus droit.
    if (demande.role_demande === 'CHEF') {
      showToast("🚪 Vous avez été remplacé(e) comme chef de cet établissement.");
      setTimeout(() => { window.location.reload(); }, 1500);
    }
  };

  const refuserDemande = async (demande) => {
    if (actionsEnCours[`refus_${demande.id}`]) return;
    debuterAction(`refus_${demande.id}`);
    // [CORRIGÉ] Même logique que l'approbation : on refuse d'un coup tous
    // les doublons de la même personne, pas seulement celui cliqué.
    const { error } = await supabase
      .from('demandes_affiliation')
      .update({ statut: 'REFUSEE', traite_par_user_id: userId, traite_at: new Date().toISOString() })
      .eq('user_id', demande.user_id)
      .eq('etablissement_id', affiliationChef.etablissement_id)
      .eq('role_demande', demande.role_demande)
      .eq('statut', 'EN_ATTENTE');
    if (error) { showToast("⚠️ Erreur : " + error.message); terminerAction(`refus_${demande.id}`); return; }

    await envoyerNotification(
      demande.user_id, 'DEMANDE_AFFILIATION_REFUSEE',
      `❌ Votre demande pour rejoindre l'établissement a été refusée.`,
      demande.role_demande === 'ENSEIGNANT' ? 'affiliation' : 'profil_ecole', affiliationChef.etablissement_id
    );

    setDemandesAffiliationRecues(prev => prev.filter(d => d.user_id !== demande.user_id));
    showToast("❌ Demande refusée.");
    terminerAction(`refus_${demande.id}`);
  };

  const approuverDemandeDepart = async (demande) => {
    if (actionsEnCours[`approDep_${demande.id}`]) return;
    debuterAction(`approDep_${demande.id}`);
    const { error } = await supabase
      .from('demandes_depart')
      .update({ statut: 'APPROUVEE', traite_par_user_id: userId })
      .eq('id', demande.id);
    if (error) { showToast("⚠️ Erreur : " + error.message); terminerAction(`approDep_${demande.id}`); return; }

    await envoyerNotification(
      demande.user_id, 'DEPART_APPROUVE',
      `✅ Votre demande de départ de l'établissement a été approuvée.`,
      demande.role_demandeur === 'ENSEIGNANT' ? 'affiliation' : 'profil_ecole', affiliationChef.etablissement_id
    );

    setDemandesDepartRecues(prev => prev.filter(d => d.id !== demande.id));
    setListeProfesseursEtablissementBrute(prev => prev.filter(p => p.userId !== demande.user_id));
    showToast("✅ Départ approuvé. La personne a été notifiée.");
    terminerAction(`approDep_${demande.id}`);
  };

  const refuserDemandeDepart = (demande, nomComplet) => {
    demanderConfirmation({
      titre: 'Refuser ce départ ?',
      message: `${nomComplet} restera affilié(e) à l'établissement.`,
      necessiteMotif: false,
      onConfirmer: async () => {
        if (actionsEnCours[`refusDep_${demande.id}`]) return;
        debuterAction(`refusDep_${demande.id}`);
        const { error } = await supabase
          .from('demandes_depart')
          .update({ statut: 'REFUSEE', traite_par_user_id: userId })
          .eq('id', demande.id);
        if (error) { showToast("⚠️ Erreur : " + error.message); terminerAction(`refusDep_${demande.id}`); return; }

        await envoyerNotification(
          demande.user_id, 'DEPART_REFUSE',
          `❌ Votre demande de départ de l'établissement a été refusée.`,
          demande.role_demandeur === 'ENSEIGNANT' ? 'affiliation' : 'profil_ecole', affiliationChef.etablissement_id
        );

        setDemandesDepartRecues(prev => prev.filter(d => d.id !== demande.id));
        showToast("❌ Demande de départ refusée.");
        terminerAction(`refusDep_${demande.id}`);
      },
    });
  };

  const genererTokenInvitation = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  const envoyerInvitation = async (e) => {
    e.preventDefault();
    if (!nouvelleInvitationEmail.trim() || !affiliationChef || actionsEnCours['envoyerInvitation']) return;
    debuterAction('envoyerInvitation');

    const { data: nouvelleInvitation, error } = await supabase
      .from('invitations')
      .insert({
        etablissement_id: affiliationChef.etablissement_id,
        invite_par_user_id: userId,
        email: nouvelleInvitationEmail.trim().toLowerCase(),
        role_propose: nouvelleInvitationRole,
        token: genererTokenInvitation(),
        expire_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select().single();

    if (error) { showToast("⚠️ Erreur d'envoi de l'invitation : " + error.message); terminerAction('envoyerInvitation'); return; }

    setInvitationsEnvoyees(prev => [nouvelleInvitation, ...prev]);
    setNouvelleInvitationEmail('');
    showToast(`📨 Invitation envoyée à ${nouvelleInvitation.email} (rôle : ${nouvelleInvitationRole}) !`);
    terminerAction('envoyerInvitation');
  };

  const handleChangerPhotoProfilChef = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setFormProfilChef(prev => ({ ...prev, photoProfil: reader.result })); };
    reader.readAsDataURL(file);
  };

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
              {/* [CORRIGÉ] Cet écran n'avait aucun moyen de sortir — un
                  compte qui n'a pas encore d'établissement (ou qui s'est
                  connecté par erreur ici) restait totalement bloqué. */}
              <button onClick={async () => {
                try { await supabase.auth.signOut(); } catch (err) { console.warn('signOut a échoué, nettoyage forcé :', err); }
                localStorage.clear();
                window.location.reload();
              }} className="bouton bouton-secondaire" style={{ marginTop: '10px', color: '#ef4444' }}>⬅️ Retour</button>
            </div>
          )}

          {modeSetup === 'CONNECTER' && (
            <form onSubmit={handleConnecterEcole} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={styles.label}>Nom de l'établissement</label><input type="text" value={inputNomEcole} onChange={(e) => setInputNomEcole(e.target.value)} style={styles.inputStyle} required /></div>
              <div>
                <label style={styles.label}>Code de l'établissement</label>
                <input type="text" value={inputCodeEtablissement} onChange={(e) => setInputCodeEtablissement(e.target.value)} style={styles.inputStyle} required />
              </div>
              <div><label style={styles.label}>Année Scolaire</label><input type="text" value={inputAnneeScolaire} onChange={(e) => setInputAnneeScolaire(e.target.value)} style={styles.inputStyle} required /></div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}><button type="button" onClick={() => setModeSetup('CHOIX')} className="bouton bouton-secondaire" style={{ flex: 1 }}>Retour</button><button type="submit" className="bouton bouton-principal" style={{ flex: 1 }} disabled={envoiDemandeConnecterEnCours}>{envoiDemandeConnecterEnCours ? 'Envoi...' : 'Envoyer la demande'}</button></div>
            </form>
          )}

          {modeSetup === 'CREER' && (
            <form onSubmit={handleCreerEcole} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={styles.label}>Type d'établissement</label><select value={inputTypeEtablissement} onChange={(e) => setInputTypeEtablissement(e.target.value)} style={styles.inputStyle}><option value="public">Public</option><option value="prive">Privé</option></select></div>
              <div>
                <label style={styles.label}>Enseignement dispensé</label>
                <select value={inputTypeEnseignement} onChange={(e) => setInputTypeEnseignement(e.target.value)} style={styles.inputStyle}>
                  <option value="GENERAL">Général (séries A, B, C, D, E)</option>
                  <option value="TECHNIQUE">Technique (séries F1-F4, G1-G3, H1-H2)</option>
                  <option value="MIXTE">Les deux (général et technique)</option>
                </select>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0' }}>Détermine les séries proposées au censeur pour la création des classes du second cycle.</p>
              </div>
              <div><label style={styles.label}>Nom de l'établissement</label><input type="text" value={inputNomEcole} onChange={(e) => setInputNomEcole(e.target.value)} style={styles.inputStyle} required /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}><div><label style={styles.label}>Code</label><input type="text" value={inputCodeEtablissement} onChange={(e) => setInputCodeEtablissement(e.target.value)} style={styles.inputStyle} required /></div><div><label style={styles.label}>Année</label><input type="text" value={inputAnneeScolaire} onChange={(e) => setInputAnneeScolaire(e.target.value)} style={styles.inputStyle} required /></div></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}><div><label style={styles.label}>Élèves</label><input type="number" value={inputNombreEleves} onChange={(e) => setInputNombreEleves(e.target.value)} style={styles.inputStyle} required /></div><div><label style={styles.label}>Enseignants</label><input type="number" value={inputNombreEnseignants} onChange={(e) => setInputNombreEnseignants(e.target.value)} style={styles.inputStyle} required /></div></div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}><button type="button" onClick={() => setModeSetup('CHOIX')} className="bouton bouton-secondaire" style={{ flex: 1 }}>Retour</button><button type="submit" className="bouton bouton-principal" style={{ flex: 1 }}>Créer</button></div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.darkNavbar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '8px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }} ref={profilChefRef}>
            <button onClick={() => setProfilChefOuvert(!profilChefOuvert)} style={styles.navbarTeacherClickableBlock}>
              <div style={styles.avatarNavbarContainer}>
                {infosChef.photoProfil ? <img src={infosChef.photoProfil} alt="Profil" style={styles.avatarNavbarImg} /> : <div style={styles.avatarNavbarPlaceholder}>👤</div>}
              </div>
              <div style={styles.navbarTeacherInfo}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '100%' }}>{infosChef.civilite} {infosChef.nom}</span>
                <span style={{ fontSize: '9px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase' }}>Direction</span>
              </div>
              <span style={{ fontSize: '9px', color: '#94a3b8', marginLeft: '2px' }}>{profilChefOuvert ? '▲' : '▼'}</span>
            </button>

            {profilChefOuvert && (
              <div style={{ ...styles.notificationDropdown, left: 0, right: 'auto' }}>
                <div style={styles.dropdownHeader}>Mon Compte Directeur</div>
                <button onClick={() => { setModalProfilChefOuvert(true); setProfilChefOuvert(false); }} className="bouton-option">⚙️ Modifier mon profil</button>
                <button onClick={() => { setModalSecurite(true); setProfilChefOuvert(false); }} className="bouton-option">🔒 Changer mot de passe</button>
                <button onClick={() => { setModalQuitterEcole(true); setProfilChefOuvert(false); }} className="bouton-option" style={{ color: '#ef4444', fontWeight: '800' }}>🚪 Quitter l'école</button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.08)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.12)', flexShrink: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>E-cahier !</span>
            <span style={{ fontSize: '12px' }}>📖</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }} ref={notifChefRef}>
              <button onClick={() => setNotifChefOuvert(!notifChefOuvert)} style={styles.navDarkBtn}>
                <span>🔔</span>
                {notificationsChef.length > 0 && <span style={styles.pastilleAlerte}>{notificationsChef.length}</span>}
              </button>
              {notifChefOuvert && (
                <div style={{ ...styles.notificationDropdown, right: 0, left: 'auto' }}>
                  <div style={styles.dropdownHeader}>Notifications</div>
                  {notificationsChef.length === 0 ? (
                    <p style={{ fontSize: '11px', color: '#94a3b8', padding: '8px', fontStyle: 'italic' }}>Aucune nouvelle notification.</p>
                  ) : (
                    notificationsChef.map(n => (
                      <div key={n.id} onClick={() => marquerNotificationLue(n)} style={{ ...styles.notifItem, cursor: 'pointer' }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#334155' }}>{n.texte}</p>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.date}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }} ref={menuBurgerChefRef}>
              <button onClick={() => setMenuBurgerChefOuvert(!menuBurgerChefOuvert)} style={styles.burgerBtn}>☰</button>
              {menuBurgerChefOuvert && (
                <div style={{ ...styles.notificationDropdown, right: 0, left: 'auto', width: '240px' }} className="anim-apparition">
                  <div style={styles.dropdownHeader}>Menu Direction</div>
                  <button onClick={() => { setActiveTab('profil_ecole'); setMenuBurgerChefOuvert(false); }} className="bouton-option">🏛️ Profil & Carte d'Identité</button>
                  <button onClick={() => { setActiveTab('censeurs'); setMenuBurgerChefOuvert(false); }} className="bouton-option">👥 Invitations & Demandes</button>
                  <button onClick={() => { setActiveTab('professeurs'); setMenuBurgerChefOuvert(false); }} className="bouton-option">👨‍🏫 Annuaire Personnel</button>
                  <button onClick={() => { setActiveTab('fichiers_pedagogiques'); setMenuBurgerChefOuvert(false); }} className="bouton-option">📚 Fiches Pédagogiques</button>
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px' }}>
                    <button onClick={() => { setModalDeconnexion(true); setMenuBurgerChefOuvert(false); }} className="bouton-option" style={{ color: '#ef4444', fontWeight: '900', textAlign: 'center' }}>🚪 Se déconnecter</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <style>{`
        .bouton { padding: 9px 17px; border-radius: 14px; font-weight: 800; font-size: 13px; cursor: pointer; border: none; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
        .bouton:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .bouton-principal { background-color: #2563eb; color: #ffffff; }
        .bouton-secondaire { background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
        .bouton-succes { background-color: #16a34a; color: #ffffff; }
        .bouton-danger { background-color: #ef4444; color: #ffffff; }
        .bouton-option { width: 100%; text-align: left; padding: 9px 12px; background: transparent; border: none; color: #334155; font-size: 12px; font-weight: 700; cursor: pointer; border-radius: 8px; margin-bottom: 2px; transition: background 0.15s ease; }
        .bouton-option:hover { background-color: #f1f5f9; }
      `}</style>

      <main style={styles.mainContentBody}>
        {message && <div style={styles.toastSuccess}>{message}</div>}

        {modalQuitterEcole && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px', textAlign: 'center', maxHeight: '85vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>⚠️ Quitter l'établissement</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Êtes-vous sûr de vouloir rompre l'affiliation avec <strong>{ecoleConfig?.nom}</strong> ?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalQuitterEcole(false)} className="bouton bouton-secondaire">Retour (Annuler)</button>
                <button onClick={() => { setModalQuitterEcole(false); setEcoleConfig(null); showToast("🔗 Affiliation rompue."); }} className="bouton bouton-danger">Oui, quitter l'école</button>
              </div>
            </div>
          </div>
        )}

        {modalDeconnexion && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '400px', textAlign: 'center', maxHeight: '85vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🚪 Déconnexion</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Êtes-vous sûr de vouloir vous déconnecter ?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalDeconnexion(false)} className="bouton bouton-secondaire">Annuler</button>
                <button onClick={async () => { setModalDeconnexion(false); await supabase.auth.signOut(); window.location.reload(); }} className="bouton bouton-danger">Oui, me déconnecter</button>
              </div>
            </div>
          </div>
        )}

        {modalSecurite && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '460px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>🔒 Sécurité du compte</h3>
                <button onClick={() => setModalSecurite(false)} className="bouton bouton-secondaire" style={{ padding: '6px 10px' }}>✕</button>
              </div>

              <form onSubmit={handleChangerEmailConnexion} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
                <label style={styles.label}>Changer l'email de connexion</label>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '-6px 0 4px 0' }}>Actuel : {infosChef.emailSecurite || '—'}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="email" placeholder="nouvel-email@exemple.com" value={emailSaisiChangement} onChange={e => setEmailSaisiChangement(e.target.value)} style={{ ...styles.inputStyle, flex: 1 }} required />
                  <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }} disabled={actionsEnCours['changerEmail']}>{actionsEnCours['changerEmail'] ? 'Envoi...' : 'Changer'}</button>
                </div>
              </form>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!nouveauMdp) { showToast("⚠️ Veuillez saisir un nouveau mot de passe."); return; }
                const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
                if (error) { showToast("⚠️ Erreur : " + error.message); return; }
                showToast("🔒 Mot de passe modifié avec succès !");
                setModalSecurite(false);
                setAncienMdp('');
                setNouveauMdp('');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={styles.label}>Changer mon mot de passe</label>
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

        {modalProfilChefOuvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>👤 Paramètres du Profil & Photo</h3>
              <form onSubmit={handleEnregistrerProfilChef} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid #cbd5e1', flexShrink: 0 }}>
                    {formProfilChef.photoProfil ? (
                      <img src={formProfilChef.photoProfil} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '28px' }}>👤</span>
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Photo de profil</label>
                    <input type="file" accept="image/*" onChange={handleChangerPhotoProfilChef} style={{ fontSize: '12px', cursor: 'pointer' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <div>
                    <label style={styles.label}>Civilité</label>
                    <select value={formProfilChef.civilite} onChange={(e) => setFormProfilChef({...formProfilChef, civilite: e.target.value})} style={styles.inputStyle}>
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Dr">Dr</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Nom</label>
                    <input type="text" value={formProfilChef.nom} onChange={(e) => setFormProfilChef({...formProfilChef, nom: e.target.value})} style={styles.inputStyle} required />
                  </div>
                </div>
                <div>
                  <label style={styles.label}>Prénoms</label>
                  <input type="text" value={formProfilChef.prenoms} onChange={(e) => setFormProfilChef({...formProfilChef, prenoms: e.target.value})} style={styles.inputStyle} required />
                </div>
                <div>
                  <label style={styles.label}>Téléphone</label>
                  <input type="tel" placeholder="+225 XX XX XX XX XX" value={formProfilChef.telephone || ''} onChange={(e) => setFormProfilChef({...formProfilChef, telephone: e.target.value})} style={styles.inputStyle} />
                </div>
                <div>
                  <label style={styles.label}>Établissement</label>
                  <input type="text" value={formProfilChef.etablissement} onChange={(e) => setFormProfilChef({...formProfilChef, etablissement: e.target.value})} style={styles.inputStyle} required />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setModalProfilChefOuvert(false)} className="bouton bouton-secondaire">Annuler</button>
                  <button type="submit" className="bouton bouton-principal" disabled={actionsEnCours['enregistrerProfilChef']}>{actionsEnCours['enregistrerProfilChef'] ? 'Enregistrement...' : 'Enregistrer'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalConfirmationActionAnnee.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '420px', textAlign: 'center', maxHeight: '85vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 10px 0', color: modalConfirmationActionAnnee.actionType === 'fermer' ? '#991b1b' : '#166534', fontSize: '18px', fontWeight: '800' }}>
                {modalConfirmationActionAnnee.actionType === 'fermer' ? '⚠️ Clôturer l’année scolaire ?' : '🟢 Ouvrir une nouvelle année ?'}
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px', lineHeight: '1.5' }}>
                {modalConfirmationActionAnnee.actionType === 'fermer' 
                  ? 'Êtes-vous sûr de vouloir terminer l’année scolaire ? Un bilan (fiches non traitées / non produites) sera généré automatiquement pour le censeur et le chef, et l’année sera clôturée.' 
                  : 'Êtes-vous sûr de vouloir ouvrir et démarrer les activités pour cette nouvelle année scolaire ? Si une année est encore active, elle sera clôturée automatiquement au passage.'}
              </p>
              {modalConfirmationActionAnnee.actionType === 'ouvrir' && (
                <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                  <label style={styles.label}>Intitulé de la nouvelle année</label>
                  <input type="text" placeholder="ex. 2026-2027" value={inputNouvelleAnneeIntitule} onChange={(e) => setInputNouvelleAnneeIntitule(e.target.value)} style={styles.inputStyle} required />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalConfirmationActionAnnee({ ouvert: false, actionType: null })} className="bouton bouton-secondaire">Annuler</button>
                <button 
                  onClick={executerActionAnneeScolaire} 
                  className={`bouton ${modalConfirmationActionAnnee.actionType === 'fermer' ? 'bouton-danger' : 'bouton-succes'}`}
                >
                  {modalConfirmationActionAnnee.actionType === 'fermer' ? 'Oui, fermer l’année' : 'Oui, ouvrir l’année'}
                </button>
              </div>
            </div>
          </div>
        )}

        {modalConfirmationGenerique.ouvert && (
          <div style={styles.fondModale}>
            <div style={{ ...styles.cardWide, width: '420px', textAlign: 'center', maxHeight: '85vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#991b1b', fontSize: '18px', fontWeight: '800' }}>
                {modalConfirmationGenerique.titre}
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', lineHeight: '1.5' }}>
                {modalConfirmationGenerique.message}
              </p>
              {modalConfirmationGenerique.necessiteMotif && (
                <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                  <label style={styles.label}>Motif (obligatoire)</label>
                  <textarea
                    value={modalConfirmationGenerique.motif}
                    onChange={(e) => setModalConfirmationGenerique(prev => ({ ...prev, motif: e.target.value }))}
                    style={{ ...styles.inputStyle, minHeight: '70px', resize: 'vertical' }}
                    required
                  />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => setModalConfirmationGenerique({ ouvert: false, titre: '', message: '', necessiteMotif: false, motif: '', onConfirmer: null })} className="bouton bouton-secondaire">Annuler</button>
                <button
                  onClick={() => {
                    const callback = modalConfirmationGenerique.onConfirmer;
                    const motif = modalConfirmationGenerique.motif;
                    setModalConfirmationGenerique({ ouvert: false, titre: '', message: '', necessiteMotif: false, motif: '', onConfirmer: null });
                    if (callback) callback(motif);
                  }}
                  className="bouton bouton-danger"
                >
                  Oui, confirmer
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div style={styles.statCard}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>🏫</div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Nombre total de Classes</h4>
            <p style={{ fontSize: '30px', fontWeight: '900', color: '#2563eb', margin: 0 }}>{statistiquesReseau.totalClasses}</p>
          </div>
          <div style={styles.statCard}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>👥</div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Membres du Réseau (total)</h4>
            <p style={{ fontSize: '30px', fontWeight: '900', color: '#16a34a', margin: 0 }}>{statistiquesReseau.totalPersonnesConnectees}</p>
          </div>
          <div style={styles.statCard}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>🟢</div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>En Ligne Maintenant</h4>
            <p style={{ fontSize: '30px', fontWeight: '900', color: '#059669', margin: 0 }}>{personnesEnLigne.length}</p>
            {personnesEnLigne.length > 0 && (
              <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>
                {personnesEnLigne.map(p => p.nom || 'Anonyme').join(', ')}
              </p>
            )}
          </div>
        </div>

        {activeTab === 'profil_ecole' && (
          <div style={styles.cardWide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>🏛️ Carte d'Identité & Bibliothèque d'Archives</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Informations modifiables et stockage des documents.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {!modeEditionEcole ? (
                  <button onClick={() => setModeEditionEcole(true)} className="bouton bouton-principal">✏️ Modifier</button>
                ) : (
                  <button onClick={() => setModeEditionEcole(false)} className="bouton bouton-secondaire">Annuler</button>
                )}
              </div>
            </div>

            <div style={{ backgroundColor: anneeActive ? '#f0fdf4' : '#fef2f2', padding: '18px 20px', borderRadius: '16px', border: `1px solid ${anneeActive ? '#bbf7d0' : '#fecaca'}`, marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <label style={styles.label}>Année scolaire</label>
                <p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px' }}>
                  {anneeActive ? `${anneeActive.intitule} — en cours` : 'Aucune année active'}
                </p>
              </div>
              {anneeActive ? (
                <button style={styles.boutonPuissantFermer} onClick={() => setModalConfirmationActionAnnee({ ouvert: true, actionType: 'fermer' })}>🔒 Clôturer l'année</button>
              ) : (
                <button style={styles.boutonPuissantOuvrir} onClick={() => setModalConfirmationActionAnnee({ ouvert: true, actionType: 'ouvrir' })}>🟢 Ouvrir une année</button>
              )}
            </div>

            {!modeEditionEcole ? (
              <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div><label style={styles.label}>Nom Officiel</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px' }}>{ecoleConfig.nom}</p></div>
                <div>
                  <label style={styles.label}>Code</label>
                  <p style={{ margin: '4px 0 4px 0', fontWeight: '800', fontSize: '15px', color: '#2563eb' }}>{ecoleConfig.code}</p>
                  <button onClick={regenererCodeEtablissement} className="bouton bouton-secondaire" style={{ fontSize: '11px', padding: '4px 8px' }} disabled={actionsEnCours['regenererCode']}>🔄 {actionsEnCours['regenererCode'] ? '...' : 'Régénérer le code'}</button>
                </div>
                <div><label style={styles.label}>Type</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px' }}>{ecoleConfig.visibilite === 'PRIVE' ? 'Privé' : 'Public'}</p></div>
                <div><label style={styles.label}>Enseignement</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px' }}>{{ GENERAL: 'Général', TECHNIQUE: 'Technique', MIXTE: 'Général et Technique' }[ecoleConfig.parametres_json?.typeEnseignement] || 'Général'}</p></div>
                <div><label style={styles.label}>Adresse</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px' }}>{ecoleConfig.adresse || '—'}</p></div>
                <div><label style={styles.label}>Ville</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px' }}>{ecoleConfig.ville || '—'}</p></div>
                <div><label style={styles.label}>Pays</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px' }}>{ecoleConfig.pays || '—'}</p></div>
                <div><label style={styles.label}>Année de création</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px' }}>{ecoleConfig.parametres_json?.anneeCreation || '—'}</p></div>
                <div><label style={styles.label}>Classes (Auto)</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#2563eb' }}>{nombreClassesReel}</p></div>
                <div><label style={styles.label}>Élèves</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#16a34a' }}>{ecoleConfig.parametres_json?.nombreEleves || '—'}</p></div>
                <div><label style={styles.label}>Enseignants</label><p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#16a34a' }}>{ecoleConfig.parametres_json?.nombreEnseignants || '—'}</p></div>
                {ecoleConfig.logo_url && (
                  <div><label style={styles.label}>Logo</label><br /><img src={ecoleConfig.logo_url} alt="Logo établissement" style={{ maxWidth: '80px', maxHeight: '80px', marginTop: '6px', borderRadius: '8px' }} /></div>
                )}
              </div>
            ) : (
              <form onSubmit={handleEnregistrerCarteEcole} style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #2563eb', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={styles.label}>Nom Officiel</label>
                  <input type="text" value={formEcoleEdition.nom || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, nom: e.target.value})} style={styles.inputStyle} required />
                </div>
                <div>
                  <label style={styles.label}>Code établissement</label>
                  <input type="text" value={formEcoleEdition.code || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, code: e.target.value})} style={styles.inputStyle} required />
                </div>
                <div>
                  <label style={styles.label}>Type</label>
                  <select value={formEcoleEdition.visibilite || 'PRIVE'} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, visibilite: e.target.value})} style={styles.inputStyle}>
                    <option value="PRIVE">Privé</option>
                    <option value="PUBLIC">Public</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Enseignement dispensé</label>
                  <select
                    value={formEcoleEdition.parametres_json?.typeEnseignement || 'GENERAL'}
                    onChange={(e) => setFormEcoleEdition({...formEcoleEdition, parametres_json: {...formEcoleEdition.parametres_json, typeEnseignement: e.target.value}})}
                    style={styles.inputStyle}
                  >
                    <option value="GENERAL">Général (séries A, B, C, D, E)</option>
                    <option value="TECHNIQUE">Technique (séries F1-F4, G1-G3, H1-H2)</option>
                    <option value="MIXTE">Les deux (général et technique)</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Adresse</label>
                  <input type="text" value={formEcoleEdition.adresse || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, adresse: e.target.value})} style={styles.inputStyle} />
                </div>
                <div>
                  <label style={styles.label}>Ville</label>
                  <input type="text" value={formEcoleEdition.ville || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, ville: e.target.value})} style={styles.inputStyle} />
                </div>
                <div>
                  <label style={styles.label}>Pays</label>
                  <input type="text" value={formEcoleEdition.pays || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, pays: e.target.value})} style={styles.inputStyle} />
                </div>
                <div>
                  <label style={styles.label}>Logo (URL)</label>
                  <input type="text" placeholder="https://..." value={formEcoleEdition.logo_url || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, logo_url: e.target.value})} style={styles.inputStyle} />
                </div>
                <div>
                  <label style={styles.label}>Année de création</label>
                  <input type="text" placeholder="ex. 1998" value={formEcoleEdition.parametres_json?.anneeCreation || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, parametres_json: {...formEcoleEdition.parametres_json, anneeCreation: e.target.value}})} style={styles.inputStyle} />
                </div>
                <div>
                  <label style={styles.label}>Nombre d'élèves</label>
                  <input type="number" min="0" value={formEcoleEdition.parametres_json?.nombreEleves || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, parametres_json: {...formEcoleEdition.parametres_json, nombreEleves: e.target.value}})} style={styles.inputStyle} />
                </div>
                <div>
                  <label style={styles.label}>Nombre d'enseignants</label>
                  <input type="number" min="0" value={formEcoleEdition.parametres_json?.nombreEnseignants || ''} onChange={(e) => setFormEcoleEdition({...formEcoleEdition, parametres_json: {...formEcoleEdition.parametres_json, nombreEnseignants: e.target.value}})} style={styles.inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setModeEditionEcole(false)} className="bouton bouton-secondaire" style={{ marginRight: '10px' }}>Annuler</button>
                  <button type="submit" className="bouton bouton-principal" disabled={actionsEnCours['enregistrerCarte']}>{actionsEnCours['enregistrerCarte'] ? 'Enregistrement...' : 'Enregistrer'}</button>
                </div>
              </form>
            )}

            <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '16px', border: '1px solid #bfdbfe', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a', marginBottom: '8px' }}>📤 Uploader un Fichier Administratif</h3>
              <form onSubmit={uploaderFichierAdministratifreel} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Nom du document..." value={nomNouveauFichier} onChange={(e) => setNomNouveauFichier(e.target.value)} style={{ ...styles.inputStyle, flex: '2 1 200px', margin: 0 }} required />
                <select value={categorieNouveauFichier} onChange={(e) => setCategorieNouveauFichier(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 160px', margin: 0 }}>
                  <option value="Administratif">Administratif</option>
                  <option value="Pédagogique">Pédagogique</option>
                  <option value="Officiel">Officiel</option>
                  <option value="Autre">Autre</option>
                </select>
                <input type="file" onChange={(e) => setFichierSelectionneObj(e.target.files[0] || null)} style={{ ...styles.inputStyle, flex: '1 1 200px', margin: 0, padding: '8px 10px' }} required />
                <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }} disabled={uploadEnCours}>{uploadEnCours ? 'Envoi...' : 'Uploader'}</button>
              </form>

              {documentsEtablissement.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                  {documentsEtablissement.map(doc => (
                    <div key={doc.id} style={{ ...styles.itemRow, backgroundColor: '#ffffff' }}>
                      <div>
                        <strong style={{ fontSize: '13px' }}>{doc.titre}</strong>
                        <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>{doc.categorie}</span>
                      </div>
                      <button onClick={() => telechargerDocumentEtablissement(doc)} className="bouton bouton-secondaire" style={{ fontSize: '11px', padding: '6px 10px' }}>📥 Télécharger</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'censeurs' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>📨 Inviter quelqu'un à rejoindre l'établissement</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>La personne recevra l'invitation à l'adresse indiquée et pourra l'accepter en se connectant.</p>
            <form onSubmit={envoyerInvitation} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px' }}>
              <input type="email" placeholder="email@exemple.com" value={nouvelleInvitationEmail} onChange={(e) => setNouvelleInvitationEmail(e.target.value)} style={{ ...styles.inputStyle, flex: '2 1 220px', margin: 0 }} required />
              <select value={nouvelleInvitationRole} onChange={(e) => setNouvelleInvitationRole(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 140px', margin: 0 }}>
                <option value="CENSEUR">Censeur</option>
                <option value="ENSEIGNANT">Enseignant</option>
              </select>
              <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }} disabled={actionsEnCours['envoyerInvitation']}>{actionsEnCours['envoyerInvitation'] ? 'Envoi...' : "Envoyer l'invitation"}</button>
            </form>

            {invitationsEnvoyees.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>Invitations envoyées</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {invitationsEnvoyees.map(inv => (
                    <div key={inv.id} style={styles.itemRow}>
                      <span style={{ fontSize: '13px' }}>{inv.email} — <strong>{inv.role_propose}</strong></span>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: inv.statut === 'ACCEPTEE' ? '#16a34a' : inv.statut === 'EN_ATTENTE' ? '#d97706' : '#ef4444' }}>{inv.statut}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>👥 Demandes d'affiliation reçues</h2>
            {demandesAffiliationRecues.length === 0 ? (
              <div style={{ ...styles.emptyState, padding: '24px 20px' }}><span style={{ ...styles.emptyStateIcon, fontSize: '24px' }}>📥</span><p style={styles.emptyStateText}>Aucune demande en attente.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {demandesAffiliationRecues.map(demande => (
                  <div key={demande.id} style={styles.itemRow}>
                    <div>
                      <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                        {demande.utilisateurs_profils?.prenom} {demande.utilisateurs_profils?.nom}
                      </strong>
                      <br /><small>Souhaite rejoindre en tant que : <strong>{demande.role_demande}</strong></small>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => approuverDemande(demande)} className="bouton bouton-succes" disabled={!!actionsEnCours[`appro_${demande.id}`]}>{actionsEnCours[`appro_${demande.id}`] ? '...' : 'Approuver'}</button>
                      <button
                        onClick={() => demanderConfirmation({
                          titre: 'Refuser cette demande ?',
                          message: `Êtes-vous sûr de vouloir refuser la demande de ${demande.utilisateurs_profils?.prenom} ${demande.utilisateurs_profils?.nom} ?`,
                          necessiteMotif: false,
                          onConfirmer: () => refuserDemande(demande),
                        })}
                        className="bouton bouton-danger"
                        disabled={!!actionsEnCours[`refus_${demande.id}`]}
                      >{actionsEnCours[`refus_${demande.id}`] ? '...' : 'Refuser'}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '28px 0 16px 0' }}>🚪 Demandes de départ</h2>
            {demandesDepartRecues.length === 0 ? (
              <div style={{ ...styles.emptyState, padding: '24px 20px' }}><span style={{ ...styles.emptyStateIcon, fontSize: '24px' }}>🚪</span><p style={styles.emptyStateText}>Aucune demande de départ en attente.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {demandesDepartRecues.map(demande => {
                  const nomComplet = `${demande.utilisateurs_profils?.prenom || ''} ${demande.utilisateurs_profils?.nom || ''}`.trim() || 'Personne inconnue';
                  return (
                    <div key={demande.id} style={styles.itemRow}>
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '14px' }}>{nomComplet}</strong>
                        <br /><small>Souhaite quitter en tant que : <strong>{demande.role_demandeur === 'CENSEUR' ? 'Censeur' : 'Enseignant'}</strong></small>
                        {demande.motif && <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0 0', fontStyle: 'italic' }}>« {demande.motif} »</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => approuverDemandeDepart(demande)} className="bouton bouton-succes" disabled={!!actionsEnCours[`approDep_${demande.id}`]}>{actionsEnCours[`approDep_${demande.id}`] ? '...' : 'Approuver'}</button>
                        <button onClick={() => refuserDemandeDepart(demande, nomComplet)} className="bouton bouton-danger" disabled={!!actionsEnCours[`refusDep_${demande.id}`]}>{actionsEnCours[`refusDep_${demande.id}`] ? '...' : 'Refuser'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'professeurs' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>👨‍🏫 Annuaire des Enseignants</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              {professeursFiltres.length === 0 ? (
                <div style={{ ...styles.emptyState, padding: '24px 20px' }}><span style={{ ...styles.emptyStateIcon, fontSize: '24px' }}>👨‍🏫</span><p style={styles.emptyStateText}>Aucun enseignant affilié pour l'instant.</p></div>
              ) : professeursFiltres.map(prof => (
                <div key={prof.affiliationId} style={styles.itemRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{prof.matiere}</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{prof.nomComplet}</strong>
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Classes : <strong>{prof.classes && prof.classes.length ? prof.classes.join(', ') : 'Aucune classe attribuée'}</strong></p>
                  </div>
                  <button
                    onClick={() => retirerEnseignant(prof.affiliationId, prof.nomComplet)}
                    className="bouton bouton-danger"
                    style={{ flexShrink: 0 }}
                    disabled={!!actionsEnCours[`retirerEns_${prof.affiliationId}`]}
                  >🗑️ {actionsEnCours[`retirerEns_${prof.affiliationId}`] ? '...' : 'Retirer'}</button>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>🧑‍💼 Personnel Administratif</h2>
            <form onSubmit={ajouterPersonnelAdministratif} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <input type="text" placeholder="Nom complet" value={nouveauAdminNom} onChange={(e) => setNouveauAdminNom(e.target.value)} style={{ ...styles.inputStyle, flex: '2 1 180px', margin: 0 }} required />
              <input type="text" placeholder="Fonction" value={nouveauAdminRole} onChange={(e) => setNouveauAdminRole(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 140px', margin: 0 }} />
              <input type="text" placeholder="Contact" value={nouveauAdminContact} onChange={(e) => setNouveauAdminContact(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 140px', margin: 0 }} />
              <input type="email" placeholder="Email" value={nouveauAdminEmail} onChange={(e) => setNouveauAdminEmail(e.target.value)} style={{ ...styles.inputStyle, flex: '1 1 180px', margin: 0 }} />
              <button type="submit" className="bouton bouton-principal" style={{ flexShrink: 0 }} disabled={actionsEnCours['ajouterPersonnelChef']}>{actionsEnCours['ajouterPersonnelChef'] ? '...' : 'Ajouter'}</button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {personnelAdministratifManuel.length === 0 ? (
                <div style={{ ...styles.emptyState, padding: '24px 20px' }}><span style={{ ...styles.emptyStateIcon, fontSize: '24px' }}>🗂️</span><p style={styles.emptyStateText}>Aucun membre du personnel enregistré.</p></div>
              ) : personnelAdministratifManuel.map(p => (
                <div key={p.id} style={styles.itemRow}>
                  <div>
                    <strong style={{ fontSize: '13px' }}>{p.nomComplet}</strong> — <span style={{ fontSize: '12px', color: '#475569' }}>{p.role}</span>
                  </div>
                  <button onClick={() => supprimerPersonnelAdministratif(p.id, p.nomComplet)} className="bouton bouton-danger" style={{ flexShrink: 0 }} disabled={!!actionsEnCours[`suppPersonnelChef_${p.id}`]}>🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'fichiers_pedagogiques' && (
          <div style={styles.cardWide}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>📚 Fiches Pédagogiques</h2>

            <div style={{ display: 'flex', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 220px' }}>
                <label style={styles.label}>Recherche (titre de fiche ou enseignant)</label>
                <input type="text" placeholder="Ex : révisions, Kouassi..." value={filtreFichesTexte} onChange={(e) => setFiltreFichesTexte(e.target.value)} style={styles.inputStyle} />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.label}>Année scolaire</label>
                <select value={filtreFichesAnnee} onChange={(e) => setFiltreFichesAnnee(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes</option>
                  {anneesFichesDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.label}>Classe</label>
                <select value={filtreFichesClasse} onChange={(e) => setFiltreFichesClasse(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes</option>
                  {classesFichesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={styles.label}>Matière</label>
                <select value={filtreFichesMatiere} onChange={(e) => setFiltreFichesMatiere(e.target.value)} style={styles.inputStyle}>
                  <option value="TOUTES">Toutes</option>
                  {matieresFichesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {fichesPedagogiquesParClasse.length === 0 ? (
              <div style={styles.emptyState}><span style={styles.emptyStateIcon}>📚</span><p style={styles.emptyStateText}>Aucune fiche pour l'instant. Les fiches visées par le censeur apparaîtront ici automatiquement.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {fichesPedagogiquesParClasse.map(([classe, fiches]) => {
                  const estOuverte = !!classesOuvertesFiches[classe];
                  return (
                    <div key={classe} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                      <button
                        onClick={() => toggleClasseFiches(classe)}
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
                          {fiches.map(fiche => (
                            <div key={fiche.id} style={styles.itemRow}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{fiche.matiere}</span>
                                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{fiche.titre}</strong>
                                </div>
                                <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Enseignant : <strong>{fiche.enseignant}</strong></p>
                              </div>
                              <div>
                                <button
                                  onClick={() => telechargerDocumentPDF(`Fiche : ${fiche.titre}`, `<p><strong>Matière :</strong> ${fiche.matiere}</p><p><strong>Enseignant :</strong> ${fiche.enseignant}</p><p><strong>Classe :</strong> ${fiche.classe}</p><p><strong>Détails :</strong> Fiche validée et approuvée le ${fiche.dateValidation}.</p>`)}
                                  className="bouton bouton-principal"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  📥 Télécharger / Voir (PDF)
                                </button>
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

      </main>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f7f9fc', minHeight: '100vh', color: '#1e293b', paddingBottom: '40px', overflowX: 'hidden', boxSizing: 'border-box', width: '100%' },
  setupContainer: { backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  setupCard: { backgroundColor: '#ffffff', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #334155', boxSizing: 'border-box' },
  darkNavbar: { backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderBottom: '1px solid #1e293b', position: 'sticky', top: '0', zIndex: 100, width: '100%', boxSizing: 'border-box' },
  mainContentBody: { padding: '20px 12px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  cardWide: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #edf1f7', boxShadow: '0 2px 8px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(15,23,42,0.06)', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' },
  statCard: { backgroundColor: '#ffffff', padding: '22px', borderRadius: '18px', border: '1px solid #edf1f7', boxShadow: '0 2px 8px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(15,23,42,0.06)', boxSizing: 'border-box' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f7f9fc', padding: '14px 16px', borderRadius: '14px', border: '1px solid #edf1f7', gap: '12px', boxSizing: 'border-box', width: '100%', flexWrap: 'wrap', transition: 'border-color 0.15s ease' },
  label: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' },
  inputStyle: { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
  toastSuccess: { backgroundColor: '#0f172a', color: '#f8fafc', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', fontWeight: '700', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  navbarTeacherClickableBlock: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '10px', border: '1px solid #334155', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box', minWidth: 0, maxWidth: '38vw', flexShrink: 1 },
  avatarNavbarContainer: { width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #475569', flexShrink: 0 },
  avatarNavbarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarNavbarPlaceholder: { fontSize: '14px', color: '#94a3b8' },
  navbarTeacherInfo: { display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
  notificationDropdown: { position: 'absolute', top: '42px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #edf1f7', width: '280px', maxWidth: '90vw', zIndex: 110, padding: '10px', boxSizing: 'border-box' },
  dropdownHeader: { padding: '6px 8px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #edf1f7', marginBottom: '6px' },
  notifItem: { backgroundColor: '#f7f9fc', padding: '10px', borderRadius: '10px', fontSize: '11px', marginBottom: '4px', border: '1px solid #edf1f7', boxSizing: 'border-box' },
  navDarkBtn: { backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '6px 10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' },
  fondModale: { position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000', padding: '12px', boxSizing: 'border-box' },
  pastilleAlerte: { backgroundColor: '#ef4444', color: 'white', padding: '1px 4px', borderRadius: '999px', fontSize: '9px', fontWeight: '800', position: 'absolute', top: '-4px', right: '-4px' },
  burgerBtn: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '10px', fontSize: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' },
  boutonPuissantOuvrir: { background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' },
  boutonPuissantFermer: { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' },
  // [NOUVEAU] État vide engageant : icône + message + éventuel bouton d'action.
  emptyState: { textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
  emptyStateIcon: { fontSize: '32px', opacity: 0.5 },
  emptyStateText: { fontSize: '13px', color: '#64748b', maxWidth: '320px', lineHeight: '1.5' },
};
