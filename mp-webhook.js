// netlify/functions/mp-webhook.js
// Recebe webhook do Mercado Pago e libera token de acesso para o pagador

const https = require("https");

// ─── Configuração ──────────────────────────────────────────────────────────
// Defina estas variáveis em: Netlify > Site Settings > Environment Variables
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN; // Token do Mercado Pago
const VALOR_ESPERADO  = parseFloat(process.env.VALOR_CALCULO || "19.90");
// ───────────────────────────────────────────────────────────────────────────

// Busca detalhes do pagamento na API do Mercado Pago
function fetchPayment(paymentId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.mercadopago.com",
      path: `/v1/payments/${paymentId}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // ── GET /mp-webhook?check=<email_ou_id> ─ frontend consulta liberação ──
  if (event.httpMethod === "GET") {
    const identifier = event.queryStringParameters?.check;
    if (!identifier) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Parâmetro 'check' obrigatório." }) };
    }

    // Carrega pagamentos aprovados salvos (usando Netlify Blobs ou variável simples)
    // Por simplicidade, usamos um Map em memória com TTL via arquivo JSON em /tmp
    // Para produção real, use um banco (FaunaDB, Supabase, etc.)
    const store = loadStore();
    const entry = store[normalizeKey(identifier)];

    if (entry && entry.status === "aprovado") {
      // Gera token temporário válido por 2 horas
      const token = Buffer.from(
        JSON.stringify({ id: identifier, ts: Date.now(), ok: true })
      ).toString("base64");
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ liberado: true, token, pagador: entry.pagador, valor: entry.valor }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ liberado: false }),
    };
  }

  // ── POST /mp-webhook ─ webhook do Mercado Pago ──────────────────────────
  if (event.httpMethod === "POST") {
    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch { body = {}; }

    // MP envia type="payment" com data.id = payment_id
    const type = body.type || event.queryStringParameters?.type;
    const paymentId = body.data?.id || event.queryStringParameters?.["data.id"];

    if (type !== "payment" || !paymentId) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, msg: "Evento ignorado." }) };
    }

    // Consulta pagamento no MP para confirmar (nunca confiar apenas no webhook)
    let payment;
    try { payment = await fetchPayment(paymentId); }
    catch (e) {
      console.error("Erro ao buscar pagamento:", e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Erro ao consultar MP." }) };
    }

    const status    = payment.status;           // "approved", "pending", etc.
    const valor     = payment.transaction_amount;
    const email     = payment.payer?.email || "";
    const pagador   = payment.payer?.first_name || email;
    const externalRef = payment.external_reference || "";

    console.log(`Webhook MP: payment_id=${paymentId} status=${status} valor=${valor} email=${email}`);

    if (status === "approved" && valor >= VALOR_ESPERADO - 0.01) {
      // Registra liberação
      const store = loadStore();
      const key = normalizeKey(email || externalRef || String(paymentId));
      store[key] = {
        status: "aprovado",
        paymentId,
        pagador,
        email,
        valor,
        approvedAt: new Date().toISOString(),
      };
      saveStore(store);
      console.log(`Pagamento aprovado e liberado: ${key}`);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Método não permitido." }) };
};

// ── Armazenamento simples em /tmp (persiste durante a instância serverless) ─
// Para produção real, substitua por FaunaDB, Supabase, Redis, etc.
const STORE_PATH = "/tmp/jusprof_payments.json";
const fs = require("fs");

function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, "utf8")); }
  catch { return {}; }
}

function saveStore(data) {
  try { fs.writeFileSync(STORE_PATH, JSON.stringify(data)); }
  catch (e) { console.error("Erro ao salvar store:", e); }
}

function normalizeKey(s) {
  return String(s || "").toLowerCase().trim();
}
