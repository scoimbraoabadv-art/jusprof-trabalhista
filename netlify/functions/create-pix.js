const crypto=require('crypto');
const {createIdentityToken,readIdentityToken}=require('./identity-token');

const PROMO_END=Date.parse('2026-09-22T02:59:59Z');
const currentPrice=()=>Date.now()<=PROMO_END?10.50:19.90;
const digits=value=>String(value||'').replace(/\D/g,'');
const validCpf=value=>{const cpf=digits(value);if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;for(let size=9;size<=10;size++){let sum=0;for(let i=0;i<size;i++)sum+=Number(cpf[i])*(size+1-i);let check=(sum*10)%11;if(check===10)check=0;if(check!==Number(cpf[size]))return false}return true};
const cpfHash=(cpf,secret)=>crypto.createHmac('sha256',secret).update(digits(cpf)).digest('hex').slice(0,24);

exports.handler=async event=>{
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};
  try{
    if(event.httpMethod!=='POST')return{statusCode:405,headers,body:JSON.stringify({error:'Use POST.'})};
    const token=process.env.MP_ACCESS_TOKEN;
    if(!token)return{statusCode:500,headers,body:JSON.stringify({error:'Pagamento ainda não ativado.'})};
    const body=JSON.parse(event.body||'{}'),payer=body.payer||{},email=String(payer.email||'').trim(),savedToken=String(payer.identity_token||''),cpf=savedToken?readIdentityToken(savedToken,token):digits(payer.cpf);
    if(!/^\S+@\S+\.\S+$/.test(email))return{statusCode:400,headers,body:JSON.stringify({error:'E-mail inválido.'})};
    if(!validCpf(cpf))return{statusCode:400,headers,body:JSON.stringify({error:savedToken?'Dados salvos expiraram. Informe o CPF novamente.':'CPF inválido. Confira os números informados.'})};
    const amount=currentPrice(),priceCode=amount===10.50?'P1050':'P1990',hash=cpfHash(cpf,token),ref=`JPTRAB-${priceCode}-C${hash}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,payload={transaction_amount:amount,description:amount===10.50?'JusProf Trabalhista — lançamento — cálculo por trabalhador':'JusProf Trabalhista — cálculo por trabalhador',payment_method_id:'pix',payer:{email,first_name:String(payer.nome||'Cliente').split(' ')[0]},external_reference:ref},response=await fetch('https://api.mercadopago.com/v1/payments',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Idempotency-Key':ref},body:JSON.stringify(payload)}),payment=await response.json();
    if(!response.ok)return{statusCode:502,headers,body:JSON.stringify({error:'Não foi possível gerar o PIX.'})};
    return{statusCode:200,headers,body:JSON.stringify({payment_id:payment.id,amount,identity_token:createIdentityToken(cpf,token),cpf_masked:`***.${cpf.slice(3,6)}.${cpf.slice(6,9)}-**`,qr_code:payment.point_of_interaction?.transaction_data?.qr_code||'',qr_code_base64:payment.point_of_interaction?.transaction_data?.qr_code_base64||''})};
  }catch(error){
    console.error('create-pix:',error);
    return{statusCode:500,headers,body:JSON.stringify({error:'Erro ao gerar o PIX.'})};
  }
};
