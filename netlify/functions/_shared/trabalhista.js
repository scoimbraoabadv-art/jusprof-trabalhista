// JusProf Trabalhista — motor de cálculo compartilhado (servidor).
// Bloco 1: cálculo original da versão 1.0, copiado sem alteração (apenas renomeado para calculateLegacy).
const number=value=>Number(String(value??'').replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'))||0;
const day=864e5;
const date=value=>{const [y,m,d]=String(value||'').split('-').map(Number);const result=new Date(Date.UTC(y,m-1,d));return y&&m&&d&&!Number.isNaN(result.getTime())?result:null};
const add=(value,days)=>new Date(value.getTime()+days*day);
const diff=(start,end)=>Math.floor((end-start)/day);

function years(start,end){let total=end.getUTCFullYear()-start.getUTCFullYear();if(end<new Date(Date.UTC(end.getUTCFullYear(),start.getUTCMonth(),start.getUTCDate())))total--;return Math.max(0,total)}
function avos13(start,end){const year=end.getUTCFullYear(),initial=start.getUTCFullYear()===year?start:new Date(Date.UTC(year,0,1));let total=0;for(let month=initial.getUTCMonth();month<=end.getUTCMonth();month++){const first=month===initial.getUTCMonth()?initial.getUTCDate():1,last=month===end.getUTCMonth()?end.getUTCDate():new Date(Date.UTC(year,month+1,0)).getUTCDate();if(last-first+1>=15)total++}return Math.min(12,total)}
function avosFerias(start,end){let initial=new Date(Date.UTC(end.getUTCFullYear(),start.getUTCMonth(),start.getUTCDate()));if(initial>end)initial=new Date(Date.UTC(end.getUTCFullYear()-1,start.getUTCMonth(),start.getUTCDate()));while(initial<start)initial=new Date(Date.UTC(initial.getUTCFullYear()+1,initial.getUTCMonth(),initial.getUTCDate()));let total=0;for(let month=0;month<12;month++){const first=new Date(Date.UTC(initial.getUTCFullYear(),initial.getUTCMonth()+month,initial.getUTCDate())),next=new Date(Date.UTC(initial.getUTCFullYear(),initial.getUTCMonth()+month+1,initial.getUTCDate())),last=end<add(next,-1)?end:add(next,-1);if(last>=first&&diff(first,last)+1>=15)total++}return Math.min(12,total)}

function calculateLegacy(data){
  const salary=number(data.salario),start=date(data.admissao),end=date(data.saida),reason=String(data.motivo||''),notice=String(data.aviso||''),validReasons=['semJustaCausa','pedidoDemissao','acordo','terminoContrato'];
  if(!salary||salary>100000000||!start||!end||end<start||!validReasons.includes(reason))throw new Error('Confira o salário, as datas e o motivo do desligamento.');
  const indemnified=(reason==='semJustaCausa'||reason==='acordo')&&notice==='indenizado',noticeDays=Math.min(90,30+years(start,end)*3),projected=indemnified?add(end,noticeDays):end,months13=avos13(start,projected),monthsVacation=avosFerias(start,projected),salaryBalance=salary/30*Math.min(end.getUTCDate(),30),thirteenth=salary/12*months13,proportionalVacation=salary/12*monthsVacation,vacationThird=proportionalVacation/3,noticeValue=indemnified?salary/30*noticeDays*(reason==='acordo'?.5:1):0,fullVacation=Math.max(0,Math.min(3,Number(data.ferias)||0)),lateVacation=Math.max(0,Math.min(fullVacation,Number(data.dobro)||0)),acquiredVacation=(fullVacation-lateVacation)*(salary+salary/3)+lateVacation*2*(salary+salary/3),noticeDiscount=reason==='pedidoDemissao'&&notice==='naoCumprido'?salary:0,contractMonths=Math.max(1,Math.ceil((diff(start,end)+1)/30.4375)),fgts=number(data.fgtsIn)||salary*contractMonths*.08+thirteenth*.08+noticeValue*.08,fine=reason==='semJustaCausa'?fgts*.4:reason==='acordo'?fgts*.2:0,withdrawal=reason==='semJustaCausa'?fgts:reason==='acordo'?fgts*.8:0;
  const items=[
    {label:'Saldo de salário',detail:Math.min(end.getUTCDate(),30)+' dia(s) no mês da saída',value:salaryBalance},
    {label:'13º proporcional',detail:months13+'/12 avos'+(indemnified?' com projeção do aviso':''),value:thirteenth},
    {label:'Férias proporcionais',detail:monthsVacation+'/12 do período aquisitivo',value:proportionalVacation},
    {label:'1/3 sobre férias proporcionais',detail:'Adicional constitucional',value:vacationThird}
  ];
  if(acquiredVacation)items.push({label:'Férias adquiridas não pagas',detail:fullVacation+' período(s), sendo '+lateVacation+' em dobro',value:acquiredVacation});
  if(noticeValue)items.push({label:reason==='acordo'?'50% do aviso-prévio indenizado':'Aviso-prévio indenizado',detail:noticeDays+' dias',value:noticeValue});
  if(fine)items.push({label:reason==='acordo'?'Multa de 20% do FGTS':'Multa de 40% do FGTS',detail:number(data.fgtsIn)?'Sobre saldo informado':'Sobre saldo estimado',value:fine});
  if(noticeDiscount)items.push({label:'Possível desconto do aviso',detail:'Pedido de demissão sem cumprimento',value:-noticeDiscount});
  return{items,total:items.reduce((sum,item)=>sum+item.value,0),fgts,withdrawal,fgts_informed:Boolean(number(data.fgtsIn))};
}


/* ======================================================================
 * V2.0 — 57 AGENTES TRABALHISTAS
 * O cálculo original (calculateLegacy, acima) foi preservado sem alteração.
 * Os agentes somam-se a ele. Valores de 2026 conferidos em fonte oficial:
 *  - Salário mínimo R$ 1.621,00 — Decreto 12.797/2025 (planalto.gov.br)
 *  - INSS empregado — Portaria Interministerial MPS/MF 13/2026 (gov.br/inss)
 *  - IRRF + redução — Lei 15.270/2025, art. 3º-A da Lei 9.250 (planalto; gov.br/receitafederal)
 *  - Seguro-desemprego 2026 — MTE (divulgado por trabalho.ce.gov.br) e regras de parcelas (gov.br/trabalho-e-emprego)
 * ====================================================================== */
const SM_2026=1621.00;
// Salário mínimo nacional mês a mês — conferido no Planalto:
// Lei 14.013/2020 (jan/2020 R$ 1.039; fev/2020 R$ 1.045), Lei 14.158/2021, Lei 14.358/2022, MP 1.143/2022 (jan–abr/2023),
// Lei 14.663/2023 (maio/2023), Decreto 11.864/2023, Decreto 12.342/2024, Decreto 12.797/2025.
const SM_HIST=[['2020-01',1039.00],['2020-02',1045.00],['2021-01',1100.00],['2022-01',1212.00],['2023-01',1302.00],['2023-05',1320.00],['2024-01',1412.00],['2025-01',1518.00],['2026-01',1621.00]];
function smDoMes(y,m){const key=y+'-'+String(m+1).padStart(2,'0');let v=null;for(const [k,val] of SM_HIST)if(k<=key)v=val;return v}
// Insalubridade: soma mês a mês, de trás para frente a partir do mês da saída.
// base 'minimo' = mínimo vigente em cada mês; base 'convencao' = valor fixado na norma coletiva, sem substituição.
function insalubridadeMensal(end,meses,pct,baseTipo,baseValor){
  let total=0,cobertos=0,semTabela=0,min=Infinity,max=0;const inteiros=Math.floor(meses),frac=meses-inteiros;
  for(let k=0;k<Math.ceil(meses);k++){
    const peso=k<inteiros?1:frac,d=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()-k,1));
    const base=baseTipo==='convencao'?baseValor:smDoMes(d.getUTCFullYear(),d.getUTCMonth());
    if(base==null){semTabela+=peso;continue}
    total+=base*pct*peso;cobertos+=peso;min=Math.min(min,base);max=Math.max(max,base);
  }
  return {total,cobertos,semTabela,min,max};
}
const INSS_2026=[[1621.00,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]];
const IRRF_2026=[[2428.80,0,0],[2826.65,.075,182.16],[3751.05,.15,394.16],[4664.68,.225,675.49],[Infinity,.275,908.73]];
const IR_DEP=189.59,IR_SIMPLIFICADO=607.20;
const SD_2026={faixa1:2222.17,faixa2:3703.99,base2:1777.74,teto:2518.65,piso:SM_2026};
const round=v=>{const x=Number(v)||0;return Math.sign(x)*Math.round(Math.abs(x)*100+1e-7)/100};
const fmtDate=d=>d?d.toISOString().slice(0,10).split('-').reverse().join('/'):'';
const addMonths=(d,m)=>new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+m,d.getUTCDate()));
const monthsBetween=(a,b)=>Math.max(0,(diff(a,b)+1)/30.4375);

