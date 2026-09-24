/* Cumbre GO: group sharing and promotional-code requests.
 * Catalog recognition is not approval of a group discount.
 */
const groupCommerce={promoOpen:false,draft:'',promo:null,promoBusy:false,promoMessage:'',promoError:false,sequence:0,saving:false,pending:null,receipt:null};
const GROUP_WHATSAPP_NUMBER='523331436632';
function normalizedGroupCode(value){return String(value||'').trim().toUpperCase()}
function renderGroupPromo(){
  const summary=document.getElementById('summary');if(!summary)return;
  let card=document.getElementById('groupPromoCard');
  if(!card){
    card=document.createElement('div');card.id='groupPromoCard';card.className='promo-card';
    card.innerHTML='<button type="button" class="promo-head" id="groupPromoToggle" aria-expanded="false" aria-controls="groupPromoBody"><span class="promo-gift" aria-hidden="true">🎁</span><span class="promo-copy"><strong>¿Tienes un código de descuento?</strong><span>Agrega tu promoción a la solicitud</span></span><span class="promo-chevron" aria-hidden="true">⌄</span></button><div class="promo-body" id="groupPromoBody" hidden><label class="label" for="groupPromoInput">Código de promoción</label><div class="promo-row"><input id="groupPromoInput" type="text" maxlength="40" placeholder="Escribe tu código" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="button" id="groupPromoAdd">Agregar</button></div><div class="promo-applied" id="groupPromoApplied" hidden><div><strong id="groupPromoCode"></strong><span> · Pendiente de cotización</span></div><button type="button" class="promo-remove" id="groupPromoRemove">Quitar</button></div><div id="groupPromoMessage" class="promo-message" role="status" aria-live="polite" hidden></div><p class="promo-help">En visitas grupales, el equipo valida las condiciones y el descuento al preparar la cotización. No se aplica un importe automático.</p></div>';
    summary.querySelector('.summary-price').insertAdjacentElement('afterend',card);
    document.getElementById('groupPromoToggle').onclick=()=>{groupCommerce.promoOpen=!groupCommerce.promoOpen;updateGroupPromoView()};
    const input=document.getElementById('groupPromoInput');
    input.oninput=()=>{groupCommerce.sequence++;groupCommerce.draft=input.value;groupCommerce.promo=null;groupCommerce.promoBusy=false;groupCommerce.promoMessage='';groupCommerce.promoError=false;updateGroupPromoView(false)};
    input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addGroupPromo()}};
    document.getElementById('groupPromoAdd').onclick=addGroupPromo;
    document.getElementById('groupPromoRemove').onclick=()=>{if(groupCommerce.saving||groupCommerce.pending)return;groupCommerce.sequence++;groupCommerce.promo=null;groupCommerce.draft='';groupCommerce.promoBusy=false;groupCommerce.promoMessage='Código retirado de la solicitud.';groupCommerce.promoError=false;updateGroupPromoView();input.focus()};
  }
  updateGroupPromoView();
}
function updateGroupPromoView(syncInput=true){
  const card=document.getElementById('groupPromoCard');if(!card)return;
  const locked=groupCommerce.saving||!!groupCommerce.pending;
  card.classList.toggle('is-open',groupCommerce.promoOpen);card.classList.toggle('is-success',!!groupCommerce.promo);card.classList.toggle('is-error',groupCommerce.promoError);
  document.getElementById('groupPromoToggle').setAttribute('aria-expanded',String(groupCommerce.promoOpen));
  document.getElementById('groupPromoBody').hidden=!groupCommerce.promoOpen;
  if(syncInput)document.getElementById('groupPromoInput').value=groupCommerce.draft;
  document.getElementById('groupPromoInput').disabled=locked;
  const add=document.getElementById('groupPromoAdd');add.disabled=groupCommerce.promoBusy||locked;add.textContent=groupCommerce.promoBusy?'Revisando…':'Agregar';
  document.getElementById('groupPromoRemove').disabled=locked;
  document.getElementById('groupPromoApplied').hidden=!groupCommerce.promo;
  document.getElementById('groupPromoCode').textContent=groupCommerce.promo?.code||'';
  const msg=document.getElementById('groupPromoMessage');msg.hidden=!groupCommerce.promoMessage;msg.textContent=groupCommerce.promoMessage;msg.className='promo-message'+(groupCommerce.promoError?' error':'');
}
async function groupRPC(name,body){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_KEY},body:JSON.stringify(body),signal:controller.signal});
    const raw=await response.text();let data;
    try{data=raw?JSON.parse(raw):null}catch(_){throw new Error('El sistema no devolvió una respuesta válida. Intenta de nuevo.')}
    if(!response.ok){const e=new Error(data?.message||'No fue posible completar la solicitud.');e.status=response.status;throw e}
    return data;
  }finally{clearTimeout(timer)}
}
async function checkGroupPromo(code){
  if(!/^[A-Z0-9_-]{1,40}$/.test(code))throw new Error('Escribe un código válido, sin espacios ni símbolos especiales.');
  // Existing RPC fills min_total/type/value only after activity, dates and usage
  // checks pass. Zero probes recognition, NOT a group subtotal. Ignore amounts.
  const data=await groupRPC('validate_promo',{p_code:code,p_subtotal:0});
  const r=Array.isArray(data)?data[0]:data;
  if(!r||typeof r.valid!=='boolean')throw new Error('No pudimos revisar el código. Intenta de nuevo.');
  const waitingForSubtotal=r.valid===false&&Number(r.min_total)>0&&['percent','fixed'].includes(r.discount_type)&&r.discount_value!=null&&Number.isFinite(Number(r.discount_value));
  if(r.valid!==true&&!waitingForSubtotal)throw new Error(r.message||'Ese código no está disponible.');
  if(normalizedGroupCode(r.code)!==code)throw new Error('No pudimos confirmar el código. Intenta de nuevo.');
  return {code,status:'pending_quote'};
}
async function addGroupPromo(){
  if(groupCommerce.promoBusy||groupCommerce.saving||groupCommerce.pending)return;
  const code=normalizedGroupCode(document.getElementById('groupPromoInput').value),ticket=++groupCommerce.sequence;
  groupCommerce.draft=code;groupCommerce.promo=null;groupCommerce.promoOpen=true;groupCommerce.promoMessage='';groupCommerce.promoError=false;groupCommerce.promoBusy=true;updateGroupPromoView();
  try{
    const result=await checkGroupPromo(code);if(ticket!==groupCommerce.sequence)return;
    groupCommerce.promo=result;groupCommerce.promoMessage='Código reconocido. Lo incluiremos para que el equipo valide su aplicación a la cotización grupal.';
  }catch(e){if(ticket!==groupCommerce.sequence)return;groupCommerce.promoError=true;groupCommerce.promoMessage=e.name==='AbortError'?'La revisión tardó demasiado. Intenta de nuevo.':e.message}
  finally{if(ticket===groupCommerce.sequence){groupCommerce.promoBusy=false;updateGroupPromoView()}}
}
function buildGroupPayload(){
  const aEl=document.getElementById('adults'),cEl=document.getElementById('children');
  const a=aEl?aEl.value:'',c=cEl?cEl.value:'';
  const notes={message:document.getElementById('notes').value.trim()};
  if(groupCommerce.promo){notes.promo_code=groupCommerce.promo.code;notes.promo_status='pending_quote'}
  return {schema_version:1,contact:{name:document.getElementById('name').value.trim(),phone:document.getElementById('phone').value.replace(/\D/g,''),email:document.getElementById('email').value.trim()},group:{type:state.groupType,need:state.need,date:document.getElementById('date').value,visitors_total:state.total,adults:a===''?null:Number(a),children:c===''?null:Number(c),stay:state.stay},activities:[...state.activities],notes,attribution:attribution(),consent:{policies:true,contact:true,version:POLICY_VERSION}};
}
function validateGroupPayload(p){
  if(!GROUPS.some(x=>x[0]===p.group.type)||!NEEDS.some(x=>x[0]===p.group.need))throw new Error('Revisa el tipo de grupo y la visita que necesitas.');
  if(!p.contact.name||p.contact.phone.length<10||p.contact.phone.length>15)throw new Error('Revisa el nombre y WhatsApp de contacto.');
  if(p.contact.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.contact.email))throw new Error('Revisa el correo de contacto.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(p.group.date))throw new Error('Selecciona una fecha tentativa.');
  if(!Number.isInteger(p.group.visitors_total)||p.group.visitors_total<1||p.group.visitors_total>2000)throw new Error('Revisa el total de visitantes.');
  for(const v of [p.group.adults,p.group.children])if(v!==null&&(!Number.isInteger(v)||v<0||v>p.group.visitors_total))throw new Error('Revisa el desglose de visitantes.');
  if(p.group.adults!==null&&p.group.children!==null&&p.group.adults+p.group.children!==p.group.visitors_total)throw new Error('El desglose debe coincidir con el total.');
}
async function submitGroupRequest(){
  if(groupCommerce.receipt){go('success');return}
  if(groupCommerce.saving)return;
  const err=document.getElementById('submitErr'),btn=document.getElementById('submitBtn');err.textContent='';
  if(!document.getElementById('consent').checked){err.innerHTML='<div class="error">Necesitas aceptar las políticas para enviar la solicitud.</div>';return}
  if(groupCommerce.promoBusy){err.innerHTML='<div class="error">Espera a que termine la revisión del código.</div>';return}
  if(!groupCommerce.pending&&normalizedGroupCode(groupCommerce.draft)&&normalizedGroupCode(groupCommerce.draft)!==groupCommerce.promo?.code){groupCommerce.promoOpen=true;updateGroupPromoView();err.innerHTML='<div class="error">Agrega el código a la solicitud o borra el campo para continuar sin promoción.</div>';document.getElementById('groupPromoInput')?.focus();return}
  groupCommerce.saving=true;btn.disabled=true;btn.textContent='Guardando solicitud…';updateGroupPromoView();
  try{
    if(!groupCommerce.pending){
      if(groupCommerce.promo)groupCommerce.promo=await checkGroupPromo(groupCommerce.promo.code);
      const payload=buildGroupPayload();validateGroupPayload(payload);state.requestKey=state.requestKey||uuid();groupCommerce.pending={key:state.requestKey,payload};
    }
    // Freeze payload and key until outcome is known; a lost response cannot create a second lead.
    const pending=groupCommerce.pending;
    const data=await groupRPC('cumbre_go_submit_group',{p_request_key:pending.key,p_payload:pending.payload});
    if(!data||!/^CSG-G-\d{6,}$/.test(data.folio||''))throw new Error('No pudimos confirmar el folio. Reintenta el envío para consultar la misma solicitud.');
    groupCommerce.receipt={folio:data.folio,payload:JSON.parse(JSON.stringify(pending.payload))};
    document.getElementById('folio').textContent=data.folio;
    try{renderQr(data.folio)}catch(_){document.getElementById('qrBox').textContent='Usa tu folio para dar seguimiento.'}
    prepareGroupWhatsApp();go('success');
  }catch(e){
    if(e.status>=400&&e.status<500){groupCommerce.pending=null;state.requestKey=null}
    const message=groupCommerce.pending?'No pudimos confirmar el envío. Reintenta para recuperar el mismo folio; conservamos la información enviada para evitar duplicados.':(e.name==='AbortError'?'No pudimos revisar la promoción. Intenta de nuevo.':e.message);
    err.innerHTML='<div class="error">'+esc(message)+'</div>';
  }finally{groupCommerce.saving=false;btn.disabled=false;btn.innerHTML='SOLICITAR PROPUESTA <span>→</span>';updateGroupPromoView()}
}
function groupDateText(iso){return new Date(iso+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}
function groupFollowupUrl(folio){return 'https://wa.me/'+GROUP_WHATSAPP_NUMBER+'?text='+encodeURIComponent('Hola, equipo de Cumbre Salvaje. Quiero dar seguimiento a mi solicitud grupal. Folio: '+folio)}
function groupWhatsAppText(receipt){
  const p=receipt.payload,g=p.group;
  const lines=['Hola, equipo de Cumbre Salvaje. Quiero dar seguimiento a mi solicitud de cotización grupal.','','Folio: '+receipt.folio,'Grupo: '+label(GROUPS,g.type),'Necesidad: '+label(NEEDS,g.need),'Fecha tentativa: '+groupDateText(g.date),'Visitantes: '+g.visitors_total];
  if(g.adults!==null)lines.push('Adultos / acompañantes: '+g.adults);
  if(g.children!==null)lines.push('Menores / alumnos: '+g.children);
  lines.push('Estancia: '+(g.stay==='dia'?'Visita de día':g.stay==='noche'?'Con noche':'Por definir'),'','Experiencias de interés:');
  lines.push(...(p.activities.length?p.activities.map(id=>'- '+actLabel(id)):['Por definir con el equipo']));
  if(p.notes.promo_code)lines.push('','Código de promoción solicitado: '+p.notes.promo_code,'Aplicación y descuento pendientes de validar en la cotización grupal.');
  if(p.notes.message)lines.push('','Comentarios: '+p.notes.message);
  lines.push('','Contacto: '+p.contact.name,'WhatsApp: '+p.contact.phone);
  if(p.contact.email)lines.push('Correo: '+p.contact.email);
  lines.push('','Mi solicitud ya está registrada con este folio. Quedo pendiente de la cotización personalizada y disponibilidad. No representa pago ni reserva confirmada.');
  return lines.join('\n');
}
function prepareGroupWhatsApp(){
  if(!groupCommerce.receipt)return;
  const text=groupWhatsAppText(groupCommerce.receipt);
  document.getElementById('groupWaMessage').textContent=text;
  document.getElementById('groupWaOpen').href='https://wa.me/'+GROUP_WHATSAPP_NUMBER+'?text='+encodeURIComponent(text);
}
function openGroupWhatsApp(){if(!groupCommerce.receipt)return;prepareGroupWhatsApp();go('whatsapp')}
async function copyGroupWhatsApp(){
  if(!groupCommerce.receipt)return;
  const status=document.getElementById('groupWaCopyStatus');
  try{if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');await navigator.clipboard.writeText(groupWhatsAppText(groupCommerce.receipt));status.textContent='Mensaje copiado.'}
  catch(_){status.textContent='No se pudo copiar automáticamente. Mantén pulsado el mensaje para seleccionarlo y copiarlo.'}
}
