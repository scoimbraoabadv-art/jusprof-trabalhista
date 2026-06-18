const https = require("https");
const fs = require("fs");
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const VALOR_ESPERADO = parseFloat(process.env.VALOR_CALCULO || "19.90");
const STORE_PATH = "/tmp/jusprof_payments.json";

function loadStore() { try { return JSON.parse(fs.readFileSync(STORE_PATH, "utf8")); } catch { return {}; } }
function saveStore(data) { try { fs.writeFileSync(STORE_PATH, JSON.stringify(data)); } catch (e) {} }
function normalizeKey(s) { return String(s || "").toLowerCase().trim(); }

function mpRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "api.mercadopago.com",
      path,
      method,
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, (res) => {
      let d = "";
      res.on("data", (chunk) => (d += chunk));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  if (event.httpMethod === "GET") {
    const identifier = event.queryStringParameters?.check;
    if (!identifier) return { statusCode: 400, headers, body: JSON.stringify({ error: "check obrigatorio" }) };
    const store = loadStore();
    const entry = store[normalizeKey(identifier)];
    if (entry && entry.status === "aprovado") {
      const token = Buffer.from(JSON.stringify({ id: identifier, ts: Date.now(), ok: true })).toString("base64");
      return { statusCode: 200, headers, body: JSON.stringify({ liberado: true, token, pagador: entry.pagador, valor: entry.valor }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ liberado: false }) };
  }

  if (event.httpMethod === "POST") {
    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }

    if (body.action === "gerar_pix") {
      const { email, name, valor } = body;
      if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: "Email obrigatorio" }) };
      try {
        const payment = await mpRequest("POST", "/v1/payments", {
          transaction_amount: parseFloat(valor) || VALOR_ESPERADO,
          description: "Calculo Trabalhista JusProf",
          payment_method_id: "pix",
          payer: { email, first_name: name || "Cliente" },
          external_reference: email,
          notification_url: "https://jusprof-trabalhista.netlify.app/api/mp-webhook"
        });
        if (payment.point_of_interaction?.transaction_data?.qr_code) {
          return { statusCode: 200, headers, body: JSON.stringify({
            qr_code: payment.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: payment.point_of_interaction.transaction_data.qr_code_base64,
            payment_id: payment.id
          })};
        }
        return { statusCode: 500, headers, body: JSON.stringify({ error: "QR Code nao gerado", detail: payment }) };
      } catch (e) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
      }
    }

    const type = body.type || event.queryStringParameters?.type;
    const paymentId = body.data?.id || event.queryStringParameters?.["data.id"];
    if (type !== "payment" || !paymentId) return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

    try {
      const payment = await mpRequest("GET", `/v1/payments/${paymentId}`);
      const status = payment.status;
      const valor = payment.transaction_amount;
      const email = payment.payer?.email || "";
      const pagador = payment.payer?.first_name || email;
      if (status === "approved" && valor >= VALOR_ESPERADO - 0.01) {
        const store = loadStore();
        const key = normalizeKey(email || String(paymentId));
        store[key] = { status: "aprovado", paymentId, pagador, email, valor, approvedAt: new Date().toISOString() };
        saveStore(store);
      }
    } catch (e) { console.error("Erro webhook:", e); }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Metodo nao permitido" }) };
};
