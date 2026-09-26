-- Transactional QA. Every test quote, CRM row, coupon usage and queued webhook
-- is rolled back inside the exception block. Only the disabled draft must exist.
do $qa$
declare
  v_request uuid := gen_random_uuid();
  v_session uuid := gen_random_uuid();
  v_meta jsonb := '{"source":"instagram","utm_source":"instagram","utm_medium":"organic_social","utm_campaign":"fresita_reel","utm_content":"qa","visit_type":"pareja","stay":"dia","lodgings":{},"has_pending_quote":false,"is_test":true}'::jsonb;
  v_items jsonb := '[{"item_code":"entrada","item_name":"Entrada general","category":"acceso","quantity":2,"unit_price":20,"line_total":40,"details":{}},{"item_code":"tirolesa","item_name":"Tirolesa","category":"aventura","quantity":2,"unit_price":300,"line_total":600,"details":{}},{"item_code":"puente","item_name":"Puente colgante","category":"aventura","quantity":2,"unit_price":150,"line_total":300,"details":{}}]'::jsonb;
  v record;
  q record;
  repeated record;
  v_report jsonb;
  v_before_uses integer;
  v_scope_ok boolean;
  v_sum numeric;
begin
  select uses into v_before_uses from public.promo_codes
    where code='FRESITA10' and active=false and metadata->>'status'='draft';
  if not found then raise exception 'QA requires the disabled FRESITA10 draft.'; end if;
  if not has_function_privilege('anon','public.validate_promo(text,numeric)','EXECUTE')
     or not has_function_privilege('anon','public.submit_quote_v3(uuid,boolean,text,uuid,date,integer,integer,integer,text,text,text,text,jsonb,jsonb,text)','EXECUTE') then
    raise exception 'Public RPC execute grant is missing.';
  end if;
  begin
    update public.promo_codes set active=true,valid_from=now()-interval '1 minute',
      valid_until=now()+interval '7 days' where code='FRESITA10';

    select * into v from public.validate_promo(' fresita10 ',1000);
    if v.valid is distinct from true or v.discount_amount<>100 or v.final_total<>900 then raise exception '1000 -> 900 failed'; end if;
    select * into v from public.validate_promo('FRESITA10',3500);
    if v.valid is distinct from true or v.discount_amount<>350 or v.final_total<>3150 then raise exception '3500 -> 3150 failed'; end if;
    select * into v from public.validate_promo('FRESITA10',7000);
    if v.valid is distinct from true or v.discount_amount<>700 or v.final_total<>6300 then raise exception 'Uncapped discount failed'; end if;
    select * into v from public.validate_promo('FRESITA10',1499.99);
    if v.discount_amount<>150 or v.final_total<>1349.99 then raise exception 'Rounding failed'; end if;

    select * into q from public.submit_quote_v3(
      v_request,true,'csg-policies-2026-09-20-v1',v_session,current_date+1,
      2,0,null,'QA FRESITA ROLLBACK','0000000000',null,
      'instagram',v_meta,v_items,'FRESITA10');
    if q.subtotal_estimated<>940 or q.discount_amount<>94 or q.total_estimated<>846
       or q.promo_code is distinct from 'FRESITA10' then raise exception 'Quote total failed'; end if;

    select * into repeated from public.submit_quote_v3(
      v_request,true,'csg-policies-2026-09-20-v1',v_session,current_date+1,
      2,0,null,'QA FRESITA ROLLBACK','0000000000',null,
      'instagram',v_meta,v_items,'FRESITA10');
    if repeated.quote_id is distinct from q.quote_id or repeated.solicitud_id is distinct from q.solicitud_id
       or (select uses from public.promo_codes where code='FRESITA10')<>v_before_uses+1 then
      raise exception 'Retry consumed a second coupon or created a duplicate.';
    end if;

    select s.atribucion->>'utm_campaign'='fresita_reel'
       and s.atribucion->>'utm_source'='instagram'
       and s.solicitud_original#>>'{quote,promo_code}'='FRESITA10'
       and (s.solicitud_original#>>'{quote,discount_amount}')::numeric=94
       and s.estimado_cliente_mxn=846
       and s.folio=q.folio
       and qt.meta->>'utm_campaign'='fresita_reel'
       and qt.promo_code='FRESITA10'
    into v_scope_ok
    from public.cumbre_go_solicitudes s join public.quotes qt on qt.id=s.quote_id
    where s.id=q.solicitud_id;
    if v_scope_ok is distinct from true then raise exception 'CRM campaign/coupon linkage failed'; end if;
    select sum(line_total) into v_sum from public.quote_items where quote_id=q.quote_id;
    if v_sum<>846 then raise exception 'Saved line items do not reconcile'; end if;

    update public.promo_codes set valid_until=now()-interval '1 second' where code='FRESITA10';
    select * into v from public.validate_promo('FRESITA10',1000);
    if v.valid is distinct from false then raise exception 'Expired coupon was accepted'; end if;
    update public.promo_codes set valid_from=now()+interval '1 day',valid_until=now()+interval '7 days' where code='FRESITA10';
    select * into v from public.validate_promo('FRESITA10',1000);
    if v.valid is distinct from false then raise exception 'Future coupon was accepted'; end if;
    update public.promo_codes set active=false where code='FRESITA10';
    select * into v from public.validate_promo('FRESITA10',1000);
    if v.valid is distinct from false then raise exception 'Disabled coupon was accepted'; end if;

    v_report:=jsonb_build_object(
      'result','PASS','discount_examples',jsonb_build_array(
        jsonb_build_object('subtotal',1000,'discount',100,'total',900),
        jsonb_build_object('subtotal',3500,'discount',350,'total',3150)),
      'quote_to_crm',true,'campaign_preserved',true,'coupon_preserved',true,
      'retry_idempotent',true,'expiry_and_inactive_checked',true,
      'test_records_persisted',false);
    raise exception using errcode='PZ001',message='ROLLBACK_QA_ONLY';
  exception when sqlstate 'PZ001' then
    perform set_config('fresita.qa_report',v_report::text,true);
  end;
  if exists(select 1 from public.cumbre_go_solicitudes where request_key=v_request)
     or exists(select 1 from public.quotes where id=q.quote_id)
     or exists(select 1 from public.promo_codes where code='FRESITA10' and (active or uses<>v_before_uses)) then
    raise exception 'QA rollback verification failed';
  end if;
end;
$qa$;
select current_setting('fresita.qa_report',true)::jsonb as qa_report;