// Catálogo dos 57 agentes. conferido=true: base numérica lida em fonte oficial nesta versão.
const AGENTS=[
 ['T01','Modalidade','Dispensa sem justa causa','CLT art. 477; Lei 8.036/90 art. 18 §1º',false,'trabalhador'],
 ['T02','Modalidade','Pedido de demissão','CLT art. 487 §2º',false,'trabalhador'],
 ['T03','Modalidade','Acordo entre as partes','CLT art. 484-A',true,'trabalhador'],
 ['T04','Modalidade','Término do contrato por prazo','CLT art. 443',false,'trabalhador'],
 ['T05','Modalidade','Justa causa','CLT arts. 482 e 146, parágrafo único',false,'trabalhador'],
 ['T06','Modalidade','Rescisão indireta','CLT art. 483',false,'trabalhador'],
 ['T07','Modalidade','Rescisão antecipada pelo empregador (prazo determinado)','CLT art. 479',false,'trabalhador'],
 ['T08','Modalidade','Rescisão antecipada pelo empregado (prazo determinado)','CLT art. 480',false,'trabalhador'],
 ['T09','Modalidade','Culpa recíproca','CLT art. 484; Súmula 14 TST; Lei 8.036/90 art. 18 §2º',false,'trabalhador'],
 ['T10','Modalidade','Falecimento do empregado','Lei 6.858/80',false,'trabalhador'],
 ['T11','Verbas rescisórias','Saldo de salário','CLT art. 462 (pagamento dos dias trabalhados)',false,'trabalhador'],
 ['T12','Verbas rescisórias','Aviso-prévio proporcional','Lei 12.506/2011',true,'trabalhador'],
 ['T13','Verbas rescisórias','13º salário proporcional','Lei 4.090/62',false,'trabalhador'],
 ['T14','Verbas rescisórias','Férias vencidas simples e em dobro','CLT art. 137',false,'trabalhador'],
 ['T15','Verbas rescisórias','Férias proporcionais + 1/3','CLT art. 146; CF art. 7º, XVII',false,'trabalhador'],
 ['T16','Verbas rescisórias','Indenização do art. 479','CLT art. 479',false,'trabalhador'],
 ['T17','Verbas rescisórias','Descontos do art. 480 e do aviso não cumprido','CLT arts. 480 e 487 §2º',false,'trabalhador'],
 ['T18','FGTS','FGTS do contrato','Lei 8.036/90 art. 15',false,'trabalhador'],
 ['T19','FGTS','FGTS sobre verbas rescisórias','Lei 8.036/90 art. 15; Súmula 305 TST',false,'trabalhador'],
 ['T20','FGTS','Multa rescisória do FGTS (40% / 20%)','Lei 8.036/90 art. 18; CLT art. 484-A',false,'trabalhador'],
 ['T21','FGTS','Saque do FGTS','Lei 8.036/90 art. 20; CLT art. 484-A §1º',true,'trabalhador'],
 ['T22','Jornada','Horas extras 50%','CLT art. 59 §1º',true,'profissional'],
 ['T23','Jornada','Horas extras 100% (domingos e feriados)','Lei 605/49 art. 9º; Súmula 146 TST',false,'profissional'],
 ['T24','Jornada','DSR sobre horas extras','Lei 605/49 art. 7º; Súmula 172 TST',false,'profissional'],
 ['T25','Jornada','Adicional noturno e hora reduzida','CLT art. 73, caput e §1º',true,'profissional'],
 ['T26','Jornada','Intervalo intrajornada suprimido','CLT art. 71 §4º',true,'profissional'],
 ['T27','Jornada','Intervalo interjornada (11 horas)','CLT art. 66; OJ 355 SDI-1 TST',true,'profissional'],
 ['T28','Jornada','Horas de sobreaviso (1/3)','CLT art. 244 §2º; Súmula 428 TST',false,'profissional'],
 ['T29','Jornada','Banco de horas não compensado','CLT art. 59 §§3º e 5º',true,'profissional'],
 ['T30','Jornada','Reflexos das verbas habituais','Súmulas 45, 172 e 347 TST; CLT art. 487 §5º',false,'profissional'],
 ['T31','Adicionais','Adicional de insalubridade','CLT art. 192; Súmula Vinculante 4 STF; norma coletiva quando fixar a base; salário mínimo mês a mês (2020–2026, conferido)',false,'profissional'],
 ['T32','Adicionais','Adicional de periculosidade','CLT art. 193 §1º',false,'profissional'],
 ['T33','Adicionais','Não cumulação insalubridade × periculosidade','CLT art. 193 §2º; TST IRR Tema 17',false,'profissional'],
 ['T34','Adicionais','Adicional de transferência','CLT art. 469 §3º',false,'profissional'],
 ['T35','Salário','Diferenças de piso salarial','CF art. 7º, V; norma coletiva',false,'profissional'],
 ['T36','Salário','Equiparação salarial','CLT art. 461',false,'profissional'],
 ['T37','Salário','Comissões e variáveis não pagas','CLT art. 466',false,'profissional'],
 ['T38','Salário','Vale-transporte não fornecido','Lei 7.418/85',false,'profissional'],
 ['T39','Estabilidade','Gestante','ADCT art. 10, II, b',false,'profissional'],
 ['T40','Estabilidade','Acidentária','Lei 8.213/91 art. 118',false,'profissional'],
 ['T41','Estabilidade','Membro da CIPA','ADCT art. 10, II, a',false,'profissional'],
 ['T42','Estabilidade','Dirigente sindical','CLT art. 543 §3º',false,'profissional'],
 ['T43','Multas','Multa por atraso na rescisão','CLT art. 477 §§6º e 8º',false,'trabalhador'],
 ['T44','Multas','Multa do art. 467 (verbas incontroversas)','CLT art. 467',false,'profissional'],
 ['T45','Multas','Indenização adicional da data-base','Lei 7.238/84 art. 9º',false,'profissional'],
 ['T46','Indenizações','Dano extrapatrimonial (parâmetro)','CLT art. 223-G §1º; STF ADI 6050',true,'profissional'],
 ['T47','Descontos','INSS do empregado 2026','Portaria Interministerial MPS/MF 13/2026',true,'trabalhador'],
 ['T48','Descontos','IRRF 2026 com redução','Lei 9.250/95 art. 3º-A (Lei 15.270/2025)',true,'trabalhador'],
 ['T49','Descontos','IRRF sobre o 13º','Lei 9.250/95 art. 3º-A §3º (Lei 15.270/2025)',true,'trabalhador'],
 ['T50','Descontos','Verbas sem IR (aviso e férias indenizados)','Lei 7.713/88 art. 6º, V; Súmula 386 STJ',false,'trabalhador'],
 ['T51','Descontos','Pensão alimentícia e outros descontos','CLT art. 462; Lei 9.250/95 art. 4º, II',false,'profissional'],
 ['T52','Benefícios','Seguro-desemprego: direito e parcelas','Lei 7.998/90; regras do MTE',true,'trabalhador'],
 ['T53','Benefícios','Seguro-desemprego: valor da parcela 2026','Tabela MTE 2026',true,'trabalhador'],
 ['T54','Prazos','Prazo para pagar a rescisão','CLT art. 477 §6º',true,'trabalhador'],
 ['T55','Prazos','Prescrição bienal e quinquenal','CF art. 7º, XXIX; CLT art. 11; OJ 83 SDI-1 TST',true,'trabalhador'],
 ['T56','Processo','Correção monetária e juros (fator informado)','STF ADC 58/59; Lei 14.905/2024',false,'profissional'],
 ['T57','Processo','Memória de cálculo com base legal','Relatório do próprio cálculo',true,'trabalhador']
].map(([id,grupo,nome,base,conferido,modo])=>({id,grupo,nome,base,conferido,modo}));
const AG=Object.fromEntries(AGENTS.map(a=>[a.id,a]));

