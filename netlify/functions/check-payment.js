const crypto=require('crypto');
const {readIdentityToken}=require('./identity-token');

const digits=value=>String(value||'').replace(/\D/g,'');
const cpfHash=(cpf,secret)=>crypto.createHmac('sha256',secret).update(digits(cpf)).digest('hex').slice(0,24);

exports.handler=async event=>{
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};
  try{
    const token=process.env.MP_ACCESS_TOKEN,id=event.queryStringParameters?.id,identityToken=event.queryStringParameters?.identity_token,cpf=identityToken?readIdentityToken(identityToken,token):digits(event.queryStringParameters?.cpf);
    if(!token||!id||!/^[0-9]+$/.test(id))return{statusCode:400,headers,body:JSON.stringify({approved:false})};
    const response=await fetch('https://api.mercadopago.com/v1/payments/'+id,{headers:{Authorization:'Bearer '+token}}),payment=await response.json(),reference=String(payment.external_reference||''),expected=reference.startsWith('JPTRAB-P1050-')?10.50:reference.startsWith('JPTRAB-P1990-')?19.90:NaN,match=reference.match(/-C([a-f0-9]{24})-/),cpfOk=!match||(cpf.length===11&&crypto.timingSafeEqual(Buffer.from(match[1]),Buffer.from(cpfHash(cpf,token)))),approved=response.ok&&payment.status==='approved'&&cpfOk&&Number.isFinite(expected)&&Math.abs(Number(payment.transaction_amount)-expected)<.001;
    return{statusCode:200,headers,body:JSON.stringify({approved})};
  }catch{return{statusCode:500,headers,body:JSON.stringify({approved:false})}}
};
