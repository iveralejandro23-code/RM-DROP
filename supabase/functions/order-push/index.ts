import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const money=(v:any)=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(Number(v)||0);

Deno.serve(async(req)=>{
  if(req.method!=="POST") return new Response("Method not allowed",{status:405});

  const supplied=req.headers.get("x-rockstar-secret");
  const expected=Deno.env.get("ROCKSTAR_ORDER_WEBHOOK_SECRET");
  if(!expected || supplied!==expected){
    return Response.json({ok:false,error:"Unauthorized"},{status:401});
  }

  const VAPID_PUBLIC_KEY=Deno.env.get("VAPID_PUBLIC_KEY")||"";
  const VAPID_PRIVATE_KEY=Deno.env.get("VAPID_PRIVATE_KEY")||"";
  const VAPID_SUBJECT=Deno.env.get("VAPID_SUBJECT")||"mailto:admin@example.com";
  const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";

  let secretKey="";
  try{secretKey=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}")["default"]||""}catch(_){}
  if(!secretKey) secretKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";

  if(!VAPID_PUBLIC_KEY||!VAPID_PRIVATE_KEY||!SUPABASE_URL||!secretKey){
    return Response.json({ok:false,error:"Missing push secrets"},{status:500});
  }

  const payload=await req.json().catch(()=>({}));
  if(payload.type!=="INSERT" || payload.table!=="orders"){
    return Response.json({ok:true,skipped:true});
  }
  const order=payload.record||{};

  webpush.setVapidDetails(VAPID_SUBJECT,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY);

  const db=createClient(SUPABASE_URL,secretKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:subs,error}=await db.from("push_subscriptions")
    .select("id,endpoint,p256dh,auth").eq("active",true);
  if(error) return Response.json({ok:false,error:error.message},{status:500});

  const message=JSON.stringify({
    title:`🛒 Nuevo pedido ${order.folio||""}`,
    body:`${order.customer_name||"Cliente"} · ${money(order.total)}`,
    tag:`rockstar-order-${order.id||Date.now()}`,
    url:"./admin.html#ordersPanel",
    data:{order_id:order.id||null,folio:order.folio||null}
  });

  const results=[];
  for(const sub of subs||[]){
    try{
      await webpush.sendNotification({
        endpoint:sub.endpoint,
        keys:{p256dh:sub.p256dh,auth:sub.auth}
      },message);
      results.push({id:sub.id,ok:true});
    }catch(e:any){
      const status=Number(e?.statusCode||e?.status||0);
      results.push({id:sub.id,ok:false,status});
      if(status===404||status===410){
        await db.from("push_subscriptions").update({active:false}).eq("id",sub.id);
      }
    }
  }

  return Response.json({ok:true,sent:results.filter(x=>x.ok).length,total:results.length,results});
});
