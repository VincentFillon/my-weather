const cringeToggleButton = document.getElementById('toggle-cringe');
const CRINGE_STORAGE_KEY = 'toggle-cringe';
let cringeLink;

// Fonction pour charger ou retirer la feuille de style
function setCringeCss(enabled) {
  if (enabled) {
    if (!cringeLink) {
      cringeLink = document.createElement('link');
      cringeLink.rel = 'stylesheet';
      cringeLink.href = 'cringe.css'; // Remplacez par le chemin réel
      document.head.appendChild(cringeLink);
    }
    cringeToggleButton.classList.remove('btn-success');
    cringeToggleButton.classList.add('btn-danger');
    cringeToggleButton.textContent = '😵‍💫';
  } else {
    cringeLink?.remove();
    cringeLink = null;
    cringeToggleButton.classList.remove('btn-danger');
    cringeToggleButton.classList.add('btn-success');
    cringeToggleButton.textContent = '🤩';
  }
  // Sauvegarde dans le localStorage
  localStorage.setItem(CRINGE_STORAGE_KEY, enabled);
}

// Charger l'état au démarrage
const cringeCssEnabled = JSON.parse(localStorage.getItem(CRINGE_STORAGE_KEY)) || false;
setCringeCss(cringeCssEnabled);

// Gérer le clic sur le bouton
cringeToggleButton.addEventListener('click', () => {
  setCringeCss(!cringeLink);
});
