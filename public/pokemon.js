const pokemonToggleButton = document.getElementById('toggle-pokemon');
const POKEMON_STORAGE_KEY = 'pokemonCssEnabled';
let pokemonLink;

// Fonction pour charger ou retirer la feuille de style
function setPokemonCss(enabled) {
  if (enabled) {
    if (!pokemonLink) {
      pokemonLink = document.createElement('link');
      pokemonLink.rel = 'stylesheet';
      pokemonLink.href = 'pokemon.css'; // Remplacez par le chemin réel
      document.head.appendChild(pokemonLink);
    }
    pokemonToggleButton.classList.remove('btn-success');
    pokemonToggleButton.classList.add('btn-danger');
    pokemonToggleButton.textContent = '✖️';
  } else {
    pokemonLink?.remove();
    pokemonLink = null;
    pokemonToggleButton.classList.remove('btn-danger');
    pokemonToggleButton.classList.add('btn-success');
    pokemonToggleButton.textContent = '😻';
  }
  // Sauvegarde dans le localStorage
  localStorage.setItem(POKEMON_STORAGE_KEY, enabled);
}

// Charger l'état au démarrage
const pokemonCssEnabled = JSON.parse(localStorage.getItem(POKEMON_STORAGE_KEY)) || false;
setPokemonCss(pokemonCssEnabled);

// Gérer le clic sur le bouton
pokemonToggleButton.addEventListener('click', () => {
  setPokemonCss(!pokemonLink);
});
