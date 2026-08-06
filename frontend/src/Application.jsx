import React, { useState, useEffect } from 'react';
import EnseignantDashboard from './components/EnseignantDashboard';
import CenseurDashboard from './components/CenseurDashboard';
import ChefEtablissementDashboard from './components/ChefEtablissementDashboard';

export default function App() {
  const [modeAffichage, setModeAffichage] = useState('accueil'); 
  const [userRole, setUserRole] = useState(''); 
  const [notification, setNotification] = useState('');
  
  const [estEnLigne, setEstEnLigne] = useState(navigator.onLine);

  const [formConnexion, setFormConnexion] = useState({ email: '', motDePasse: '' });
  
  // Inscription enrichie et unifiée pour tous les profils (Civilités, Ancienneté, Matière/Prédilection et Statut Public/Privé/Matricule)
  const [formInscription, setFormInscription] = useState({
    civilite: 'M.',
    nom: '',
    prenoms: '',
    dateNaissance: '',
    telephone: '',
    email: '',
    motDePasse: '',
    role: 'enseignant',
    matiere: 'Éducation Physique et Sportive (EPS)',
    ville: 'Abidjan',
    anciennete: '1 à 5 ans',
    secteurEnseignement: 'Public', // 'Public' ou 'Privé'
    typeStatutPublic: 'Titulaire', // 'Titulaire', 'En attente d’un matricule', 'Contractuel'
    numeroMatricule: ''
  });

  const [formAffiliation, setFormAffiliation] = useState({
    etablissementDemande: '',
    classeSaisie: '',
    classesAjoutees: []
  });

  const [demandesAffiliationEnseignants, setDemandesAffiliationEnseignants] = useState(() => {
    const saved = localStorage.getItem('app_demandes_affiliation');
    return saved ? JSON.parse(saved) : [
      { id: 1, enseignant: 'M. Kouassi Jean', email: 'jean.kouassi@prof.edu', specialite: 'Éducation Physique (EPS)', classeDemandee: '6ème A, 5ème B', statut: 'Validée', dateDemande: '2026-03-01' },
      { id: 2, enseignant: 'Mme Touré Aminata', email: 'aminata.toure@prof.edu', specialite: 'Mathématiques', classeDemandee: '4ème A, 3ème C', statut: 'Validée', dateDemande: '2026-03-05' }
    ];
  });

  const [seancesEnseignants, setSeancesEnseignants] = useState(() => {
    const saved = localStorage.getItem('app_seances_enseignants');
    return saved ? JSON.parse(saved) : [
      {
        id: 1001,
        enseignantNom: 'M. Kouassi Jean',
        matiere: 'Éducation Physique (EPS)',
        niveau: '6ème',
        classe: '6ème A',
        numero: 1,
        titre: 'Initiation au roulement avant',
        date: '2026-03-10',
        cycle: 'Cycle 1 - Gymnastique',
        lecon: 'Leçon 1 : Les gammes gymniques',
        habilites: 'Savoir enrouler sa tête et pousser sur ses bras.',
        contenus: 'Atelier sol matelas : passage du groupé.',
        exercices: 'Roulé-boulé par groupes de 4.',
        annee: '2025-2026',
        statut: 'En attente'
      }
    ];
  });

  const [bibliothequeFiches, setBibliothequeFiches] = useState(() => {
    const saved = localStorage.getItem('app_bibliotheque_fiches');
    return saved ? JSON.parse(saved) : [
      {
        id: 3001,
        enseignantNom: 'M. Kouassi Jean',
        matiere: 'Éducation Physique (EPS)',
        niveau: '6ème',
        classe: '6ème A',
        annee: '2025-2026',
        cycle: 'Cycle 1 - Gymnastique',
        lecon: 'Leçon 1 : Les gammes gymniques',
        seance: 'Séance 1',
        titre: 'Initiation au roulement avant',
        contenus: 'Atelier sol matelas...',
        dateValidation: '2026-03-02'
      }
    ];
  });

  const [enseignantsSansFiche, setEnseignantsSansFiche] = useState([
    { id: 201, enseignantNom: 'M. Yao Koffi', matiere: 'Histoire-Géographie', niveau: '2nde', classe: '2nde A', email: 'koffi.yao@prof.edu', derniereFiche: '2026-02-18' }
  ]);

  useEffect(() => {
    const gererEnLigne = () => {
      setEstEnLigne(true);
      afficherNotification("Connexion Internet rétablie : synchronisation en cours...");
      const fileAttente = JSON.parse(localStorage.getItem('app_file_attente_offline')) || [];
      if (fileAttente.length > 0) {
        localStorage.removeItem('app_file_attente_offline');
        setTimeout(() => {
          afficherNotification("Synchronisation réussie ! Vos actions hors ligne ont été prises en compte.");
        }, 1500);
      }
    };

    const gererHorsLigne = () => {
      setEstEnLigne(false);
      afficherNotification("⚠️ Mode hors ligne activé. Sauvegarde locale active.");
    };

    window.addEventListener('online', gererEnLigne);
    window.addEventListener('offline', gererHorsLigne);

    return () => {
      window.removeEventListener('online', gererEnLigne);
      window.removeEventListener('offline', gererHorsLigne);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('app_demandes_affiliation', JSON.stringify(demandesAffiliationEnseignants));
  }, [demandesAffiliationEnseignants]);

  useEffect(() => {
    localStorage.setItem('app_seances_enseignants', JSON.stringify(seancesEnseignants));
  }, [seancesEnseignants]);

  useEffect(() => {
    localStorage.setItem('app_bibliotheque_fiches', JSON.stringify(bibliothequeFiches));
  }, [bibliothequeFiches]);

  const afficherNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const gererActionHorsLigne = (actionType, donneesPayload) => {
    if (!navigator.onLine) {
      const fileExistante = JSON.parse(localStorage.getItem('app_file_attente_offline')) || [];
      fileExistante.push({ type: actionType, payload: donneesPayload, timestamp: Date.now() });
      localStorage.setItem('app_file_attente_offline', JSON.stringify(fileExistante));
    }
  };

  const handleConnexion = (e) => {
    e.preventDefault();
    if (!formConnexion.email || !formConnexion.motDePasse) {
      afficherNotification("Veuillez remplir tous les champs de connexion.");
      return;
    }

    if (formConnexion.email.includes('chef') || formConnexion.email.includes('direction')) {
      setUserRole('chef');
    } else if (formConnexion.email.includes('censeur') || formConnexion.email.includes('kone')) {
      setUserRole('censeur');
    } else {
      setUserRole('enseignant');
    }
    afficherNotification("Connexion réussie ! Bienvenue dans E-cahier !");
  };

  const handleInscription = (e) => {
    e.preventDefault();
    if (!formInscription.nom || !formInscription.email || !formInscription.motDePasse) {
      afficherNotification("Veuillez renseigner tous les champs obligatoires.");
      return;
    }

    if (formInscription.secteurEnseignement === 'Public' && formInscription.typeStatutPublic === 'Titulaire' && !formInscription.numeroMatricule.trim()) {
      afficherNotification("Veuillez renseigner votre numéro matricule.");
      return;
    }

    afficherNotification("Compte créé avec succès !");

    if (formInscription.role === 'enseignant') {
      setTimeout(() => {
        setModeAffichage('affiliation_enseignant');
      }, 1000);
    } else {
      setTimeout(() => {
        setUserRole(formInscription.role); 
      }, 1200);
    }
  };

  const ajouterClassePersonnalisee = (e) => {
    e.preventDefault();
    const classeNom = formAffiliation.classeSaisie.trim();
    if (!classeNom) return;

    if (formAffiliation.classesAjoutees.includes(classeNom)) {
      afficherNotification("Cette classe a déjà été ajoutée.");
      return;
    }

    setFormAffiliation({
      ...formAffiliation,
      classesAjoutees: [...formAffiliation.classesAjoutees, classeNom],
      classeSaisie: ''
    });
  };

  const retirerClasseDeListe = (classeNom) => {
    setFormAffiliation({
      ...formAffiliation,
      classesAjoutees: formAffiliation.classesAjoutees.filter(c => c !== classeNom)
    });
  };

  const soumettreAffiliationEnseignant = (e) => {
    e.preventDefault();
    if (!formAffiliation.etablissementDemande || formAffiliation.classesAjoutees.length === 0) {
      afficherNotification("Veuillez indiquer l'établissement et ajouter au moins une classe.");
      return;
    }

    const nomComplet = `${formInscription.civilite} ${formInscription.nom} ${formInscription.prenoms}`.trim();
    const nouvelleDemande = {
      id: Date.now(),
      enseignant: nomComplet || formInscription.nom,
      email: formInscription.email,
      specialite: formInscription.matiere,
      classeDemandee: formAffiliation.classesAjoutees.join(', '),
      statut: 'En attente',
      dateDemande: new Date().toISOString().split('T')[0]
    };

    setDemandesAffiliationEnseignants(prev => [nouvelleDemande, ...prev]);
    gererActionHorsLigne('NOUVELLE_AFFILIATION', nouvelleDemande);

    afficherNotification(estEnLigne ? "Demande d'affiliation transmise !" : "Enregistré hors ligne : synchronisation au retour du réseau.");
    setTimeout(() => {
      setUserRole('enseignant');
    }, 1500);
  };

  const handleLogout = () => {
    setUserRole('');
    setModeAffichage('accueil');
  };

  return (
    <div style={styles.conteneurGlobal}>
      <style>{`
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        @keyframes apparition { from { opacity: 0; } to { opacity: 1; } }
        @keyframes glissement { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .anim-apparition { animation: apparition 0.3s ease-out forwards; }
        .anim-carte { animation: glissement 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .bouton-principal {
          background-color: #4f46e5; color: #ffffff; border: none; padding: 12px 20px;
          border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer;
          transition: all 0.2s ease; width: 100%; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .bouton-principal:hover { background-color: #4338ca; transform: translateY(-1px); }
        .bouton-secondaire {
          background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;
          padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer;
          transition: all 0.2s ease;
        }
        .bouton-secondaire:hover { background-color: #e2e8f0; color: #0f172a; }
        .champ-saisie {
          width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1;
          font-size: 13px; background-color: #fff; color: #1e293b; outline: none; transition: border-color 0.2s;
        }
        .champ-saisie:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15); }
        .carte-auth {
          background: #ffffff; padding: 36px; border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          width: 100%; max-width: 460px; border: 1px solid #e2e8f0;
        }
      `}</style>

      {!estEnLigne && (
        <div style={styles.bandeauHorsLigne}>
          ⚠️ Vous êtes actuellement <strong>hors ligne</strong>. Vos modifications sont sauvegardées localement.
        </div>
      )}

      {notification && (
        <div style={styles.conteneurNotification} className="anim-apparition">
          <div style={styles.texteNotification}>{notification}</div>
        </div>
      )}

      {!userRole && (
        <div style={styles.ecranAuth} className="anim-apparition">
          
          {modeAffichage === 'accueil' && (
            <div style={styles.carteAuth} className="anim-carte">
              <div style={styles.logoConteneur}>
                <span style={styles.logoBadge}>📖</span>
                <h1 style={styles.titreLogo}>E-cahier !</h1>
              </div>
              <p style={styles.sousTitreAuth}>Gestion intelligente, synchronisée et mode hors-ligne</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                <button onClick={() => setModeAffichage('connexion')} className="bouton-principal">
                  🔐 Se connecter à mon compte
                </button>
                <button onClick={() => setModeAffichage('inscription')} className="bouton-secondaire" style={{ width: '100%', textAlign: 'center' }}>
                  📝 Créer un nouveau compte
                </button>
              </div>
            </div>
          )}

          {modeAffichage === 'connexion' && (
            <div style={styles.carteAuth} className="anim-carte">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📖</span>
                  <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: '800' }}>E-cahier !</h2>
                </div>
                <button onClick={() => setModeAffichage('accueil')} style={styles.lienRetour}>← Retour</button>
              </div>

              <form onSubmit={handleConnexion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.libelle}>Adresse e-mail</label>
                  <input type="email" placeholder="votre.email@ecole.edu" value={formConnexion.email} onChange={e => setFormConnexion({...formConnexion, email: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label style={styles.libelle}>Mot de passe</label>
                  <input type="password" placeholder="••••••••" value={formConnexion.motDePasse} onChange={e => setFormConnexion({...formConnexion, motDePasse: e.target.value})} className="champ-saisie" required />
                </div>
                <button type="submit" className="bouton-principal" style={{ marginTop: '10px' }}>Se connecter</button>
              </form>
            </div>
          )}

          {modeAffichage === 'inscription' && (
            <div style={{ ...styles.carteAuth, maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-carte">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📖</span>
                  <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: '800' }}>E-cahier !</h2>
                </div>
                <button onClick={() => setModeAffichage('accueil')} style={styles.lienRetour}>← Retour</button>
              </div>

              <form onSubmit={handleInscription} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={styles.libelle}>Sélectionnez votre profil</label>
                  <select value={formInscription.role} onChange={e => setFormInscription({...formInscription, role: e.target.value})} className="champ-saisie">
                    <option value="enseignant">Enseignant</option>
                    <option value="censeur">Censeur / Superviseur</option>
                    <option value="chef">Chef d'Établissement (Direction)</option>
                  </select>
                </div>

                {/* CIVILITÉS & NOMS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <div>
                    <label style={styles.libelle}>Civilité</label>
                    <select value={formInscription.civilite} onChange={e => setFormInscription({...formInscription, civilite: e.target.value})} className="champ-saisie">
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Dr">Dr</option>
                      <option value="Pr">Pr</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.libelle}>Nom</label>
                    <input type="text" placeholder="Kouassi" value={formInscription.nom} onChange={e => setFormInscription({...formInscription, nom: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div>
                  <label style={styles.libelle}>Prénoms</label>
                  <input type="text" placeholder="Jean" value={formInscription.prenoms} onChange={e => setFormInscription({...formInscription, prenoms: e.target.value})} className="champ-saisie" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={styles.libelle}>Date de naissance</label>
                    <input type="date" value={formInscription.dateNaissance} onChange={e => setFormInscription({...formInscription, dateNaissance: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label style={styles.libelle}>Téléphone / WhatsApp</label>
                    <input type="text" placeholder="+225..." value={formInscription.telephone} onChange={e => setFormInscription({...formInscription, telephone: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={styles.libelle}>Matière / Prédilection (Origine)</label>
                    <input type="text" placeholder="Ex: Mathématiques, EPS..." value={formInscription.matiere} onChange={e => setFormInscription({...formInscription, matiere: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label style={styles.libelle}>Ancienneté</label>
                    <select value={formInscription.anciennete} onChange={e => setFormInscription({...formInscription, anciennete: e.target.value})} className="champ-saisie">
                      <option value="Moins d'un an">Moins d'un an</option>
                      <option value="1 à 5 ans">1 à 5 ans</option>
                      <option value="6 à 10 ans">6 à 10 ans</option>
                      <option value="Plus de 10 ans">Plus de 10 ans</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={styles.libelle}>Ville / Commune</label>
                  <input type="text" placeholder="Abidjan" value={formInscription.ville} onChange={e => setFormInscription({...formInscription, ville: e.target.value})} className="champ-saisie" required />
                </div>

                {/* STATUT PROFESSIONNEL (PUBLIC / PRIVÉ & MATRICULE) */}
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={styles.libelle}>Secteur d'enseignement</label>
                    <select value={formInscription.secteurEnseignement} onChange={e => setFormInscription({...formInscription, secteurEnseignement: e.target.value})} className="champ-saisie">
                      <option value="Public">Public</option>
                      <option value="Privé">Privé</option>
                    </select>
                  </div>

                  {formInscription.secteurEnseignement === 'Public' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <label style={styles.libelle}>Statut dans le Public</label>
                        <select value={formInscription.typeStatutPublic} onChange={e => setFormInscription({...formInscription, typeStatutPublic: e.target.value})} className="champ-saisie">
                          <option value="Titulaire">Titulaire (Avec Matricule)</option>
                          <option value="En attente de matricule">En attente d’un matricule</option>
                          <option value="Contractuel">Contractuel</option>
                        </select>
                      </div>

                      {formInscription.typeStatutPublic === 'Titulaire' && (
                        <div>
                          <label style={styles.libelle}>Numéro Matricule</label>
                          <input type="text" placeholder="Ex: MT-XXXXXX" value={formInscription.numeroMatricule} onChange={e => setFormInscription({...formInscription, numeroMatricule: e.target.value})} className="champ-saisie" required />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '8px', backgroundColor: '#eef2f6', borderRadius: '6px', fontSize: '12px', color: '#334155', fontWeight: '600', textAlign: 'center' }}>
                      Statut enregistré : <span style={{ color: '#4f46e5' }}>Privé</span>
                    </div>
                  )}
                </div>

                <div>
                  <label style={styles.libelle}>Adresse e-mail professionnelle</label>
                  <input type="email" placeholder="email@etablissement.edu" value={formInscription.email} onChange={e => setFormInscription({...formInscription, email: e.target.value})} className="champ-saisie" required />
                </div>

                <div>
                  <label style={styles.libelle}>Mot de passe sécurisé</label>
                  <input type="password" placeholder="••••••••" value={formInscription.motDePasse} onChange={e => setFormInscription({...formInscription, motDePasse: e.target.value})} className="champ-saisie" required />
                </div>

                <button type="submit" className="bouton-principal" style={{ marginTop: '10px' }}>
                  {formInscription.role === 'enseignant' ? 'Continuer vers l’affiliation' : 'Créer mon compte'}
                </button>
              </form>
            </div>
          )}

          {modeAffichage === 'affiliation_enseignant' && (
            <div style={{ ...styles.carteAuth, maxWidth: '520px' }} className="anim-carte">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>📖</span>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: '800' }}>E-cahier !</h2>
              </div>
              <p style={styles.sousTitreAuth}>
                Indiquez l'établissement souhaité et saisissez l'appellation exacte de vos classes (ex: <strong>6e 1</strong>, <strong>1re C1</strong>).
              </p>

              <form onSubmit={soumettreAffiliationEnseignant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={styles.libelle}>Nom de l'établissement souhaité</label>
                  <input type="text" placeholder="Ex: Lycée Moderne..." value={formAffiliation.etablissementDemande} onChange={e => setFormAffiliation({...formAffiliation, etablissementDemande: e.target.value})} className="champ-saisie" required />
                </div>

                <div>
                  <label style={styles.libelle}>Ajouter une classe en charge</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" placeholder="Ex: 6e 1, 1re C1..." value={formAffiliation.classeSaisie} onChange={e => setFormAffiliation({...formAffiliation, classeSaisie: e.target.value})} className="champ-saisie" />
                    <button type="button" onClick={ajouterClassePersonnalisee} style={styles.boutonAjouterClasse}>+ Ajouter</button>
                  </div>
                </div>

                <div>
                  <label style={styles.libelle}>Classes sélectionnées ({formAffiliation.classesAjoutees.length}) :</label>
                  <div style={styles.conteneurClassesListe}>
                    {formAffiliation.classesAjoutees.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Aucune classe ajoutée.</span>
                    ) : (
                      formAffiliation.classesAjoutees.map(classe => (
                        <div key={classe} style={styles.badgeClasseItem}>
                          <span>{classe}</span>
                          <button type="button" onClick={() => retirerClasseDeListe(classe)} style={styles.boutonSupprimerBadge}>✕</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button type="submit" className="bouton-principal" style={{ marginTop: '10px' }}>
                  Soumettre la demande au Censeur / Direction
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      {userRole === 'enseignant' && (
        <div className="anim-apparition">
          <div style={styles.barreNavigation}>
            <div style={styles.navLogoContainer}>
              <span style={{ fontSize: '16px' }}>📖</span>
              <span style={{ fontWeight: '800', letterSpacing: '0.5px' }}>E-cahier !</span>
              <span style={{ opacity: 0.5, margin: '0 6px' }}>|</span>
              <span style={styles.texteNav}>Espace Enseignant ({formInscription.civilite} {formInscription.nom}) {!estEnLigne && '*(Hors ligne)*'}</span>
            </div>
            <button style={styles.boutonDeconnexion} onClick={handleLogout}>Déconnexion</button>
          </div>
          <EnseignantDashboard 
            demandesAffiliation={demandesAffiliationEnseignants}
            setDemandesAffiliation={setDemandesAffiliationEnseignants}
            seances={seancesEnseignants}
            setSeances={setSeancesEnseignants}
          />
        </div>
      )}

      {userRole === 'censeur' && (
        <div className="anim-apparition">
          <div style={styles.barreNavigation}>
            <div style={styles.navLogoContainer}>
              <span style={{ fontSize: '16px' }}>📖</span>
              <span style={{ fontWeight: '800', letterSpacing: '0.5px' }}>E-cahier !</span>
              <span style={{ opacity: 0.5, margin: '0 6px' }}>|</span>
              <span style={styles.texteNav}>Poste de Commandement Censeur ({formInscription.civilite} {formInscription.nom}) {!estEnLigne && '*(Hors ligne)*'}</span>
            </div>
            <button style={styles.boutonDeconnexion} onClick={handleLogout}>Déconnexion</button>
          </div>
          <CenseurDashboard 
            demandesAffiliation={demandesAffiliationEnseignants}
            setDemandesAffiliation={setDemandesAffiliationEnseignants}
            seances={seancesEnseignants}
            setSeances={setSeancesEnseignants}
            bibliotheque={bibliothequeFiches}
            setBibliotheque={setBibliothequeFiches}
            enseignantsSansFiche={enseignantsSansFiche}
          />
        </div>
      )}

      {userRole === 'chef' && (
        <div className="anim-apparition">
          <div style={styles.barreNavigation}>
            <div style={styles.navLogoContainer}>
              <span style={{ fontSize: '16px' }}>📖</span>
              <span style={{ fontWeight: '800', letterSpacing: '0.5px' }}>E-cahier !</span>
              <span style={{ opacity: 0.5, margin: '0 6px' }}>|</span>
              <span style={styles.texteNav}>Chef d'Établissement ({formInscription.civilite} {formInscription.nom}) {!estEnLigne && '*(Hors ligne)*'}</span>
            </div>
            <button style={styles.boutonDeconnexion} onClick={handleLogout}>Déconnexion</button>
          </div>
          <ChefEtablissementDashboard 
            demandesAffiliation={demandesAffiliationEnseignants}
            seances={seancesEnseignants}
            bibliotheque={bibliothequeFiches}
            enseignantsSansFiche={enseignantsSansFiche}
          />
        </div>
      )}
    </div>
  );
}

const styles = {
  conteneurGlobal: { minHeight: '100vh', backgroundColor: '#f1f5f9', position: 'relative' },
  bandeauHorsLigne: { backgroundColor: '#f59e0b', color: '#ffffff', padding: '8px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', position: 'sticky', top: 0, zIndex: 10000, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  ecranAuth: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' },
  logoConteneur: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' },
  logoBadge: { fontSize: '42px', backgroundColor: '#e0e7ff', padding: '12px', borderRadius: '16px', marginBottom: '8px', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.1)' },
  titreLogo: { fontSize: '26px', fontWeight: '900', color: '#1e1b4b', textAlign: 'center', margin: 0, letterSpacing: '-0.5px' },
  sousTitreAuth: { fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '20px' },
  lienRetour: { background: 'none', border: 'none', color: '#4f46e5', fontWeight: '600', fontSize: '13px', cursor: 'pointer' },
  libelle: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' },
  boutonAjouterClasse: { backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' },
  conteneurClassesListe: { display: 'flex', flexWrap: 'wrap', gap: '8px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '50px', alignItems: 'center' },
  badgeClasseItem: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #bae6fd' },
  boutonSupprimerBadge: { background: 'none', border: 'none', color: '#0369a1', fontWeight: '700', cursor: 'pointer', fontSize: '12px', padding: 0 },
  conteneurNotification: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 },
  texteNotification: { backgroundColor: '#1e293b', color: '#f8fafc', padding: '14px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #334155' },
  barreNavigation: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', color: '#ffffff', padding: '12px 30px', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  navLogoContainer: { display: 'flex', alignItems: 'center', gap: '8px' },
  texteNav: { fontWeight: '400' },
  boutonDeconnexion: { background: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', transition: 'background 0.2s' },
};
