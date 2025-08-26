const fetch = require('node-fetch');

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST') return { statusCode:405, body:'Method not allowed' };

  try{
    const place = JSON.parse(event.body);

    // ID opcional: si ya existe, actualiza; si no, crea nuevo
    const slug = place.id ? `place-${place.id}` : `place-${Date.now()}`;

    const response = await fetch(`${process.env.NETLIFY_API_URL}/collections/lugares/entries/${slug}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.NETLIFY_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        entry: {
          ...place,
          id: slug
        }
      })
    });

    const json = await response.json();
    return { statusCode:200, body: JSON.stringify(json) };

  } catch(e){
    return { statusCode:500, body: e.message };
  }
};
