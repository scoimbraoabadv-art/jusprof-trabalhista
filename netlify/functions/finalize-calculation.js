const crypto=require('crypto');
const {readIdentityToken}=require('./identity-token');

const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};
const digits=value=>String(value||'').replace(/\D/g,'');
const cpfHash=(cpf,secret)=>crypto.createHmac('sha256',secret).update(digits(cpf)).digest('hex').slice(0,24);
const number=value=>Number(String(value??'').replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'))||0;
const day=864e5;
const date=value=>{const [y,m,d]=String(value||'').split('-').map(Number);const result=new Date(Date.UTC(y,m-1,d));return y&&m&&d&&!Number.isNaN(result.getTime())?result:null};
const add=(value,days)=>new Date(value.getTime()+days*day);
const diff=(start,end)=>Math.floor((end-start)/day);

function years(start,end){let total=end.getUTCFullYear()-start.getUTCFullYear();if(end<new Date(Date.UTC(end.getUTCFullYear(),start.getUTCMonth(),start.getUTCDate())))total--;return Math.max(0,total)}
function avos13(start,end){const year=end.getUTCFullYear(),initial=start.getUTCFullYear()===year?start:new Date(Date.UTC(year,0,1));let total=0;for(let month=initial.getUTCMonth();month<=end.getUTCMonth();month++){const first=month===initial.getUTCMonth()?initial.getUTCDate():1,last=month===end.getUTCMonth()?end.getUTCDate():new Date(Date.UTC(year,month+1,0)).getUTCDate();if(last-first+1>=15)total++}return Math.min(12,total)}
function avosFerias(start,end){let initial=new Date(Date.UTC(end.getUTCFullYear(),start.getUTCMonth(),start.getUTCDate()));if(initial>end)initial=new Date(Date.UTC(end.getUTCFullYear()-1,start.getUTCMonth(),start.getUTCDate()));while(initial<start)initial=new Date(Date.UTC(initial.getUTCFullYear()+1,initial.getUTCMonth(),initial.getUTCDate()));let total=0;for(let month=0;month<12;month++){const first=new Date(Date.UTC(initial.getUTCFullYear(),initial.getUTCMonth()+month,initial.getUTCDate())),next=new Date(Date.UTC(initial.getUTCFullYear(),initial.getUTCMonth()+month+1,initial.getUTCDate())),last=end<add(next,-1)?end:add(next,-1);if(last>=first&&diff(first,last)+1>=15)total++}return Math.min(12,total)}

function calculate(data){
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

exports.handler=async event=>{
  if(event.httpMethod!=='POST')return{statusCode:405,headers,body:JSON.stringify({error:'Use POST.'})};
  try{
    const token=process.env.MP_ACCESS_TOKEN,body=JSON.parse(event.body||'{}'),id=String(body.payment_id||''),identityToken=String(body.identity_token||''),cpf=identityToken?readIdentityToken(identityToken,token):digits(body.cpf);
    if(!token||!/^\d+$/.test(id)||cpf.length!==11)return{statusCode:400,headers,body:JSON.stringify({error:'Dados de liberação inválidos.'})};
    const result=calculate(body.data||{});
    const paymentResponse=await fetch('https://api.mercadopago.com/v1/payments/'+id,{headers:{Authorization:'Bearer '+token}}),payment=await paymentResponse.json(),reference=String(payment.external_reference||''),expected=reference.startsWith('JPTRAB-P1050-')?10.50:reference.startsWith('JPTRAB-P1990-')?19.90:NaN,match=reference.match(/-C([a-f0-9]{24})-/),cpfOk=match&&crypto.timingSafeEqual(Buffer.from(match[1]),Buffer.from(cpfHash(cpf,token))),approved=paymentResponse.ok&&payment.status==='approved'&&cpfOk&&Number.isFinite(expected)&&Math.abs(Number(payment.transaction_amount)-expected)<.001;
    if(!approved)return{statusCode:403,headers,body:JSON.stringify({error:'Pagamento não confirmado para este trabalhador.'})};
    const {connectLambda,getStore}=await import('@netlify/blobs');
    connectLambda(event);
    const store=getStore('jusprof-calculos-utilizados'),key='payment-'+id;
    const write=await store.setJSON(key,{used_at:new Date().toISOString(),cpf_hash:cpfHash(cpf,token)},{onlyIfNew:true});
    if(!write.modified)return{statusCode:409,headers,body:JSON.stringify({error:'Este pagamento já foi utilizado em um cálculo.'})};
    return{statusCode:200,headers,body:JSON.stringify({ok:true,result})};
  }catch(error){
    console.error('finalize-calculation:',error);
    const message=error&&error.message&&error.message.startsWith('Confira')?error.message:'Não foi possível finalizar o cálculo. Tente novamente.';
    return{statusCode:500,headers,body:JSON.stringify({error:message})};
  }
};
