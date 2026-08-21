import React, { useState, useEffect, useRef } from 'react';

// [NOUVEAU] Geste "tirer vers le bas pour recharger" — surtout utile en
// mode application installée (standalone), où il n'y a plus de barre de
// navigateur ni de bouton natif pour recharger la page. Composant
// autonome : ne modifie aucun écran existant, juste une fine bande
// d'indicateur qui apparaît en haut pendant le geste.
export default function PullToRefresh() {
  const [distance, setDistance] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const yDepart = useRef(null);
  const actif = useRef(false);

  const SEUIL_DECLENCHEMENT = 70;
  const RESISTANCE = 0.5;

  useEffect(() => {
    const surDebut = (e) => {
      // Ne se déclenche que si on est déjà tout en haut de la page —
      // sinon ça interférerait avec un scroll normal.
      if (window.scrollY <= 0 && !enCours) {
        yDepart.current = e.touches[0].clientY;
        actif.current = true;
      }
    };

    const surDeplacement = (e) => {
      if (!actif.current || yDepart.current === null || enCours) return;
      const delta = e.touches[0].clientY - yDepart.current;
      if (delta > 0) {
        setDistance(Math.min(delta * RESISTANCE, 120));
      } else {
        actif.current = false;
        setDistance(0);
      }
    };

    const surFin = () => {
      if (!actif.current) return;
      actif.current = false;
      if (distance >= SEUIL_DECLENCHEMENT) {
        setEnCours(true);
        setTimeout(() => window.location.reload(), 250);
      } else {
        setDistance(0);
      }
      yDepart.current = null;
    };

    window.addEventListener('touchstart', surDebut, { passive: true });
    window.addEventListener('touchmove', surDeplacement, { passive: true });
    window.addEventListener('touchend', surFin, { passive: true });

    return () => {
      window.removeEventListener('touchstart', surDebut);
      window.removeEventListener('touchmove', surDeplacement);
      window.removeEventListener('touchend', surFin);
    };
  }, [distance, enCours]);

  if (distance === 0 && !enCours) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: `${Math.max(distance, enCours ? 60 : 0)}px`,
        overflow: 'hidden',
        transition: enCours ? 'height 0.15s ease' : 'none',
        zIndex: 10000,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '3px solid #e2e8f0',
          borderTopColor: '#2563eb',
          animation: enCours || distance >= SEUIL_DECLENCHEMENT ? 'spin 0.7s linear infinite' : 'none',
          transform: enCours ? 'none' : `rotate(${Math.min(distance * 3, 210)}deg)`,
          opacity: Math.min(distance / SEUIL_DECLENCHEMENT, 1),
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
