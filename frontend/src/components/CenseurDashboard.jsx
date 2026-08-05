import React, { useState, useMemo, useRef, useEffect } from 'react';

export default function CenseurDashboard() {
  const [etapeParcours, etapeSetParcours] = useState('inscription');
  const [ongletActif, setOngletActif] = useState('flux');
  const [notification, setNotification] = useState('');

  // Gestion des menus déroulants et clics extérieurs
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [profilOuvert, setProfilOuvert] = useState(false);

  const menuRef = useRef(null);
  const profilRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOuvert(false);
      if (profilRef.current && !profilRef.current.contains(event.target)) setProfilOuvert(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formulaire initial pour l'inscription (Civilités + Matière de prédilection + Statut)
  const [formInscription, setFormInscription] = useState({
    role: 'censeur',
    civilite: 'M.',
    nom: 'Koné',
    prenoms: 'Bernard',
    titre: 'Censeur / Chef des Études',
    dateNaissance: '1985-04-12',
    telephone: '+225 0700000000',
    ville: 'Abidjan',
    email: 'bernard.kone@ecole.edu',
    anciennete: '6 à 10 ans',
    matierePredilection: 'Mathématiques', // Matière de prédilection / discipline d'origine (statistiques)
    secteurEnseignement: 'Public', // 'Public' ou 'Privé'
    typeStatutPublic: 'Titulaire', // 'Titulaire', 'En attente d’un matricule', 'Contractuel'
    numeroMatricule: 'MT-987654',
    motDePasse: ''
  });

  // Profil du Censeur validé après inscription
  const [infosCenseur, setInfosCenseur] = useState({
    ...formInscription,
    photoProfil: '',
    etablissementSaisi: '',
    affilieValide: false,
    demandeSoumise: false,
    etablissementsDisponibles: ['Lycée Moderne d’Abidjan', 'Le Mota', 'Collège Privé Saint-Jean']
  });

  const [modalProfilOuvert, setModalProfilOuvert] = useState(false);
  const [formProfil, setFormProfil] = useState({ ...infosCenseur });

  // --- RÉPERTOIRE OFFICIEL DES CLASSES DE L'ÉTABLISSEMENT ---
  const [classesEtablissement, setClassesEtablissement] = useState([
    { id: 1, nom: '6ème A', niveau: '6ème' },
    { id: 2, nom: '6ème B', niveau: '6ème' },
    { id: 3, nom: '5ème A', niveau: '5ème' },
    { id: 4, nom: '4ème A', niveau: '4ème' },
    { id: 5, nom: '3ème C', niveau: '3ème' },
    { id: 6, nom: '2nde A', niveau: '2nde' },
    { id: 7, nom: '1ère C', niveau: '1ère' }
  ]);

  const [modalCreationClasse, setModalCreationClasse] = useState(false);
  const [modalEditionClasse, setModalEditionClasse] = useState({ ouvert: false, data: null });
  const [nomClasseModif, setNomClasseModif] = useState('');
  const [niveauClasseModif, setNiveauClasseModif] = useState('6ème');
  const [modalSuppressionClasse, setModalSuppressionClasse] = useState({ ouvert: false, data: null });
  
  const [modeCreation, setModeCreation] = useState('lot');
  const [niveauLot, setNiveauLot] = useState('6ème');
  const [nombreClassesLot, setNombreClassesLot] = useState(4);
  const [styleAppellation, setStyleAppellation] = useState('lettre');
  
  const [seriesLyceeConfig, setSeriesLyceeConfig] = useState({
    A: { active: true, nombre: 2 },
    C: { active: true, nombre: 1 },
    D: { active: true, nombre: 3 },
    F: { active: false, nombre: 1 }
  });

  const [nomNouvelleClasse, setNomNouvelleClasse] = useState('');
  const [niveauNouvelleClasse, setNiveauNouvelleClasse] = useState('6ème');

  // Affiliations des enseignants
  const [demandesAffiliationEnseignants, setDemandesAffiliationEnseignants] = useState([
    { id: 1, enseignant: 'M. Kouassi Jean', email: 'jean.kouassi@prof.edu', specialite: 'Éducation Physique (EPS)', ecoleDemandee: 'Lycée Moderne d’Abidjan', classeDemandee: ['6ème A', '5ème B'], statutEcole: 'Validée', statutClasse: 'Validée', dateDemande: '2026-03-01' },
    { id: 2, enseignant: 'Mme Touré Aminata', email: 'aminata.toure@prof.edu', specialite: 'Mathématiques', ecoleDemandee: 'Lycée Moderne d’Abidjan', classeDemandee: ['4ème A', '3ème C'], statutEcole: 'Validée', statutClasse: 'Validée', dateDemande: '2026-03-05' }
  ]);

  // Fiches et cahiers de texte
  const [seancesEnseignants, setSeancesEnseignants] = useState([
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
  ]);

  const afficherNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleValidationInscription = (e) => {
    e.preventDefault();
    if (formInscription.secteurEnseignement === 'Public' && formInscription.typeStatutPublic === 'Titulaire' && !formInscription.numeroMatricule.trim()) {
      afficherNotification("Veuillez renseigner votre numéro matricule.");
      return;
    }
    setInfosCenseur(prev => ({ ...prev, ...formInscription }));
    etapeSetParcours('affiliation');
    afficherNotification("✅ Compte créé avec succès ! Veuillez maintenant procéder à l'affiliation.");
  };

  // Synchronisation des modifications faites depuis le Dashboard (modale Profil)
  const handleSauvegarderProfil = (e) => {
    e.preventDefault();
    setInfosCenseur(formProfil);
    setModalProfilOuvert(false);
    afficherNotification("Profil du censeur mis à jour avec succès !");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormProfil(prev => ({ ...prev, photoProfil: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const soumettreAffiliationCenseur = (e) => {
    e.preventDefault();
    if (!infosCenseur.etablissementSaisi.trim()) {
      afficherNotification("Veuillez indiquer le nom de l'établissement.");
      return;
    }

    setInfosCenseur(prev => ({ ...prev, demandeSoumise: true }));
    afficherNotification("🚀 Demande d'affiliation transmise au Chef d'Établissement pour validation !");
  };

  const genererClassesParLot = (e) => {
    e.preventDefault();
    let nouvellesClasses = [];
    const estLycee = ['2nde', '1ère', 'Terminale'].includes(niveauLot);

    if (estLycee) {
      Object.entries(seriesLyceeConfig).forEach(([serie, config]) => {
        if (config.active && config.nombre > 0) {
          for (let i = 1; i <= parseInt(config.nombre); i++) {
            const suffixe = styleAppellation === 'lettre' ? String.fromCharCode(64 + i) : i;
            nouvellesClasses.push({
              id: Date.now() + Math.random(),
              nom: `${niveauLot} ${serie}${suffixe}`,
              niveau: niveauLot
            });
          }
        }
      });
    } else {
      for (let i = 1; i <= parseInt(nombreClassesLot); i++) {
        const suffixe = styleAppellation === 'lettre' ? String.fromCharCode(64 + i) : i;
        nouvellesClasses.push({
          id: Date.now() + Math.random(),
          nom: `${niveauLot} ${suffixe}`,
          niveau: niveauLot
        });
      }
    }

    setClassesEtablissement(prev => [...prev, ...nouvellesClasses]);
    setModalCreationClasse(false);
    afficherNotification(`✨ ${nouvellesClasses.length} classes générées avec succès !`);
  };

  const ajouterClasseUnitaire = (e) => {
    e.preventDefault();
    if (!nomNouvelleClasse.trim()) return;

    setClassesEtablissement(prev => [...prev, { id: Date.now(), nom: nomNouvelleClasse.trim(), niveau: niveauNouvelleClasse }]);
    setNomNouvelleClasse('');
    setModalCreationClasse(false);
    afficherNotification("Classe officielle créée avec succès !");
  };

  const enregistrerModificationClasse = (e) => {
    e.preventDefault();
    if (!modalEditionClasse.data || !nomClasseModif.trim()) return;

    const idCible = modalEditionClasse.data.id;
    setClassesEtablissement(prev => prev.map(cls => cls.id === idCible ? { ...cls, nom: nomClasseModif.trim(), niveau: niveauClasseModif } : cls));
    setModalEditionClasse({ ouvert: false, data: null });
    afficherNotification("Classe modifiée avec succès !");
  };

  const confirmerSuppressionClasse = () => {
    if (!modalSuppressionClasse.data) return;
    setClassesEtablissement(prev => prev.filter(c => c.id !== modalSuppressionClasse.data.id));
    setModalSuppressionClasse({ ouvert: false, data: null });
    afficherNotification("Classe supprimée du répertoire officiel.");
  };

  const validerSeanceUnitaire = (id) => {
    setSeancesEnseignants(prev => prev.filter(s => s.id !== id));
    afficherNotification("Fiche validée avec succès !");
  };

  const totalSeancesEnAttente = seancesEnseignants.length;
  const totalAffiliationsEnAttente = demandesAffiliationEnseignants.filter(e => e.statutEcole === 'En attente' || e.statutClasse === 'En attente').length;
  const totalRetataires = 1;

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
        .fond-modale { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .pastille-alerte { background-color: #ef4444; color: white; padding: 2px 6px; border-radius: 999px; font-size: 10px; font-weight: 700; }
      `}</style>

      {/* NAVBAR SUPÉRIEURE CENSEUR */}
      {etapeParcours === 'dashboard' && infosCenseur.affilieValide && (
        <header style={styles.darkNavbar}>
          <div style={styles.topBarMainRow}>
            <h1 style={styles.navbarAppTitle}>Poste de Commandement Pédagogique ({infosCenseur.etablissementSaisi})</h1>
          </div>

          <div style={styles.bottomBarRow}>
            <div style={{ position: 'relative' }} ref={profilRef}>
              <button onClick={() => setProfilOuvert(!profilOuvert)} style={styles.navbarTeacherClickableBlock}>
                <div style={styles.avatarNavbarContainer}>
                  {infosCenseur.photoProfil ? (
                    <img src={infosCenseur.photoProfil} alt="Censeur" style={styles.avatarNavbarImg} />
                  ) : (
                    <div style={styles.avatarNavbarPlaceholder}>👔</div>
                  )}
                </div>
                <div style={styles.navbarTeacherInfo}>
                  <span style={styles.navbarTeacherName}>{infosCenseur.civilite} {infosCenseur.nom} {infosCenseur.prenoms}</span>
                  <span style={styles.navbarTeacherDetails}>{infosCenseur.titre} - Matière origine : {infosCenseur.matierePredilection}</span>
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>{profilOuvert ? '▲' : '▼'}</span>
              </button>

              {profilOuvert && (
                <div style={{ ...styles.notificationDropdown, width: '280px', left: 0, top: '50px' }} className="anim-apparition">
                  <div style={styles.dropdownHeader}>Compte Censeur</div>
                  <button onClick={() => { setFormProfil({ ...infosCenseur }); setModalProfilOuvert(true); setProfilOuvert(false); }} className="option-menu">
                    ⚙️ Modifier Profil, Civilités & Matière
                  </button>
                </div>
              )}
            </div>

            <div style={styles.navActionsRight}>
              <div style={{ position: 'relative' }} ref={menuRef}>
                <button onClick={() => setMenuOuvert(!menuOuvert)} style={styles.navDarkBtn}>
                  <span>🎛️ Navigation Pédagogique</span>
                  {(totalSeancesEnAttente > 0 || totalAffiliationsEnAttente > 0) && (
                    <span className="pastille-alerte">{totalSeancesEnAttente + totalAffiliationsEnAttente}</span>
                  )}
                  <span style={{ fontSize: '10px' }}>{menuOuvert ? '▲' : '▼'}</span>
                </button>
                {menuOuvert && (
                  <div style={styles.multitaskDropdown} className="anim-apparition">
                    <button onClick={() => { setOngletActif('flux'); setMenuOuvert(false); }} className={`option-menu ${ongletActif === 'flux' ? 'actif' : ''}`}>📊 Tableau de Bord Global</button>
                    <button onClick={() => { setOngletActif('validation'); setMenuOuvert(false); }} className={`option-menu ${ongletActif === 'validation' ? 'actif' : ''}`}>📖 Validation des Fiches ({totalSeancesEnAttente})</button>
                    <button onClick={() => { setOngletActif('relances'); setMenuOuvert(false); }} className={`option-menu ${ongletActif === 'relances' ? 'actif' : ''}`}>⚠️ Retataires Semaine ({totalRetataires})</button>
                    <button onClick={() => { setOngletActif('classes'); setMenuOuvert(false); }} className={`option-menu ${ongletActif === 'classes' ? 'actif' : ''}`}>🏫 Répertoire des Classes ({classesEtablissement.length})</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* CONTENU PRINCIPAL */}
      <main style={styles.mainContentBody}>
        {notification && (
          <div style={styles.toastContainer} className="anim-apparition">
            <div style={styles.toastSuccess}>{notification}</div>
          </div>
        )}

        {/* --- ÉTAPE 1 : CRÉATION DU COMPTE INITIAL (AVEC TOUTES LES CIVILITÉS ET MATIÈRE DE PRÉDILECTION) --- */}
        {etapeParcours === 'inscription' && (
          <div style={{ maxWidth: '580px', margin: '20px auto', backgroundColor: '#ffffff', padding: '36px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }} className="anim-apparition">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '40px' }}>📝</span>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '10px 0 6px 0' }}>Création de Compte Censeur</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Renseignez vos civilités et votre discipline d'origine pour les statistiques de l'établissement.
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
                  <input type="text" value={formInscription.nom} onChange={(e) => setFormInscription({...formInscription, nom: e.target.value})} placeholder="Ex: Koné" className="champ-saisie" required />
                </div>
              </div>

              <div>
                <label style={styles.label}>Prénoms</label>
                <input type="text" value={formInscription.prenoms} onChange={(e) => setFormInscription({...formInscription, prenoms: e.target.value})} placeholder="Ex: Bernard" className="champ-saisie" required />
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
                  <label style={styles.label}>Matière de prédilection (Origine)</label>
                  <input type="text" value={formInscription.matierePredilection} onChange={(e) => setFormInscription({...formInscription, matierePredilection: e.target.value})} placeholder="Ex: Mathématiques, EPS..." className="champ-saisie" required />
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

              <button type="submit" className="bouton bouton-principal" style={{ marginTop: '10px', backgroundColor: '#0f172a', padding: '12px' }}>
                Valider et continuer vers l'affiliation
              </button>
            </form>
          </div>
        )}

        {/* --- ÉTAPE 2 : AFFILIATION ÉTABLISSEMENT --- */}
        {etapeParcours === 'affiliation' && !infosCenseur.affilieValide && (
          <div style={{ maxWidth: '580px', margin: '40px auto', backgroundColor: '#ffffff', padding: '36px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }} className="anim-apparition">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '40px' }}>👔</span>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '10px 0 6px 0' }}>Affiliation Établissement</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Bonjour {infosCenseur.civilite} {infosCenseur.nom}, veuillez rattacher votre profil à votre école.
              </p>
            </div>

            {infosCenseur.demandeSoumise ? (
              <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                <h3 style={{ color: '#166534', margin: '0 0 6px 0' }}>⏳ Demande transmise (En attente de validation)</h3>
                <p style={{ fontSize: '13px', color: '#15803d', margin: '0 0 16px 0' }}>
                  Votre demande d'affiliation pour l'établissement <strong>{infosCenseur.etablissementSaisi}</strong> est en attente d'approbation par le Chef d'Établissement.
                </p>

                <button 
                  onClick={() => {
                    setInfosCenseur(prev => ({ ...prev, affilieValide: true, demandeSoumise: false }));
                    etapeSetParcours('dashboard');
                    afficherNotification("🎉 Accord du Directeur reçu ! Bienvenue sur votre tableau de bord censeur.");
                  }} 
                  className="bouton bouton-succes" 
                  style={{ fontSize: '12px', marginBottom: '12px', width: '100%' }}
                >
                  ⚡ [Simulation] Valider l'affiliation côté Chef d'Établissement
                </button>

                <button 
                  onClick={() => setInfosCenseur(prev => ({ ...prev, demandeSoumise: false }))} 
                  className="bouton bouton-secondaire" 
                  style={{ fontSize: '12px', width: '100%' }}
                >
                  Modifier mon choix d'établissement
                </button>
              </div>
            ) : (
              <form onSubmit={soumettreAffiliationCenseur} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <label style={styles.label}>Nom de l'établissement souhaité ({infosCenseur.ville})</label>
                  <input 
                    type="text" 
                    value={infosCenseur.etablissementSaisi} 
                    onChange={(e) => setInfosCenseur({ ...infosCenseur, etablissementSaisi: e.target.value })} 
                    placeholder="Tapez le nom de l'établissement..." 
                    className="champ-saisie" 
                    style={{ backgroundColor: '#fefce8' }}
                    required 
                  />

                  {infosCenseur.etablissementSaisi.trim() !== '' && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto', zIndex: 100, marginTop: '4px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                      {infosCenseur.etablissementsDisponibles
                        .filter(e => e.toLowerCase().includes(infosCenseur.etablissementSaisi.toLowerCase()))
                        .map((etab, idx) => (
                          <div 
                            key={idx}
                            onClick={() => setInfosCenseur({ ...infosCenseur, etablissementSaisi: etab })}
                            style={{ padding: '10px 14px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                          >
                            🏫 <strong>{etab}</strong>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                  💡 <strong>Rappel :</strong> Un établissement peut compter plusieurs censeurs. Aucune sélection de classe n'est requise ici pour vous laisser une liberté totale de supervision collaborative.
                </div>

                <button type="submit" className="bouton bouton-principal" style={{ width: '100%', backgroundColor: '#0f172a', padding: '12px' }}>
                  Soumettre la demande d'affiliation au Directeur
                </button>
              </form>
            )}
          </div>
        )}

        {/* --- ÉTAPE 3 : TABLEAU DE BORD GLOBAL DU CENSEUR --- */}
        {etapeParcours === 'dashboard' && infosCenseur.affilieValide && (
          <div key={ongletActif} className="anim-apparition">
            
            {/* MODALE CRÉATION CLASSES */}
            {modalCreationClasse && (
              <div className="fond-modale anim-apparition">
                <div style={{ ...styles.modalCard, width: '480px' }} className="anim-modale">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a' }}>➕ Création des Classes Officielles</h3>
                    <button onClick={() => setModalCreationClasse(false)} className="bouton bouton-secondaire" style={{ padding: '4px 8px' }}>✕</button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button type="button" onClick={() => setModeCreation('lot')} className={`bouton ${modeCreation === 'lot' ? 'bouton-principal' : 'bouton-secondaire'}`} style={{ flex: 1, fontSize: '12px' }}>
                      ⚡ Génération par Lot (Auto)
                    </button>
                    <button type="button" onClick={() => setModeCreation('unitaire')} className={`bouton ${modeCreation === 'unitaire' ? 'bouton-principal' : 'bouton-secondaire'}`} style={{ flex: 1, fontSize: '12px' }}>
                      ✏️ Création Unitaire
                    </button>
                  </div>

                  {modeCreation === 'lot' ? (
                    <form onSubmit={genererClassesParLot} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={styles.label}>Niveau d'enseignement</label>
                        <select value={niveauLot} onChange={(e) => setNiveauLot(e.target.value)} className="champ-saisie">
                          <option value="6ème">6ème</option>
                          <option value="5ème">5ème</option>
                          <option value="4ème">4ème</option>
                          <option value="3ème">3ème</option>
                          <option value="2nde">2nde (Lycée)</option>
                          <option value="1ère">1ère (Lycée)</option>
                          <option value="Terminale">Terminale (Lycée)</option>
                        </select>
                      </div>

                      {['2nde', '1ère', 'Terminale'].includes(niveauLot) ? (
                        <div>
                          <label style={styles.label}>Précisez le nombre de classes pour chaque série :</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                            {Object.keys(seriesLyceeConfig).map(serie => (
                              <div key={serie} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={seriesLyceeConfig[serie].active}
                                    onChange={(e) => {
                                      setSeriesLyceeConfig({
                                        ...seriesLyceeConfig,
                                        [serie]: { ...seriesLyceeConfig[serie], active: e.target.checked }
                                      });
                                    }}
                                  />
                                  Série {serie}
                                </label>
                                {seriesLyceeConfig[serie].active && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>Classes :</span>
                                    <input 
                                      type="number" 
                                      min="1" 
                                      max="10" 
                                      value={seriesLyceeConfig[serie].nombre}
                                      onChange={(e) => {
                                        setSeriesLyceeConfig({
                                          ...seriesLyceeConfig,
                                          [serie]: { ...seriesLyceeConfig[serie], nombre: parseInt(e.target.value) || 1 }
                                        });
                                      }}
                                      className="champ-saisie"
                                      style={{ width: '70px', padding: '4px 8px' }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label style={styles.label}>Nombre de classes</label>
                          <input type="number" min="1" max="20" value={nombreClassesLot} onChange={(e) => setNombreClassesLot(e.target.value)} className="champ-saisie" required />
                        </div>
                      )}

                      <div>
                        <label style={styles.label}>Format d'appellation</label>
                        <select value={styleAppellation} onChange={(e) => setStyleAppellation(e.target.value)} className="champ-saisie">
                          <option value="lettre">Lettres (A, B, C...)</option>
                          <option value="chiffre">Chiffres (1, 2, 3...)</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                        <button type="button" onClick={() => setModalCreationClasse(false)} className="bouton bouton-secondaire">Annuler</button>
                        <button type="submit" className="bouton bouton-principal">Générer</button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={ajouterClasseUnitaire} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={styles.label}>Nom exact de la classe</label>
                        <input type="text" value={nomNouvelleClasse} onChange={(e) => setNomNouvelleClasse(e.target.value)} placeholder="Ex: 6ème A..." className="champ-saisie" required />
                      </div>
                      <div>
                        <label style={styles.label}>Niveau</label>
                        <select value={niveauNouvelleClasse} onChange={(e) => setNiveauNouvelleClasse(e.target.value)} className="champ-saisie">
                          <option value="6ème">6ème</option>
                          <option value="5ème">5ème</option>
                          <option value="4ème">4ème</option>
                          <option value="3ème">3ème</option>
                          <option value="2nde">2nde</option>
                          <option value="1ère">1ère</option>
                          <option value="Terminale">Terminale</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                        <button type="button" onClick={() => setModalCreationClasse(false)} className="bouton bouton-secondaire">Annuler</button>
                        <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* MODALE MODIFICATION PROFIL CENSEUR DEPUIS LE DASHBOARD */}
            {modalProfilOuvert && (
              <div className="fond-modale anim-apparition">
                <div style={{ ...styles.modalCard, width: '480px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-modale">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a' }}>⚙️ Modifier le Profil & Civilités</h3>
                    <button onClick={() => setModalProfilOuvert(false)} className="bouton bouton-secondaire" style={{ padding: '4px 8px' }}>✕</button>
                  </div>

                  <form onSubmit={handleSauvegarderProfil} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                        {formProfil.photoProfil ? (
                          <img src={formProfil.photoProfil} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '28px' }}>👔</span>
                        )}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>Photo (Fichier)</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ fontSize: '11px', cursor: 'pointer' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                      <div>
                        <label style={styles.label}>Civilité</label>
                        <select value={formProfil.civilite} onChange={(e) => setFormProfil({ ...formProfil, civilite: e.target.value })} className="champ-saisie">
                          <option value="M.">M.</option>
                          <option value="Mme">Mme</option>
                          <option value="Dr">Dr</option>
                          <option value="Pr">Pr</option>
                        </select>
                      </div>
                      <div>
                        <label style={styles.label}>Nom</label>
                        <input type="text" value={formProfil.nom} onChange={(e) => setFormProfil({ ...formProfil, nom: e.target.value })} className="champ-saisie" required />
                      </div>
                    </div>

                    <div><label style={styles.label}>Prénoms</label><input type="text" value={formProfil.prenoms} onChange={(e) => setFormProfil({ ...formProfil, prenoms: e.target.value })} className="champ-saisie" required /></div>
                    <div><label style={styles.label}>Titre / Fonction</label><input type="text" value={formProfil.titre} onChange={(e) => setFormProfil({ ...formProfil, titre: e.target.value })} className="champ-saisie" required /></div>
                    <div><label style={styles.label}>Téléphone / WhatsApp</label><input type="text" value={formProfil.telephone} onChange={(e) => setFormProfil({ ...formProfil, telephone: e.target.value })} className="champ-saisie" required /></div>
                    
                    <div>
                      <label style={styles.label}>Matière de prédilection (Origine)</label>
                      <input type="text" value={formProfil.matierePredilection} onChange={(e) => setFormProfil({ ...formProfil, matierePredilection: e.target.value })} className="champ-saisie" required />
                    </div>

                    {/* SECTION STATUT PUBLIC / PRIVÉ & MATRICULE */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={styles.label}>Secteur d'enseignement</label>
                        <select 
                          value={formProfil.secteurEnseignement} 
                          onChange={(e) => setFormProfil({ ...formProfil, secteurEnseignement: e.target.value })} 
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
                              onChange={(e) => setFormProfil({ ...formProfil, typeStatutPublic: e.target.value })} 
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
                                onChange={(e) => setFormProfil({ ...formProfil, numeroMatricule: e.target.value })} 
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

                    <div><label style={styles.label}>Établissement</label><input type="text" value={formProfil.etablissementSaisi} onChange={(e) => setFormProfil({ ...formProfil, etablissementSaisi: e.target.value })} className="champ-saisie" required /></div>
                    <div><label style={styles.label}>Ville</label><input type="text" value={formProfil.ville} onChange={(e) => setFormProfil({ ...formProfil, ville: e.target.value })} className="champ-saisie" required /></div>
                    <div><label style={styles.label}>Email professionnel</label><input type="email" value={formProfil.email} onChange={(e) => setFormProfil({ ...formProfil, email: e.target.value })} className="champ-saisie" required /></div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                      <button type="button" onClick={() => setModalProfilOuvert(false)} className="bouton bouton-secondaire">Annuler</button>
                      <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ONGLET 1 : TABLEAU DE BORD GLOBAL */}
            {ongletActif === 'flux' && (
              <div style={styles.sectionContainer}>
                <div style={styles.kpiGrid}>
                  <div style={styles.statCard} onClick={() => setOngletActif('validation')} role="button">
                    <h4 style={styles.statTitle}>Fiches en Attente de Validation</h4>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: totalSeancesEnAttente > 0 ? '#d97706' : '#166534' }}>{totalSeancesEnAttente} à examiner</div>
                    <p style={styles.statSub}>Consultation ou validation multiple</p>
                  </div>
                  <div style={styles.statCard} onClick={() => setOngletActif('relances')} role="button">
                    <h4 style={styles.statTitle}>Enseignants Retataires (Semaine)</h4>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: totalRetataires > 0 ? '#dc2626' : '#166534' }}>{totalRetataires} sans fiches</div>
                    <p style={styles.statSub}>Rappels par matière et classe</p>
                  </div>
                  <div style={styles.statCard} onClick={() => setOngletActif('classes')} role="button">
                    <h4 style={styles.statTitle}>Répertoire des Classes</h4>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}>{classesEtablissement.length} classe(s)</div>
                    <p style={styles.statSub}>Base centralisée de l'école</p>
                  </div>
                </div>

                <div style={styles.cardWide}>
                  <h3 style={styles.cardTitle}>⚡ Poste de Commandement Pédagogique ({infosCenseur.etablissementSaisi})</h3>
                  <p style={styles.cardSubtitle}>Pilotez les activités, contrôlez les fiches et validez les professeurs de l'établissement.</p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <button onClick={() => setOngletActif('validation')} className="bouton bouton-principal">📖 Examiner les fiches en attente</button>
                    <button onClick={() => setOngletActif('classes')} className="bouton" style={{ backgroundColor: '#7c3aed', color: 'white' }}>🏫 Gérer les classes officielles</button>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET : CLASSES OFFICIELLES */}
            {ongletActif === 'classes' && (
              <div style={styles.cardWide}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={styles.cardTitle}>🏫 Répertoire Officiel des Classes</h3>
                    <p style={styles.cardSubtitle}>Classes configurées pour l'établissement. Les enseignants y piochent directement leurs classes en charge.</p>
                  </div>
                  <button onClick={() => setModalCreationClasse(true)} className="bouton bouton-principal">
                    ➕ Créer ou générer des classes
                  </button>
                </div>

                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.trHead}>
                        <th style={styles.th}>Appellation</th>
                        <th style={styles.th}>Niveau</th>
                        <th style={styles.th}>Statut</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classesEtablissement.map((cls) => (
                        <tr key={cls.id} className="ligne-tableau">
                          <td style={styles.td}><strong style={{ color: '#2563eb' }}>{cls.nom}</strong></td>
                          <td style={styles.td}><span style={styles.badgeNiveau}>{cls.niveau}</span></td>
                          <td style={styles.td}><span style={{ color: '#166534', fontWeight: '600', fontSize: '12px' }}>● Actif</span></td>
                          <td style={styles.td}>
                            <button onClick={() => setModalSuppressionClasse({ ouvert: true, data: cls })} className="bouton bouton-danger" style={{ padding: '6px 10px', fontSize: '11px' }}>
                              🗑️ Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ONGLET : VALIDATION DES FICHES */}
            {ongletActif === 'validation' && (
              <div style={styles.cardWide}>
                <h3 style={styles.cardTitle}>📖 Validation & Consultation des Fiches</h3>
                <p style={styles.cardSubtitle}>Examinez et validez les cahiers de texte soumis par le corps professoral.</p>
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.trHead}>
                        <th style={styles.th}>Enseignant</th>
                        <th style={styles.th}>Classe</th>
                        <th style={styles.th}>Séance</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seancesEnseignants.map(s => (
                        <tr key={s.id} className="ligne-tableau">
                          <td style={styles.td}><strong>{s.enseignantNom}</strong><br/><span style={{fontSize:'11px', color:'#64748b'}}>{s.matiere}</span></td>
                          <td style={styles.td}><span style={styles.badgeNiveau}>{s.classe}</span></td>
                          <td style={styles.td}>{s.titre}</td>
                          <td style={styles.td}>
                            <button onClick={() => validerSeanceUnitaire(s.id)} className="bouton bouton-principal" style={{ padding: '6px 10px', fontSize: '11px' }}>✓ Valider</button>
                          </td>
                        </tr>
                      ))}
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
  toastContainer: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 },
  toastSuccess: { backgroundColor: '#1e293b', color: '#f8fafc', padding: '14px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #334155' },
  sectionContainer: { display: 'flex', flexDirection: 'column', gap: '20px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' },
  statCard: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.2s' },
  statTitle: { fontSize: '13px', fontWeight: '600', color: '#64748b', margin: '0 0 8px 0' },
  statSub: { fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' },
  cardWide: { backgroundColor: '#ffffff', padding: '32px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' },
  cardTitle: { fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' },
  cardSubtitle: { fontSize: '12px', color: '#64748b', marginBottom: '20px' },
  badgeNiveau: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' },
  modalCard: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  tableContainer: { marginTop: '10px', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' },
  trHead: { borderBottom: '2px solid #e2e8f0', color: '#475569' },
  th: { padding: '12px', fontWeight: '600', fontSize: '13px' },
  td: { padding: '12px', color: '#334155' }
};
