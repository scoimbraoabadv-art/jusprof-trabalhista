const {validPaymentToken}=require('./payment-token');

const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};
const {calculate}=require('./_shared/trabalhista');

exports.handler=async event=>{
  if(event.httpMethod!=='POST')return{statusCode:405,headers,body:JSON.stringify({error:'Use POST.'})};
  try{
    const token=process.env.MP_ACCESS_TOKEN,body=JSON.parse(event.body||'{}'),id=String(body.payment_id||''),paymentToken=String(body.payment_token||'');
    if(!token||!/^\d+$/.test(id)||!validPaymentToken(id,paymentToken,token))return{statusCode:400,headers,body:JSON.stringify({error:'Dados de liberação inválidos.'})};
    const result=calculate(body.data||{});
    const paymentResponse=await fetch('https://api.mercadopago.com/v1/payments/'+id,{headers:{Authorization:'Bearer '+token}}),payment=await paymentResponse.json(),reference=String(payment.external_reference||''),expected=reference.startsWith('JPTRAB-P1050-')?10.50:reference.startsWith('JPTRAB-P1990-')?19.90:NaN,approved=paymentResponse.ok&&payment.status==='approved'&&Number.isFinite(expected)&&Math.abs(Number(payment.transaction_amount)-expected)<.001;
    if(!approved)return{statusCode:403,headers,body:JSON.stringify({error:'Pagamento não confirmado para este cálculo.'})};
    const {connectLambda,getStore}=await import('@netlify/blobs');
    connectLambda(event);
    const store=getStore('jusprof-calculos-utilizados'),key='payment-'+id;
    const write=await store.setJSON(key,{used_at:new Date().toISOString()},{onlyIfNew:true});
    if(!write.modified)return{statusCode:409,headers,body:JSON.stringify({error:'Este pagamento já foi utilizado em um cálculo.'})};
    return{statusCode:200,headers,body:JSON.stringify({ok:true,result})};
  }catch(error){
    console.error('finalize-calculation:',error);
    const message=error&&error.message&&error.message.startsWith('Confira')?error.message:'Não foi possível finalizar o cálculo. Tente novamente.';
    return{statusCode:500,headers,body:JSON.stringify({error:message})};
  }
};
