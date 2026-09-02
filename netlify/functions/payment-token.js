const crypto=require('crypto');

const createPaymentToken=(paymentId,secret)=>crypto.createHmac('sha256',secret).update('jusprof-calculo:'+String(paymentId)).digest('base64url');
const validPaymentToken=(paymentId,value,secret)=>{
  try{
    const expected=Buffer.from(createPaymentToken(paymentId,secret)),received=Buffer.from(String(value||''));
    return expected.length===received.length&&crypto.timingSafeEqual(expected,received);
  }catch{return false}
};

module.exports={createPaymentToken,validPaymentToken};
