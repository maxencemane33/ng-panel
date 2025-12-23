const formPlayer = document.getElementById("searchPlayerForm");
const formCountry = document.getElementById("searchCountryForm");
const resultsDiv = document.getElementById("results");
const playerServerSelect = document.getElementById("playerServer");
const countryServerSelect = document.getElementById("countryServer");

const WORKER_URL = "https://ng-panel.ng-panel.workers.dev";

// --------------------- Joueur ---------------------
formPlayer.addEventListener("submit", async e => {
  e.preventDefault();
  const username = e.target.username.value.trim();
  const server = playerServerSelect.value;

  if (!username || !server) {
    resultsDiv.innerHTML = "Veuillez choisir un serveur et saisir un nom de joueur.";
    return;
  }

  resultsDiv.innerHTML = "Chargement...";

  try {
    const res = await fetch(`${WORKER_URL}/user/${username}?server=${server}`);
    if (!res.ok) throw new Error("Joueur non trouvé");
    const data = await res.json();
    displayPlayer(data, server);
  } catch (err) {
    resultsDiv.innerHTML = `Erreur : ${err.message}`;
  }
});

// --------------------- Pays ---------------------
formCountry.addEventListener("submit", async e => {
  e.preventDefault();
  const country = e.target.country.value.trim();
  const server = countryServerSelect.value;

  if (!country || !server) {
    resultsDiv.innerHTML = "Veuillez choisir un serveur et saisir un nom de pays.";
    return;
  }

  resultsDiv.innerHTML = "Chargement...";

  try {
    const res = await fetch(`${WORKER_URL}/country/${server}/${country}`);
    if (!res.ok) throw new Error("Pays non trouvé");
    const data = await res.json();
    displayCountry(data);
  } catch (err) {
    resultsDiv.innerHTML = `Erreur : ${err.message}`;
  }
});

// --------------------- Affichage Joueur ---------------------
function displayPlayer(player, server) {
  if (!player.servers || !player.servers[server]) {
    resultsDiv.innerHTML = "Aucun joueur trouvé sur ce serveur.";
    return;
  }

  const s = player.servers[server];

  resultsDiv.innerHTML = `
    <div class="player-card">
      <!-- Colonne gauche : tête + pseudo + description + stats -->
      <div class="player-left">
        <div class="player-header">
          <img src="${player.skin.head}" class="head" alt="Skin head">
          <h2>${player.username}</h2>
        </div>
        <p>${player.description || 'Aucune description'}</p>
        <h3>Stats serveur : ${server}</h3>
        <ul>
          <li>Pays : ${s.country || 'N/A'}</li>
          <li>Rank : ${s.country_rank || 'N/A'}</li>
          <li>Power : ${s.power}/${s.max_power}</li>
          <li>Playtime : ${(s.playtime/3600).toFixed(2)}h</li>
        </ul>
        <h4>Stats métiers :</h4>
        <ul>
          <li>Miner : ${s.skills?.miner || 0}</li>
          <li>Lumberjack : ${s.skills?.lumberjack || 0}</li>
          <li>Farmer : ${s.skills?.farmer || 0}</li>
          <li>Builder : ${s.skills?.builder || 0}</li>
          <li>Hunter : ${s.skills?.hunter || 0}</li>
          <li>Engineer : ${s.skills?.engineer || 0}</li>
        </ul>
      </div>

      <!-- Colonne droite : corps du skin + graphique -->
      <div class="player-right">
        <img src="${player.skin.body}" class="body" alt="Skin body">
        <canvas id="playtimeChart"></canvas>
      </div>
    </div>
  `;

  // Graphique temps de jeu
  const ctx = document.getElementById('playtimeChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(player.servers),
      datasets: [{
        label: 'Temps de jeu (h)',
        data: Object.values(player.servers).map(s => (s.playtime/3600).toFixed(2)),
        backgroundColor: 'rgba(54,162,235,0.6)'
      }]
    },
    options: { scales: { y: { beginAtZero:true } } }
  });
}


// --------------------- Affichage Pays ---------------------
function displayCountry(country) {
  if (!country) {
    resultsDiv.innerHTML = "Aucun pays trouvé.";
    return;
  }

  resultsDiv.innerHTML = `
    <div class="country-card">
      <div class="country-header">
        <img src="data:image/png;base64,${country.flag}" alt="Drapeau ${country.name}" class="country-flag">
        <h2>${country.name} (${country.base_name})</h2>
      </div>
      <p>Serveur : ${country.server}</p>
      <p>Dirigeant : ${country.leader}</p>
      <p>Membres : ${country.count_members}</p>
      <p>Banque : ${country.bank}</p>
      <p>Puissance : ${country.power}/${country.maxpower}</p>
      <p>Claims : ${country.count_claims}</p>
      <p>MMR : ${country.mmr} — Level : ${country.level}</p>
      <p>Description : ${country.description || 'N/A'}</p>
      <p>Alliés : ${(country.allies || []).join(', ') || 'Aucun'}</p>
      <p>Ennemis : ${(country.enemies || []).join(', ') || 'Aucun'}</p>
    </div>
  `;
}
