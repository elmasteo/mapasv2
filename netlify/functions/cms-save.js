const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const data = JSON.parse(event.body);

    const res = await fetch(`${process.env.NETLIFY_API_URL}/collections/places/entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NETLIFY_API_TOKEN}`
      },
      body: JSON.stringify({ entry: data })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.msg || 'CMS save failed');

    return { statusCode: 200, body: JSON.stringify({ success: true, entry: json }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
