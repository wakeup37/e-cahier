import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Application from '../Application.jsx';
import EnseignantDashboard from './EnseignantDashboard';
import CenseurDashboard from './CenseurDashboard';
import ChefEtablissementDashboard from './ChefEtablissementDashboard';

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
  const [afficherMdpConfirmation, setAfficherMdpConfirmation] = useState(false);

  const [etapeChoixEtablissement, setEtapeChoixEtablissement] = useState(false);
  const [choixModeEcole, setChoixModeEcole] = useState('choix');
  const [nomEcoleSaisi, setNomEcoleSaisi] = useState('');
  const [typeEcoleSaisi, setTypeEcoleSaisi] = useState('public');
  const [anneeCreationSaisie, setAnneeCreationSaisie] = useState('');
  const [codeEtablissementSaisi, setCodeEtablissementSaisi] = useState('');

  const [etapeAuth, setEtapeAuth] = useState(null);
  const [modeAuth, setModeAuth] = useState('connexion');
  const [modeMdpOublieAuth, setModeMdpOublieAuth] = useState(false);

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
  const [mdpConfirmationSaisi, setMdpConfirmationSaisi] = useState('');

  const [notification, setNotification] = useState('');
  const [envoiAuthEnCours, setEnvoiAuthEnCours] = useState(false);

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
    setUserRole('');
    setSessionUser(null);
    setProfilUtilisateur(null);
    setEtapeAuth(null);
    setEtapeChoixEtablissement(false);
    setEtablissementActifId(null);
    setChoixModeEcole('choix');
    afficherNotification("🔓 Déconnexion réussie.");
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
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const handleLoginRouter = (role) => {
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

  const validerAuthUtilisateur = async (e) => {
    e.preventDefault();
    if (!emailSaisi || !mdpSaisi) {
      afficherNotification("⚠️ Veuillez remplir l'e-mail et le mot de passe.");
      return;
    }

    if (modeAuth === 'inscription') {
      if (mdpSaisi !== mdpConfirmationSaisi) {
        afficherNotification("⚠️ Les mots de passe saisis ne correspondent pas.");
        return;
      }
      if (!nomSaisi || !prenomsSaisi || !dateNaissanceSaisie) {
        afficherNotification("⚠️ Veuillez renseigner toutes vos civilités personnelles.");
        return;
      }
      if (etapeAuth === 'enseignant' && matiereIdsSaisies.length === 0) {
        afficherNotification("⚠️ Veuillez choisir au moins une matière enseignée.");
        return;
      }
    }

    if (envoiAuthEnCours) return;
    setEnvoiAuthEnCours(true);

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

          // [CORRIGÉ] Utilisation d'un insert direct avec contrôle d'existence préalable
          // pour éviter tout plantage lié à la contrainte d'unicité de l'upsert.
          const { data: profilExistant } = await supabase
            .from('utilisateurs_profils')
            .select('user_id')
            .eq('user_id', data.user.id)
            .maybeSingle();

          const payloadProfil = {
            user_id: data.user.id,
            nom: nomSaisi.trim(),
            prenom: prenomsSaisi.trim(),
            preferences_json: {
              genre: genreSaisi,
              date_naissance: dateFormatee,
              matieres_predilection: roleActuel === 'enseignant' ? nomsMatieresChoisies : null,
              role_signup: roleActuel,
            },
          };

          if (profilExistant) {
            const { error: updateErr } = await supabase
              .from('utilisateurs_profils')
              .update(payloadProfil)
              .eq('user_id', data.user.id);
            if (updateErr) throw updateErr;
          } else {
            const { error: insertErr } = await supabase
              .from('utilisateurs_profils')
              .insert([payloadProfil]);
            if (insertErr) throw insertErr;
          }
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
        messageErreur = "Cet e-mail est déjà enregistré. Si l'inscription précédente a échoué, connectez-vous directement.";
      }
      afficherNotification("❌ " + messageErreur);
    } finally {
      setEnvoiAuthEnCours(false);
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

  if (!userRole && !etapeAuth) {
    return (
      <div style={styles.ecranAuth}>
        <div style={styles.carteAuth}>
          <div style={styles.enteteLogo}>
            <div style={styles.iconeCahier}><span style={{ fontSize: '24px' }}>📖</span></div>
            <h1 style={styles.titreLogo}>E-cahier !</h1>
          </div>

          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
            Veuillez sélectionner votre profil pour vous connecter.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button type="button" style={{ ...styles.boutonBase, backgroundColor: '#2563eb' }} onClick={() => handleLoginRouter('enseignant')}>
              👨‍🏫 Espace Enseignant
            </button>
            <button type="button" style={{ ...styles.boutonBase, backgroundColor: '#16a34a' }} onClick={() => handleLoginRouter('censeur')}>
              📋 Espace Censeur
            </button>
            <button type="button" style={{ ...styles.boutonBase, backgroundColor: '#9333ea' }} onClick={() => handleLoginRouter('chef')}>
              🏫 Espace Chef d'Établissement
            </button>
          </div>
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
                          <p style={{ fontSize: '11px', color: '#7f1d1d', margin: 0 }}>{erreurCatalogueMatieres}</p>
                          <button
                            type="button"
                            onClick={() => { setEtapeAuth(null); setTimeout(() => setEtapeAuth('enseignant'), 0); }}
                            style={{ marginTop: '8px', fontSize: '11px', fontWeight: '800', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            ↻ Réessayer
                          </button>
                        </div>
                      ) : catalogueMatieresInscription.length === 0 ? (
                        <p style={{ fontSize: '12px', color: '#991b1b' }}>Aucune matière disponible pour l'instant.</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', backgroundColor: '#f8fafc' }}>
                          {catalogueMatieresInscription.map(m => {
                            const estCochee = matiereIdsSaisies.includes(m.id);
                            return (
                              <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '6px', backgroundColor: estCochee ? '#dbeafe' : '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700', color: '#334155' }}>
                                <input
                                  type="checkbox"
                                  checked={estCochee}
                                  onChange={() => {
                                    setMatiereIdsSaisies(prev => estCochee ? prev.filter(id => id !== m.id) : [...prev, m.id]);
                                  }}
                                />
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

                {modeAuth === 'inscription' && (
                  <div style={{ marginTop: '10px' }}>
                    <label style={styles.libelle}>Confirmer le mot de passe</label>
                    <div style={styles.conteneurMotDePasse}>
                      <input type={afficherMdpConfirmation ? "text" : "password"} placeholder="••••••••" value={mdpConfirmationSaisi} onChange={e => setMdpConfirmationSaisi(e.target.value)} style={styles.champMdpInterne} required />
                      <span onClick={() => setAfficherMdpConfirmation(!afficherMdpConfirmation)} style={styles.boutonOeil}>{afficherMdpConfirmation ? '👁️‍🗨️' : '👁️'}</span>
                    </div>
                  </div>
                )}

                {modeAuth === 'connexion' && (
                  <div style={{ textAlign: 'right', marginTop: '6px' }}>
                    <span onClick={() => setModeMdpOublieAuth(true)} style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}>
                      Mot de passe oublié ?
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', flex: 1 }} onClick={() => { setEtapeAuth(null); setEmailSaisi(''); setMdpSaisi(''); setMdpConfirmationSaisi(''); }}>⬅️ Retour</button>
                <button type="submit" style={{ ...(modeAuth === 'connexion' ? styles.boutonPrincipal : styles.boutonInscription), flex: 2 }} disabled={envoiAuthEnCours}>
                  {envoiAuthEnCours ? 'Patientez...' : (modeAuth === 'connexion' ? 'Se connecter' : "S'inscrire")}
                </button>
              </div>
            </form>
          )}
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
              <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', marginTop: '6px' }} onClick={gererDeconnexionGlobale}>⬅️ Retour au choix du profil / Déconnexion</button>
            </div>
          )}

          {choixModeEcole === 'creer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', marginTop: '15px' }}>
              <div>
                <label style={styles.libelle}>Nom de l'établissement</label>
                <input type="text" placeholder="Ex: Lycée Moderne..." value={nomEcoleSaisi} onChange={e => setNomEcoleSaisi(e.target.value)} style={styles.champSaisie} required />
              </div>
              <div>
                <label style={styles.libelle}>Type d'établissement</label>
                <select value={typeEcoleSaisi} onChange={e => setTypeEcoleSaisi(e.target.value)} style={styles.champSaisie}>
                  <option value="public">Public</option>
                  <option value="prive">Privé</option>
                </select>
              </div>
              <div>
                <label style={styles.libelle}>Année de création</label>
                <input type="text" placeholder="Ex: 1998" maxLength="4" value={anneeCreationSaisie} onChange={e => setAnneeCreationSaisie(e.target.value)} style={styles.champSaisie} required />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', flex: 1 }} onClick={() => setChoixModeEcole('choix')}>⬅️ Retour</button>
                <button type="button" style={{ ...styles.boutonPrincipal, flex: 2 }} onClick={() => gererEtablissementChef('creer')}>Enregistrer</button>
              </div>
            </div>
          )}

          {choixModeEcole === 'rejoindre' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', marginTop: '15px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Un établissement n'a pas de mot de passe : rejoindre en tant que chef nécessite le code de l'établissement, et votre demande devra être approuvée.
              </p>
              <div>
                <label style={styles.libelle}>Code de l'établissement</label>
                <input type="text" placeholder="Ex: LYCMOD-A1B2" value={codeEtablissementSaisi} onChange={e => setCodeEtablissementSaisi(e.target.value)} style={styles.champSaisie} required />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', flex: 1 }} onClick={() => setChoixModeEcole('choix')}>⬅️ Retour</button>
                <button type="button" style={{ ...styles.boutonPrincipal, flex: 2 }} onClick={() => gererEtablissementChef('rejoindre')}>Envoyer la demande</button>
              </div>
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

    if (erreurAff) {
      if (erreurAff.code === '23505') {
        afficherNotification("⚠️ Vous avez déjà une affiliation active incompatible avec ce rôle ailleurs.");
      } else {
        afficherNotification("❌ Erreur : " + erreurAff.message);
      }
      return;
    }

    await supabase.from('invitations').update({ statut: 'ACCEPTEE' }).eq('id', invitation.id);
    setInvitationsRecues(prev => prev.filter(i => i.id !== invitation.id));
    afficherNotification(`✅ Vous avez rejoint ${invitation.etablissements?.nom} !`);
    setTimeout(() => window.location.reload(), 1200);
  };

  const refuserInvitation = async (invitation) => {
    await supabase.from('invitations').update({ statut: 'REFUSEE' }).eq('id', invitation.id);
    setInvitationsRecues(prev => prev.filter(i => i.id !== invitation.id));
    afficherNotification("Invitation refusée.");
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {notification && <div style={styles.conteneurNotification}>{notification}</div>}

      {invitationsRecues.length > 0 && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', margin: '12px', padding: '14px 18px', borderRadius: '12px' }}>
          {invitationsRecues.map(inv => (
            <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '6px 0' }}>
              <span style={{ fontSize: '13px', color: '#78350f' }}>
                📨 Vous avez été invité(e) à rejoindre <strong>{inv.etablissements?.nom}</strong> en tant que <strong>{inv.role_propose}</strong>
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => accepterInvitation(inv)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Accepter</button>
                <button onClick={() => refuserInvitation(inv)} style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Refuser</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {userRole === 'enseignant' && (
        <EnseignantDashboard demandesAffiliation={demandesAffiliation} setDemandesAffiliation={setDemandesAffiliation} seances={seances} setSeances={setSeances} />
      )}

      {userRole === 'censeur' && (
        <CenseurDashboard demandesAffiliation={demandesAffiliation} setDemandesAffiliation={setDemandesAffiliation} seances={seances} setSeances={setSeances} bibliotheque={bibliotheque} setBibliotheque={setBibliotheque} enseignantsSansFiche={enseignantsSansFiche} />
      )}

      {userRole === 'chef' && (
        <ChefEtablissementDashboard demandesAffiliation={demandesAffiliation} seances={seances} bibliotheque={bibliotheque} enseignantsSansFiche={enseignantsSansFiche} />
      )}
    </div>
  );
}

const styles = {
  boutonDeconnexion: { background: '#ef4444', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  ecranAuth: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px', backgroundColor: '#f8fafc', boxSizing: 'border-box' },
  carteAuth: { background: '#ffffff', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)', border: '1px solid #e2e8f0', width: '100%', maxWidth: '450px', textAlign: 'center', boxSizing: 'border-box' },
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
