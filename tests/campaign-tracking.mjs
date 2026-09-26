import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const method=html.slice(html.indexOf('  async trackEvent(name,payload){'),html.indexOf('  async saveQuote(){'));
assert.ok(method.includes('async trackEvent('),'Find the real event method');
const events=[], database=[];
const meta={build:'qa',visit_id:'private-visit',source:'instagram',utm_source:'instagram',utm_medium:'organic_social',utm_campaign:'fresita_reel',utm_content:'dm',user_agent:'private-agent'};
const sandbox={
  trafficMeta:()=>meta,
  trackMetaFunnelEvent:()=>{},
  supabaseRpc:async(name,args)=>{database.push({name,args});return {ok:true};},
  window:{posthog:{capture:(name,props)=>events.push({name,props})}},
  console:{warn:()=>{}}
};
const app=vm.runInNewContext('({'+method+'})',sandbox);
app.state={sessionId:'private-session',quoteId:'private-quote'};
const plain=value=>JSON.parse(JSON.stringify(value));
const quote={subtotal:1000,discount:100,total:900,promo_code:'FRESITA10',folio:'PRIVATE-FOLIO',phone:'PRIVATE-PHONE',email:'PRIVATE-EMAIL',full_name:'PRIVATE-NAME'};
await app.trackEvent('quote_generated',quote);
assert.deepEqual(plain(events[0].props),{
  build:'qa',utm_source:'instagram',utm_medium:'organic_social',
  utm_campaign:'fresita_reel',utm_content:'dm',promo_code:'FRESITA10',
  subtotal:1000,discount:100,total:900,currency:'MXN'
});
assert.equal(database[0].args.p_payload.folio,'PRIVATE-FOLIO');
assert.equal(database[0].args.p_event_name,'quote_generated');
assert.equal(JSON.stringify(events).includes('PRIVATE'),false,'No contact or quote identifiers go to PostHog');

await app.trackEvent('promo_applied',{promo_code:' fresita10 ',subtotal:3500,discount:350,final_total:3150});
assert.equal(events.at(-1).props.total,3150);
assert.equal(events.at(-1).props.promo_code,'FRESITA10');
await app.trackEvent('promo_rejected',{promo_code:'FRESITA10',reason:'PRIVATE-ERROR'});
assert.equal(events.at(-1).props.reason,undefined);
await app.trackEvent('promo_removed',{promo_code:'FRESITA10',subtotal:3500,discount:350});
assert.equal(events.at(-1).props.discount,350);
await app.trackEvent('whatsapp_clicked',{...quote,total:0});
assert.equal(events.at(-1).props.total,0,'Keep a real zero total');

const beforeUnknown=events.length;
await app.trackEvent('unlisted_event',{phone:'PRIVATE-PHONE'});
assert.equal(events.length,beforeUnknown,'Only selected events are forwarded');
assert.equal(database.at(-1).args.p_event_name,'unlisted_event');

sandbox.window.posthog.capture=()=>{throw new Error('SDK unavailable');};
assert.deepEqual(plain(await app.trackEvent('quote_generated',quote)),{ok:true},'First-party tracking survives PostHog failure');
sandbox.window={};
assert.deepEqual(plain(await app.trackEvent('quote_generated',quote)),{ok:true},'First-party tracking survives a blocked SDK');
sandbox.window.posthog={capture:(name,props)=>events.push({name,props})};
meta.utm_content='person@example.com';
await app.trackEvent('app_open',{});
assert.equal(events.at(-1).props.utm_content,undefined,'Reject free-form campaign values');
console.log('PASS: campaign attribution, coupon events, amounts, privacy allowlist and first-party fallback.');
