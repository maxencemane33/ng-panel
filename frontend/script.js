const btn = document.getElementById("load");
const out = document.getElementById("output");

btn.onclick = async () => {
  out.textContent = "Chargement...";
  const res = await fetch("https://TON-WORKER.workers.dev/alliance");
  const data = await res.json();
  out.textContent = JSON.stringify(data, null, 2);
};

fetch("https://worker.ng-panel.workers.dev")
