import { db } from './db/db';
import { supabase } from './components/AppRouter'; // Ajuste le chemin si besoin

// Écouteur de retour de connexion pour synchroniser le mode hors-ligne
window.addEventListener('online', async () => {
  console.log('🌐 Connexion rétablie ! Synchronisation des données hors-ligne...');
  
  const actionsEnAttente = await db.sync_outbox.toArray();
  
  for (const item of actionsEnAttente) {
    try {
      const { error } = await supabase.from(item.table).upsert(item.payload);
      if (error) throw error;

      // Si la synchro réussit, on supprime l'élément de la file d'attente locale
      await db.sync_outbox.delete(item.id);
      console.log(`✅ Élément ${item.id} synchronisé avec succès.`);
    } catch (err) {
      console.error(`❌ Échec de synchro pour l'élément ${item.id}:`, err);
      break; 
    }
  }
});