const LEGACY_REASONS=['semJustaCausa','pedidoDemissao','acordo','terminoContrato'];
const NEW_REASONS=['justaCausa','rescisaoIndireta','antecipadaEmpregador','antecipadaEmpregado','culpaReciproca','falecimento'];
const REASON_AGENT={semJustaCausa:'T01',pedidoDemissao:'T02',acordo:'T03',terminoContrato:'T04',justaCausa:'T05',rescisaoIndireta:'T06',antecipadaEmpregador:'T07',antecipadaEmpregado:'T08',culpaReciproca:'T09',falecimento:'T10'};
const LABEL_AGENT=[[/^Saldo de salário/,'T11'],[/aviso-prévio indenizado|Aviso-prévio indenizado/,'T12'],[/^13º/,'T13'],[/^Férias adquiridas/,'T14'],[/^Férias proporcionais|^1\/3 sobre férias/,'T15'],[/^Multa de/,'T20'],[/desconto do aviso/,'T17']];

function inss(base){let total=0,prev=0;for(const [lim,pct] of INSS_2026){if(base>prev){total+=(Math.min(base,lim)-prev)*pct}prev=lim}return round(total)}
function irrf(gross,inssValue,dependentes=0,pensao=0){
  if(gross<=0)return {imposto:0,base:0,reducao:0,deducao:'—'};
  const legais=inssValue+dependentes*IR_DEP+pensao,usaSimplificado=IR_SIMPLIFICADO>legais,deducao=Math.max(legais,IR_SIMPLIFICADO),base=Math.max(0,gross-deducao);
  const [,pct,parcela]=IRRF_2026.find(([lim])=>base<=lim);const bruto=Math.max(0,base*pct-parcela);
  let reducao=0;if(gross<=5000)reducao=Math.min(bruto,312.89);else if(gross<=7350)reducao=Math.min(bruto,Math.max(0,978.62-0.133145*gross));
  return {imposto:round(bruto-reducao),base:round(base),reducao:round(reducao),deducao:usaSimplificado?'desconto simplificado':'deduções legais'};
}
function seguroValor(media){let v=media<=SD_2026.faixa1?media*.8:media<=SD_2026.faixa2?(media-SD_2026.faixa1)*.5+SD_2026.base2:SD_2026.teto;return round(Math.min(SD_2026.teto,Math.max(SD_2026.piso,v)))}
function seguroParcelas(meses,solicitacao){if(meses>=24)return 5;if(meses>=12)return 4;if(solicitacao===2&&meses>=9)return 3;if(solicitacao>=3&&meses>=6)return 3;return 0}

