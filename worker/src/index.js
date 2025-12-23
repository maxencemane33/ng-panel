export default {
  async fetch(req, env) {
    return new Response(JSON.stringify({ message: "Worker actif !" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
