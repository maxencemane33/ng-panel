addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

const API_KEY = NG_API_KEY; // secret injecté par Wrangler
const API_BASE = "https://publicapi.nationsglory.fr";

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.split("/").filter(Boolean); // ["user","pseudo"] ou ["country","France"]

  // 🔹 Gestion du préflight CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

if (url.pathname === "/notations") {
  const apiUrl = `https://publicapi.nationsglory.fr/notations${url.search}`;
  const apiRes = await fetch(apiUrl, {
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Accept": "application/json"
    }
  });
  return new Response(apiRes.body, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}


  try {
    let data;

    if (path[0] === "user" && path[1]) {
      const username = encodeURIComponent(path[1]);
      const res = await fetch(`${API_BASE}/user/${username}`, {
        headers: { "Authorization": `Bearer ${API_KEY}` }
      });
      data = await res.json();

    } else if (path[0] === "country") {
      if (path[1] && path[2]) {
        // URL avec serveur et nom : /country/:serveur/:nom
        const server = encodeURIComponent(path[1]);
        const countryName = encodeURIComponent(path[2]);
        const res = await fetch(`${API_BASE}/country/${server}/${countryName}`, {
          headers: { "Authorization": `Bearer ${API_KEY}` }
        });
        data = await res.json();
      } else if (path[1]) {
        // URL simple : /country/:nom
        const countryName = encodeURIComponent(path[1]);
        const res = await fetch(`${API_BASE}/country/${countryName}`, {
          headers: { "Authorization": `Bearer ${API_KEY}` }
        });
        data = await res.json();
      } else {
        // Aucun paramètre, renvoyer liste ou message
        data = { error: "Paramètre pays manquant" };
      }

    } else {
      // Sinon : endpoint par défaut (playercount)
      const res = await fetch(`${API_BASE}/playercount`, {
        headers: { "Authorization": `Bearer ${API_KEY}` }
      });
      data = await res.json();
    }

    // 🔹 Réponse JSON avec headers CORS
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
}

