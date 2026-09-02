const crypto=require('crypto');

const MAX_AGE=365*24*60*60*1000;
const digits=value=>String(value||'').replace(/\D/g,'');
const key=secret=>crypto.createHash('sha256').update('jusprof-device:'+secret).digest();

function createIdentityToken(cpf,secret){
  const clean=digits(cpf),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(secret),iv),payload=Buffer.from(JSON.stringify({cpf:clean,issued_at:Date.now()}),'utf8'),encrypted=Buffer.concat([cipher.update(payload),cipher.final()]),tag=cipher.getAuthTag();
  return Buffer.concat([iv,tag,encrypted]).toString('base64url');
}

function readIdentityToken(token,secret){
  try{
    const value=Buffer.from(String(token||''),'base64url');
    if(value.length<30)return'';
    const iv=value.subarray(0,12),tag=value.subarray(12,28),encrypted=value.subarray(28),decipher=crypto.createDecipheriv('aes-256-gcm',key(secret),iv);
    decipher.setAuthTag(tag);
    const payload=JSON.parse(Buffer.concat([decipher.update(encrypted),decipher.final()]).toString('utf8'));
    const cpf=digits(payload.cpf),age=Date.now()-Number(payload.issued_at);
    return cpf.length===11&&age>=0&&age<=MAX_AGE?cpf:'';
  }catch{return''}
}

module.exports={createIdentityToken,readIdentityToken};
