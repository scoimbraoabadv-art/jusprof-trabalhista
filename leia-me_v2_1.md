# JusProf Trabalhista — V2.1 — 57 agentes

## V2.1 — Insalubridade com a base correta
- **Base salário mínimo:** usa o mínimo vigente em cada mês do período, contado de trás para frente a partir da saída. Os valores de 2020 a 2026 foram conferidos no Planalto: Lei 14.013/2020, Lei 14.158/2021, Lei 14.358/2022, MP 1.143/2022, Lei 14.663/2023 e Decretos 11.864/2023, 12.342/2024 e 12.797/2025.
- **Base da convenção coletiva:** usa o valor fixado na norma, sem trocar pelo salário mínimo.
- **Meses anteriores a jan/2020:** não são calculados pelo mínimo e geram um alerta. Para esse período, informe a base da convenção.

---
# Histórico — V2.0

## O que mudou
- **Dois modos, mesmo pagamento (R$ 19,90 por cálculo):**
  - **Trabalhador:** é o cálculo de antes, acrescido de descontos, líquido, seguro-desemprego e prazos.
  - **Profissional:** feito para advogado ou empresa. Inclui jornada, adicionais, estabilidades, multas, dano e correção.
- **Seis modalidades novas:** justa causa, rescisão indireta, culpa recíproca, encerramento antecipado do contrato a prazo pela empresa (art. 479) ou pelo trabalhador (art. 480) e falecimento.
- **Resultado:** cada verba mostra o agente que a calculou. O resultado traz ainda descontos, líquido estimado, alertas, informações de prazo e a memória de cálculo com a base legal.
- **Cálculo no servidor:** continua no servidor, com o pagamento e o uso único do PIX inalterados. O motor fica em `netlify/functions/_shared/trabalhista.js`.

## Os 57 agentes
| Grupo | Agentes |
|---|---|
| Modalidades | T01–T10 |
| Verbas rescisórias | T11–T17 |
| FGTS | T18–T21 |
| Jornada | T22–T30 (HE 50%/100%, DSR, noturno, intervalos, sobreaviso, banco de horas, reflexos) |
| Adicionais e salário | T31–T38 |
| Estabilidades | T39–T42 |
| Multas e indenizações | T43–T46 |
| Descontos | T47–T51 |
| Seguro-desemprego | T52–T53 |
| Prazos e processo | T54–T57 |

## Valores de 2026 conferidos em fonte oficial
- **Salário mínimo:** R$ 1.621,00 (Decreto 12.797/2025, planalto.gov.br).
- **INSS:** 7,5% / 9% / 12% / 14%, com teto de R$ 8.475,55 (Portaria Interministerial MPS/MF 13/2026, gov.br/inss).
- **IRRF:** tabela de 2026, com dependente de R$ 189,59, desconto simplificado de R$ 607,20 e a redução da Lei 15.270/2025 (art. 3º-A da Lei 9.250, inclusive para o 13º pelo § 3º).
- **Seguro-desemprego:** faixas de R$ 2.222,17 e R$ 3.703,99, teto de R$ 2.518,65 e piso de R$ 1.621,00. A tabela foi publicada pelo MTE e lida em trabalho.ce.gov.br, porque a página do MTE exige login. As regras de parcelas foram lidas em gov.br/trabalho-e-emprego.
- **Artigos lidos no texto oficial:**
  - Lei 12.506/2011.
  - CLT arts. 11, 59 § 1º, 71 § 4º, 223-G, 477 § 6º e 484-A, pela Lei 13.467/2017.
  - CLT arts. 66 e 73, no texto da Câmara.

## Base legal NÃO conferida nesta versão
A ferramenta de leitura corta as páginas da CLT por volta do art. 75. Por isso não reli o texto oficial de:
- **CLT:** arts. 130, 137, 146, 192, 193, 461, 466, 469, 479, 480, 482–484, 487 e 543.
- **Outras leis:** Lei 8.036/90, Lei 605/49, Lei 7.238/84, Lei 7.418/85 e Lei 8.213/91.
- **Jurisprudência:** ADCT, súmulas e OJs do TST.

Esses agentes aparecem na memória de cálculo como "base não conferida nesta versão". As regras usadas são as tradicionais (por exemplo, insalubridade de 10/20/40% e periculosidade de 30%), mas precisam da sua conferência antes de serem divulgadas.

## Limitações conhecidas
- **Reflexos:** calculados pela média do período informado (habituais ÷ 12 para 13º e férias), sem apuração mês a mês.
- **Correção monetária:** só aplica um fator informado pelo usuário, tirado de tabela oficial. Não inventa índice.
- **Dano extrapatrimonial:** é parâmetro (até N salários), com caráter orientativo segundo a ADI 6050, e não é somado ao total.
- **Valores no processo:** IRRF e INSS de verbas pagas em juízo, como RRA (art. 12-A da Lei 7.713), não são calculados.

## Validação
- **Regressão:** 2.000 contratos aleatórios no modo simples deram resultado idêntico ao da V1.0, em itens, total, FGTS e saque.
- **Casos à mão:** INSS, IRRF, seguro-desemprego, novas modalidades e modo profissional (`npm test`).
- **Navegador (390 px):** 14 verificações passaram, com a finalização chamando o motor real e o pagamento simulado, sem erros JavaScript.
- **Não testado:** pagamento real no Mercado Pago (não houve cobrança).

## Fase 2 (não incluída)
Cálculo coletivo por planilha, com vários empregados e relatório consolidado.
