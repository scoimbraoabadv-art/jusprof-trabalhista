const {validPaymentToken}=require('./payment-token');

exports.handler=async event=>{
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};
  try{
    const token=process.env.MP_ACCESS_TOKEN,id=String(event.queryStringParameters?.id||''),paymentToken=event.queryStringParameters?.payment_token;
    if(!token||!/^\d+$/.test(id)||!validPaymentToken(id,paymentToken,token))return{statusCode:400,headers,body:JSON.stringify({approved:false})};
    const response=await fetch('https://api.mercadopago.com/v1/payments/'+id,{headers:{Authorization:'Bearer '+token}}),payment=await response.json(),reference=String(payment.external_reference||''),expected=reference.startsWith('JPTRAB-P1050-')?10.50:reference.startsWith('JPTRAB-P1990-')?19.90:NaN,approved=response.ok&&payment.status==='approved'&&Number.isFinite(expected)&&Math.abs(Number(payment.transaction_amount)-expected)<.001;
    return{statusCode:200,headers,body:JSON.stringify({approved})};
  }catch{return{statusCode:500,headers,body:JSON.stringify({approved:false})}}
};
