const PROMO_END=Date.parse('2026-09-22T02:59:59Z');
exports.handler=async()=>{const promo=Date.now()<=PROMO_END;return{statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'},body:JSON.stringify({amount:promo?10.50:19.90,regular_amount:19.90,promo,ends_at:'2026-09-21T23:59:59-03:00'})}};
