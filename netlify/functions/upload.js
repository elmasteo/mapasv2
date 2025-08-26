// /.netlify/functions/upload
const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST') return { statusCode:405, body:'Method not allowed' };

  try{
    // event.body viene en multipart, Netlify lo pasa como Buffer
    const busboy = require('busboy');
    const bb = busboy({ headers: event.headers });
    
    let fileBuffer = null;
    let filename = '';
    
    const uploadPromise = new Promise((resolve,reject)=>{
      bb.on('file', (name, file, info) => {
        filename = info.filename;
        const chunks = [];
        file.on('data', c => chunks.push(c));
        file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
      });
      bb.on('error', reject);
      bb.on('finish', resolve);
    });
    
    bb.end(Buffer.from(event.body, 'base64'));
    await uploadPromise;

    if(!fileBuffer) throw new Error('No file received');

    const form = new FormData();
    form.append('file', fileBuffer, { filename });
    form.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`, {
      method:'POST',
      body: form
    });

    const json = await res.json();
    return { statusCode:200, body: JSON.stringify({ url: json.secure_url }) };

  } catch(e){
    return { statusCode:500, body: e.message };
  }
};
