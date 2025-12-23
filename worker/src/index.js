export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (url.pathname !== "/alliance") {
      return new Response("Not found", { status: 404 });
    }

    const ngRes = await fetch(
      "https://publicapi.nationsglory.fr",
      {
        headers: {
          "Authorization": `Bearer ${env.NG_API_KEY}`
        }
      }
    );

    const data = await ngRes.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
