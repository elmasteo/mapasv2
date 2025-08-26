const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') 
    return { statusCode: 405, body: 'Method not allowed' };

  try {
    const data = JSON.parse(event.body);

    const url = `https://api.netlify.com/api/v1/sites/${process.env.NETLIFY_SITE_ID}/cms/collections/places/entries`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NETLIFY_API_TOKEN}`
      },
      body: JSON.stringify({ entry: data })
    });

    // Leer el texto crudo primero
    const text = await res.text();

    let json;
    try { 
      json = JSON.parse(text); 
    } catch(e) {
      throw new Error(`CMS save failed, response not JSON: ${text}`);
    }

    if (!res.ok) throw new Error(json.msg || 'CMS save failed');

    return { statusCode: 200, body: JSON.stringify({ success: true, entry: json }) };

  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
