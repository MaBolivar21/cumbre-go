-- FRESITA10: create a disabled draft. This does not launch the promotion.
-- Scope to review: 10% of the complete priced quote, with no minimum or cap.
-- Expiry is set to seven days from activation by activate-fresita10.sql.
insert into public.promo_codes
  (code,label,discount_type,discount_value,min_total,max_discount,
   active,valid_from,valid_until,max_uses,uses,metadata)
values
  ('FRESITA10','Fresita · 10%','percent',10,0,null,
   false,now(),null,null,0,
   jsonb_build_object(
     'campaign','fresita_reel',
     'status','draft',
     'duration_days',7,
     'scope','complete_priced_quote',
     'terms','10% sobre el subtotal cotizado. Un código por cotización; no acumulable. Sujeto a disponibilidad y confirmación.',
     'source_hint','instagram',
     'medium_hint','organic_social',
     'manual_validation',false))
on conflict (code) do nothing;

select code,label,discount_type,discount_value,min_total,max_discount,
       active,valid_from,valid_until,max_uses,uses,metadata
from public.promo_codes where code='FRESITA10';
