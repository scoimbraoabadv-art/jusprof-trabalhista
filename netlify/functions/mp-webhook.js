// netlify/functions/mp-webhook.js
const https = require("https");
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const VALOR_ESPERADO = parseFloat(process.env.VALOR_CALCULO || "19.90");

function fetchPayment(paymentId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.mercadopago.com",
      path: `/v1/payments/${paymentId}`,
      method: "GET",
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on("error", reject);
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
    const type = body.type || event.queryStringParameters?.type;
    const paymentId = body.data?.id || event.queryStringParameters?.["data.id"];
    if (type !== "payment" || !paymentId) return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    let payment;
    try { payment = await fetchPayment(paymentId); } catch (e) { return { statusCode: 500, headers, body: JSON.stringify({ error: "Erro MP" }) }; }
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
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }
  return { statusCode: 405, headers, body: JSON.stringify({ error: "Metodo nao permitido" }) };
};

const STORE_PATH = "/tmp/jusprof_payments.json";
const fs = require("fs");
function loadStore() { try { return JSON.parse(fs.readFileSync(STORE_PATH, "utf8")); } catch { return {}; } }
function saveStore(data) { try { fs.writeFileSync(STORE_PATH, JSON.stringify(data)); } catch (e) {} }
function normalizeKey(s) { return String(s || "").toLowerCase().trim(); }
