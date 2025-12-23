const formPlayer = document.getElementById("searchPlayerForm");
const formCountry = document.getElementById("searchCountryForm");
const resultsDiv = document.getElementById("results");

const WORKER_URL = "https://ng-panel.ng-panel.workers.dev"; // Remplace par ton Worker

formPlayer.addEventListener("submit", async e => {
  e.preventDefault();
  const username = e.target.username.value;
  resultsDiv.innerHTML = "Chargement...";
  try {
    const res = await fetch(`${WORKER_URL}/user/${username}`);
    const data = await res.json();
    displayPlayer(data);
  } catch (err) {
    resultsDiv.innerHTML = "Erreur : joueur non trouvé ou problème API";
  }
});

formCountry.addEventListener("submit", async e => {
  e.preventDefault();
  const country = e.target.country.value;
  resultsDiv.innerHTML = "Chargement...";
  try {
    const res = await fetch(`${WORKER_URL}/country/${country}`);
    const data = await res.json();
    displayCountry(data);
  } catch (err) {
    resultsDiv.innerHTML = "Erreur : pays non trouvé ou problème API";
  }
});

function displayPlayer(player) {
  if (!player) {
    resultsDiv.innerHTML = "Aucun joueur trouvé";
    return;
  }

  resultsDiv.innerHTML = `
    <div style="display:flex; gap:20px; align-items:center;">
      <div class="skin-images">
        <img src="${player.skin.head}" alt="Skin Head">
        <img src="${player.skin.body}" alt="Skin Body">
      </div>
      <h2>${player.username}</h2>
    </div>
    <p>Description : ${player.description || 'N/A'}</p>
    <h3>Temps de jeu par serveur :</h3>
    <ul>
      ${Object.entries(player.servers || {}).map(([color, server]) => `
        <li>
          <strong>${color}</strong> — Pays : ${server.country || 'N/A'} — Temps : ${(server.playtime/3600).toFixed(2)}h — Power : ${server.power}/${server.max_power}
        </li>
      `).join('')}
    </ul>
    <canvas id="playtimeChart" width="600" height="400"></canvas>
  `;

  // Graphique
  const servers = player.servers || {};
  const labels = Object.keys(servers);
  const data = labels.map(c => (servers[c].playtime/3600).toFixed(2));

  const ctx = document.getElementById('playtimeChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets:[{label:'Temps de jeu (h)', data, backgroundColor:'rgba(54,162,235,0.6)'}] },
    options: { scales: { y: { beginAtZero:true } } }
  });
}

function displayCountry(country) {
  resultsDiv.innerHTML = `<pre>${JSON.stringify(country, null, 2)}</pre>`;
}
