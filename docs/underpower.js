const WORKER_URL = "https://ng-panel.ng-panel.workers.dev";

const serverSelect = document.getElementById("serverSelect");
const loadBtn = document.getElementById("loadBtn");
const resultsDiv = document.getElementById("results");
const statusDiv = document.getElementById("status");


loadBtn.addEventListener("click", () => {
  loadUnderpower(serverSelect.value);
});

async function loadUnderpower(server) {
  resultsDiv.innerHTML = "";
  statusDiv.textContent = "Chargement de la liste des pays…";

  try {
    // 1️⃣ récupérer la liste des pays du serveur
    const listRes = await fetch(`${WORKER_URL}/country/list/${server}`);
    if (!listRes.ok) throw new Error("Impossible de récupérer la liste des pays");
    const data = await listRes.json();
    const countries = data.claimed.map(c => c.name); // ✅ juste les pays possédés

    statusDiv.textContent = `Analyse de ${countries.length} pays…`;

    // 2️⃣ récupérer les infos pays (en parallèle, mais sécurisé)
    const results = await Promise.allSettled(
      countries.map(name => fetchCountry(server, name))
    );

    let underpowered = [];

    results.forEach(r => {
      if (r.status !== "fulfilled") return;
      const c = r.value;

      if (c.count_claims > c.power - marge.value) {
        underpowered.push(c);
      }
    });

    statusDiv.textContent = `${underpowered.length} pays en sous power trouvés`;

    displayCountries(underpowered, server);

  } catch (err) {
    statusDiv.textContent = "Erreur lors du chargement ❌";
    console.error(err);
  }
}

async function fetchCountry(server, name) {
  const res = await fetch(`${WORKER_URL}/country/${server}/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error("Pays non trouvé");
  return await res.json();
}

function displayCountries(countries, server) {
  if (countries.length === 0) {
    resultsDiv.innerHTML = "<p>Aucun pays en sous power 🎉</p>";
    return;
  }

  resultsDiv.innerHTML = countries
    .sort((a, b) => (b.count_claims - b.power) - (a.count_claims - a.power))
    .map(c => {
      const diff = c.count_claims - c.power;

      return `
        <div class="country-card underpower">
          <div class="country-header">
            <img src="data:image/png;base64,${c.flag}" class="country-flag">
            <h2>${c.name}</h2>
          </div>
          <p><strong>Leader :</strong> ${c.leader}</p>
          <p><strong>Power :</strong> ${c.power}/${c.maxpower}</p>
          <p><strong>Claims :</strong> ${c.count_claims}</p>
          <p class="danger">Sous power de ${diff} claims</p>
        </div>
      `;
    })
    .join("");
}
