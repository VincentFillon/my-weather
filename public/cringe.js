const toggleButton = document.getElementById('toggle-cringe');
const STORAGE_KEY = 'cringeCssEnabled';
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
    toggleButton.classList.remove('btn-success');
    toggleButton.classList.add('btn-danger');
    toggleButton.textContent = '😵‍💫';
  } else {
    cringeLink?.remove();
    cringeLink = null;
    toggleButton.classList.remove('btn-danger');
    toggleButton.classList.add('btn-success');
    toggleButton.textContent = '🤩';
  }
  // Sauvegarde dans le localStorage
  localStorage.setItem(STORAGE_KEY, enabled);
}

// Charger l'état au démarrage
const cringeCssEnabled = JSON.parse(localStorage.getItem(STORAGE_KEY)) || false;
setCringeCss(cringeCssEnabled);

// Gérer le clic sur le bouton
toggleButton.addEventListener('click', () => {
  setCringeCss(!cringeLink);
});
