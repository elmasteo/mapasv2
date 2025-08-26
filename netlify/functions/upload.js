const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST') return { statusCode:405, body:'Method not allowed' };

  try{
    const body = JSON.parse(event.body);
    const { fileBase64, filename } = body;
    const buffer = Buffer.from(fileBase64, 'base64');

    const form = new FormData();
    form.append('file', buffer, { filename });
    form.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`, {
      method:'POST',
      body: form
    });

    const json = await res.json();
    return { statusCode: 200, body: JSON.stringify({ url: json.secure_url }) };
  } catch(e){
    return { statusCode: 500, body: e.message };
  }
};
