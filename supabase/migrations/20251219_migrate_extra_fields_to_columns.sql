-- Migração dos dados antigos de extra_fields para as novas colunas separadas
-- Execute este script no Supabase SQL Editor

UPDATE items
SET
  species = (extra_fields->>'species'),
  breed = (extra_fields->>'breed'),
  size = (extra_fields->>'size'),
  age = (extra_fields->>'age'),
  collar = (extra_fields->>'collar'),
  microchip = (extra_fields->>'microchip'),
  animal_name = (extra_fields->>'animal_name')
WHERE extra_fields IS NOT NULL;

-- Após rodar, você pode remover a coluna extra_fields se desejar:
-- ALTER TABLE items DROP COLUMN extra_fields;
