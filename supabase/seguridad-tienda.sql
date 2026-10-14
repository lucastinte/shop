-- ═══════════════════════════════════════════════════════════════════════
-- Seguridad de la tienda pública (starlinkers.shop)
--
-- Pegar TODO en Supabase → SQL Editor → Run. Corre en una transacción:
-- si algo falla, no se aplica nada.
--
-- Qué hace:
--   1. Los visitantes (clave pública "anon") ya NO pueden leer costos,
--      pagos, facturación ni notas internas: solo las columnas que la
--      tienda muestra.
--   2. Pueden leer las tandas en stock de un producto publicado aunque esa
--      tanda no tenga el tilde de publicar (igual que lo muestra el
--      dashboard), para que se vean todas las sedes.
--   3. La clave pública no puede escribir nada.
--
-- El dashboard no se ve afectado: entra con usuario (rol "authenticated").
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- 1) ¿El producto (por nombre, sin mayúsculas ni espacios extra) tiene
--    alguna tanda en stock publicada? Corre como dueño para poder mirar
--    todas las filas sin chocar con la propia regla de lectura.
create or replace function public.producto_publicado(nombre text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.items p
    where p.status = 'in_stock'
      and p.public_in_store = true
      and lower(regexp_replace(btrim(p.product_name), '\s+', ' ', 'g'))
        = lower(regexp_replace(btrim(nombre), '\s+', ' ', 'g'))
  );
$$;

revoke all on function public.producto_publicado(text) from public;
grant execute on function public.producto_publicado(text) to anon, authenticated;

-- 2) Regla de lectura para visitantes: lo publicado en stock, más las otras
--    tandas en stock de productos publicados (salvo los "propios").
alter table public.items enable row level security;

drop policy if exists "Public store read" on public.items;
create policy "Public store read" on public.items
  for select
  to anon
  using (
    status = 'in_stock'
    and (
      public_in_store = true
      or (coalesce(item_type::text, 'resale') <> 'personal' and public.producto_publicado(product_name))
    )
  );

-- 3) Columnas: solo las que muestra la tienda (sin purchase_price, montos,
--    facturación, vendedor, etc.). Debe coincidir con STORE_COLUMNS en
--    src/services/itemService.ts.
revoke all on public.items from anon;
grant select (
  id, created_at, date, product_name, store_title, sale_price, estimated_sale_price,
  quantity, status, item_condition, item_type, location, image_url, store_images,
  store_video_url, description, category, store_group, store_variant_name, public_in_store
) on public.items to anon;

commit;

-- ── Para comprobar (opcional) ─────────────────────────────────────────
-- Debe listar solo las columnas de arriba:
--   select column_name from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'items' and grantee = 'anon'
--   order by 1;
--
-- Para deshacer el punto 3 (volver a dejar leer todas las columnas):
--   grant select on public.items to anon;
