import * as Sentry from "@sentry/react";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import EnseignantDashboard from './EnseignantDashboard';
import CenseurDashboard from './CenseurDashboard';
import ChefEtablissementDashboard from './ChefEtablissementDashboard';
import GuideInstallationModal from './GuideInstallationModal';

Sentry.init({
  dsn: "https://4d9a8453ed9e09ce79603032a9d1d8b4@o4511943155187712.ingest.de.sentry.io/4511943162921040",
  integrations: [
    Sentry.browserTracingIntegration()
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/okepdydyxgsfywoknhqq\.supabase\.co/],
  enableLogs: true
});

const supabaseUrl = 'https://okepdydyxgsfywoknhqq.supabase.co';
const supabaseKey = 'sb_publishable_9baPKtdp4KTDvj08yJ63fQ_YQMWe6D_';
export const supabase = createClient(supabaseUrl, supabaseKey);

const genererCodeEtablissement = (nom) => {
  const base = nom.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'ETAB';
  const suffixe = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${suffixe}`;
};

export default function AppRouter() {
  const [userRole, setUserRole] = useState('');
  const [sessionUser, setSessionUser] = useState(null);
  const [profilUtilisateur, setProfilUtilisateur] = useState(null);
  const [etablissementActifId, setEtablissementActifId] = useState(null);
  const [invitationsRecues, setInvitationsRecues] = useState([]);

  const [afficherMdp, setAfficherMdp] = useState(false);

  const [etapeChoixEtablissement, setEtapeChoixEtablissement] = useState(false);
  const [choixModeEcole, setChoixModeEcole] = useState('choix');
  const [nomEcoleSaisi, setNomEcoleSaisi] = useState('');
  const [typeEcoleSaisi, setTypeEcoleSaisi] = useState('public');
  const [anneeCreationSaisie, setAnneeCreationSaisie] = useState('');
  const [codeEtablissementSaisi, setCodeEtablissementSaisi] = useState('');

  const [etapeAuth, setEtapeAuth] = useState(null);
  const [modeAuth, setModeAuth] = useState('connexion');
  const [modeMdpOublieAuth, setModeMdpOublieAuth] = useState(false);
  const [modeRecuperationMdp, setModeRecuperationMdp] = useState(false);
  const [modePolitiqueConfidentialite, setModePolitiqueConfidentialite] = useState(false);
  const [nouveauMdpSaisi, setNouveauMdpSaisi] = useState('');
  const [confirmationNouveauMdpSaisi, setConfirmationNouveauMdpSaisi] = useState('');

  const [genreSaisi, setGenreSaisi] = useState('M.');
  const [nomSaisi, setNomSaisi] = useState('');
  const [prenomsSaisi, setPrenomsSaisi] = useState('');
  const [dateNaissanceSaisie, setDateNaissanceSaisie] = useState('');
  const [matiereIdsSaisies, setMatiereIdsSaisies] = useState([]);
  const [catalogueMatieresInscription, setCatalogueMatieresInscription] = useState([]);
  const [chargementCatalogueMatieres, setChargementCatalogueMatieres] = useState(false);
  const [erreurCatalogueMatieres, setErreurCatalogueMatieres] = useState('');
  const [emailSaisi, setEmailSaisi] = useState('');
  const [mdpSaisi, setMdpSaisi] = useState('');
  const [confirmationMdpSaisi, setConfirmationMdpSaisi] = useState('');
  const [afficherConfirmationMdp, setAfficherConfirmationMdp] = useState(false);
  const [consentementSaisi, setConsentementSaisi] = useState(false);

  const [notification, setNotification] = useState('');

  const [demandesAffiliation, setDemandesAffiliation] = useState([]);
  const [seances, setSeances] = useState([]);
  const [bibliotheque, setBibliotheque] = useState([]);
  const [enseignantsSansFiche] = useState([]);

  const gererSaisieDateNaissance = (e) => {
    let valeur = e.target.value.replace(/\D/g, '');
    if (valeur.length > 8) valeur = valeur.slice(0, 8);
    if (valeur.length > 4) {
      valeur = `${valeur.slice(0, 2)}/${valeur.slice(2, 4)}/${valeur.slice(4)}`;
    } else if (valeur.length > 2) {
      valeur = `${valeur.slice(0, 2)}/${valeur.slice(2)}`;
    }
    setDateNaissanceSaisie(valeur);
  };

  useEffect(() => {
    if (etapeAuth === 'enseignant' && modeAuth === 'inscription') {
      setChargementCatalogueMatieres(true);
      setErreurCatalogueMatieres('');
      supabase.from('matieres').select('id, nom').order('nom', { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            console.error('Erreur chargement catalogue matières :', error);
            setErreurCatalogueMatieres(error.message);
            afficherNotification("⚠️ Impossible de charger les matières : " + error.message);
          }
          setCatalogueMatieresInscription(data || []);
          setChargementCatalogueMatieres(false);
        });
    }
  }, [etapeAuth, modeAuth]);

  const gererDeconnexionGlobale = async () => {
    try { 
      await supabase.auth.signOut(); 
    } catch (err) { 
      console.error("Erreur lors de la déconnexion Supabase", err); 
    }
    localStorage.clear();
    sessionStorage.clear();
    setUserRole('');
    setSessionUser(null);
    setProfilUtilisateur(null);
    setEtapeAuth(null);
    setEtapeChoixEtablissement(false);
    setEtablissementActifId(null);
    setChoixModeEcole('choix');
    afficherNotification("🔓 Déconnexion réussie.");
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionUser(session.user);
        chargerProfilEtDonnees(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null);
      if (!session?.user) {
        setUserRole('');
        setProfilUtilisateur(null);
        setEtapeChoixEtablissement(false);
      }
      if (_event === 'PASSWORD_RECOVERY') {
        setModeRecuperationMdp(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionUser?.id) return;
    const canal = supabase
      .channel(`role-watch-${sessionUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${sessionUser.id}` }, () => {
        chargerProfilEtDonnees(sessionUser.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [sessionUser?.id]);

  useEffect(() => {
    if (!sessionUser?.id || !etablissementActifId) return;

    const canal = supabase.channel(`presence-etablissement-${etablissementActifId}`, {
      config: { presence: { key: sessionUser.id } },
    });

    canal.on('presence', { event: 'sync' }, () => {});

    canal.subscribe(async (statut) => {
      if (statut === 'SUBSCRIBED') {
        await canal.track({
          nom: `${profilUtilisateur?.prenom || ''} ${profilUtilisateur?.nom || ''}`.trim(),
          role: userRole,
          en_ligne_depuis: new Date().toISOString(),
        });
      }
    });

    return () => { supabase.removeChannel(canal); };
  }, [sessionUser?.id, etablissementActifId, userRole, profilUtilisateur?.prenom, profilUtilisateur?.nom]);

  const chargerProfilEtDonnees = async (userId) => {
    try {
      const { data: profil, error: profilError } = await supabase
        .from('utilisateurs_profils')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profilError) console.warn("Avis chargement profil:", profilError.message);
      if (profil) setProfilUtilisateur(profil);

      const { data: affiliationsActives } = await supabase
        .from('affiliations_etablissement')
        .select('role, etablissement_id')
        .eq('user_id', userId)
        .eq('statut', 'ACTIVE');

      const roles = (affiliationsActives || []).map(a => a.role);
      let roleDetecte = '';
      if (roles.includes('CHEF')) roleDetecte = 'chef';
      else if (roles.includes('CENSEUR')) roleDetecte = 'censeur';
      else if (roles.includes('ENSEIGNANT')) roleDetecte = 'enseignant';
      else roleDetecte = profil?.preferences_json?.role_signup || '';

      const roleVersRole = { chef: 'CHEF', censeur: 'CENSEUR', enseignant: 'ENSEIGNANT' };
      const affiliationRetenue = (affiliationsActives || []).find(a => a.role === roleVersRole[roleDetecte]);
      setEtablissementActifId(affiliationRetenue?.etablissement_id || null);

      if (roleDetecte) {
        setUserRole(roleDetecte);
        if (roleDetecte === 'chef' && !roles.includes('CHEF')) {
          setEtapeChoixEtablissement(true);
        } else {
          setEtapeChoixEtablissement(false);
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: invitations } = await supabase
          .from('invitations')
          .select('id, etablissement_id, role_propose, expire_at, etablissements(nom)')
          .eq('email', user.email.toLowerCase())
          .eq('statut', 'EN_ATTENTE')
          .gt('expire_at', new Date().toISOString());
        setInvitationsRecues(invitations || []);
      }
      return roleDetecte;
    } catch (err) {
      console.error("Erreur lors du chargement du profil Supabase", err);
      return '';
    }
  };

  const afficherNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleLoginRouter = (e, role) => {
    if (e && e.preventDefault) {
      e.preventDefault(); 
    }
    setEtapeAuth(role);
    setModeAuth('connexion');
    setModeMdpOublieAuth(false);
  };

  const gererMotDePasseOublieAuth = async (e) => {
    e.preventDefault();
    if (!emailSaisi) { afficherNotification("⚠️ Veuillez entrer votre e-mail."); return; }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailSaisi.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      afficherNotification("📧 Un lien de réinitialisation vous a été envoyé !");
      setModeMdpOublieAuth(false);
    } catch (err) {
      afficherNotification("❌ Erreur : " + err.message);
    }
  };

  const [validationMdpEnCours, setValidationMdpEnCours] = useState(false);
  const validerNouveauMotDePasse = async (e) => {
    e.preventDefault();
    if (validationMdpEnCours) return;
    if (!nouveauMdpSaisi || nouveauMdpSaisi.length < 6) {
      afficherNotification("⚠️ Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (nouveauMdpSaisi !== confirmationNouveauMdpSaisi) {
      afficherNotification("⚠️ Les deux mots de passe ne correspondent pas.");
      return;
    }
    setValidationMdpEnCours(true);
    const { error } = await supabase.auth.updateUser({ password: nouveauMdpSaisi });
    if (error) {
      afficherNotification("❌ Erreur : " + error.message);
      setValidationMdpEnCours(false);
      return;
    }
    afficherNotification("✅ Mot de passe mis à jour ! Vous êtes connecté(e).");
    setModeRecuperationMdp(false);
    setNouveauMdpSaisi('');
    setConfirmationNouveauMdpSaisi('');
    setValidationMdpEnCours(false);
  };

  const validerAuthUtilisateur = async (e) => {
    e.preventDefault();
    if (!emailSaisi || !mdpSaisi) {
      afficherNotification("⚠️ Veuillez remplir l'e-mail et le mot de passe.");
      return;
    }

    if (modeAuth === 'inscription') {
      if (!nomSaisi || !prenomsSaisi || !dateNaissanceSaisie) {
        afficherNotification("⚠️ Veuillez renseigner toutes vos civilités personnelles.");
        return;
      }
      if (etapeAuth === 'enseignant' && matiereIdsSaisies.length === 0) {
        afficherNotification("⚠️ Veuillez choisir au moins une matière enseignée.");
        return;
      }
      if (mdpSaisi !== confirmationMdpSaisi) {
        afficherNotification("⚠️ Les deux mots de passe ne correspondent pas.");
        return;
      }
      if (!consentementSaisi) {
        afficherNotification("⚠️ Vous devez accepter la politique de confidentialité pour vous inscrire.");
        return;
      }
    }

    const roleActuel = etapeAuth;
    const emailNettoye = emailSaisi.trim().toLowerCase();

    try {
      if (modeAuth === 'inscription') {
        await supabase.auth.signOut().catch(() => {});

        const { data, error } = await supabase.auth.signUp({
          email: emailNettoye,
          password: mdpSaisi,
        });
        if (error) throw error;

        if (data?.user) {
          let datePartita = dateNaissanceSaisie.trim().split('/');
          let dateFormatee = dateNaissanceSaisie.trim();
          if (datePartita.length === 3) {
            dateFormatee = `${datePartita[2]}-${datePartita[1]}-${datePartita[0]}`;
          }

          const nomsMatieresChoisies = catalogueMatieresInscription
            .filter(m => matiereIdsSaisies.includes(m.id))
            .map(m => m.nom);

          const { error: profileError } = await supabase.from('utilisateurs_profils').upsert([
            {
              user_id: data.user.id,
              nom: nomSaisi.trim(),
              prenom: prenomsSaisi.trim(),
              preferences_json: {
                genre: genreSaisi,
                date_naissance: dateFormatee,
                matieres_predilection: roleActuel === 'enseignant' ? nomsMatieresChoisies : null,
                role_signup: roleActuel,
                consentement_donne: true,
                date_consentement: new Date().toISOString()
              },
            }
          ], { onConflict: 'user_id' });
          if (profileError) throw profileError;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: emailNettoye,
          password: mdpSaisi,
        });
        if (loginError) throw loginError;

        afficherNotification("✅ Inscription réussie !");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailNettoye,
          password: mdpSaisi,
        });
        if (error) throw error;
        afficherNotification("🔓 Connexion réussie !");
      }

      setUserRole(roleActuel);
      setEtapeAuth(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionUser(session.user);
        const roleReellementDetecte = await chargerProfilEtDonnees(session.user.id);
        if (roleReellementDetecte === 'chef') setEtapeChoixEtablissement(true);
      }
    } catch (err) {
      console.error("Erreur Supabase:", err);
      let messageErreur = err.message || "Une erreur est survenue";
      if (messageErreur.includes("User already registered")) {
        messageErreur = "Cet e-mail est déjà enregistré.";
      }
      afficherNotification("❌ " + messageErreur);
    }
  };

  const gererEtablissementChef = async (action) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { afficherNotification("⚠️ Session invalide, reconnectez-vous."); return; }

    if (action === 'creer') {
      if (!nomEcoleSaisi || !anneeCreationSaisie) {
        afficherNotification("⚠️ Veuillez remplir le nom et l'année de création de l'établissement.");
        return;
      }
      try {
        const code = genererCodeEtablissement(nomEcoleSaisi);
        const nouvelEtablissementId = crypto.randomUUID();

        const { error: etabError } = await supabase
          .from('etablissements')
          .insert([{
            id: nouvelEtablissementId,
            code,
            nom: nomEcoleSaisi.trim(),
            visibilite: typeEcoleSaisi === 'prive' ? 'PRIVE' : 'PUBLIC',
            parametres_json: { annee_creation: anneeCreationSaisie.trim() },
          }]);
        if (etabError) throw etabError;

        const { error: affError } = await supabase.from('affiliations_etablissement').insert([{
          user_id: user.id,
          etablissement_id: nouvelEtablissementId,
          role: 'CHEF',
          statut: 'ACTIVE',
          date_debut: new Date().toISOString().slice(0, 10),
        }]);
        if (affError) {
          if (affError.code === '23505') {
            afficherNotification("⚠️ Vous êtes déjà chef actif d'un autre établissement.");
          } else {
            afficherNotification("⚠️ Établissement créé, mais erreur d'affiliation : " + affError.message);
          }
          return;
        }

        afficherNotification(`🏫 Établissement créé ! Code : ${code}`);
        setEtapeChoixEtablissement(false);
        setUserRole('chef');
        await chargerProfilEtDonnees(user.id);
      } catch (err) {
        afficherNotification("❌ Erreur : " + err.message);
      }
    } else if (action === 'rejoindre') {
      if (!codeEtablissementSaisi.trim()) {
        afficherNotification("⚠️ Veuillez entrer le code de l'établissement.");
        return;
      }
      try {
        const { data: etabCible, error: erreurRecherche } = await supabase
          .from('etablissements').select('id, nom').eq('code', codeEtablissementSaisi.trim()).maybeSingle();

        if (erreurRecherche || !etabCible) {
          afficherNotification("⚠️ Aucun établissement trouvé avec ce code.");
          return;
        }

        const { error: erreurDemande } = await supabase.from('demandes_affiliation').insert([{
          user_id: user.id,
          etablissement_id: etabCible.id,
          role_demande: 'CHEF',
        }]);
        if (erreurDemande) throw erreurDemande;

        afficherNotification(`📨 Demande envoyée pour "${etabCible.nom}". En attente d'approbation.`);
        setEtapeChoixEtablissement(false);
      } catch (err) {
        afficherNotification("❌ Erreur : " + err.message);
      }
    } else {
      setEtapeChoixEtablissement(false);
    }
  };

  if (modePolitiqueConfidentialite) {
    const pointsCles = [
      { icone: '🔒', titre: 'Vos données sont protégées', texte: "Chacun ne voit que ce qui concerne son rôle et son établissement." },
      { icone: '🚫', titre: 'Rien n\'est vendu aujourd\'hui', texte: "À ce jour, aucune donnée n'est vendue ni partagée à des fins publicitaires." },
      { icone: '🍪', titre: 'Pas de cookie publicitaire', texte: "Seul un cookie technique garde votre session de connexion active." },
      { icone: '✏️', titre: 'Vos droits', texte: "Vous pouvez consulter, corriger ou supprimer vos données à tout moment." },
    ];
    return (
      <div style={styles.ecranAuth}>
        <div style={{ ...styles.carteAuth, maxWidth: '640px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={styles.enteteLogo}>
              <div style={styles.iconeCahier}><span style={{ fontSize: '20px' }}>🔒</span></div>
              <h1 style={{ ...styles.titreLogo, fontSize: '18px' }}>Confidentialité & Cookies</h1>
            </div>
            <button onClick={() => setModePolitiqueConfidentialite(false)} style={{ ...styles.boutonBase, width: 'auto', padding: '8px 14px', backgroundColor: '#64748b' }}>✕ Fermer</button>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '18px' }}>Dernière mise à jour : {new Date().toLocaleDateString()}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {pointsCles.map((pt, i) => (
              <div key={i} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                <span style={{ fontSize: '20px' }}>{pt.icone}</span>
                <p style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', margin: '8px 0 4px 0' }}>{pt.titre}</p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>{pt.texte}</p>
              </div>
            ))}
          </div>

          <div style={{ maxHeight: '55vh', overflowY: 'auto', fontSize: '13px', color: '#334155', lineHeight: '1.6', paddingRight: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <h3 style={{ color: '#0f172a', fontSize: '14px', marginTop: '0' }}>1. Qui sommes-nous</h3>
            <p>E-cahier est une plateforme numérique de suivi pédagogique destinée aux établissements scolaires, à leurs enseignants, censeurs et chefs d'établissement.</p>

            <h3 style={{ color: '#0f172a', fontSize: '14px', marginTop: '16px' }}>2. Données que nous collectons</h3>
            <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
            <ul style={{ paddingLeft: '18px' }}>
              <li>Identité : nom, prénom, adresse e-mail, numéro de téléphone</li>
              <li>Données professionnelles : établissement(s), rôle (enseignant, censeur, chef), matières enseignées, classes attribuées</li>
              <li>Contenu pédagogique que vous créez : programmes annuels, cycles, leçons, séances, fiches</li>
              <li>Données techniques minimales liées à la connexion (session de connexion sécurisée)</li>
            </ul>

            <h3 style={{ color: '#0f172a', fontSize: '14px', marginTop: '16px' }}>3. Pourquoi nous les collectons</h3>
            <p>Ces données servent exclusivement à faire fonctionner E-cahier : gérer votre compte, vous rattacher au bon établissement, assurer le suivi et la validation des séances pédagogiques, et vous notifier des événements qui vous concernent.</p>

            <h3 style={{ color: '#0f172a', fontSize: '14px', marginTop: '16px' }}>4. Partage des données</h3>
            <p>Vos données ne sont <strong>jamais vendues</strong> à des tiers à ce jour. Elles sont visibles uniquement par les personnes de votre établissement habilitées par leur rôle (ex. votre censeur voit vos séances, votre chef d'établissement voit les membres de son établissement).</p>
            <p>Nous nous réservons la possibilité, à l'avenir, de partager certaines données avec des prestataires techniques de confiance (hébergement, envoi d'e-mails ou de notifications) strictement pour faire fonctionner le service, ou dans le cadre d'une évolution de la structure de l'entreprise (fusion, rachat, partenariat). Le cas échéant, cette politique sera mise à jour au préalable et vous en serez informé(e).</p>

            <h3 style={{ color: '#0f172a', fontSize: '14px', marginTop: '16px' }}>5. Hébergement et sécurité</h3>
            <p>Les données sont hébergées chez Supabase, avec un accès protégé par mot de passe et des règles de sécurité limitant chaque personne aux seules données pertinentes pour son rôle.</p>

            <h3 style={{ color: '#0f172a', fontSize: '14px', marginTop: '16px' }}>6. Cookies et stockage local</h3>
            <p>E-cahier utilise uniquement un cookie/jeton technique indispensable pour garder votre session de connexion active. Nous n'utilisons aucun cookie publicitaire ni traceur tiers à des fins commerciales.</p>

            <h3 style={{ color: '#0f172a', fontSize: '14px', marginTop: '16px' }}>7. Vos droits</h3>
            <p>Vous pouvez à tout moment demander la consultation, la correction ou la suppression de vos données en contactant l'administrateur de votre établissement, ou l'équipe E-cahier.</p>

            <h3 style={{ color: '#0f172a', fontSize: '14px', marginTop: '16px' }}>8. Contact</h3>
            <p>Pour toute question relative à vos données personnelles, contactez-nous à : <strong>contact@e-cahier.app</strong></p>
          </div>
        </div>
      </div>
    );
  }

  if (modeRecuperationMdp) {
    return (
      <div style={styles.ecranAuth}>
        <div style={styles.carteAuth}>
          <div style={styles.enteteLogo}>
            <div style={styles.iconeCahier}><span style={{ fontSize: '24px' }}>🔑</span></div>
            <h1 style={styles.titreLogo}>Nouveau mot de passe</h1>
          </div>

          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
            Choisissez un nouveau mot de passe pour votre compte E-cahier.
          </p>

          <form onSubmit={validerNouveauMotDePasse} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            <div>
              <label style={styles.libelle}>Nouveau mot de passe</label>
              <input type="password" value={nouveauMdpSaisi} onChange={(e) => setNouveauMdpSaisi(e.target.value)} style={styles.champSaisie} placeholder="Au moins 6 caractères" required />
            </div>
            <div>
              <label style={styles.libelle}>Confirmer le mot de passe</label>
              <input type="password" value={confirmationNouveauMdpSaisi} onChange={(e) => setConfirmationNouveauMdpSaisi(e.target.value)} style={styles.champSaisie} placeholder="Retapez le même mot de passe" required />
            </div>
            <button type="submit" style={{ ...styles.boutonPrincipal }} disabled={validationMdpEnCours}>
              {validationMdpEnCours ? 'Enregistrement...' : 'Valider le nouveau mot de passe'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (etapeAuth) {
    const roleLabels = { enseignant: 'Enseignant', censeur: 'Censeur', chef: "Chef d'Établissement" };

    return (
      <div style={styles.ecranAuth}>
        {notification && <div style={styles.conteneurNotification}>{notification}</div>}
        <div style={styles.carteAuth}>

          <div style={styles.enteteLogo}>
            <div style={styles.iconeCahier}><span style={{ fontSize: '24px' }}>📖</span></div>
            <h1 style={styles.titreLogo}>E-cahier !</h1>
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#334155', margin: '0 0 16px 0' }}>Espace {roleLabels[etapeAuth]}</h2>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', justifyContent: 'center', fontSize: '14px' }}>
            <span onClick={() => { setModeAuth('connexion'); setModeMdpOublieAuth(false); }} style={{ cursor: 'pointer', fontWeight: modeAuth === 'connexion' && !modeMdpOublieAuth ? '800' : 'normal', color: modeAuth === 'connexion' && !modeMdpOublieAuth ? '#2563eb' : '#94a3b8' }}>Connexion</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span onClick={() => { setModeAuth('inscription'); setModeMdpOublieAuth(false); }} style={{ cursor: 'pointer', fontWeight: modeAuth === 'inscription' ? '800' : 'normal', color: modeAuth === 'inscription' ? '#16a34a' : '#94a3b8' }}>Inscription</span>
          </div>

          {modeMdpOublieAuth ? (
            <form onSubmit={gererMotDePasseOublieAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Entrez votre e-mail personnel pour recevoir un lien de réinitialisation.</p>
              <div>
                <label style={styles.libelle}>Email personnel</label>
                <input type="email" placeholder="votre@email.com" value={emailSaisi} onChange={e => setEmailSaisi(e.target.value)} style={styles.champSaisie} required />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', flex: 1 }} onClick={() => setModeMdpOublieAuth(false)}>Retour</button>
                <button type="submit" style={{ ...styles.boutonPrincipal, flex: 2 }}>Envoyer le lien</button>
              </div>
            </form>
          ) : (
            <form onSubmit={validerAuthUtilisateur} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>

              {modeAuth === 'inscription' && (
                <>
                  <div>
                    <label style={styles.libelle}>Genre (Civilité)</label>
                    <select value={genreSaisi} onChange={e => setGenreSaisi(e.target.value)} style={styles.champSaisie}>
                      <option value="M.">M. (Monsieur)</option>
                      <option value="Mme">Mme (Madame)</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.libelle}>Nom</label>
                    <input type="text" placeholder="Ex: Kouassi" value={nomSaisi} onChange={e => setNomSaisi(e.target.value)} style={styles.champSaisie} required />
                  </div>
                  <div>
                    <label style={styles.libelle}>Prénoms</label>
                    <input type="text" placeholder="Ex: Jean Baptiste" value={prenomsSaisi} onChange={e => setPrenomsSaisi(e.target.value)} style={styles.champSaisie} required />
                  </div>
                  <div>
                    <label style={styles.libelle}>Date de naissance</label>
                    <input type="text" placeholder="JJ/MM/AAAA" value={dateNaissanceSaisie} onChange={gererSaisieDateNaissance} maxLength={10} style={styles.champSaisie} required />
                  </div>

                  {etapeAuth === 'enseignant' && (
                    <div>
                      <label style={styles.libelle}>Matière(s) enseignée(s)</label>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '-2px 0 8px 0' }}>Cochez-en plusieurs si besoin.</p>
                      {chargementCatalogueMatieres ? (
                        <p style={{ fontSize: '12px', color: '#64748b' }}>Chargement du catalogue...</p>
                      ) : erreurCatalogueMatieres ? (
                        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px' }}>
                          <p style={{ fontSize: '12px', color: '#991b1b', margin: '0 0 6px 0', fontWeight: '700' }}>⚠️ Impossible de charger les matières</p>
                        </div>
                      ) : catalogueMatieresInscription.length === 0 ? (
                        <p style={{ fontSize: '12px', color: '#991b1b' }}>Aucune matière disponible pour l'instant.</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', backgroundColor: '#f8fafc' }}>
                          {catalogueMatieresInscription.map(m => {
                            const estCochee = matiereIdsSaisies.includes(m.id);
                            return (
                              <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '6px', backgroundColor: estCochee ? '#dbeafe' : '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700', color: '#334155' }}>
                                <input type="checkbox" checked={estCochee} onChange={() => { setMatiereIdsSaisies(prev => estCochee ? prev.filter(id => id !== m.id) : [...prev, m.id]); }} />
                                {m.nom}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div>
                <label style={styles.libelle}>Email personnel</label>
                <input type="email" placeholder="votre@email.com" value={emailSaisi} onChange={e => setEmailSaisi(e.target.value)} style={styles.champSaisie} required />
              </div>
              <div>
                <label style={styles.libelle}>Mot de passe</label>
                <div style={styles.conteneurMotDePasse}>
                  <input type={afficherMdp ? "text" : "password"} placeholder="••••••••" value={mdpSaisi} onChange={e => setMdpSaisi(e.target.value)} style={styles.champMdpInterne} required />
                  <span onClick={() => setAfficherMdp(!afficherMdp)} style={styles.boutonOeil}>{afficherMdp ? '👁️‍🗨️' : '👁️'}</span>
                </div>
              </div>

              {modeAuth === 'inscription' && (
                <div>
                  <label style={styles.libelle}>Confirmer le mot de passe</label>
                  <div style={styles.conteneurMotDePasse}>
                    <input type={afficherConfirmationMdp ? "text" : "password"} placeholder="Retapez le même mot de passe" value={confirmationMdpSaisi} onChange={e => setConfirmationMdpSaisi(e.target.value)} style={styles.champMdpInterne} required />
                    <span onClick={() => setAfficherConfirmationMdp(!afficherConfirmationMdp)} style={styles.boutonOeil}>{afficherConfirmationMdp ? '👁️‍🗨️' : '👁️'}</span>
                  </div>
                  {confirmationMdpSaisi && mdpSaisi !== confirmationMdpSaisi && (
                    <p style={{ fontSize: '11px', color: '#dc2626', margin: '4px 0 0 0' }}>Les mots de passe ne correspondent pas.</p>
                  )}
                </div>
              )}

              {modeAuth === 'inscription' && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', textAlign: 'left' }}>
                  <input type="checkbox" checked={consentementSaisi} onChange={e => setConsentementSaisi(e.target.checked)} style={{ marginTop: '3px' }} required />
                  <span style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                    J'accepte la{' '}
                    <span onClick={(e) => { e.preventDefault(); setModePolitiqueConfidentialite(true); }} style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}>
                      politique de confidentialité et cookies
                    </span>{' '}d'E-cahier.
                  </span>
                </label>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', flex: 1 }} onClick={() => { setEtapeAuth(null); setEmailSaisi(''); setMdpSaisi(''); }}>⬅️ Retour</button>
                <button type="submit" style={{ ...(modeAuth === 'connexion' ? styles.boutonPrincipal : styles.boutonInscription), flex: 2 }}>
                  {modeAuth === 'connexion' ? 'Se connecter' : "S'inscrire"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div style={styles.ecranAuth}>
        <div style={styles.carteAuth}>
          <span style={{ fontSize: '40px' }}>📚</span>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '12px 0 8px 0' }}>
            Bienvenue sur E-cahier !
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
            Veuillez sélectionner votre profil pour vous connecter.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              type="button" 
              style={{ ...styles.boutonBase, backgroundColor: '#2563eb' }} 
              onClick={(e) => handleLoginRouter(e, 'enseignant')}
            >
              👨‍🏫 Espace Enseignant
            </button>
            
            <button 
              type="button" 
              style={{ ...styles.boutonBase, backgroundColor: '#16a34a' }} 
              onClick={(e) => handleLoginRouter(e, 'censeur')}
            >
              📋 Espace Censeur
            </button>
            
            <button 
              type="button" 
              style={{ ...styles.boutonBase, backgroundColor: '#9333ea' }} 
              onClick={(e) => handleLoginRouter(e, 'chef')}
            >
              🏫 Espace Chef d'Établissement
            </button>
          </div>

          <button
            type="button"
            onClick={() => setModePolitiqueConfidentialite(true)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', marginTop: '20px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            🔒 Politique de confidentialité et cookies
          </button>
        </div>
      </div>
    );
  }

  if (userRole === 'chef' && etapeChoixEtablissement) {
    return (
      <div style={styles.ecranAuth}>
        {notification && <div style={styles.conteneurNotification}>{notification}</div>}
        <div style={styles.carteAuth}>
          <div style={styles.enteteLogo}>
            <div style={styles.iconeCahier}><span style={{ fontSize: '24px' }}>📖</span></div>
            <h1 style={styles.titreLogo}>E-cahier !</h1>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#334155', margin: '0 0 16px 0' }}>Gestion de l'Établissement</h2>
          {choixModeEcole === 'choix' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
              <button type="button" style={styles.boutonPrincipal} onClick={() => setChoixModeEcole('creer')}>➕ Créer un établissement</button>
              <button type="button" style={styles.boutonInscription} onClick={() => setChoixModeEcole('rejoindre')}>🔗 Rejoindre un établissement existant</button>
              <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', marginTop: '6px' }} onClick={gererDeconnexionGlobale}>⬅️ Retour au choix du profil</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const accepterInvitation = async (invitation) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: erreurAff } = await supabase.from('affiliations_etablissement').insert({
      user_id: user.id,
      etablissement_id: invitation.etablissement_id,
      role: invitation.role_propose,
      statut: 'ACTIVE',
      date_debut: new Date().toISOString().slice(0, 10),
    });

    if (erreurAff) return;

    await supabase.from('invitations').update({ statut: 'ACCEPTEE' }).eq('id', invitation.id);
    setInvitationsRecues(prev => prev.filter(i => i.id !== invitation.id));
    setTimeout(() => window.location.reload(), 1200);
  };

  const refuserInvitation = async (invitation) => {
    await supabase.from('invitations').update({ statut: 'REFUSEE' }).eq('id', invitation.id);
    setInvitationsRecues(prev => prev.filter(i => i.id !== invitation.id));
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {notification && <div style={styles.conteneurNotification}>{notification}</div>}

      {invitationsRecues.length > 0 && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', margin: '12px', padding: '14px 18px', borderRadius: '12px' }}>
          {invitationsRecues.map(inv => (
            <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '6px 0' }}>
              <span style={{ fontSize: '13px', color: '#78350f' }}>📨 Invitation à rejoindre <strong>{inv.etablissements?.nom}</strong></span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => accepterInvitation(inv)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Accepter</button>
                <button onClick={() => refuserInvitation(inv)} style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Refuser</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {userRole === 'enseignant' && ( <EnseignantDashboard demandesAffiliation={demandesAffiliation} setDemandesAffiliation={setDemandesAffiliation} seances={seances} setSeances={setSeances} /> )}
      {userRole === 'censeur' && ( <CenseurDashboard demandesAffiliation={demandesAffiliation} setDemandesAffiliation={setDemandesAffiliation} seances={seances} setSeances={setSeances} bibliotheque={bibliotheque} setBibliotheque={setBibliotheque} enseignantsSansFiche={enseignantsSansFiche} /> )}
      {userRole === 'chef' && ( <ChefEtablissementDashboard demandesAffiliation={demandesAffiliation} seances={seances} bibliotheque={bibliotheque} enseignantsSansFiche={enseignantsSansFiche} /> )}

      <GuideInstallationModal />
    </div>
  );
}

const styles = {
  boutonDeconnexion: { background: '#ef4444', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  ecranAuth: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', minHeight: '100vh', padding: '30px 20px', backgroundColor: '#f8fafc', boxSizing: 'border-box', overflowY: 'auto' },
  carteAuth: { background: '#ffffff', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)', border: '1px solid #e2e8f0', width: '100%', maxWidth: '450px', textAlign: 'center', boxSizing: 'border-box', margin: 'auto 0' },
  enteteLogo: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' },
  iconeCahier: { backgroundColor: '#2563eb', borderRadius: '10px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' },
  titreLogo: { fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0' },
  boutonBase: { color: '#ffffff', border: 'none', padding: '14px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '15px', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxSizing: 'border-box' },
  boutonPrincipal: { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', width: '100%', boxSizing: 'border-box' },
  boutonInscription: { backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', width: '100%', boxSizing: 'border-box' },
  champSaisie: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#f8fafc', outline: 'none', marginTop: '4px', boxSizing: 'border-box' },
  conteneurMotDePasse: { display: 'flex', alignItems: 'center', width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', marginTop: '4px', overflow: 'hidden', boxSizing: 'border-box' },
  champMdpInterne: { flex: 1, padding: '10px 14px', border: 'none', fontSize: '13px', backgroundColor: 'transparent', outline: 'none', width: '100%', boxSizing: 'border-box' },
  boutonOeil: { padding: '0 12px', cursor: 'pointer', fontSize: '16px', userSelect: 'none' },
  libelle: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px', textAlign: 'left' },
  conteneurNotification: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, backgroundColor: '#1e293b', color: '#f8fafc', padding: '14px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }
};
