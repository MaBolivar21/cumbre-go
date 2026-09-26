-- Execute only after the commercial scope and launch are confirmed.
-- This data update does not change the schema or reset usage of a launched promotion.
do $activation$
begin
  update public.promo_codes
  set active=true,
      valid_from=now(),
      valid_until=now()+interval '7 days',
      metadata=metadata || jsonb_build_object('status','active','activated_at',now())
  where code='FRESITA10' and active=false and uses=0
    and metadata->>'status'='draft'
    and discount_type='percent' and discount_value=10
    and min_total=0 and max_discount is null and max_uses is null;
  if not found then
    raise exception 'FRESITA10 no coincide con el borrador revisado o ya fue activado. Revisar antes de continuar.';
  end if;
end;
$activation$;

select code,active,
       valid_from at time zone 'America/Mexico_City' as inicio_cdmx,
       valid_until at time zone 'America/Mexico_City' as fin_cdmx,
       discount_value,min_total,max_discount
from public.promo_codes where code='FRESITA10';
