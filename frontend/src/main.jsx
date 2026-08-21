import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRouter from './components/AppRouter'
import { db } from './db/db'
import { supabase } from './components/AppRouter'
import './index.css'

// Écouteur de retour de connexion pour synchroniser le mode hors-ligne
window.addEventListener('online', async () => {
  console.log('🔗 Connexion rétablie ! Synchronisation des données hors-ligne...');
  try {
    const actionsEnAttente = await db.sync_outbox.toArray();
    for (const item of actionsEnAttente) {
      const { error } = await supabase.from(item.table).upsert(item.payload);
      if (error) throw error;
      await db.sync_outbox.delete(item.id);
      console.log(`✅ Élément ${item.id} synchronisé avec succès.`);
    }
  } catch (err) {
    console.error('❌ Échec de synchro pour l’élément :', err);
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)
