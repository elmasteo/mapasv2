// /.netlify/functions/cms-save.js
const fetch = require("node-fetch");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;     // ej: "usuario/repo"
const GITHUB_BRANCH = process.env.GITHUB_BRANCH; // ej: "main"
const DATA_FILE = "lugares.json";

// helper: obtener SHA si el archivo ya existe
async function getFileSha(filePath) {
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(apiUrl, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
  if (res.ok) {
    const json = await res.json();
    return json.sha;
  }
  return null; // no existe
}

// helper: subir archivo a GitHub
async function commitToGitHub(filePath, base64Content, message) {
  const sha = await getFileSha(filePath);
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

  const payload = { message, branch: GITHUB_BRANCH, content: base64Content };
  if (sha) payload.sha = sha;

  const resp = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GitHub commit failed: ${err}`);
  }
  return resp.json();
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body);

    // traer JSON actual
    let places = [];
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${DATA_FILE}`
      );
      if (res.ok) {
        places = await res.json();
      }
    } catch (err) {
      console.log("lugares.json aún no existe, se creará nuevo.");
    }

    // === eliminar ===
    if (body.deleteId) {
      places = places.filter(p => p.id !== body.deleteId);

      // 💡 aquí aseguramos que incluso [] se guarde en GitHub
      const jsonBase64 = Buffer.from(JSON.stringify(places, null, 2)).toString("base64");
      await commitToGitHub(DATA_FILE, jsonBase64, `Delete place ${body.deleteId}`);

      return { statusCode: 200, body: JSON.stringify({ ok: true, deleted: body.deleteId, count: places.length }) };
    }

    // === insertar o actualizar ===
    const idx = places.findIndex(p => p.id === body.id);
    if (idx >= 0) {
      places[idx] = body; // update
    } else {
      places.push(body); // add
    }

    // guardar siempre el archivo actualizado
    const jsonBase64 = Buffer.from(JSON.stringify(places, null, 2)).toString("base64");
    await commitToGitHub(DATA_FILE, jsonBase64, `Save place ${body.id || "new"}`);

    return { statusCode: 200, body: JSON.stringify({ ok: true, place: body, count: places.length }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
