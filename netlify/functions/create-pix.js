const crypto = require('crypto');

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

    const external_reference = 'JPTRAB-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    const siteUrl = process.env.SITE_URL || 'https://jusprof-trabalhista.netlify.app';

    const payload = {
      transaction_amount: amount,
      description: body.description || 'JusProf Trabalhista',
      payment_method_id: 'pix',
      payer: {
        email,
        first_name: String(payer.nome || '').split(' ')[0] || 'Cliente'
      },
      external_reference,
      notification_url: `${siteUrl}/.netlify/functions/mp-webhook`
    };

    const mp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': external_reference
      },
      body: JSON.stringify(payload)
    });

    const data = await mp.json();

    if (!mp.ok) {
      return json(mp.status, {
        error: data.message || 'Erro Mercado Pago.',
        details: data
      });
    }

    return json(200, {
      id: data.id,
      payment_id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      external_reference,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code || '',
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64 || '',
      ticket_url: data.point_of_interaction?.transaction_data?.ticket_url || ''
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
