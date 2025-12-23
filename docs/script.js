const formPlayer = document.getElementById("searchPlayerForm");
const formCountry = document.getElementById("searchCountryForm");
const resultsDiv = document.getElementById("results");
const playerServerSelect = document.getElementById("playerServer");
const countryServerSelect = document.getElementById("countryServer");

const WORKER_URL = "https://ng-panel.ng-panel.workers.dev";



async function fetchUserWithRetry(username, server, retries = 10, delay = 600) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${WORKER_URL}/user/${username}?server=${server}`);
      const data = await res.json();
      const s = data.servers?.[server];

      // ✅ Valeur correcte trouvée
      if (s && s.max_power > 0) {
        return { power: s.power, max_power: s.max_power };
      }

      // ⏳ Attente avant nouvelle tentative
      await new Promise(r => setTimeout(r, delay));
    } catch {
      // on ignore et on retente
    }
  }

  // ❌ après X tentatives → on abandonne
  return { power: 0, max_power: 0 };
}

function getPowerBadge(power, maxPower) {
  if (maxPower > 0 && power === maxPower) {
    return `<span class="badge badge-green">●</span>`;
  }

  if (power < 5) {
    return `<span class="badge badge-red">●</span>`;
  }

  return `<span class="badge badge-yellow">●</span>`;
}

// Fonction pour trier et formater les membres
function getSortedMembers(members) {
  const roles = {
    "*": "Officier",
    "+": "Membre",
    "-": "Recrue"
  };

  return members
    .filter(m => !m.startsWith("**")) // supprimer les chefs
    .map(m => {
      const prefix = m[0];
      const name = m.slice(1);
      const role = roles[prefix] || "Inconnu";
      return { name, role };
    })
    .sort((a, b) => ["Officier", "Membre", "Recrue"].indexOf(a.role) - ["Officier", "Membre", "Recrue"].indexOf(b.role));
}

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
    displayCountry(data, server);
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
      <div class="player-left">
        <div class="player-header">
          <img src="${player.skin.head}" class="head" alt="Skin head">
          <h2>${player.username}</h2>
        </div>
        <p>${player.description || 'Aucune description'}</p>
        <h3>Stats serveur : ${server}</h3>
        <ul>
          <li> Dernière connexion : ${s.last_connection || 'N/A'}</li>
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
function displayCountry(country, server) {
  if (!country) {
    resultsDiv.innerHTML = "Aucun pays trouvé.";
    return;
  }

  const sortedMembers = getSortedMembers(country.members);

  resultsDiv.innerHTML = `
    <div class="country-card">
      <div class="country-header">
        <img src="data:image/png;base64,${country.flag}" alt="Drapeau ${country.name}" class="country-flag">
        <h2>${country.name} (${country.base_name})</h2>
      </div>

      <p>Date de création : ${country.creation_date}</p>
      <p>Dirigeant : ${country.leader}</p>
      <p>Membres : ${country.count_members}</p>
      <p>Banque : ${country.bank}</p>
      <p>Puissance : ${country.power}/${country.maxpower}</p>
      <p>Claims : ${country.count_claims}</p>
      <p>MMR : ${country.mmr} — Level : ${country.level}</p>
      <p>Description : ${country.description || 'N/A'}</p>

      <div id="member-filters">
        <button data-role="Officier">Officiers</button>
        <button data-role="Membre">Membres</button>
        <button data-role="Recrue">Recrues</button>
      </div>
      <ul id="member-list"></ul>
    </div>
  `;

  const memberFilters = document.getElementById("member-filters");
  const memberList = document.getElementById("member-list");

  memberFilters.addEventListener("click", async (e) => {
    if (e.target.tagName !== "BUTTON") return;
    const role = e.target.dataset.role;

    memberList.innerHTML = "Chargement...";

    const filteredMembers = sortedMembers.filter(m => m.role === role);

    // Fetch seulement pour les membres filtrés
    const membersData = await Promise.allSettled(
  filteredMembers.map(async m => {
    const stats = await fetchUserWithRetry(m.name, server);
    return { ...m, ...stats };
  })
);

   memberList.innerHTML = membersData.map(m => {
  if (m.status !== "fulfilled") {
    return `<li>Inconnu — 0/0</li>`;
  }

  const { name, power, max_power } = m.value;
  const badge = getPowerBadge(power, max_power);

  return `
    <li class="member-item">
      ${badge}
      <strong>${name}</strong>
      <span class="power">${power}/${max_power}</span>
    </li>
  `;
}).join('');
  });
}
