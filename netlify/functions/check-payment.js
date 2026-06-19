exports.handler = async (event) => {
  try {
    const token = process.env.MP_ACCESS_TOKEN;

    if (!token) {
      return json(500, {
        error: "MP_ACCESS_TOKEN não configurado."
      });
    }

    const id =
      event.queryStringParameters?.id ||
      event.queryStringParameters?.payment_id;

    if (!id) {
      return json(400, {
        error: "payment_id obrigatório"
      });
    }

    const resp = await fetch(
      `https://api.mercadopago.com/v1/payments/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await resp.json();

    return json(200, {
      id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      external_reference: data.external_reference,
      transaction_amount: data.transaction_amount,
      payer: data.payer
    });

  } catch (e) {

    return json(500, {
      error: e.message
    });

  }
};

function json(statusCode, body) {

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(body)
  };

}
