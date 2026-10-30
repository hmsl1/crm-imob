-- Migração 006 — endereço (rua e número) do imóvel
-- Usado pelo botão "Ver no mapa" (Google Maps) da tela do imóvel.
-- Campo opcional: imóveis antigos continuam funcionando (o mapa usa bairro e cidade).
-- Pode ser repetida sem erro.

alter table public.imoveis
  add column if not exists endereco text;
