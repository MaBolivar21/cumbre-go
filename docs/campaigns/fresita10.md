# Lanzamiento de FRESITA10

## Configuración autorizada el 26 de septiembre de 2026

- El cupón se preparó en Supabase como borrador desactivado; el usuario autorizó su publicación y activación.
- Condición aprobada: 10% del subtotal completo de servicios con precio confirmado.
- Incluye hospedaje, alimentos y entrada cuando formen parte de ese subtotal.
- Sin compra mínima, sin tope de descuento y sin límite total de usos, aprobado por el usuario.
- Vigencia prevista: siete días exactos desde su activación. El script devuelve inicio y fin en America/Mexico_City.
- Un código por cotización; no acumulable dentro del cotizador. La reserva queda sujeta a disponibilidad y confirmación del equipo.
- La vigencia se comprueba al generar la cotización; no limita automáticamente la fecha de visita ni implementa una fecha límite de pago.
- El cupón no restringe el número de cotizaciones por persona. El equipo debe evitar aplicar beneficios duplicados a una misma reserva.
- El contador de usos cuenta cotizaciones, no reservas pagadas.

## Ya verificado

La prueba transaccional con las funciones vigentes confirmó:

- $1,000 - $100 = $900.
- $3,500 - $350 = $3,150.
- $7,000 - $700 = $6,300: no hay un tope implícito.
- Redondeo a centavos.
- Cupón inactivo, futuro y vencido rechazados.
- Solicitud de prueba por $940: descuento $94, total $846.
- Campaña, origen, cupón, descuento y folio conservados en la cotización y en el registro del CRM.
- Reintentar la misma solicitud devuelve la misma cotización y consume un solo uso.
- La prueba revierte todos sus registros y el webhook encolado; no deja leads, reservas ni ventas de prueba.

Esto comprueba la función y los registros de base de datos. Falta la prueba desde el navegador de Instagram y comprobar la llegada real de eventos a PostHog después del despliegue.

## Cambios de medición

Se reutilizan los nombres actuales: app_open, screen_view, quote_generated y whatsapp_clicked.
Se agregan a la salida de PostHog los eventos ya existentes promo_applied, promo_rejected y promo_removed.

Se transmiten únicamente campos seleccionados de campaña y de importes. Nombre, teléfono, correo, folio y UUID de la cotización quedan fuera de ese payload. Una excepción del SDK de PostHog ya no impide registrar el evento en Supabase.

No se incorpora confirmación de reserva al navegador: esa conversión se debe medir con el estado validado por el equipo en CRM. Abrir WhatsApp no demuestra que se envió un mensaje.

## Enlaces preparados

El visitante escribe FRESITA10 en el campo de promoción; estos enlaces identifican el canal, no aplican automáticamente el descuento.

| Uso | Enlace |
| --- | --- |
| DM solicitado | https://go.cumbresalvaje.mx/?utm_source=instagram&utm_medium=organic_social&utm_campaign=fresita_reel&utm_content=dm |
| Bio | https://go.cumbresalvaje.mx/?utm_source=instagram&utm_medium=organic_social&utm_campaign=fresita_reel&utm_content=bio |
| Stories | https://go.cumbresalvaje.mx/?utm_source=instagram&utm_medium=organic_social&utm_campaign=fresita_reel&utm_content=story |

La atribución del enlace y el uso del cupón deben conservarse como señales separadas: si alguien comparte el código fuera de Instagram, el código por sí solo no demuestra una visita desde Instagram.

## Orden para arrancar

1. Alcance autorizado: 10% sobre el total completo, incluyendo hospedaje y alimentos. Publicación en el repositorio público y activación autorizadas por el usuario el 26 de septiembre de 2026.
2. Publicar el ajuste de medición y verificar que la versión nueva está disponible.
3. Activar el cupón con ops/campaigns/activate-fresita10.sql. Si cambian las condiciones, revisar primero el borrador y repetir la prueba.
4. Hacer una cotización desde un enlace abierto en Instagram; comprobar el total, el folio y el registro CRM, y observar los eventos en PostHog. Marcar cualquier prueba persistida como QA para excluirla del reporte.
5. Preparar comentario fijado, bio y Stories con las condiciones y la fecha/hora exactas. Comenzar por personas que soliciten el beneficio o ya pregunten cómo visitar el parque.
6. Medir visitas etiquetadas, cotizaciones únicas, reservas confirmadas y pagos registrados por separado. No sumar cada evento de aplicación de cupón como un cliente ni presentar cotizado como ingreso.
7. Evaluar publicidad después de comprobar esta primera ruta.

## Archivos operativos

- prepare-fresita10.sql: crea el borrador sin sobrescribir un cupón existente.
- activate-fresita10.sql: activa exactamente las condiciones revisadas durante siete días; falla si la configuración cambió o si ya se había activado.
- verify-fresita10.sql: prueba transaccional con reversión de datos y del webhook.
- tests/campaign-tracking.mjs: prueba el envío de campaña/cupón, importes, lista de campos y continuidad cuando falla PostHog.

La vista específica de campaña, las gráficas y el evento de reserva confirmada son pasos posteriores; no se incluyen en este cambio inicial.
