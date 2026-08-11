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
        // 1. On déconnecte proprement toute session active résiduelle avant de créer un compte
        await supabase.auth.signOut().catch(() => {});

        // 2. Création du compte utilisateur dans Supabase Auth
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
              matiere: roleActuel === 'enseignant' ? matiereSaisi.trim() : null
            }
          ]);
          if (profileError) throw profileError;
        }

        // 3. Connexion automatique du nouveau compte
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: emailSaisi,
          password: mdpSaisi,
        });
        if (loginError) throw loginError;

        afficherNotification("✅ Inscription réussie !");
      } else {
        // Mode Connexion classique
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