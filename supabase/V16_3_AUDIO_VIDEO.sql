-- ROCKSTAR STORE V16.3 — AUDIO DEL VIDEO / MÚSICA
-- Ejecutar UNA VEZ en Supabase > SQL Editor.

alter table public.store_settings
  add column if not exists audio_mode text not null default 'music';

-- Valores admitidos:
-- 'music' = usa la música subida/configurada
-- 'video' = usa el audio del video de fondo
update public.store_settings
set audio_mode = 'music'
where audio_mode is null or audio_mode not in ('music','video');
