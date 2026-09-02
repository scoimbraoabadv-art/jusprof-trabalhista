const crypto=require('crypto');
const {createPaymentToken}=require('./payment-token');

const PROMO_END=Date.parse('2026-09-22T02:59:59Z');
const currentPrice=()=>Date.now()<=PROMO_END?10.50:19.90;

exports.handler=async event=>{
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};
  try{
    if(event.httpMethod!=='POST')return{statusCode:405,headers,body:JSON.stringify({error:'Use POST.'})};
    const token=process.env.MP_ACCESS_TOKEN;
    if(!token)return{statusCode:500,headers,body:JSON.stringify({error:'Pagamento ainda não ativado.'})};
    const body=JSON.parse(event.body||'{}'),email=String(body.payer?.email||'').trim();
    if(!/^\S+@\S+\.\S+$/.test(email))return{statusCode:400,headers,body:JSON.stringify({error:'E-mail inválido.'})};
    const amount=currentPrice(),priceCode=amount===10.50?'P1050':'P1990',reference=`JPTRAB-${priceCode}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`,payload={transaction_amount:amount,description:amount===10.50?'JusProf Trabalhista — lançamento — um cálculo':'JusProf Trabalhista — um cálculo',payment_method_id:'pix',payer:{email,first_name:'Cliente'},external_reference:reference},response=await fetch('https://api.mercadopago.com/v1/payments',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Idempotency-Key':reference},body:JSON.stringify(payload)}),payment=await response.json();
    if(!response.ok||!payment.id)return{statusCode:502,headers,body:JSON.stringify({error:'Não foi possível gerar o PIX.'})};
    return{statusCode:200,headers,body:JSON.stringify({payment_id:payment.id,payment_token:createPaymentToken(payment.id,token),amount,qr_code:payment.point_of_interaction?.transaction_data?.qr_code||'',qr_code_base64:payment.point_of_interaction?.transaction_data?.qr_code_base64||''})};
  }catch(error){
    console.error('create-pix:',error);
    return{statusCode:500,headers,body:JSON.stringify({error:'Erro ao gerar o PIX.'})};
  }
};
