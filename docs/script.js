// --------------------- Sélection des éléments ---------------------
const formPlayer = document.getElementById("searchPlayerForm");
const formCountry = document.getElementById("searchCountryForm");
const resultsDiv = document.getElementById("results");
const playerServerSelect = document.getElementById("playerServer");
const countryServerSelect = document.getElementById("countryServer");

const WORKER_URL = "https://ng-panel.ng-panel.workers.dev";

// --------------------- Utilitaires ---------------------

/**
 * Trie et formate les membres d'un pays par rôle
 */
function getSortedMembers(members) {
  const roles = { "*": "Officier", "+": "Membre", "-": "Recrue" };
  return members
    .filter(m => !m.startsWith("**"))
    .map(m => {
      const prefix = m[0];
      const name = m.slice(1);
      return { name, role: roles[prefix] || "Inconnu" };
    })
    .sort((a, b) => ["Officier", "Membre", "Recrue"].indexOf(a.role) - ["Officier", "Membre", "Recrue"].indexOf(b.role));
}

/**
 * Badge couleur selon le power
 */
function getPowerBadge(power, maxPower) {
  if (maxPower > 0 && power === maxPower) return `<span class="badge badge-green">●</span>`;
  if (power < 5) return `<span class="badge badge-red">●</span>`;
  return `<span class="badge badge-yellow">●</span>`;
}

/**
 * Calcule le temps offline depuis last_connection
 */
function formatOfflineTime(lastConnection) {
  if (!lastConnection) return "N/A";
  const lastDate = new Date(lastConnection);
  if (isNaN(lastDate)) return "N/A";
  const diffMs = Date.now() - lastDate.getTime();
  const diffHours = Math.floor(diffMs / 1000 / 3600);
  const days = Math.floor(diffHours / 24);
  const hours = diffHours % 24;
  return `${days}j ${hours}h`;
}

/**
 * Fetch un joueur avec retry jusqu'à obtenir max_power > 0 et last_connection
 */
async function fetchUserWithRetry(username, server, retries = 10, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${WORKER_URL}/user/${username}?server=${server}`);
      const data = await res.json();
      const s = data.servers?.[server];
      if (s && s.max_power > 0 && s.last_connection) {
        return { username: data.username, power: s.power, max_power: s.max_power, last_connection: s.last_connection };
      }
      await new Promise(r => setTimeout(r, delay));
    } catch {
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return { username, power: 0, max_power: 0, last_connection: null };
}

// --------------------- Recherche joueur ---------------------
if (formPlayer && playerServerSelect) {
  formPlayer.addEventListener("submit", async e => {
    e.preventDefault();
    const username = e.target.username.value.trim();
    const server = playerServerSelect.value;
    if (!username || !server) {
      resultsDiv.innerHTML = "Veuillez choisir un serveur et saisir un nom de joueur.";
      return;
    }

    resultsDiv.innerHTML = "Chargement du joueur...";

    try {
      const res = await fetch(`${WORKER_URL}/user/${username}?server=${server}`);
      if (!res.ok) throw new Error("Joueur non trouvé");
      const data = await res.json();
      displayPlayer(data, server);
    } catch (err) {
      resultsDiv.innerHTML = `Erreur : ${err.message}`;
    }
  });
}

// --------------------- Affichage joueur ---------------------
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
        <h3>Grade : ${s.groups.length >= 2 ? s.groups[s.groups.length - 2] : ''}</h3>
        <ul>
          <li>Dernière connexion : ${s.last_connection || 'N/A'}</li>
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

// --------------------- Recherche pays ---------------------
if (formCountry && countryServerSelect) {
  formCountry.addEventListener("submit", async e => {
    e.preventDefault();
    const countryName = e.target.country.value.trim();
    const server = countryServerSelect.value;
    if (!countryName || !server) {
      resultsDiv.innerHTML = "Veuillez saisir un pays et choisir un serveur.";
      return;
    }

    resultsDiv.innerHTML = "Chargement du pays...";

    try {
      const res = await fetch(`${WORKER_URL}/country/${server}/${countryName}`);
      if (!res.ok) throw new Error("Pays non trouvé");
      const countryData = await res.json();
      displayCountry(countryData, server);
    } catch (err) {
      resultsDiv.innerHTML = `Erreur : ${err.message}`;
    }
  });
}

// --------------------- Affichage pays ---------------------
function displayCountry(country, server) {
  if (!country) {
    resultsDiv.innerHTML = "Aucun pays trouvé.";
    return;
  }

  const sortedMembers = getSortedMembers(country.members);

  resultsDiv.innerHTML = `
    <div class="country-card">
      <div class="country-header">
        <img src="data:image/png;base64,${country.flag}" class="country-flag" alt="Drapeau">
        <h2>${country.name}</h2>
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
        <button class="but" data-role="Officier">Officiers</button>
        <button class="but" data-role="Membre">Membres</button>
        <button class="but" data-role="Recrue">Recrues</button>
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

    // Fetch tous les membres avec retry
    const membersData = await Promise.allSettled(
      filteredMembers.map(m => fetchUserWithRetry(m.name, server))
    );

    memberList.innerHTML = membersData.map(m => {
      if (m.status !== "fulfilled") return `<li>Inconnu — 0/0 — NA</li>`;
      const { username, power, max_power, last_connection } = m.value;
      const badge = getPowerBadge(power, max_power);
      const offlineTime = formatOfflineTime(last_connection);

      return `
        <li class="member-item">
          ${badge} <strong>${username}</strong> <span class="power">${power}/${max_power}</span> <span class="offline-time">${offlineTime}</span>
        </li>
      `;
    }).join('');
  });
}
