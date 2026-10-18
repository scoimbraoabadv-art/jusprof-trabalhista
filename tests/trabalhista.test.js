// Testes do motor trabalhista V2.0 — node tests/trabalhista.test.js
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const T=require('../netlify/functions/_shared/trabalhista.js');
const near=(a,b,m)=>assert.ok(Math.abs(a-b)<0.006,`${m}: ${a} ≠ ${b}`);

// 1) Regressão: modo simples idêntico à versão 1.0 (função original guardada em tests/fixtures).
const origSrc=fs.readFileSync(path.join(__dirname,'fixtures/calculate-v1.js'),'utf8');
const orig=new Function(origSrc+';return calculate;')();
let rnd=7;const r=()=>(rnd=(rnd*48271)%2147483647)/2147483647;
const iso=d=>d.toISOString().slice(0,10);
for(let i=0;i<2000;i++){
  const start=new Date(Date.UTC(2015+Math.floor(r()*11),Math.floor(r()*12),1+Math.floor(r()*28))),end=new Date(start.getTime()+Math.floor(r()*3000)*864e5);
  const motivo=['semJustaCausa','pedidoDemissao','acordo','terminoContrato'][Math.floor(r()*4)],ferias=Math.floor(r()*4);
  const data={salario:(1000+r()*15000).toFixed(2).replace('.',','),admissao:iso(start),saida:iso(end),motivo,aviso:motivo==='pedidoDemissao'?['trabalhado','naoCumprido'][Math.floor(r()*2)]:['indenizado','trabalhado'][Math.floor(r()*2)],ferias:String(ferias),dobro:String(Math.floor(r()*(ferias+1))),fgtsIn:r()<.3?(r()*50000).toFixed(2).replace('.',','):''};
  const a=orig(data),b=T.calculate(data);
  assert.equal(b.total,a.total,'total #'+i);assert.equal(b.fgts,a.fgts);assert.equal(b.withdrawal,a.withdrawal);
  assert.deepEqual(b.items.map(x=>[x.label,x.detail,x.value]),a.items.map(x=>[x.label,x.detail,x.value]),'itens #'+i);
}
console.log('PASSOU — regressão: 2.000 contratos aleatórios no modo simples iguais à versão 1.0');

// 2) Catálogo: 57 agentes únicos, com base legal.
assert.equal(T.AGENTS.length,57);assert.equal(new Set(T.AGENTS.map(a=>a.id)).size,57);
T.AGENTS.forEach(a=>assert.ok(a.base&&a.nome&&['trabalhador','profissional'].includes(a.modo)));
console.log('PASSOU — 57 agentes únicos com base legal');

// 3) Tabelas oficiais 2026 (casos calculados à mão).
near(T.inss(1621),121.58,'INSS no 1º limite');
near(T.inss(3000),248.60,'INSS 3.000');           // 121,575 + 115,3656 + 11,6592
near(T.inss(20000),988.09,'INSS no teto');        // 121,575+115,3656+174,1716+576,9782
assert.equal(T.irrf(5000,T.inss(5000)).imposto,0,'até R$ 5.000 o IR é zerado');
const ir6=T.irrf(6000,T.inss(6000));               // base 5.358,49 → 564,85475 − redução 179,75 = 385,10
near(ir6.reducao,179.75,'redução 6.000');near(ir6.imposto,385.10,'IR 6.000');
assert.equal(T.irrf(8000,T.inss(8000)).reducao,0,'sem redução acima de R$ 7.350');
near(T.seguroValor(1500),1621,'seguro: piso = salário mínimo');
near(T.seguroValor(3000),2166.66,'seguro: 2ª faixa');
near(T.seguroValor(9000),2518.65,'seguro: teto');
assert.equal(T.seguroParcelas(11,1),0);assert.equal(T.seguroParcelas(12,1),4);assert.equal(T.seguroParcelas(24,1),5);assert.equal(T.seguroParcelas(9,2),3);assert.equal(T.seguroParcelas(6,3),3);
console.log('PASSOU — INSS, IRRF (Lei 15.270), seguro-desemprego 2026');

// 4) Novas modalidades.
const base={salario:'3000',admissao:'2024-01-10',saida:'2026-06-20',ferias:'0',dobro:'0'};
const jc=T.calculate({...base,motivo:'justaCausa'});
assert.deepEqual(jc.items.map(i=>i.label),['Saldo de salário'],'justa causa: só saldo (sem férias vencidas)');
assert.equal(jc.withdrawal,0);
const ri=T.calculate({...base,motivo:'rescisaoIndireta',aviso:'indenizado'}),sj=T.calculate({...base,motivo:'semJustaCausa',aviso:'indenizado'});
assert.equal(ri.total,sj.total,'rescisão indireta = dispensa sem justa causa');
assert.ok(ri.info.find(i=>i.agente==='T52').texto.includes('parcela'),'rescisão indireta dá seguro');
const cr=T.calculate({...base,motivo:'culpaReciproca'});
assert.ok(cr.items.some(i=>i.label==='50% do aviso-prévio indenizado'));assert.ok(cr.items.some(i=>i.label==='Multa de 20% do FGTS'));
assert.throws(()=>T.calculate({...base,motivo:'antecipadaEmpregador'}),/data prevista/);
const ae=T.calculate({...base,motivo:'antecipadaEmpregador',termoPrevisto:'2026-08-19'});
near(ae.items.find(i=>i.label==='Indenização do art. 479').value,3000/30*60/2,'art. 479: metade de 60 dias');
const ad=T.calculate({...base,motivo:'antecipadaEmpregado',termoPrevisto:'2026-08-19'});
assert.ok(ad.items.find(i=>/art\. 480/.test(i.label)).value<0);
assert.ok(T.calculate({...base,motivo:'pedidoDemissao',aviso:'trabalhado'}).info.find(i=>i.agente==='T52').texto.includes('não dá direito'));
console.log('PASSOU — justa causa, rescisão indireta, culpa recíproca, arts. 479/480, seguro por modalidade');

