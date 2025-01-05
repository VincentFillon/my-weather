const luxeToggleButton = document.getElementById('toggle-luxe');
const LUXE_STORAGE_KEY = 'toggle-luxe';
let luxeLink;

// Fonction pour charger ou retirer la feuille de style
function setLuxeCss(enabled) {
  if (enabled) {
    if (!luxeLink) {
      luxeLink = document.createElement('link');
      luxeLink.rel = 'stylesheet';
      luxeLink.href = 'luxe.css'; // Remplacez par le chemin réel
      document.head.appendChild(luxeLink);
    }
    luxeToggleButton.classList.remove('btn-success');
    luxeToggleButton.classList.add('btn-danger');
    luxeToggleButton.textContent = '🤮';
  } else {
    luxeLink?.remove();
    luxeLink = null;
    luxeToggleButton.classList.remove('btn-danger');
    luxeToggleButton.classList.add('btn-success');
    luxeToggleButton.textContent = '🍾';
  }
  // Sauvegarde dans le localStorage
  localStorage.setItem(LUXE_STORAGE_KEY, enabled);
}

// Charger l'état au démarrage
const luxeCssEnabled = JSON.parse(localStorage.getItem(LUXE_STORAGE_KEY)) || false;
setLuxeCss(luxeCssEnabled);

// Gérer le clic sur le bouton
luxeToggleButton.addEventListener('click', () => {
  setLuxeCss(!luxeLink);
});
