import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Application from '../Application.jsx';
import EnseignantDashboard from './EnseignantDashboard';
import CenseurDashboard from './CenseurDashboard';
import ChefEtablissementDashboard from './ChefEtablissementDashboard';

// Initialisation de Supabase
const supabaseUrl = 'https://okepdydyxgsfywoknhqq.supabase.co';
const supabaseKey = 'sb_publishable_9baPKtdp4KTDvj08yJ63fQ_YQMWe6D_';
export const supabase = createClient(supabaseUrl, supabaseKey);

export default function AppRouter() {
  const [userRole, setUserRole] = useState(''); 
  const [sessionUser, setSessionUser] = useState(null);
  const [profilUtilisateur, setProfilUtilisateur] = useState(null);
  
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [afficherMdpEtablissement, setAfficherMdpEtablissement] = useState(false);
  
  const [etapeChoixEtablissement, setEtapeChoixEtablissement] = useState(false);
  const [choixModeEcole, setChoixModeEcole] = useState('choix');
  const [nomEcoleSaisi, setNomEcoleSaisi] = useState('');
  const [typeEcoleSaisi, setTypeEcoleSaisi] = useState('public');
  const [anneeCreationSaisie, setAnneeCreationSaisie] = useState('');
  const [emailEtablissementSaisi, setEmailEtablissementSaisi] = useState('');
  const [mdpEtablissementSaisi, setMdpEtablissementSaisi] = useState('');
  
  const [etapeAuth, setEtapeAuth] = useState(null); 
  const [modeAuth, setModeAuth] = useState('connexion'); 
  const [modeMdpOublieAuth, setModeMdpOublieAuth] = useState(false);
  
  const [genreSaisi, setGenreSaisi] = useState('M.');
  const [nomSaisi, setNomSaisi] = useState('');
  const [prenomsSaisi, setPrenomsSaisi] = useState('');
  const [dateNaissanceSaisie, setDateNaissanceSaisie] = useState('');
  const [matiereSaisie, setMatiereSaisie] = useState('');
  const [emailSaisi, setEmailSaisi] = useState('');
  const [mdpSaisi, setMdpSaisi] = useState('');

  const [notification, setNotification] = useState('');

  const [demandesAffiliation, setDemandesAffiliation] = useState([]);
  const [seances, setSeances] = useState([]);
  const [bibliotheque, setBibliotheque] = useState([]);
  const [enseignantsSansFiche] = useState([
    { id: 201, enseignantNom: 'M. Yao Koffi', matiere: 'Histoire-Géographie', niveau: '2nde', classe: '2nde A', email: 'koffi.yao@prof.edu', derniereFiche: '2026-02-18' }
  ]);

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
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const chargerProfilEtDonnees = async (userId) => {
    try {
      const { data: profil } = await supabase
        .from('utilisateurs_profils')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profil) {
        setProfilUtilisateur(profil);
        setUserRole(profil.role);
        if (profil.role === 'chef') {
          setEtapeChoixEtablissement(true);
        }
      }

      const { data: resSeances } = await supabase.from('seances').select('*');
      const { data: resBiblio } = await supabase.from('bibliotheque').select('*');
      const { data: resDemandes } = await supabase.from('demandes_affiliation').select('*');

      if (resSeances) setSeances(resSeances);
      if (resBiblio) setBibliotheque(resBiblio);
      if (resDemandes) setDemandesAffiliation(resDemandes);

    } catch (err) {
      console.error("Erreur lors du chargement des données Supabase", err);
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
    if (!emailSaisi) {
      afficherNotification("⚠️ Veuillez entrer votre e-mail.");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailSaisi, {
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
      if (!nomSaisi || !prenomsSaisi || !dateNaissanceSaisie) {
        afficherNotification("⚠️ Veuillez renseigner toutes vos civilités personnelles.");
        return;
      }
      if (etapeAuth === 'enseignant' && !matiereSaisie.trim()) {
        afficherNotification("⚠️ Veuillez indiquer la matière enseignée.");
        return;
      }
    }

    const roleActuel = etapeAuth;

    try {
      if (modeAuth === 'inscription') {
        const { data, error } = await supabase.auth.signUp({
          email: emailSaisi,
          password: mdpSaisi,
        });
        if (error) throw error;

        if (data?.user) {
          const { error: profileError } = await supabase.from('utilisateurs_profils').insert([
            { 
              user_id: data.user.id, 
              email: emailSaisi, 
              role: roleActuel,
              genre: genreSaisi,
              nom: nomSaisi.trim(),
              prenoms: prenomsSaisi.trim(),
              date_naissance: dateNaissanceSaisie,
              matiere: roleActuel === 'enseignant' ? matiereSaisie.trim() : null
            }
          ]);
          if (profileError) throw profileError;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: emailSaisi,
          password: mdpSaisi,
        });
        if (loginError) throw loginError;

        afficherNotification("✅ Inscription réussie !");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailSaisi,
          password: mdpSaisi,
        });
        if (error) throw error;
        afficherNotification("🔓 Connexion réussie !");
      }
      
      setUserRole(roleActuel);
      if (roleActuel === 'chef') {
        setEtapeChoixEtablissement(true);
      }
      setEtapeAuth(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionUser(session.user);
        chargerProfilEtDonnees(session.user.id);
      }
    } catch (err) {
      afficherNotification("❌ Erreur : " + (err.message || "Une erreur est survenue"));
    }
  };

  const gererEtablissementChef = async (action) => {
    if (action === 'creer') {
      if (!nomEcoleSaisi || !anneeCreationSaisie) {
        afficherNotification("⚠️ Veuillez remplir le nom et l'année de création de l'établissement.");
        return;
      }
      try {
        const { error: etabError } = await supabase.from('etablissements').insert([
          { 
            nom: nomEcoleSaisi.trim(),
            type_etablissement: typeEcoleSaisi,
            annee_creation: anneeCreationSaisie.trim(),
            email_contact: sessionUser?.email
          }
        ]);
        if (etabError) throw etabError;
        afficherNotification("🏫 Établissement créé et configuré avec succès !");
        setEtapeChoixEtablissement(false);
      } catch (err) {
        afficherNotification("❌ Erreur : " + err.message);
      }
    } else if (action === 'rejoindre') {
      if (!emailEtablissementSaisi || !mdpEtablissementSaisi) {
        afficherNotification("⚠️ Veuillez entrer l'e-mail et le mot de passe de l'établissement.");
        return;
      }
      try {
        afficherNotification("🔗 Connexion à l'établissement réussie !");
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
            <div style={styles.iconeCahier}>
              <span style={{ fontSize: '24px' }}>📖</span>
            </div>
            <h1 style={styles.titreLogo}>E-cahier !</h1>
          </div>

          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
            Veuillez sélectionner votre profil pour vous connecter.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              type="button" 
              style={{ ...styles.boutonBase, backgroundColor: '#2563eb' }} 
              onClick={() => handleLoginRouter('enseignant')}
            >
              👨‍🏫 Espace Enseignant
            </button>
            
            <button 
              type="button" 
              style={{ ...styles.boutonBase, backgroundColor: '#16a34a' }} 
              onClick={() => handleLoginRouter('censeur')}
            >
              📋 Espace Censeur
            </button>
            
            <button 
              type="button" 
              style={{ ...styles.boutonBase, backgroundColor: '#9333ea' }} 
              onClick={() => handleLoginRouter('chef')}
            >
              🏫 Espace Chef d'Établissement
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (etapeAuth) {
    const roleLabels = {
      enseignant: 'Enseignant',
      censeur: 'Censeur',
      chef: "Chef d'Établissement"
    };
    
    return (
      <div style={styles.ecranAuth}>
        {notification && <div style={styles.conteneurNotification}>{notification}</div>}
        <div style={styles.carteAuth}>
          
          <div style={styles.enteteLogo}>
            <div style={styles.iconeCahier}>
              <span style={{ fontSize: '24px' }}>📖</span>
            </div>
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
                    <input type="date" value={dateNaissanceSaisie} onChange={e => setDateNaissanceSaisie(e.target.value)} style={styles.champSaisie} required />
                  </div>

                  {etapeAuth === 'enseignant' && (
                    <div>
                      <label style={styles.libelle}>Matière enseignée</label>
                      <input type="text" placeholder="Ex: Mathématiques, Histoire-Géo..." value={matiereSaisie} onChange={e => setMatiereSaisie(e.target.value)} style={styles.champSaisie} required />
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
                  <span onClick={() => setAfficherMdp(!afficherMdp)} style={styles.boutonOeil}>
                    {afficherMdp ? '👁️‍🗨️' : '👁️'}
                  </span>
                </div>
                
                <div style={{ textAlign: 'right', marginTop: '6px' }}>
                  <span onClick={() => setModeMdpOublieAuth(true)} style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}>
                    Mot de passe oublié ?
                  </span>
                </div>
              </div>

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

  if (userRole === 'chef' && etapeChoixEtablissement) {
    return (
      <div style={styles.ecranAuth}>
        {notification && <div style={styles.conteneurNotification}>{notification}</div>}
        <div style={styles.carteAuth}>
          
          <div style={styles.enteteLogo}>
            <div style={styles.iconeCahier}>
              <span style={{ fontSize: '24px' }}>📖</span>
            </div>
            <h1 style={styles.titreLogo}>E-cahier !</h1>
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#334155', margin: '0 0 16px 0' }}>Gestion de l'Établissement</h2>
          
          {choixModeEcole === 'choix' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
              <button type="button" style={styles.boutonPrincipal} onClick={() => setChoixModeEcole('creer')}>➕ Créer un établissement</button>
              <button type="button" style={styles.boutonInscription} onClick={() => setChoixModeEcole('rejoindre')}>🔗 Se connecter à un ancien établissement</button>
              <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', marginTop: '10px' }} onClick={async () => { await supabase.auth.signOut(); setUserRole(''); }}>⬅️ Se déconnecter / Retour</button>
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
                <input 
                  type="text" 
                  placeholder="Ex: 1998" 
                  maxLength="4" 
                  value={anneeCreationSaisie} 
                  onChange={e => setAnneeCreationSaisie(e.target.value)} 
                  style={styles.champSaisie} 
                  required 
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', flex: 1 }} onClick={() => setChoixModeEcole('choix')}>⬅️ Retour</button>
                <button type="button" style={{ ...styles.boutonPrincipal, flex: 2 }} onClick={() => gererEtablissementChef('creer')}>Enregistrer</button>
              </div>
            </div>
          )}

          {choixModeEcole === 'rejoindre' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', marginTop: '15px' }}>
              <div>
                <label style={styles.libelle}>Email de l'établissement</label>
                <input type="email" placeholder="ecole@etablissement.edu" value={emailEtablissementSaisi} onChange={e => setEmailEtablissementSaisi(e.target.value)} style={styles.champSaisie} required />
              </div>
              <div>
                <label style={styles.libelle}>Mot de passe de l'établissement</label>
                <div style={styles.conteneurMotDePasse}>
                  <input type={afficherMdpEtablissement ? "text" : "password"} placeholder="••••••••" value={mdpEtablissementSaisi} onChange={e => setMdpEtablissementSaisi(e.target.value)} style={styles.champMdpInterne} required />
                  <span onClick={() => setAfficherMdpEtablissement(!afficherMdpEtablissement)} style={styles.boutonOeil}>
                    {afficherMdpEtablissement ? '👁️‍🗨️' : '👁️'}
                  </span>
                </div>
                <div style={{ textAlign: 'right', marginTop: '6px' }}>
                  <span onClick={() => afficherNotification("📧 Un lien de réinitialisation pour l'établissement a été envoyé.")} style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}>
                    Mot de passe oublié ?
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" style={{ ...styles.boutonDeconnexion, background: '#64748b', flex: 1 }} onClick={() => setChoixModeEcole('choix')}>⬅️ Retour</button>
                <button type="button" style={{ ...styles.boutonPrincipal, flex: 2 }} onClick={() => gererEtablissementChef('rejoindre')}>Se connecter</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {notification && <div style={styles.conteneurNotification}>{notification}</div>}

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
