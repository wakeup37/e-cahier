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
    const emailNettoye = emailSaisi.trim().toLowerCase();

    try {
      if (modeAuth === 'inscription') {
        // 1. Inscription propre dans Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email: emailNettoye,
          password: mdpSaisi,
        });
        
        // Si l'erreur indique que l'utilisateur existe mais qu'on veut rendre l'app souple,
        // on tente directement une connexion de secours pour ne pas bloquer l'utilisateur.
        if (error) {
          if (error.message.includes("User already registered")) {
            const { error: loginFallbackError } = await supabase.auth.signInWithPassword({
              email: emailNettoye,
              password: mdpSaisi,
            });
            if (loginFallbackError) throw new Error("Cet e-mail existe déjà. Vérifiez votre mot de passe ou connectez-vous.");
          } else {
            throw error;
          }
        }

        const userId = data?.user?.id;

        if (userId) {
          // 2. Enregistrement ou mise à jour sécurisée du profil sans faire tout planter
          await supabase.from('utilisateurs_profils').upsert([
            { 
              user_id: userId, 
              email: emailNettoye, 
              role: roleActuel,
              genre: genreSaisi,
              nom: nomSaisi.trim(),
              prenoms: prenomsSaisi.trim(),
              date_naissance: dateNaissanceSaisie.trim(),
              matiere: roleActuel === 'enseignant' ? matiereSaisie.trim() : null
            }
          ], { onConflict: 'user_id' });
        }

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
      console.error("Erreur complète Supabase:", err);
      afficherNotification("❌ " + (err.message || "Une erreur est survenue"));
    }
  };