// Base para as novas modalidades (sem projeção de aviso, exceto rescisão indireta).
function baseNewReason(data){
  const salary=number(data.salario),start=date(data.admissao),end=date(data.saida),reason=String(data.motivo||'');
  if(!salary||salary>100000000||!start||!end||end<start)throw new Error('Confira o salário, as datas e o motivo do desligamento.');
  if(reason==='rescisaoIndireta')return {...calculateLegacy({...data,motivo:'semJustaCausa'}),reason};
  const days=Math.min(end.getUTCDate(),30),saldo=salary/30*days,m13=avos13(start,end),mFer=avosFerias(start,end);
  const full=Math.max(0,Math.min(3,Number(data.ferias)||0)),late=Math.max(0,Math.min(full,Number(data.dobro)||0)),acquired=(full-late)*(salary+salary/3)+late*2*(salary+salary/3);
  const half=reason==='culpaReciproca'?.5:1,items=[{label:'Saldo de salário',detail:days+' dia(s) no mês da saída',value:saldo}];
  if(reason!=='justaCausa'){
    items.push({label:'13º proporcional',detail:m13+'/12 avos'+(half<1?' — pela metade (culpa recíproca)':''),value:salary/12*m13*half});
    items.push({label:'Férias proporcionais',detail:mFer+'/12 do período aquisitivo'+(half<1?' — pela metade':''),value:salary/12*mFer*half});
    items.push({label:'1/3 sobre férias proporcionais',detail:'Adicional constitucional',value:salary/12*mFer*half/3});
  }
  if(acquired)items.push({label:'Férias adquiridas não pagas',detail:full+' período(s), sendo '+late+' em dobro',value:acquired});
  let noticeValue=0;
  if(reason==='culpaReciproca'){const nd=Math.min(90,30+years(start,end)*3);noticeValue=salary/30*nd*.5;items.push({label:'50% do aviso-prévio indenizado',detail:nd+' dias — culpa recíproca',value:noticeValue})}
  const termo=date(data.termoPrevisto);
  if(reason==='antecipadaEmpregador'||reason==='antecipadaEmpregado'){
    if(!termo||termo<=end)throw new Error('Confira a data prevista para o fim do contrato a prazo (deve ser posterior ao desligamento).');
    const restante=salary/30*diff(end,termo)/2;
    if(reason==='antecipadaEmpregador')items.push({label:'Indenização do art. 479',detail:'Metade da remuneração até '+fmtDate(termo),value:restante});
    else items.push({label:'Possível desconto do art. 480',detail:'Limite: metade da remuneração até '+fmtDate(termo)+'; exige prejuízo comprovado',value:-restante});
  }
  const months=Math.max(1,Math.ceil((diff(start,end)+1)/30.4375)),thirteenth=items.find(i=>i.label.startsWith('13º'))?.value||0;
  const fgts=number(data.fgtsIn)||salary*months*.08+thirteenth*.08+noticeValue*.08;
  const finePct=reason==='culpaReciproca'?.2:reason==='antecipadaEmpregador'?.4:0,fine=fgts*finePct;
  if(fine)items.push({label:'Multa de '+(finePct*100)+'% do FGTS',detail:number(data.fgtsIn)?'Sobre saldo informado':'Sobre saldo estimado',value:fine});
  const withdrawal=['culpaReciproca','antecipadaEmpregador','falecimento'].includes(reason)?fgts:0;
  return {items,total:items.reduce((s,i)=>s+i.value,0),fgts,withdrawal,fgts_informed:Boolean(number(data.fgtsIn)),reason};
}

