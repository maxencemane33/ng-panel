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
async function fetchUserWithRetry(username, server, retries = 20, delay = 500) {
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
  // 🥚 EASTER EGG ULTIME
if (username.toLowerCase() === "romain") {
  resultsDiv.innerHTML = "";

  const TEXT = "DAAAARRRRRBBBBBAAAAAASSSSSS";
  const COUNT = 12; // nombre de textes affichés

  for (let i = 0; i < COUNT; i++) {
   const el = document.createElement("div");
el.className = "romain-chaos";

const inner = document.createElement("div");
inner.className = "romain-chaos-inner";
inner.textContent = TEXT;

el.style.top = Math.random() * 90 + "vh";
el.style.left = Math.random() * 90 + "vw";
inner.style.animationDelay = `${Math.random() * 1.5}s`;

el.appendChild(inner);
document.body.appendChild(el);
  }

  return;
}


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
          <li><strong>Dernière connexion : </strong>${s.last_connection || 'N/A'}</li>
          <li><strong>Pays :</strong> ${s.country || 'N/A'}</li>
          <li><strong>Rank : </strong>${s.country_rank || 'N/A'}</li>
          <li><strong>Power : </strong>${s.power}/${s.max_power}</li>
          <li><strong>Playtime : </strong>${(s.playtime/3600).toFixed(2)}h</li>
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
async function displayCountry(country, server) {
  const leader = await fetchLeaderData(country.leader, server);

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
      <p><strong>Date de création :</strong> ${country.creation_date}</p>
      <div class="leader-box">
      <strong>Dirigeant :</strong>
  <img src="${leader.head}" class="leader-head" alt="Leader head">
  <div class="leader-text">
    ${leader.name}
    <span class="power">${leader.power}/${leader.max_power}</span>
  </div>
</div>

      <p><strong>Membres : </strong>${country.count_members}</p>
      <p><strong>Banque :</strong> ${country.bank}</p>
      <p><strong>Puissance :</strong> ${country.power}/${country.maxpower}</p>
      <p><strong>Claims :</strong> ${country.count_claims}</p>
      <p><strong>MMR : </strong>${country.mmr} — Level : ${country.level}</p>
      <p><strong>Description :</strong> ${country.description || 'N/A'}</p>

      <div id="member-filters">
        <button id="load-notations" class="but">📊 Voir les notations</button>
        <button class="but" data-role="Officier">Officiers</button>
        <button class="but" data-role="Membre">Membres</button>
        <button class="but" data-role="Recrue">Recrues</button>
      </div>
      <ul id="member-list"></ul>
        <div id="notations-container"></div>
    </div>
  `;
const notationsBtn = document.getElementById("load-notations");

if (notationsBtn) {
  notationsBtn.addEventListener("click", () => {
    loadCountryNotations(country.name, server);
  });
}

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

// --------------------- NOTATIONS PAYS ---------------------

/**
 * Calcule automatiquement la semaine actuelle pour l'API
 */
function getCurrentApiWeek() {
  const now = new Date();

  // Calcul du lundi de la semaine actuelle
  const day = now.getDay(); // 0 = dimanche, 1 = lundi, ...
  const diffToMonday = (day === 0 ? -6 : 1 - day); // si dimanche, recule de 6 jours
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  // Référence pour la semaine 1 de l'API
  const refDate = new Date("2023-01-02"); // lundi 2 janvier 2023 = semaine 1 API
  const diffWeeks = Math.floor((monday - refDate) / (7 * 24 * 60 * 60 * 1000));

  return 1 + diffWeeks; // +1 car semaine 1 = référence
}

/**
 * Charge et affiche les notations d'un pays
 * Le chargement se fait uniquement au clic (lazy loading)
 * @param {string} countryName
 * @param {string} server
 */
async function loadCountryNotations(countryName, server) {
  const container = document.getElementById("notations-container");
  if (!container) return;

  const safe = val => val == null ? 0 : val;

  container.innerHTML = "Chargement des notations...";

  try {
    const currentWeek = getCurrentApiWeek()+2763; // récupère la semaine actuelle
    const res = await fetch(`${WORKER_URL}/notations?server=${server}&country=${encodeURIComponent(countryName)}&week=${currentWeek}`);
    if (!res.ok) throw new Error("Impossible de charger les notations");

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = `Aucune notation disponible pour ce pays (semaine ${currentWeek}).`;
      return;
    }

    const entry = data[0]; // entrée correspondant au pays

    // Section infos clés
    let html = `
      <div class="notation-block">
        <h4>Informations clés (Semaine ${currentWeek})</h4>
        <ul>
          <li><strong>TOP :</strong> ${safe(entry.rang)}</li>
          <li><strong>Total :</strong> ${safe(entry.total)}</li>
          <li><strong>Bourse :</strong> ${safe(entry.bourse)}</li>
          <li><strong>UNESCO Bourse :</strong> ${safe(entry.unesco_bourse)}</li>
        </ul>
      </div>
    `;

    // Section notations principales
    html += `
      <div class="notation-block">
        <h4>Notations principales</h4>
        <ul>
          <li><strong>Activité : </strong>${safe(entry.activity)}</li>
          <li><strong>Gestion : </strong>${safe(entry.gestion)}</li>
          <li><strong>Skills : </strong>${safe(entry.skills)}</li>
          <li><strong>Economie : </strong>${safe(entry.econ)}</li>
          <li><strong>Militaire : </strong>${safe(entry.military)}</li>
          <li><strong>Antimatter : </strong>${safe(entry.antim)}</li>
          <li><strong>Redmatter : </strong>${safe(entry.red)}</li>
          <li><strong>Endbringer : </strong>${safe(entry.endbringer)}</li>
          <li><strong>Fusee : </strong>${safe(entry.fusee)}</li>
          <li><strong>UNESCO : </strong>${safe(entry.unesco)}</li>
        </ul>
      </div>
    `;

    // Section architecture + staff
    const arch = entry|| {};
    const architectureTotal = (
      safe(arch.coherence_style) +
      safe(arch.activite_recente) +
      safe(arch.blocs_catalogue) +
      safe(arch.trou_missiles) +
      safe(arch.habitabilite_maison) +
      safe(arch.biome_coherent) +
      safe(arch.batiments_abandonnes) +
      safe(arch.terraforming_realiste) +
      safe(arch.utilisation_schematica) +
      safe(arch.coherence_lumieres) +
      safe(arch.roleplay_pays) +
      safe(arch.organics) +
      safe(arch.terraforming) +
      safe(arch.beaute)
    ) * safe(arch.surface_construite || 1);

    html += `
      <div class="notation-block">
        <h4>Architecture — Total calculé : ${architectureTotal.toFixed(2)}</h4>
        <ul>
         <li>Coherence Style : </strong>${safe(arch.coherence_style)}</li>
  <li><strong>Activité Récente : </strong>${safe(arch.activite_recente)}</li>
  <li><strong>Blocs Catalogue : </strong>${safe(arch.blocs_catalogue)}</li>
  <li><strong>Surface Construite : </strong>${safe(arch.surface_construite)}</li>
  <li><strong>Trou Missiles : </strong>${safe(arch.trou_missiles)}</li>
  <li><strong>Habitabilité Maison : </strong>${safe(arch.habitabilite_maison)}</li>
  <li><strong>Biome Coherent : </strong>${safe(arch.biome_coherent)}</li>
  <li><strong>Bâtiments Abandonnés : </strong>${safe(arch.batiments_abandonnes)}</li>
  <li><strong>Terraforming Réaliste : </strong>${safe(arch.terraforming_realiste)}</li>
  <li><strong>Utilisation Schématique : </strong>${safe(arch.utilisation_schematica)}</li>
  <li><strong>Coherence Lumières : </strong>${safe(arch.coherence_lumieres)}</li>
  <li><strong>Roleplay Pays : </strong>${safe(arch.roleplay_pays)}</li>
  <li><strong>Organics : </strong>${safe(arch.organics)}</li>
  <li><strong>Terraforming : </strong>${safe(arch.terraforming)}</li>
  <li><strong>Béauté : </strong>${safe(arch.beaute)}</li>
  <li><strong>Staff :</strong> ${safe(entry.staff)}</li>
      </div>
    `;

    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = "Erreur lors du chargement des notations ❌";
    console.error(err);
  }
}

async function fetchLeaderData(username, server) {
  try {
    const res = await fetch(`${WORKER_URL}/user/${username}?server=${server}`);
    if (!res.ok) throw new Error("Leader introuvable");

    const data = await res.json();
    const s = data.servers?.[server];

    return {
      name: data.username,
      head: data.skin?.head || "",
      power: s?.power ?? 0,
      max_power: s?.max_power ?? 0
    };
  } catch {
    return {
      name: username,
      head: "",
      power: 0,
      max_power: 0
    };
  }
}
