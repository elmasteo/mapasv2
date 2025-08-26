const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    // Netlify Functions recibe event.body en base64 si es binario
    const isBase64 = event.isBase64Encoded;
    const bodyBuffer = isBase64 ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'utf8');

    // Extraer el archivo enviado desde el frontend
    // El frontend envía: form.append('file', file)
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];

    const form = new FormData();
    form.append('file', bodyBuffer, { filename: 'uploadfile', contentType });
    form.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`, {
      method: 'POST',
      body: form
    });

    const json = await res.json();
    if (!json.secure_url) throw new Error('Cloudinary upload failed');

    return { statusCode: 200, body: JSON.stringify({ url: json.secure_url }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