function calculate(data){
  const reason=String(data.motivo||'');
  // Modo simples, sem campos novos: resultado idêntico ao da versão 1.0.
  const base=LEGACY_REASONS.includes(reason)?calculateLegacy(data):NEW_REASONS.includes(reason)?baseNewReason(data):(()=>{throw new Error('Confira o salário, as datas e o motivo do desligamento.')})();
  const pro=String(data.modo)==='profissional';
  const salary=number(data.salario),start=date(data.admissao),end=date(data.saida);
  const used=new Set([REASON_AGENT[reason]]),info=[],alerts=[],memoria=[];
  base.items.forEach(item=>{const hit=LABEL_AGENT.find(([re])=>re.test(item.label));if(hit){item.agente=hit[1];used.add(hit[1])}if(/art\. 479/.test(item.label)){item.agente='T16';used.add('T16')}if(/art\. 480/.test(item.label)){item.agente='T17';used.add('T17')}});
  used.add('T18');if(base.withdrawal)used.add('T21');
  const indemnifiedNotice=((reason==='semJustaCausa'||reason==='acordo'||reason==='rescisaoIndireta')&&String(data.aviso)==='indenizado');
  const noticeDays=Math.min(90,30+years(start,end)*3),projected=indemnifiedNotice?add(end,noticeDays):end;
  const extras=[],hora=salary/(number(data.divisor)||220),finePct=['semJustaCausa','rescisaoIndireta','antecipadaEmpregador'].includes(reason)?.4:['acordo','culpaReciproca'].includes(reason)?.2:0;
  const push=(agente,label,detail,value,{habitual=false,monthly=0,indenizatoria=false}={})=>{if(!(Math.abs(value)>0.004))return;extras.push({agente,label,detail,value:round(value),habitual,monthly,indenizatoria});used.add(agente)};

  // T55 — prescrição (antes da jornada, para limitar o período)
  const ajuiz=date(data.dataAjuizamento)||new Date(Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth(),new Date().getUTCDate()));
  const limiteBienal=addMonths(projected,24),marcoQuinquenal=addMonths(ajuiz,-60);
  info.push({agente:'T55',titulo:'Prescrição',texto:'Prazo para ajuizar: até '+fmtDate(limiteBienal)+' (2 anos'+(indemnifiedNotice?' contados da projeção do aviso':'')+'). Marco quinquenal: créditos anteriores a '+fmtDate(marcoQuinquenal)+' tendem a estar prescritos.'});used.add('T55');
  if(ajuiz>limiteBienal)alerts.push({agente:'T55',texto:'A data de ajuizamento informada ultrapassa o prazo bienal.'});
  const maxMeses=Math.max(0,monthsBetween(start>marcoQuinquenal?start:marcoQuinquenal,end));
  const mesesJornada=v=>{const m=Math.max(0,Number(v)||0);if(m>maxMeses+0.01){alerts.push({agente:'T55',texto:'Período informado ('+m+' meses) limitado a '+maxMeses.toFixed(1)+' meses pela prescrição quinquenal/duração do contrato.'});return maxMeses}return m};
  // T54 — prazo de pagamento
  info.push({agente:'T54',titulo:'Prazo para pagamento',texto:'Verbas rescisórias e documentos devem ser entregues até '+fmtDate(add(end,10))+' (10 dias do término).'});used.add('T54');

  if(pro){
    // Jornada
    const mJ=mesesJornada(data.mesesJornada),dsrFator=(Number(data.dsrDescanso)||5)/(Number(data.dsrUteis)||25);
    const he50=hora*1.5*(Number(data.he50)||0)*mJ,he100=hora*2*(Number(data.he100)||0)*mJ;
    push('T22','Horas extras 50%',(Number(data.he50)||0)+' h/mês × '+mJ.toFixed(1)+' meses × hora de '+BRL(hora*1.5),he50,{habitual:true,monthly:he50/(mJ||1)});
    push('T23','Horas extras 100%',(Number(data.he100)||0)+' h/mês × '+mJ.toFixed(1)+' meses',he100,{habitual:true,monthly:he100/(mJ||1)});
    push('T24','DSR sobre horas extras','Fator '+(Number(data.dsrDescanso)||5)+'/'+(Number(data.dsrUteis)||25)+' (descansos/dias úteis)',(he50+he100)*dsrFator,{habitual:true,monthly:(he50+he100)*dsrFator/(mJ||1)});
    const noturnasRelogio=Number(data.noturnas)||0,fictas=noturnasRelogio*60/52.5,not=hora*.2*fictas*mJ;
    push('T25','Adicional noturno 20%',noturnasRelogio+' h relógio = '+fictas.toFixed(2)+' h noturnas (52min30s) por mês',not,{habitual:true,monthly:not/(mJ||1)});
    const intra=hora*1.5*((Number(data.intervaloMin)||0)/60)*(Number(data.intervaloDias)||22)*mJ;
    push('T26','Intervalo intrajornada suprimido',(Number(data.intervaloMin)||0)+' min/dia × '+(Number(data.intervaloDias)||22)+' dias/mês — natureza indenizatória',intra,{indenizatoria:true});
    const inter=hora*1.5*(Number(data.interjornada)||0)*mJ;
    push('T27','Intervalo interjornada',(Number(data.interjornada)||0)+' h/mês subtraídas das 11 h',inter,{habitual:true,monthly:inter/(mJ||1)});
    const sobre=hora/3*(Number(data.sobreaviso)||0)*mJ;
    push('T28','Horas de sobreaviso',(Number(data.sobreaviso)||0)+' h/mês à razão de 1/3',sobre,{habitual:true,monthly:sobre/(mJ||1)});
    push('T29','Banco de horas não compensado',(Number(data.bancoHoras)||0)+' h com adicional de 50%',hora*1.5*(Number(data.bancoHoras)||0));
    // Adicionais
    const mI=mesesJornada(data.insalMeses),grau=Number(data.insalubridade)||0,baseTipo=String(data.insalBase||'minimo')==='convencao'?'convencao':'minimo',baseCct=number(data.insalBaseValor);
    if(grau&&baseTipo==='convencao'&&!baseCct)throw new Error('Confira a base da insalubridade fixada na convenção coletiva (valor em R$).');
    const insCalc=grau?insalubridadeMensal(end,mI,grau/100,baseTipo,baseCct):{total:0,cobertos:0,semTabela:0},ins=insCalc.total;
    if(insCalc.semTabela)alerts.push({agente:'T31',texto:insCalc.semTabela.toFixed(1)+' mês(es) de insalubridade anteriores a jan/2020 não foram calculados: informe a base da convenção ou reduza o período.'});
    const mP=mesesJornada(data.periMeses),per=data.periculosidade===true||data.periculosidade==='true'?salary*.3*mP:0;
    if(ins>0&&per>0){alerts.push({agente:'T33',texto:'Insalubridade e periculosidade não se acumulam: mantido apenas o maior valor.'});used.add('T33')}
    const insDet=baseTipo==='convencao'?'Base fixada na convenção coletiva: '+BRL(baseCct)+' × '+insCalc.cobertos.toFixed(1)+' meses':'Salário mínimo vigente em cada mês ('+(insCalc.min===insCalc.max?BRL(insCalc.min):BRL(insCalc.min)+' a '+BRL(insCalc.max))+') × '+insCalc.cobertos.toFixed(1)+' meses';
    if(ins>=per)push('T31','Adicional de insalubridade '+grau+'%',insDet,ins,{habitual:true,monthly:ins/(insCalc.cobertos||1)});
    if(per>ins)push('T32','Adicional de periculosidade 30%','Sobre o salário-base × '+mP.toFixed(1)+' meses',per,{habitual:true,monthly:per/(mP||1)});
    const mT=mesesJornada(data.transferenciaMeses),tr=salary*.25*mT;
    push('T34','Adicional de transferência 25%',mT.toFixed(1)+' meses',tr,{habitual:true,monthly:tr/(mT||1)});
    const mPi=mesesJornada(data.pisoMeses),pisoDif=Math.max(0,number(data.piso)-salary)*mPi;
    push('T35','Diferenças de piso salarial','Piso '+BRL(number(data.piso))+' − salário × '+mPi.toFixed(1)+' meses',pisoDif,{habitual:true,monthly:pisoDif/(mPi||1)});
    const mEq=mesesJornada(data.paradigmaMeses),eq=Math.max(0,number(data.paradigma)-salary)*mEq;
    push('T36','Diferenças por equiparação salarial','Paradigma '+BRL(number(data.paradigma))+' − salário × '+mEq.toFixed(1)+' meses',eq,{habitual:true,monthly:eq/(mEq||1)});
    push('T37','Comissões e variáveis não pagas','Valor informado',number(data.comissoes),{habitual:true,monthly:0});
    const mVt=mesesJornada(data.vtMeses),vt=Math.max(0,number(data.vtMensal)-salary*.06)*mVt;
    push('T38','Vale-transporte não fornecido','Custo mensal − 6% do salário × '+mVt.toFixed(1)+' meses',vt,{indenizatoria:true});
    // T30 — reflexos das verbas de natureza salarial habitual
    const hab=extras.filter(e=>e.habitual),habTotal=hab.reduce((s,e)=>s+e.value,0),habMensal=hab.reduce((s,e)=>s+e.monthly,0);
    if(habTotal>0){
      push('T30','Reflexos em 13º salário','Habituais ÷ 12',habTotal/12);
      push('T30','Reflexos em férias + 1/3','Habituais ÷ 12 × 4/3',habTotal/12*4/3,{indenizatoria:true});
      if(indemnifiedNotice)push('T30','Reflexos no aviso-prévio','Média mensal '+BRL(habMensal)+' ÷ 30 × '+noticeDays+' dias',habMensal/30*noticeDays);
      const baseFgts=habTotal+habTotal/12+(indemnifiedNotice?habMensal/30*noticeDays:0),fg=baseFgts*.08;
      push('T19','FGTS 8% sobre as verbas acima','Habituais + reflexos em 13º e aviso',fg,{indenizatoria:true});
      if(finePct)push('T20','Multa de '+(finePct*100)+'% sobre esse FGTS','Mesma modalidade da rescisão',fg*finePct,{indenizatoria:true});
    }
    // Estabilidades (T39–T42)
    const tipo=String(data.estabilidade||''),marco=date(data.estabilidadeData);
    if(tipo&&marco){
      const fim=tipo==='gestante'?addMonths(marco,5):tipo==='acidentaria'?addMonths(marco,12):addMonths(marco,12);
      const ag={gestante:'T39',acidentaria:'T40',cipa:'T41',sindical:'T42'}[tipo];
      if(!['semJustaCausa'].includes(reason))alerts.push({agente:ag,texto:'A indenização substitutiva da estabilidade pressupõe dispensa sem justa causa.'});
      else if(fim>end){
        const dias=diff(end,fim),meses=dias/30,sal=salary*meses;
        push(ag,'Indenização substitutiva — '+AG[ag].nome,'De '+fmtDate(end)+' até '+fmtDate(fim)+' ('+dias+' dias): salários',sal,{indenizatoria:true});
        push(ag,'13º e férias + 1/3 do período de estabilidade',meses.toFixed(1)+' meses',salary/12*meses+salary/12*meses*4/3,{indenizatoria:true});
        push(ag,'FGTS + 40% do período de estabilidade','8% sobre salários e 13º, com multa',(sal+salary/12*meses)*.08*1.4,{indenizatoria:true});
      }else info.push({agente:ag,titulo:AG[ag].nome,texto:'Período de estabilidade já encerrado em '+fmtDate(fim)+'.'});
      used.add(ag);
    }
    // Multas e indenizações
    const pago=date(data.dataPagamento);
    if(pago&&diff(end,pago)>10)push('T43','Multa do art. 477 §8º','Pagamento em '+fmtDate(pago)+', após o prazo de '+fmtDate(add(end,10)),salary);
    if(data.art467===true||data.art467==='true'){const rescisorias=base.items.filter(i=>i.value>0).reduce((s,i)=>s+i.value,0);push('T44','Multa do art. 467 (50%)','Sobre verbas rescisórias incontroversas não pagas na audiência',rescisorias*.5)}
    const dataBase=date(data.dataBase);
    if(dataBase&&reason==='semJustaCausa'){const dd=diff(projected,dataBase);if(dd>=0&&dd<=30)push('T45','Indenização adicional (data-base)','Desligamento (com projeção do aviso) nos 30 dias anteriores à data-base '+fmtDate(dataBase),salary);else{info.push({agente:'T45',titulo:'Data-base',texto:'Desligamento fora dos 30 dias anteriores à data-base.'});used.add('T45')}}
    const grauDano={leve:3,media:5,grave:20,gravissima:50}[String(data.grauDano||'')];
    if(grauDano){info.push({agente:'T46',titulo:'Dano extrapatrimonial (parâmetro)',texto:'Ofensa '+data.grauDano+': até '+grauDano+'× o último salário = '+BRL(salary*grauDano)+'. Critério orientativo (STF, ADI 6050); valor NÃO somado ao total.'});used.add('T46')}
  }else if(date(data.dataPagamento)){
    const pago=date(data.dataPagamento);if(diff(end,pago)>10)push('T43','Multa do art. 477 §8º','Pagamento em '+fmtDate(pago)+', após '+fmtDate(add(end,10)),salary);
  }

  // T19 — FGTS sobre verbas rescisórias (informativo; depósito na conta vinculada)
  const saldo=base.items.find(i=>i.agente==='T11')?.value||0,dec=base.items.find(i=>i.agente==='T13')?.value||0,aviso=base.items.find(i=>i.agente==='T12')?.value||0;
  info.push({agente:'T19',titulo:'FGTS sobre a rescisão',texto:'Depósito devido na conta vinculada (não pago ao trabalhador): 8% sobre saldo, 13º e aviso = '+BRL((saldo+dec+aviso)*.08)+'.'});used.add('T19');

  // Descontos (T47–T51) — sobre verbas de natureza salarial do mês da rescisão
  const dep=Math.max(0,Math.min(20,Number(data.dependentes)||0)),pensaoPct=Math.max(0,Math.min(100,Number(data.pensaoPct)||0))/100;
  const inssSaldo=inss(saldo),inss13=inss(dec);
  const pensaoBase=Math.max(0,saldo-inssSaldo)*pensaoPct,pensao13=Math.max(0,dec-inss13)*pensaoPct;
  const irSaldo=irrf(saldo,inssSaldo,dep,pensaoBase),ir13=irrf(dec,inss13,dep,pensao13);
  const descontos=[];
  if(inssSaldo)descontos.push({agente:'T47',label:'INSS sobre saldo de salário',detail:'Tabela progressiva 2026',value:-inssSaldo});
  if(inss13)descontos.push({agente:'T47',label:'INSS sobre 13º',detail:'Tabela progressiva 2026, cálculo separado',value:-inss13});
  descontos.push({agente:'T48',label:'IRRF sobre saldo de salário',detail:'Base '+BRL(irSaldo.base)+' ('+irSaldo.deducao+'); redução Lei 15.270: '+BRL(irSaldo.reducao),value:-irSaldo.imposto||0});
  if(dec)descontos.push({agente:'T49',label:'IRRF sobre 13º (exclusivo na fonte)',detail:'Base '+BRL(ir13.base)+'; redução Lei 15.270: '+BRL(ir13.reducao),value:-ir13.imposto||0});
  if(pensaoPct)descontos.push({agente:'T51',label:'Pensão alimentícia',detail:(pensaoPct*100)+'% sobre saldo e 13º líquidos de INSS',value:-(pensaoBase+pensao13)});
  if(number(data.outrosDescontos))descontos.push({agente:'T51',label:'Outros descontos informados',detail:'Faltas, adiantamentos etc.',value:-number(data.outrosDescontos)});
  descontos.forEach(d=>{d.value=round(d.value)||0;used.add(d.agente)});
  info.push({agente:'T50',titulo:'Verbas sem imposto de renda',texto:'Aviso-prévio indenizado e férias indenizadas (com 1/3) não sofrem IRRF; o aviso indenizado também não sofre INSS.'});used.add('T50');

  // Seguro-desemprego (T52–T53)
  const temDireito=['semJustaCausa','rescisaoIndireta'].includes(reason);
  const meses36=Math.min(36,Math.floor(Number(data.meses36)||monthsBetween(start,end))),sol=Math.max(1,Math.min(3,Number(data.solicitacao)||1));
  const parcelas=temDireito?seguroParcelas(meses36,sol):0,valorParcela=parcelas?seguroValor(number(data.mediaSalarios)||salary):0;
  info.push({agente:'T52',titulo:'Seguro-desemprego',texto:temDireito?(parcelas?parcelas+' parcela(s) estimadas ('+meses36+' meses trabalhados nos últimos 36; '+sol+'ª solicitação).':'Tempo de trabalho insuficiente para a '+sol+'ª solicitação.'):'Esta modalidade não dá direito ao seguro-desemprego.'});used.add('T52');
  if(parcelas){info.push({agente:'T53',titulo:'Valor da parcela',texto:BRL(valorParcela)+' por parcela (tabela 2026), total estimado '+BRL(valorParcela*parcelas)+'. Não integra o total da rescisão.'});used.add('T53')}

  const extraItems=extras.map(({habitual,monthly,...e})=>e),items=[...base.items,...extraItems];
  const total=base.total+extraItems.reduce((s,i)=>s+i.value,0),totalDescontos=round(descontos.reduce((s,d)=>s+d.value,0));
  // T56 — correção (fator informado; sem índice inventado)
  const fator=Number(String(data.fatorCorrecao||'').replace(',','.'));
  if(pro&&fator>1){info.push({agente:'T56',titulo:'Correção monetária e juros',texto:'Fator informado '+fator+': total corrigido estimado '+BRL(total*fator)+'. O fator deve vir de tabela oficial (ADC 58/59 STF; Lei 14.905/2024).'});used.add('T56')}
  used.add('T57');
  const aplicados=AGENTS.filter(a=>used.has(a.id));
  memoria.push(...aplicados.map(a=>({agente:a.id,nome:a.nome,base:a.base,conferido:a.conferido})));
  const uniqAlerts=[...new Map(alerts.map(a=>[a.agente+a.texto,a])).values()];
  return {...base,items,total,descontos,totalDescontos,liquido:round(total+totalDescontos),info,alerts:uniqAlerts,memoria,modo:pro?'profissional':'trabalhador',seguro:{parcelas,valorParcela},versao:'2.0'};
}
function BRL(v){return 'R$ '+(Number(v)||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.')}

module.exports={calculate,calculateLegacy,AGENTS,inss,irrf,seguroValor,seguroParcelas,smDoMes,insalubridadeMensal,constants:{SM_2026,INSS_2026,IRRF_2026,SD_2026}};
