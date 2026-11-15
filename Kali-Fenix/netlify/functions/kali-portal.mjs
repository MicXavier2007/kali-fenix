const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    "x-content-type-options": "nosniff"
  },
  body: JSON.stringify(payload)
});

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Método não permitido." });
  }

  const raw = process.env.FENIX_KALI_PORTAL_URL;
  if (!raw) {
    return json(503, {
      error: "Estação Kali remota ainda não configurada.",
      instruction: "Configure FENIX_KALI_PORTAL_URL com a URL HTTPS de um portal Apache Guacamole protegido por autenticação forte e MFA."
    });
  }

  let portal;
  try {
    portal = new URL(raw);
  } catch {
    return json(500, { error: "FENIX_KALI_PORTAL_URL não contém uma URL válida." });
  }

  if (portal.protocol !== "https:" || portal.username || portal.password) {
    return json(500, {
      error: "O portal deve usar HTTPS e não pode conter credenciais embutidas na URL."
    });
  }

  return {
    statusCode: 302,
    headers: {
      location: portal.toString(),
      "cache-control": "no-store, max-age=0",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff"
    },
    body: ""
  };
}
