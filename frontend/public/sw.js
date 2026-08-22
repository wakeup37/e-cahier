// [CORRIGÉ] L'ancienne version mettait en cache "/" et "/index.html" en
// stratégie "cache d'abord" pour toujours — une fois installée, la page
// HTML n'était plus jamais revérifiée auprès du réseau, donc les
// déploiements suivants n'étaient jamais vus par les navigateurs déjà
// visités, PWA installée ou non.
//
// Nouvelle stratégie :
// - Navigation (chargement de page HTML) : réseau d'abord, cache en secours
//   uniquement si hors-ligne. Garantit que la dernière version déployée est
//   toujours utilisée quand il y a du réseau.
// - Autres ressources (JS/CSS/images) : cache d'abord, réseau en secours —
//   sans risque ici car Vite fingerprint chaque fichier (nom unique par
//   build), un ancien cache ne peut donc jamais servir un fichier obsolète
//   sous le même nom.
//
// CACHE_NAME inclut désormais un numéro de version à incrémenter à chaque
// changement de ce fichier si un nettoyage forcé est nécessaire un jour.
const CACHE_NAME = 'e-cahier-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/index.html']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;

  if (requete.url.includes('supabase.co')) {
    return;
  }

  // Requêtes de navigation (chargement/rechargement d'une page HTML) :
  // toujours essayer le réseau en premier pour avoir la dernière version.
  if (requete.mode === 'navigate') {
    event.respondWith(
      fetch(requete)
        .then((reponseReseau) => {
          const copie = reponseReseau.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copie));
          return reponseReseau;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Ressources statiques (JS/CSS/images fingerprintées par Vite) :
  // cache d'abord, réseau en secours, puis on met en cache pour la
  // prochaine fois.
  event.respondWith(
    caches.match(requete).then((reponseEnCache) => {
      if (reponseEnCache) return reponseEnCache;
      return fetch(requete).then((reponseReseau) => {
        const copie = reponseReseau.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(requete, copie));
        return reponseReseau;
      });
    })
  );
});
