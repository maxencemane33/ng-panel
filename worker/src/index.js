addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

const API_KEY = NG_API_KEY; // secret injecté par Wrangler
const API_BASE = "https://publicapi.nationsglory.fr"; // base de l'API

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.split("/").filter(Boolean); // ["user","pseudo"] ou ["country","France"]

  try {
    if (path[0] === "user" && path[1]) {
  const username = encodeURIComponent(path[1]); // 🔹 encode le pseudo
  const res = await fetch(`${API_BASE}/user/${username}`, {
    headers: { "Authorization": `Bearer ${API_KEY}` }
  });
  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
}

if (path[0] === "country" && path[1]) {
  const country = encodeURIComponent(path[1]); // 🔹 encode le nom du pays
  const res = await fetch(`${API_BASE}/country/${country}`, {
    headers: { "Authorization": `Bearer ${API_KEY}` }
  });
  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
}

    // Sinon : endpoint par défaut (playercount)
    const res = await fetch(`${API_BASE}/playercount`, {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
