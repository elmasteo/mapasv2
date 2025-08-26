const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST') return { statusCode:405, body:'Method not allowed' };

  try {
    // Usamos JSON en el body (frontend puede enviar FormData con tipo, nombre y base64)
    const data = JSON.parse(event.body);
    const { fileBase64, filename, type } = data;
    if (!fileBase64) throw new Error('No file data');

    const buffer = Buffer.from(fileBase64, 'base64');

    const form = new FormData();
    form.append('file', buffer, { filename });
    form.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);

    // Para video usamos tipo 'raw', para imágenes/audio 'auto'
    const cloudType = type === 'video' ? 'raw' : 'auto';

    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${cloudType}/upload`, {
      method:'POST',
      body: form
    });

    const json = await res.json();
    if(!json.secure_url) throw new Error('Cloudinary upload failed');

    return { statusCode:200, body: JSON.stringify({ url: json.secure_url }) };

  } catch(e) {
    console.error(e);
    return { statusCode:500, body: JSON.stringify({ error:e.message }) };
  }
};
