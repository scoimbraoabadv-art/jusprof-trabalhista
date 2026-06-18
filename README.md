# JusProf Trabalhista — Configuração do Pagamento Automático

## Como funciona

1. Cliente acessa o sistema e vê as telas bloqueadas
2. Cliente paga o PIX (R$ 19,90)
3. Mercado Pago envia um **webhook** para sua Netlify Function
4. A Function confirma o pagamento e libera o token
5. Cliente clica em **"Verificar pagamento"** com o e-mail usado no PIX
6. Sistema libera automaticamente por 2 horas

---

## Passo a passo para configurar

### 1. Faça o deploy no Netlify

- Suba os arquivos para um repositório GitHub
- Conecte o repositório no [Netlify](https://netlify.com)
- O `netlify.toml` já configura tudo automaticamente

### 2. Configure a variável de ambiente no Netlify

Vá em **Site Settings → Environment Variables** e adicione:

| Variável | Valor |
|---|---|
| `MP_ACCESS_TOKEN` | Seu Access Token de **produção** do Mercado Pago |
| `VALOR_CALCULO` | `19.90` |

> Onde encontrar o Access Token: [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/app) → Suas integrações → Credenciais de produção → Access Token

### 3. Configure o Webhook no Mercado Pago

Vá em **Mercado Pago Developers → Webhooks** e adicione:

- **URL:** `https://SEU-SITE.netlify.app/api/mp-webhook`
- **Eventos:** marque `Payments`

### 4. Configure o PIX no sistema

No `index.html`, localize o campo `pixKey` e coloque sua chave PIX real:
```
value="SUA_CHAVE_PIX_AQUI"
```

### 5. Peça ao cliente usar o mesmo e-mail no PIX

O sistema identifica o pagador pelo **e-mail cadastrado no Mercado Pago**.
Instrua o cliente a usar o mesmo e-mail ao verificar o pagamento.

---

## Importante

- O armazenamento atual usa `/tmp` na Netlify Function (memória da instância serverless)
- Para produção com alto volume, substitua por um banco de dados (Supabase, FaunaDB, etc.)
- O token de acesso expira em **2 horas** — o cliente pode verificar novamente para renovar

---

## Estrutura dos arquivos

```
├── index.html                    ← Frontend do sistema
├── netlify.toml                  ← Configuração do Netlify
└── netlify/
    └── functions/
        └── mp-webhook.js         ← Recebe webhook do MP e libera acesso
```
