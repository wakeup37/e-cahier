import React, { useState, useRef, useEffect } from 'react';

export default function ChefEtablissementDashboard() {
  // Étape du parcours : 'inscription', 'selection_etab', 'dashboard'
  const [etapeParcours, setEtapeParcours] = useState('inscription');
  const [ongletActif, setOngletActif] = useState('accueil');
  const [notification, setNotification] = useState('');

  // Gestion des menus déroulants
  const [menuNavigationOuvert, setMenuNavigationOuvert] = useState(false);
  const [menuProfilOuvert, setMenuProfilOuvert] = useState(false);
  const menuRef = useRef(null);
  const profilRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuNavigationOuvert(false);
      if (profilRef.current && !profilRef.current.contains(event.target)) setMenuProfilOuvert(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formulaire d'inscription initial (Civilités + Matière de prédilection + Statut)
  const [formInscription, setFormInscription] = useState({
    civilite: 'M.',
    nom: 'Diaby',
    prenoms: 'Oumar',
    titre: 'Chef d\'Établissement / Proviseur',
    dateNaissance: '1978-09-20',
    telephone: '+225 0700000000',
    ville: 'Abidjan',
    email: 'direction@ashport.edu',
    anciennete: 'Plus de 10 ans',
    matierePredilection: 'Histoire-Géographie', // Discipline d'origine pour les statistiques
    secteurEnseignement: 'Public', // 'Public' ou 'Privé'
    typeStatutPublic: 'Titulaire', // 'Titulaire', 'En attente d’un matricule', 'Contractuel'
    numeroMatricule: 'MT-112233',
    motDePasse: ''
  });

  // Profil du Chef d'établissement après inscription
  const [infosDirection, setInfosDirection] = useState({
    ...formInscription,
    photoProfil: ''
  });

  const [modalProfilActif, setModalProfilActif] = useState(false);
  const [formProfil, setFormProfil] = useState({ ...infosDirection });

  // --- BASE DES ÉTABLISSEMENTS EXISTANTS (ENTITÉS) ---
  const [etablissementsExistants, setEtablissementsExistants] = useState([
    { id: 1, nom: 'Ashport', ville: 'Abidjan', commune: 'Cocody', type: 'Lycée', statut: 'Privé', code: 'ASH-2026', chefActuel: 'M. Diaby Oumar', forfaitActif: 'Forfait Standard (Jusqu’à 20 classes)', limiteClassesMax: 20, classesActuellementCreees: 14 },
    { id: 2, nom: 'Lycée Moderne de Yopougon', ville: 'Abidjan', commune: 'Yopougon', type: 'Lycée', statut: 'Public', code: 'LMY-2026', chefActuel: 'Mme Koné', forfaitActif: 'Forfait Grand Complexe (Jusqu’à 50 classes)', limiteClassesMax: 50, classesActuellementCreees: 30 }
  ]);

  // État de rattachement actuel du Chef d'établissement à une entité école
  const [monEtablissement, setMonEtablissement] = useState(null);

  // 'menu_choix' (par défaut), 'creation', ou 'rattachement'
  const [etapeSelection, setEtapeSelection] = useState('menu_choix'); 
  const [rechercheFiltre, setRechercheFiltre] = useState('');

  // Formulaire de création d'un nouvel établissement
  const [formEtab, setFormEtab] = useState({
    nom: '',
    ville: infosDirection.ville,
    commune: '',
    type: 'Lycée',
    statut: 'Privé',
    nombreClasses: 20,
    code: 'ETAB-' + Math.floor(1000 + Math.random() * 9000)
  });

  const [modalEtablissementActif, setModalEtablissementActif] = useState(false);
  const [formEtablissement, setFormEtablissement] = useState({
    nomEtablissement: '',
    ville: infosDirection.ville,
    forfaitActif: 'Forfait Standard (Jusqu’à 20 classes)',
    limiteClassesMax: 20,
    classesActuellementCreees: 0
  });

  // --- GESTION DE L'ANNÉE SCOLAIRE & ARCHIVES ---
  const [anneeScolaireActive, setAnneeScolaireActive] = useState('2025-2026');
  const [activiteAutorisee, setActiviteAutorisee] = useState(true);
  const [archivesAnnuelles, setArchivesAnnuelles] = useState([
    { annee: '2024-2025', totalFiches: 1280, enseignantsTotal: 45, statut: 'Clôturée & Archivée' }
  ]);
  const [modalClotureActif, setModalClotureActif] = useState(false);
  const [nouvelleAnneeSaisie, setNouvelleAnneeSaisie] = useState('2027-2028');

  // Personnel & Affiliations
  const [personnel, setPersonnel] = useState([
    { id: 1, nom: 'M. Koné Bernard', role: 'Censeur', email: 'bernard.kone@ecole.edu', statut: 'Actif' },
    { id: 2, nom: 'Mme Touré Aminata', role: 'Enseignant (Mathématiques)', email: 'aminata.toure@ecole.edu', statut: 'Actif' }
  ]);

  const [demandesAffiliation, setDemandesAffiliation] = useState([
    { id: 101, nom: 'M. Bamba Ali', role: 'Censeur', email: 'ali.bamba@email.com', date: '02/08/2026', message: 'Suite à ma mutation, demande de rattachement à l\'établissement.' }
  ]);

  // Communications et Annonces
  const [annonces, setAnnonces] = useState([
    { id: 1, date: '01/08/2026', titre: 'Conseil de rentrée', contenu: 'Réunion générale du corps professoral prévue le 15 août en salle des professeurs.', destinataire: 'Tout le personnel' }
  ]);

  const [modalAnnonceActif, setModalAnnonceActif] = useState(false);
  const [formAnnonce, setFormAnnonce] = useState({ titre: '', contenu: '', destinataire: 'Tout le personnel' });

  const afficherNotification = (texte) => {
    setNotification(texte);
    setTimeout(() => setNotification(''), 5000);
  };

  const handleValidationInscription = (e) => {
    e.preventDefault();
    if (formInscription.secteurEnseignement === 'Public' && formInscription.typeStatutPublic === 'Titulaire' && !formInscription.numeroMatricule.trim()) {
      afficherNotification("❌ Veuillez renseigner votre numéro matricule.");
      return;
    }
    setInfosDirection(prev => ({ ...prev, ...formInscription }));
    setEtapeParcours('selection_etab');
    afficherNotification("✅ Compte créé avec succès ! Veuillez maintenant configurer ou rattacher votre établissement.");
  };

  const enregistrerProfil = (e) => {
    e.preventDefault();
    setInfosDirection(formProfil);
    setModalProfilActif(false);
    afficherNotification("Les modifications de votre profil ont été enregistrées avec succès.");
  };

  const chargerPhoto = (e) => {
    const fichier = e.target.files[0];
    if (fichier) {
      const lecteur = new FileReader();
      lecteur.onloadend = () => setFormProfil(prev => ({ ...prev, photoProfil: lecteur.result }));
      lecteur.readAsDataURL(fichier);
    }
  };

  const soumettreCreationEtablissement = (e) => {
    e.preventDefault();
    const nomSaisi = formEtab.nom.trim().toLowerCase();
    const villeSaisie = formEtab.ville.trim().toLowerCase();

    const conflit = etablissementsExistants.find(
      etab => etab.nom.toLowerCase() === nomSaisi && etab.ville.toLowerCase() === villeSaisie
    );

    if (conflit) {
      afficherNotification(`❌ Un établissement nommé "${formEtab.nom}" existe déjà à ${formEtab.ville}.`);
      return;
    }

    const nbClasses = parseInt(formEtab.nombreClasses) || 20;
    let forfaitNom = nbClasses <= 20 ? 'Forfait Standard (Jusqu’à 20 classes)' : nbClasses <= 50 ? 'Forfait Grand Complexe (Jusqu’à 50 classes)' : 'Forfait Illimité (Établissements majeurs)';

    const nouvelEtab = {
      id: Date.now(),
      nom: formEtab.nom,
      ville: formEtab.ville,
      commune: formEtab.commune,
      type: formEtab.type,
      statut: formEtab.statut,
      code: 'ASH-' + Math.floor(1000 + Math.random() * 9000),
      forfaitActif: forfaitNom,
      limiteClassesMax: nbClasses,
      classesActuellementCreees: 0,
      chefActuel: `${infosDirection.civilite} ${infosDirection.nom} ${infosDirection.prenoms}`
    };

    setEtablissementsExistants([...etablissementsExistants, nouvelEtab]);
    setMonEtablissement(nouvelEtab);
    setFormEtablissement({
      nomEtablissement: nouvelEtab.nom,
      ville: nouvelEtab.ville,
      forfaitActif: nouvelEtab.forfaitActif,
      limiteClassesMax: nouvelEtab.limiteClassesMax,
      classesActuellementCreees: nouvelEtab.classesActuellementCreees
    });
    setEtapeParcours('dashboard');
    afficherNotification(`💳 Paiement validé ! Établissement "${nouvelEtab.nom}" créé avec un quota de ${nbClasses} classes.`);
  };

  const rattacherEtablissementExistant = (etabCible) => {
    const nomCompletChef = `${infosDirection.civilite} ${infosDirection.nom} ${infosDirection.prenoms}`;
    if (etabCible.chefActuel && etabCible.chefActuel !== nomCompletChef) {
      const confirmation = window.confirm(`Cet établissement est actuellement géré par ${etabCible.chefActuel}. S'agit-il d'une mutation ou d'une reprise officielle ?`);
      if (!confirmation) return;
    }

    setEtablissementsExistants(etablissementsExistants.map(e => e.id === etabCible.id ? { ...e, chefActuel: nomCompletChef } : e));
    setMonEtablissement(etabCible);
    setFormEtablissement({
      nomEtablissement: etabCible.nom,
      ville: etabCible.ville,
      forfaitActif: etabCible.forfaitActif || 'Forfait Standard (Jusqu’à 20 classes)',
      limiteClassesMax: etabCible.limiteClassesMax || 20,
      classesActuellementCreees: etabCible.classesActuellementCreees || 0
    });
    setEtapeParcours('dashboard');
    afficherNotification(`🔄 Connexion réussie à l'établissement "${etabCible.nom}" (${etabCible.ville}).`);
  };

  const quitterEtablissement = () => {
    if (window.confirm("Voulez-vous vous détacher de cet établissement ? L'entité restera active pour permettre à un autre chef d'établissement de s'y connecter.")) {
      setMonEtablissement(null);
      setEtapeSelection('menu_choix');
      setEtapeParcours('selection_etab');
      afficherNotification("🚪 Vous avez quitté l'établissement. L'entité est désormais libre pour une autre direction.");
    }
  };

  const enregistrerEtablissement = (e) => {
    e.preventDefault();
    let limite = 20;
    if (formEtablissement.forfaitActif.includes('Grand')) limite = 50;
    if (formEtablissement.forfaitActif.includes('Illimité')) limite = 150;

    const etabMisAJour = {
      ...monEtablissement,
      nom: formEtablissement.nomEtablissement,
      ville: formEtablissement.ville,
      forfaitActif: formEtablissement.forfaitActif,
      limiteClassesMax: limite
    };

    setMonEtablissement(etabMisAJour);
    setModalEtablissementActif(false);
    afficherNotification(`💳 Forfait mis à jour avec succès : Quota étendu à ${limite} classes.`);
  };

  const gererOuvertureAnnee = (e) => {
    e.preventDefault();
    if (!nouvelleAnneeSaisie.trim()) return;
    setAnneeScolaireActive(nouvelleAnneeSaisie);
    setActiviteAutorisee(true);
    setModalClotureActif(false);
    afficherNotification(`🚀 Rentrée scolaire ${nouvelleAnneeSaisie} ouverte !`);
  };

  const cloturerAnneeScolaire = () => {
    const archiveActuelle = { annee: anneeScolaireActive, totalFiches: 142, enseignantsTotal: personnel.length, statut: 'Clôturée & Archivée' };
    setArchivesAnnuelles([archiveActuelle, ...archivesAnnuelles]);
    setActiviteAutorisee(false);
    setModalClotureActif(false);
    afficherNotification(`🏁 L'année scolaire ${anneeScolaireActive} a été clôturée.`);
  };

  const approuverAffiliation = (demande) => {
    setPersonnel([...personnel, { id: demande.id, nom: demande.nom, role: demande.role, email: demande.email, statut: 'Actif' }]);
    setDemandesAffiliation(demandesAffiliation.filter(d => d.id !== demande.id));
    afficherNotification(`✅ Affiliation validée pour ${demande.nom}.`);
  };

  const rejeterAffiliation = (id) => {
    setDemandesAffiliation(demandesAffiliation.filter(d => d.id !== id));
    afficherNotification("❌ Demande d'affiliation rejetée.");
  };

  const publierAnnonce = (e) => {
    e.preventDefault();
    setAnnonces([{ id: Date.now(), date: new Date().toLocaleDateString(), ...formAnnonce }, ...annonces]);
    setModalAnnonceActif(false);
    setFormAnnonce({ titre: '', contenu: '', destinataire: 'Tout le personnel' });
    afficherNotification("Annonce officielle diffusée.");
  };

  const etablissementsFiltresParVille = etablissementsExistants.filter(
    etab => etab.ville.toLowerCase() === infosDirection.ville.toLowerCase() &&
            etab.nom.toLowerCase().includes(rechercheFiltre.toLowerCase())
  );

  return (
    <div style={styles.conteneurGlobal}>
      <style>{`
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        @keyframes apparition { from { opacity: 0; } to { opacity: 1; } }
        @keyframes glissement { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .anim-apparition { animation: apparition 0.3s ease-out; }
        .anim-modale { animation: glissement 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .bouton { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: none; transition: all 0.2s ease; }
        .bouton-principal { background-color: #4f46e5; color: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .bouton-principal:hover { background-color: #4338ca; transform: translateY(-1px); }
        .bouton-succes { background-color: #16a34a; color: white; }
        .bouton-succes:hover { background-color: #15803d; }
        .bouton-danger { background-color: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
        .bouton-danger:hover { background-color: #fecaca; }
        .bouton-secondaire { background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
        .bouton-secondaire:hover { background-color: #e2e8f0; color: #0f172a; }
        .champ-saisie { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; background-color: #fff; color: #1e293b; outline: none; }
        .champ-saisie:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15); }
        .option-menu { width: 100%; text-align: left; padding: 10px 16px; background: transparent; border: none; color: #334155; font-size: 13px; font-weight: 600; cursor: pointer; }
        .option-menu:hover { background-color: #f1f5f9; color: #0f172a; padding-left: 20px; }
        .option-menu.actif { background-color: #e0e7ff; color: #4338ca; }
        .fond-modale { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .ligne-tableau:hover { background-color: #f8fafc; }
        .pastille-alerte { background-color: #ef4444; color: white; padding: 2px 6px; border-radius: 999px; font-size: 10px; font-weight: 700; }
      `}</style>

      {/* EN-TÊTE DE L'ÉTABLISSEMENT (AFFICHÉ QUAND LE COMPTE EST CRÉÉ) */}
      {etapeParcours !== 'inscription' && (
        <header style={styles.enteteSuperieur}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={styles.iconeLogo}>🏛️</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: '#ffffff' }}>
                  {monEtablissement ? monEtablissement.nom : 'Espace Directeur (Non rattaché)'}
                </h1>
                {monEtablissement && (
                  <span style={{ fontSize: '11px', backgroundColor: activiteAutorisee ? '#065f46' : '#7f1d1d', color: '#ffffff', padding: '2px 8px', borderRadius: '99px', fontWeight: '700' }}>
                    📅 {anneeScolaireActive} ({activiteAutorisee ? 'Active 🟢' : 'Clôturée 🔴'})
                  </span>
                )}
              </div>
              <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                {monEtablissement ? `${monEtablissement.commune ? monEtablissement.commune + ', ' : ''}${monEtablissement.ville} • Code : ${monEtablissement.code}` : `Ville enregistrée : ${infosDirection.ville}`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            {monEtablissement && (
              <button onClick={quitterEtablissement} className="bouton bouton-danger" style={{ fontSize: '12px', padding: '7px 12px' }}>
                🚪 Quitter l'établissement
              </button>
            )}

            {monEtablissement && (
              <button onClick={() => { setFormEtablissement({ nomEtablissement: monEtablissement.nom, ville: monEtablissement.ville, forfaitActif: monEtablissement.forfaitActif || 'Forfait Standard (Jusqu’à 20 classes)', limiteClassesMax: monEtablissement.limiteClassesMax || 20, classesActuellementCreees: monEtablissement.classesActuellementCreees || 0 }); setModalEtablissementActif(true); }} className="bouton" style={{ backgroundColor: '#4338ca', color: '#ffffff', fontSize: '12px', padding: '7px 12px' }}>
                💳 Gérer / Upgrade Forfait
              </button>
            )}

            {/* COMPTE & PROFIL */}
            <div style={{ position: 'relative' }} ref={profilRef}>
              <button onClick={() => setMenuProfilOuvert(!menuProfilOuvert)} style={styles.boutonProfil}>
                <div style={styles.avatarConteneur}>
                  {infosDirection.photoProfil ? (
                    <img src={infosDirection.photoProfil} alt="Profil" style={styles.avatarImage} />
                  ) : (
                    <span>👑</span>
                  )}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#ffffff' }}>{infosDirection.civilite} {infosDirection.nom} {infosDirection.prenoms}</span>
                  <span style={{ display: 'block', fontSize: '10px', color: '#93c5fd' }}>Chef d'Établissement - Origine : {infosDirection.matierePredilection}</span>
                </div>
              </button>
              
              {menuProfilOuvert && (
                <div style={{ ...styles.menuDeroulant, width: '270px', right: 0, top: '50px' }} className="anim-apparition">
                  <div style={styles.enTeteMenu}>Mon Compte</div>
                  <button onClick={() => { setFormProfil({ ...infosDirection }); setModalProfilActif(true); setMenuProfilOuvert(false); }} className="option-menu">
                    ⚙️ Modifier profil, civilités & matière
                  </button>
                </div>
              )}
            </div>

            {/* MENU DE NAVIGATION PRINCIPAL */}
            {monEtablissement && (
              <div style={{ position: 'relative' }} ref={menuRef}>
                <button onClick={() => setMenuNavigationOuvert(!menuNavigationOuvert)} className="bouton" style={{ backgroundColor: '#312e81', color: 'white' }}>
                  <span>☰ Menu Principal</span>
                  {demandesAffiliation.length > 0 && <span className="pastille-alerte">{demandesAffiliation.length}</span>}
                </button>

                {menuNavigationOuvert && (
                  <div style={{ ...styles.menuDeroulant, width: '280px', right: 0, top: '48px' }} className="anim-apparition">
                    <div style={styles.enTeteMenu}>Espaces de Gestion</div>
                    <button onClick={() => { setOngletActif('accueil'); setMenuNavigationOuvert(false); }} className={`option-menu ${ongletActif === 'accueil' ? 'actif' : ''}`}>🏠 Tableau de Bord</button>
                    <button onClick={() => { setOngletActif('personnel'); setMenuNavigationOuvert(false); }} className={`option-menu ${ongletActif === 'personnel' ? 'actif' : ''}`}>👥 Personnel & Affiliations</button>
                    <button onClick={() => { setOngletActif('anneeScolaire'); setMenuNavigationOuvert(false); }} className={`option-menu ${ongletActif === 'anneeScolaire' ? 'actif' : ''}`}>⚙️ Gestion Année Scolaire</button>
                    <button onClick={() => { setOngletActif('statistiques'); setMenuNavigationOuvert(false); }} className={`option-menu ${ongletActif === 'statistiques' ? 'actif' : ''}`}>📊 Statistiques</button>
                    <button onClick={() => { setOngletActif('communications'); setMenuNavigationOuvert(false); }} className={`option-menu ${ongletActif === 'communications' ? 'actif' : ''}`}>📢 Communications</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
      )}

      {/* CORPS DE LA PAGE */}
      <main style={styles.corpsPrincipal}>
        {notification && (
          <div style={styles.conteneurNotification} className="anim-apparition">
            <div style={styles.texteNotification}>{notification}</div>
          </div>
        )}

        {/* --- ÉTAPE 1 : CRÉATION DE COMPTE INITIALE (CIVILITÉS + MATIÈRE DE PRÉDILECTION) --- */}
        {etapeParcours === 'inscription' && (
          <div style={{ maxWidth: '580px', margin: '20px auto', backgroundColor: '#ffffff', padding: '36px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }} className="anim-apparition">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '40px' }}>📝</span>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '10px 0 6px 0' }}>Création de Compte - Chef d'Établissement</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Renseignez vos civilités et votre discipline d'origine pour les statistiques de l'établissement[span_5](start_span)[span_5](end_span).
              </p>
            </div>

            <form onSubmit={handleValidationInscription} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={styles.libelleChamp}>Civilité</label>
                  <select value={formInscription.civilite} onChange={(e) => setFormInscription({...formInscription, civilite: e.target.value})} className="champ-saisie">
                    <option value="M.">M.</option>
                    <option value="Mme">Mme</option>
                    <option value="Dr">Dr</option>
                    <option value="Pr">Pr</option>
                  </select>
                </div>
                <div>
                  <label style={styles.libelleChamp}>Nom</label>
                  <input type="text" value={formInscription.nom} onChange={(e) => setFormInscription({...formInscription, nom: e.target.value})} placeholder="Ex: Diaby" className="champ-saisie" required />
                </div>
              </div>

              <div>
                <label style={styles.libelleChamp}>Prénoms</label>
                <input type="text" value={formInscription.prenoms} onChange={(e) => setFormInscription({...formInscription, prenoms: e.target.value})} placeholder="Ex: Oumar" className="champ-saisie" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={styles.libelleChamp}>Date de naissance</label>
                  <input type="date" value={formInscription.dateNaissance} onChange={(e) => setFormInscription({...formInscription, dateNaissance: e.target.value})} className="champ-saisie" required />
                </div>
                <div>
                  <label style={styles.libelleChamp}>Téléphone / WhatsApp</label>
                  <input type="text" value={formInscription.telephone} onChange={(e) => setFormInscription({...formInscription, telephone: e.target.value})} placeholder="+225..." className="champ-saisie" required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={styles.libelleChamp}>Matière de prédilection (Origine)</label>
                  <input type="text" value={formInscription.matierePredilection} onChange={(e) => setFormInscription({...formInscription, matierePredilection: e.target.value})} placeholder="Ex: Mathématiques, Histoire..." className="champ-saisie" required />
                </div>
                <div>
                  <label style={styles.libelleChamp}>Ancienneté</label>
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
                  <label style={styles.libelleChamp}>Secteur d'enseignement</label>
                  <select value={formInscription.secteurEnseignement} onChange={(e) => setFormInscription({...formInscription, secteurEnseignement: e.target.value})} className="champ-saisie">
                    <option value="Public">Public</option>
                    <option value="Privé">Privé</option>
                  </select>
                </div>

                {formInscription.secteurEnseignement === 'Public' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={styles.libelleChamp}>Statut dans le Public</label>
                      <select value={formInscription.typeStatutPublic} onChange={(e) => setFormInscription({...formInscription, typeStatutPublic: e.target.value})} className="champ-saisie">
                        <option value="Titulaire">Titulaire (Avec Matricule)</option>
                        <option value="En attente de matricule">En attente d’un matricule</option>
                        <option value="Contractuel">Contractuel</option>
                      </select>
                    </div>

                    {formInscription.typeStatutPublic === 'Titulaire' && (
                      <div>
                        <label style={styles.libelleChamp}>Numéro Matricule</label>
                        <input type="text" value={formInscription.numeroMatricule} onChange={(e) => setFormInscription({...formInscription, numeroMatricule: e.target.value})} placeholder="Ex: MT-XXXXXX" className="champ-saisie" required />
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
                <label style={styles.libelleChamp}>Email professionnel</label>
                <input type="email" value={formInscription.email} onChange={(e) => setFormInscription({...formInscription, email: e.target.value})} placeholder="nom@ecole.edu" className="champ-saisie" required />
              </div>

              <div>
                <label style={styles.libelleChamp}>Mot de passe</label>
                <input type="password" value={formInscription.motDePasse} onChange={(e) => setFormInscription({...formInscription, motDePasse: e.target.value})} placeholder="••••••••" className="champ-saisie" required />
              </div>

              <button type="submit" className="bouton bouton-principal" style={{ marginTop: '10px', padding: '12px' }}>
                Valider mon inscription et choisir mon établissement
              </button>
            </form>
          </div>
        )}

        {/* --- ÉTAPE 2 : SÉLECTION DE L'ÉTABLISSEMENT --- */}
        {etapeParcours === 'selection_etab' && !monEtablissement && (
          <div style={{ maxWidth: '650px', margin: '40px auto', backgroundColor: '#ffffff', padding: '36px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }} className="anim-apparition">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '40px' }}>🏫</span>
              <h2 style={{ fontSize: '20px', color: '#0f172a', margin: '10px 0 6px 0' }}>Bienvenue, {infosDirection.civilite} {infosDirection.nom}</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Votre compte est validé. Veuillez choisir une option pour rattacher votre direction à un établissement.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <button 
                onClick={() => setEtapeSelection('creation')} 
                className={`bouton ${etapeSelection === 'creation' ? 'bouton-principal' : 'bouton-secondaire'}`}
                style={{ flex: 1, padding: '12px' }}
              >
                ➕ Créer un établissement (Payant)
              </button>
              <button 
                onClick={() => setEtapeSelection('rattachement')} 
                className={`bouton ${etapeSelection === 'rattachement' ? 'bouton-principal' : 'bouton-secondaire'}`}
                style={{ flex: 1, padding: '12px' }}
              >
                🔄 Se connecter à un établissement existant
              </button>
            </div>

            {etapeSelection === 'creation' && (
              <form onSubmit={soumettreCreationEtablissement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="anim-apparition">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={styles.libelleChamp}>Nom de l'établissement</label>
                    <input type="text" placeholder="Ex: Lycée Moderne" value={formEtab.nom} onChange={e => setFormEtab({...formEtab, nom: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label style={styles.libelleChamp}>Ville</label>
                    <input type="text" value={formEtab.ville} onChange={e => setFormEtab({...formEtab, ville: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={styles.libelleChamp}>Commune / Quartier</label>
                    <input type="text" placeholder="Ex: Cocody, Yopougon..." value={formEtab.commune} onChange={e => setFormEtab({...formEtab, commune: e.target.value})} className="champ-saisie" required />
                  </div>
                  <div>
                    <label style={styles.libelleChamp}>Type d'établissement</label>
                    <select value={formEtab.type} onChange={e => setFormEtab({...formEtab, type: e.target.value})} className="champ-saisie">
                      <option value="Lycée">Lycée</option>
                      <option value="Collège">Collège</option>
                      <option value="Complexe Scolaire">Complexe Scolaire</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={styles.libelleChamp}>Statut</label>
                    <select value={formEtab.statut} onChange={e => setFormEtab({...formEtab, statut: e.target.value})} className="champ-saisie">
                      <option value="Privé">Privé</option>
                      <option value="Public">Public</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.libelleChamp}>Nombre de classes (Forfait)</label>
                    <input type="number" min="1" value={formEtab.nombreClasses} onChange={e => setFormEtab({...formEtab, nombreClasses: e.target.value})} className="champ-saisie" required />
                  </div>
                </div>

                <button type="submit" className="bouton bouton-succes" style={{ marginTop: '10px', padding: '12px' }}>
                  Payer & Créer l'établissement
                </button>
              </form>
            )}

            {etapeSelection === 'rattachement' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="anim-apparition">
                <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                  Établissements enregistrés dans votre ville (<strong>{infosDirection.ville}</strong>) :
                </p>

                <input 
                  type="text" 
                  placeholder="Rechercher par nom d'établissement..." 
                  value={rechercheFiltre} 
                  onChange={e => setRechercheFiltre(e.target.value)} 
                  className="champ-saisie" 
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', marginTop: '6px' }}>
                  {etablissementsFiltresParVille.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
                      Aucun établissement trouvé à "{infosDirection.ville}". Vous pouvez en créer un via l'option de gauche.
                    </div>
                  ) : (
                    etablissementsFiltresParVille.map(etab => (
                      <div key={etab.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                        <div>
                          <strong>{etab.nom}</strong> ({etab.commune ? etab.commune + ', ' : ''}{etab.ville})<br/>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Type : {etab.type} • {etab.statut} | Ancien chef : {etab.chefActuel || 'Aucun'}</span>
                        </div>
                        <button onClick={() => rattacherEtablissementExistant(etab)} className="bouton bouton-principal" style={{ padding: '6px 14px', fontSize: '12px', flexShrink: '0' }}>
                          Sélectionner
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- ÉTAPE 3 : TABLEAU DE BORD ACTIF --- */}
        {etapeParcours === 'dashboard' && monEtablissement && (
          <div key={ongletActif} className="anim-apparition">
            
            {/* MODALE FORFAIT & UPGRADE */}
            {modalEtablissementActif && (
              <div className="fond-modale anim-apparition">
                <div style={{ ...styles.carteModale, width: '500px' }} className="anim-modale">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a' }}>💳 Gérer & Upgrader le Forfait (Classes)</h3>
                    <button onClick={() => setModalEtablissementActif(false)} className="bouton bouton-secondaire" style={{ padding: '4px 10px' }}>✕</button>
                  </div>
                  <form onSubmit={enregistrerEtablissement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                      Le forfait est payant et définit la limite stricte de classes que vos censeurs peuvent configurer.
                    </p>
                    <div>
                      <label style={styles.libelleChamp}>Nom de l'établissement</label>
                      <input type="text" value={formEtablissement.nomEtablissement} onChange={e => setFormEtablissement({...formEtablissement, nomEtablissement: e.target.value})} className="champ-saisie" required />
                    </div>
                    <div>
                      <label style={styles.libelleChamp}>Choisir un Forfait (Plafond de classes)</label>
                      <select value={formEtablissement.forfaitActif} onChange={e => setFormEtablissement({...formEtablissement, forfaitActif: e.target.value})} className="champ-saisie">
                        <option value="Forfait Standard (Jusqu’à 20 classes)">Forfait Standard (Jusqu’à 20 classes)</option>
                        <option value="Forfait Grand Complexe (Jusqu’à 50 classes)">Forfait Grand Complexe (Jusqu’à 50 classes)</option>
                        <option value="Forfait Illimité (Établissements majeurs)">Forfait Illimité (Établissements majeurs - 150 classes)</option>
                      </select>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '12px', color: '#475569' }}>
                      📊 Utilisation actuelle : <strong>{monEtablissement?.classesActuellementCreees || 0} classes créées</strong> sur le quota autorisé.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                      <button type="button" onClick={() => setModalEtablissementActif(false)} className="bouton bouton-secondaire">Annuler</button>
                      <button type="submit" className="bouton bouton-principal">Payer & Mettre à niveau le forfait</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODALE PROFIL (AVEC CIVILTÉS ET STATUT PUBLIC/PRIVÉ) */}
            {modalProfilActif && (
              <div className="fond-modale anim-apparition">
                <div style={{ ...styles.carteModale, width: '480px', maxHeight: '90vh', overflowY: 'auto' }} className="anim-modale">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a' }}>⚙️ Modifier le Profil & Civilités</h3>
                    <button onClick={() => setModalProfilActif(false)} className="bouton bouton-secondaire" style={{ padding: '4px 10px' }}>✕</button>
                  </div>
                  <form onSubmit={enregistrerProfil} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                        {formProfil.photoProfil ? (
                          <img src={formProfil.photoProfil} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '28px' }}>👑</span>
                        )}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>Photo (Fichier)</label>
                        <input type="file" accept="image/*" onChange={chargerPhoto} style={{ fontSize: '11px', cursor: 'pointer' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                      <div>
                        <label style={styles.libelleChamp}>Civilité</label>
                        <select value={formProfil.civilite} onChange={e => setFormProfil({...formProfil, civilite: e.target.value})} className="champ-saisie">
                          <option value="M.">M.</option>
                          <option value="Mme">Mme</option>
                          <option value="Dr">Dr</option>
                          <option value="Pr">Pr</option>
                        </select>
                      </div>
                      <div>
                        <label style={styles.libelleChamp}>Nom</label>
                        <input type="text" value={formProfil.nom} onChange={e => setFormProfil({...formProfil, nom: e.target.value})} className="champ-saisie" required />
                      </div>
                    </div>

                    <div><label style={styles.libelleChamp}>Prénoms</label><input type="text" value={formProfil.prenoms} onChange={e => setFormProfil({...formProfil, prenoms: e.target.value})} className="champ-saisie" required /></div>
                    <div><label style={styles.libelleChamp}>Titre / Fonction</label><input type="text" value={formProfil.titre} onChange={e => setFormProfil({...formProfil, titre: e.target.value})} className="champ-saisie" required /></div>
                    <div><label style={styles.libelleChamp}>Téléphone / WhatsApp</label><input type="text" value={formProfil.telephone} onChange={e => setFormProfil({...formProfil, telephone: e.target.value})} className="champ-saisie" required /></div>

                    <div>
                      <label style={styles.libelleChamp}>Matière de prédilection (Origine)</label>
                      <input type="text" value={formProfil.matierePredilection} onChange={e => setFormProfil({...formProfil, matierePredilection: e.target.value})} className="champ-saisie" required />
                    </div>

                    {/* SECTION STATUT PUBLIC / PRIVÉ & MATRICULE */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={styles.libelleChamp}>Secteur d'enseignement</label>
                        <select value={formProfil.secteurEnseignement} onChange={e => setFormProfil({...formProfil, secteurEnseignement: e.target.value})} className="champ-saisie">
                          <option value="Public">Public</option>
                          <option value="Privé">Privé</option>
                        </select>
                      </div>

                      {formProfil.secteurEnseignement === 'Public' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div>
                            <label style={styles.libelleChamp}>Statut dans le Public</label>
                            <select value={formProfil.typeStatutPublic} onChange={e => setFormProfil({...formProfil, typeStatutPublic: e.target.value})} className="champ-saisie">
                              <option value="Titulaire">Titulaire (Avec Matricule)</option>
                              <option value="En attente de matricule">En attente d’un matricule</option>
                              <option value="Contractuel">Contractuel</option>
                            </select>
                          </div>

                          {formProfil.typeStatutPublic === 'Titulaire' && (
                            <div>
                              <label style={styles.libelleChamp}>Numéro Matricule</label>
                              <input type="text" value={formProfil.numeroMatricule} onChange={e => setFormProfil({...formProfil, numeroMatricule: e.target.value})} placeholder="Ex: MT-XXXXXX" className="champ-saisie" required />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ padding: '8px', backgroundColor: '#eef2f6', borderRadius: '6px', fontSize: '12px', color: '#334155', fontWeight: '600', textAlign: 'center' }}>
                          Statut enregistré : <span style={{ color: '#4f46e5' }}>Privé</span>
                        </div>
                      )}
                    </div>

                    <div><label style={styles.libelleChamp}>Ville</label><input type="text" value={formProfil.ville} onChange={e => setFormProfil({...formProfil, ville: e.target.value})} className="champ-saisie" required /></div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                      <button type="button" onClick={() => setModalProfilActif(false)} className="bouton bouton-secondaire">Annuler</button>
                      <button type="submit" className="bouton bouton-principal">Enregistrer</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODALE CLÔTURE */}
            {modalClotureActif && (
              <div className="fond-modale anim-apparition">
                <div style={{ ...styles.carteModale, width: '480px' }} className="anim-modale">
                  <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>⚙️ Gestion de l'Année Scolaire</h3>
                  {activiteAutorisee ? (
                    <div>
                      <p style={{ fontSize: '13px', color: '#475569' }}>Clôturer l'année <strong>{anneeScolaireActive}</strong> ?</p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                        <button onClick={() => setModalClotureActif(false)} className="bouton bouton-secondaire">Annuler</button>
                        <button onClick={cloturerAnneeScolaire} className="bouton bouton-danger">Confirmer</button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={gererOuvertureAnnee} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={styles.libelleChamp}>Nouvelle année</label>
                      <input type="text" value={nouvelleAnneeSaisie} onChange={e => setNouvelleAnneeSaisie(e.target.value)} className="champ-saisie" required />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                        <button type="button" onClick={() => setModalClotureActif(false)} className="bouton bouton-secondaire">Annuler</button>
                        <button type="submit" className="bouton bouton-succes">Ouvrir</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* MODALE ANNONCE */}
            {modalAnnonceActif && (
              <div className="fond-modale anim-apparition">
                <div style={{ ...styles.carteModale, width: '480px' }} className="anim-modale">
                  <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>📢 Diffuser une communication</h3>
                  <form onSubmit={publierAnnonce} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div><label style={styles.libelleChamp}>Titre</label><input type="text" value={formAnnonce.titre} onChange={e => setFormAnnonce({...formAnnonce, titre: e.target.value})} className="champ-saisie" required /></div>
                    <div><label style={styles.libelleChamp}>Contenu</label><textarea rows="3" value={formAnnonce.contenu} onChange={e => setFormAnnonce({...formAnnonce, contenu: e.target.value})} className="champ-saisie" required /></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                      <button type="button" onClick={() => setModalAnnonceActif(false)} className="bouton bouton-secondaire">Annuler</button>
                      <button type="submit" className="bouton bouton-principal">Diffuser</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ONGLET ACCUEIL (TABLEAU DE BORD) */}
            {ongletActif === 'accueil' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={styles.carteContenu}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', marginBottom: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0', color: '#0f172a' }}>Bienvenue, {infosDirection.civilite} {infosDirection.nom} {infosDirection.prenoms}</h2>
                      <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                        Établissement rattaché : <strong>{monEtablissement.nom}</strong> ({monEtablissement.forfaitActif || 'Standard'}) • Année active : <strong>{anneeScolaireActive}</strong>.
                      </p>
                    </div>
                    <button onClick={() => setModalClotureActif(true)} className={`bouton ${activiteAutorisee ? 'bouton-danger' : 'bouton-succes'}`} style={{ fontSize: '12px' }}>
                      {activiteAutorisee ? '🔒 Clôturer l\'Année Scolaire' : '🔓 Ouvrir la Rentrée Scolaire'}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div style={styles.carteStatistique}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Quota Classes (Forfait Payant)</span>
                      <span style={{ fontSize: '20px', fontWeight: '700', color: '#4f46e5', marginTop: '4px', display: 'block' }}>
                        {monEtablissement.classesActuellementCreees || 0} / {monEtablissement.limiteClassesMax || 20} classes
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>Contrôle d'accès censeur actif</span>
                    </div>

                    <div style={styles.carteStatistique}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Personnel Actif</span>
                      <span style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginTop: '4px', display: 'block' }}>{personnel.length} membres</span>
                      <button onClick={() => setOngletActif('personnel')} className="bouton bouton-secondaire" style={{ marginTop: '12px', width: '100%', fontSize: '12px' }}>Gérer le répertoire</button>
                    </div>

                    <div style={styles.carteStatistique}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Demandes d'Affiliation</span>
                      <span style={{ fontSize: '24px', fontWeight: '700', color: demandesAffiliation.length > 0 ? '#ef4444' : '#1e293b', marginTop: '4px', display: 'block' }}>
                        {demandesAffiliation.length} en attente
                      </span>
                      <button onClick={() => setOngletActif('personnel')} className="bouton bouton-principal" style={{ marginTop: '12px', width: '100%', fontSize: '12px' }}>Traiter les demandes</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {ongletActif === 'personnel' && (
              <div style={styles.carteContenu}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 16px 0', color: '#0f172a' }}>Personnel & Demandes d'Affiliation</h2>
                {demandesAffiliation.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '14px', color: '#b91c1c', marginBottom: '8px' }}>Demandes en attente ({demandesAffiliation.length})</h3>
                    {demandesAffiliation.map(d => (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '8px' }}>
                        <div><strong>{d.nom}</strong> ({d.role}) - {d.email}</div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => rejeterAffiliation(d.id)} className="bouton bouton-danger" style={{ padding: '4px 10px', fontSize: '11px' }}>Refuser</button>
                          <button onClick={() => approuverAffiliation(d)} className="bouton bouton-succes" style={{ padding: '4px 10px', fontSize: '11px' }}>Valider</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <h3 style={{ fontSize: '14px', color: '#0f172a', marginBottom: '8px' }}>Membres Actifs</h3>
                <table style={styles.tableau}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left', fontSize: '13px' }}>
                      <th style={styles.celluleEnTete}>Nom</th>
                      <th style={styles.celluleEnTete}>Rôle</th>
                      <th style={styles.celluleEnTete}>Email</th>
                      <th style={styles.celluleEnTete}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personnel.map(m => (
                      <tr key={m.id} className="ligne-tableau">
                        <td style={styles.celluleTableau}><strong>{m.nom}</strong></td>
                        <td style={styles.celluleTableau}>{m.role}</td>
                        <td style={styles.celluleTableau}>{m.email}</td>
                        <td style={styles.celluleTableau}><span style={{ color: '#166534', fontWeight: '600' }}>{m.statut}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {ongletActif === 'anneeScolaire' && (
              <div style={styles.carteContenu}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 16px 0', color: '#0f172a' }}>Gestion des Années Scolaires</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>Année active : {anneeScolaireActive}</p>
              </div>
            )}

            {ongletActif === 'statistiques' && (
              <div style={styles.carteContenu}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 16px 0', color: '#0f172a' }}>Statistiques Détaillées</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>Vue analytique des performances de l'établissement (comprenant les matières de prédilection de la direction).</p>
              </div>
            )}

            {ongletActif === 'communications' && (
              <div style={styles.carteContenu}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Communications Officielles</h2>
                  <button onClick={() => setModalAnnonceActif(true)} className="bouton bouton-principal">📢 Diffuser une annonce</button>
                </div>
                {annonces.map(a => (
                  <div key={a.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '10px', backgroundColor: '#f8fafc' }}>
                    <strong>{a.titre}</strong> - <span style={{ fontSize: '11px', color: '#64748b' }}>{a.date}</span>
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#475569' }}>{a.contenu}</p>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}

const styles = {
  conteneurGlobal: { backgroundColor: '#f1f5f9', minHeight: '100vh', color: '#1e293b' },
  enteteSuperieur: { backgroundColor: '#1e1b4b', padding: '16px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderBottom: '1px solid #312e81' },
  iconeLogo: { width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#312e81', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' },
  boutonProfil: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'transparent', padding: '6px 10px', borderRadius: '8px', border: '1px solid transparent', cursor: 'pointer', textAlign: 'left' },
  avatarConteneur: { width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#4338ca', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', objectFit: 'cover' },
  menuDeroulant: { position: 'absolute', backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '6px' },
  enTeteMenu: { padding: '8px 12px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  corpsPrincipal: { padding: '30px', maxWidth: '1200px', margin: '0 auto', position: 'relative' },
  conteneurNotification: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 },
  texteNotification: { backgroundColor: '#1e293b', color: '#f8fafc', padding: '14px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' },
  carteModale: { backgroundColor: '#ffffff', padding: '26px', borderRadius: '14px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  libelleChamp: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' },
  carteContenu: { backgroundColor: '#ffffff', padding: '28px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' },
  carteStatistique: { border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', backgroundColor: '#f8fafc' },
  tableau: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  celluleEnTete: { padding: '12px 14px', fontWeight: '600' },
  celluleTableau: { padding: '14px', color: '#334155' }
};