// 5) Modo profissional.
const pro=T.calculate({...base,motivo:'semJustaCausa',aviso:'indenizado',modo:'profissional',mesesJornada:'10',he50:'20',noturnas:'35',insalubridade:'20',insalMeses:'10',periculosidade:'true',periMeses:'10',estabilidade:'gestante',estabilidadeData:'2026-08-01',dataPagamento:'2026-07-15',grauDano:'grave',fatorCorrecao:'1,1',dataAjuizamento:'2026-10-18'});
const hora=3000/220;
near(pro.items.find(i=>i.label==='Horas extras 50%').value,Math.round(hora*1.5*20*10*100)/100,'HE 50%');
near(pro.items.find(i=>i.label==='Adicional noturno 20%').value,Math.round(hora*.2*35*60/52.5*10*100)/100,'noturno com hora reduzida');
assert.ok(pro.items.some(i=>i.agente==='T32'),'periculosidade (maior) mantida');assert.ok(!pro.items.some(i=>i.agente==='T31'),'insalubridade descartada');
assert.ok(pro.alerts.some(a=>a.agente==='T33'));
assert.ok(pro.items.some(i=>i.agente==='T39'),'estabilidade gestante');
near(pro.items.find(i=>i.agente==='T43').value,3000,'multa 477 §8º');
assert.ok(pro.info.find(i=>i.agente==='T46').texto.includes('NÃO somado'));
assert.ok(pro.items.some(i=>i.label==='Reflexos em 13º salário'));
assert.ok(pro.memoria.length>=20&&pro.memoria.every(m=>m.base));
// prescrição limita o período
const lim=T.calculate({...base,motivo:'semJustaCausa',aviso:'trabalhado',modo:'profissional',mesesJornada:'80',he50:'10'});
assert.ok(lim.alerts.some(a=>a.agente==='T55'&&/limitado/.test(a.texto)),'período acima do contrato é limitado');
// modo trabalhador ignora campos profissionais
const w=T.calculate({...base,motivo:'semJustaCausa',aviso:'indenizado',he50:'20',insalubridade:'40',insalMeses:'10'});
assert.equal(w.total,sj.total,'modo trabalhador não soma campos profissionais');
assert.ok(w.liquido<w.total&&w.descontos.some(d=>d.agente==='T47'));
console.log('PASSOU — modo profissional: jornada, adicionais, reflexos, estabilidade, multas, dano, prescrição');

// 6) Insalubridade: salário mínimo mês a mês (Planalto) ou base fixa da convenção.
assert.equal(T.smDoMes(2020,0),1039);assert.equal(T.smDoMes(2020,1),1045);assert.equal(T.smDoMes(2023,3),1302);assert.equal(T.smDoMes(2023,4),1320);assert.equal(T.smDoMes(2025,11),1518);assert.equal(T.smDoMes(2026,0),1621);assert.equal(T.smDoMes(2019,11),null);
const ins=(extra)=>T.calculate({salario:'3000',admissao:'2019-01-10',saida:extra.saida,motivo:'semJustaCausa',aviso:'trabalhado',ferias:'0',dobro:'0',modo:'profissional',dataAjuizamento:extra.aj||'2026-10-18',insalubridade:extra.grau,insalMeses:extra.meses,insalBase:extra.base,insalBaseValor:extra.valor}).items.find(i=>i.agente==='T31');
near(ins({saida:'2026-03-15',grau:'40',meses:'6'}).value,0.4*(1621*3+1518*3),'mar/2026 a out/2025: 3×1.621 + 3×1.518');
near(ins({saida:'2023-06-10',grau:'20',meses:'3',aj:'2024-01-10'}).value,0.2*(1320+1320+1302),'virada de maio/2023 (1.302 → 1.320)');
assert.match(ins({saida:'2023-06-10',grau:'20',meses:'3',aj:'2024-01-10'}).detail,/R\$ 1\.302,00 a R\$ 1\.320,00/);
const cct=ins({saida:'2026-03-15',grau:'20',meses:'4',base:'convencao',valor:'2.500,00'});
near(cct.value,0.2*2500*4,'convenção: base fixa, sem troca pelo mínimo');assert.match(cct.detail,/convenção coletiva: R\$ 2\.500,00/);
assert.throws(()=>ins({saida:'2026-03-15',grau:'20',meses:'4',base:'convencao',valor:''}),/^Error: Confira a base da insalubridade/);
const antigo=T.calculate({salario:'3000',admissao:'2018-01-10',saida:'2020-03-15',motivo:'semJustaCausa',aviso:'trabalhado',ferias:'0',dobro:'0',modo:'profissional',dataAjuizamento:'2021-01-10',insalubridade:'20',insalMeses:'6'});
near(antigo.items.find(i=>i.agente==='T31').value,0.2*(1045*2+1039),'só jan–mar/2020 calculados');
assert.ok(antigo.alerts.some(a=>a.agente==='T31'&&/anteriores a jan\/2020/.test(a.texto)),'alerta do período sem tabela');
console.log('PASSOU — insalubridade: mínimo mês a mês (2020–2026) e base fixa da convenção');
