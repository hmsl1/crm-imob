insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imoveis-fotos',
  'imoveis-fotos',
  true,
  5242880,                                        -- 5 MB por arquivo (o app já comprime antes de enviar)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos: dono envia"  on storage.objects;
drop policy if exists "fotos: dono lista"  on storage.objects;
drop policy if exists "fotos: dono altera" on storage.objects;
drop policy if exists "fotos: dono apaga"  on storage.objects;

create policy "fotos: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imoveis-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos: dono lista" on storage.objects
  for select to authenticated
  using (bucket_id = 'imoveis-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos: dono altera" on storage.objects
  for update to authenticated
  using (bucket_id = 'imoveis-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imoveis-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Índice para a listagem de imóveis
create index if not exists imoveis_owner_created_idx on imoveis (owner_id, created_at desc);
