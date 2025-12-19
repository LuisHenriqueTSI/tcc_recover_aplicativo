-- Adiciona colunas separadas para todos os campos de animal na tabela items
ALTER TABLE items ADD COLUMN species TEXT;
ALTER TABLE items ADD COLUMN breed TEXT;
ALTER TABLE items ADD COLUMN size TEXT;
ALTER TABLE items ADD COLUMN age TEXT;
ALTER TABLE items ADD COLUMN collar TEXT;
ALTER TABLE items ADD COLUMN microchip TEXT;
ALTER TABLE items ADD COLUMN animal_name TEXT;
-- Opcional: manter extra_fields para compatibilidade, ou remova se não for mais usar
