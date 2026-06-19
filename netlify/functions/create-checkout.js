exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Use POST.' });

    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) return json(500, { error: 'MP_ACCESS_TOKEN não configurado no Netlify.' });

    const body = JSON.parse(event.body || '{}');
    const amount = Number(body.amount || 0);
    const payer = body.payer || {};
    const email = String(payer.email || '').trim();

    if (!amount || amount <= 0) return json(400, { error: 'Valor inválido.' });
    if (!email || !email.includes('@')) return json(400, { error: 'E-mail do pagador inválido.' });

    const siteUrl = process.env.SITE_URL || 'https://jusprof-trabalhista.netlify.app';

    const payload = {
      items: [
        {
          title: body.description || 'JusProf Trabalhista',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: amount
        }
      ],
      payer: { email },
      back_urls: {
        success: siteUrl,
        failure: siteUrl,
        pending: siteUrl
      },
      auto_return: 'approved',
      notification_url: `${siteUrl}/.netlify/functions/mp-webhook`,
      external_reference: 'JPTRAB-CHECKOUT-' + Date.now()
    };

    const mp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await mp.json();

    if (!mp.ok) {
      return json(mp.status, {
        error: data.message || 'Erro ao criar checkout.',
        details: data
      });
    }

    return json(200, {
      id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point
    });

  } catch (e) {
    return json(500, { error: e.message || 'Erro interno.' });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(body)
  };
}
