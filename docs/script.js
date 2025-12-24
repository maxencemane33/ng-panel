// --------------------- Sélection des éléments du DOM ---------------------
const formPlayer = document.getElementById("searchPlayerForm");   // Formulaire recherche joueur
const formCountry = document.getElementById("searchCountryForm"); // Formulaire recherche pays
const resultsDiv = document.getElementById("results");            // Conteneur des résultats
const playerServerSelect = document.getElementById("playerServer");   // Sélecteur serveur joueur
const countryServerSelect = document.getElementById("countryServer"); // Sélecteur serveur pays

const WORKER_URL = "https://ng-panel.ng-panel.workers.dev";

// --------------------- Fonctions utilitaires ---------------------

/**
 * Fonction pour trier et formater les membres d'un pays par rôle
 * @param {Array} members - liste des membres bruts avec préfixes (*,+,-)
 * @returns {Array} - liste des membres {name, role} triée
 */
function getSortedMembers(members) {
  const roles = { "*": "Officier", "+": "Membre", "-": "Recrue" };
  return members
    .filter(m => !m.startsWith("**")) // Supprimer les chefs
    .map(m => {
      const prefix = m[0];
      const name = m.slice(1);
      return { name, role: roles[prefix] || "Inconnu" };
    })
    .sort((a, b) => ["Officier", "Membre", "Recrue"].indexOf(a.role) - ["Officier", "Membre", "Recrue"].indexOf(b.role));
}

/**
 * Badge couleur selon la puissance
 * @param {number} power 
 * @param {number} maxPower 
 * @returns {string} HTML d'un badge
 */
function getPowerBadge(power, maxPower) {
  if (maxPower > 0 && power === maxPower) return `<span class="badge badge-green">●</span>`;
  if (power < 5) return `<span class="badge badge-red">●</span>`;
  return `<span class="badge badge-yellow">●</span>`;
}

/**
 * Fonction pour fetcher un joueur avec retry si max_power = 0
 * @param {string} username 
 * @param {string} server 
 * @param {number} retries 
 * @param {number} delay - en ms
 */
async function fetchUserWithRetry(username, server, retries = 10, delay = 1) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${WORKER_URL}/user/${username}?server=${server}`);
      const data = await res.json();
      const s = data.servers?.[server];
      if (s && s.max_power > 0) return { power: s.power, max_power: s.max_power };
      await new Promise(r => setTimeout(r, delay));
    } catch {
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return { power: 0, max_power: 0 };
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

// --------------------- Recherche pays ---------------------
if (formCountry && countryServerSelect) {
  formCountry.addEventListener("submit", async e => {
    e.preventDefault();
    const country = e.target.country.value.trim();
    const server = countryServerSelect.value;
    if (!country || !server) {
      resultsDiv.innerHTML = "Veuillez choisir un serveur et saisir un nom de pays.";
      return;
    }

    resultsDiv.innerHTML = "Chargement du pays...";

    try {
      const res = await fetch(`${WORKER_URL}/country/${server}/${country}`);
      if (!res.ok) throw new Error("Pays non trouvé");
      const data = await res.json();
      displayCountry(data, server);
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
        <img src="data:image/png;base64,${country.flag}" alt="Drapeau ${country.name}" class="country-flag">
        <h2>${country.name} </h2>
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

  const membersData = await Promise.allSettled(
    filteredMembers.map(async m => {
      try {
        const res = await fetch(`${WORKER_URL}/user/${m.name}?server=${server}`);
        const data = await res.json();
        const s = data.servers?.[server] || {};
        return {
          ...m,
          power: s.power || 0,
          max_power: s.max_power || 0,
          last_connection: s.last_connection || null
        };
      } catch {
        return { ...m, power: 0, max_power: 0, last_connection: null };
      }
    })
  );

  memberList.innerHTML = membersData.map(m => {
    if (m.status !== "fulfilled") return `<li>Inconnu — 0/0 — N/A</li>`;

    const { name, power, max_power, last_connection } = m.value;
    const badge = getPowerBadge(power, max_power);

    // Calcul du temps depuis la dernière connexion
    let offlineText = "N/A";
    if (last_connection) {
      const diffMs = Date.now() - new Date(last_connection).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      offlineText = `${diffDays}j ${diffHours}h depuis la dernière connexion`;
    }

    return `
      <li class="member-item">
        ${badge} <strong>${name}</strong>
        <span class="power">${power}/${max_power}</span>
        <span class="offline-time">${offlineText}</span>
      </li>
    `;
  }).join('');
});


}

