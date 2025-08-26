// /.netlify/functions/upload
const fetch = require('node-fetch');
const FormData = require('form-data');
const Busboy = require('busboy');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType) throw new Error('No content-type header');

    // Busboy para procesar multipart/form-data
    const bb = Busboy({ headers: { 'content-type': contentType } });
    let fileBuffer = null;
    let filename = '';
    let fileType = '';

    const uploadPromise = new Promise((resolve, reject) => {
      bb.on('file', (name, file, info) => {
        filename = info.filename;
        fileType = info.mimeType || '';
        const chunks = [];
        file.on('data', (c) => chunks.push(c));
        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });
      bb.on('error', reject);
      bb.on('finish', resolve);
    });

    bb.end(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
    await uploadPromise;

    if (!fileBuffer) throw new Error('No file received');

    const form = new FormData();
    form.append('file', fileBuffer, { filename });
    form.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);

    // Detectamos tipo Cloudinary automáticamente
    const cloudType = fileType.startsWith('video/') ? 'raw' : 'auto';

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${cloudType}/upload`,
      { method: 'POST', body: form }
    );

    const json = await res.json();
    if (!json.secure_url) throw new Error('Cloudinary upload failed');

    return { statusCode: 200, body: JSON.stringify({ url: json.secure_url }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
