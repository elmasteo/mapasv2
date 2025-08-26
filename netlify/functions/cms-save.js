// /.netlify/functions/cms-save.js
const fetch = require("node-fetch");
const Busboy = require("busboy");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH;
const DATA_FILE = "lugares.json";
const MEDIA_DIR = "media";

// helper para obtener SHA si el archivo ya existe
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

// helper para subir archivo a GitHub
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

// parse multipart/form-data si envían archivos
async function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const headers = {};
    Object.entries(event.headers || {}).forEach(([k,v]) => headers[k.toLowerCase()] = v);

    const busboy = Busboy({ headers });
    const result = { fields: {}, files: [] };

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      let buffer = [];
      file.on("data", (data) => buffer.push(data));
      file.on("end", () => {
        result.files.push({
          name: filename,
          type: mimetype,
          data: Buffer.concat(buffer).toString("base64")
        });
      });
    });

    busboy.on("field", (fieldname, val) => {
      result.fields[fieldname] = val;
    });

    busboy.on("finish", () => resolve(result));
    busboy.on("error", reject);

    busboy.end(Buffer.from(event.body, "base64"));
  });
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    let body;
    let files = [];

    const contentType = event.headers["content-type"] || event.headers["Content-Type"];
    if (contentType?.includes("multipart/form-data")) {
      const parsed = await parseMultipart(event);
      body = parsed.fields.payload ? JSON.parse(parsed.fields.payload) : parsed.fields;
      files = parsed.files;
    } else {
      body = JSON.parse(event.body);
      files = body.files || [];
    }

    // Traer JSON actual
    let places = [];
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${DATA_FILE}`);
      if (res.ok) places = await res.json();
    } catch {}

    body.media = { images: [], audios: [], videos: [] };

    for (const file of files) {
      const filePath = `${MEDIA_DIR}/${file.name}`;
      const safeBase64 = Buffer.from(file.data, "base64").toString("base64");
      await commitToGitHub(filePath, safeBase64, `Add media ${file.name}`);

      if (file.type.startsWith("image/")) body.media.images.push(`/${filePath}`);
      if (file.type.startsWith("audio/")) body.media.audios.push(`/${filePath}`);
      if (file.type.startsWith("video/")) body.media.videos.push(`/${filePath}`);
    }

    places.push(body);

    // Guardar places.json actualizado
    const jsonBase64 = Buffer.from(JSON.stringify(places, null, 2)).toString("base64");
    await commitToGitHub(DATA_FILE, jsonBase64, `Add place ${body.id || "new"}`);

    return { statusCode: 200, body: JSON.stringify({ ok: true, place: body }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
