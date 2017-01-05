CREATE SCHEMA meta
  CREATE VIEW reference AS
    SELECT
      kcu.constraint_name AS NAME,
      kcu.table_name      AS "from",
      kcu.column_name     AS "from_field",
      ccu.table_name      AS "to",
      ccu.column_name     AS "to_field",
      rc.update_rule,
      rc.delete_rule
    FROM information_schema.key_column_usage kcu
      JOIN information_schema.constraint_column_usage ccu ON kcu.constraint_name = ccu.constraint_name
      JOIN information_schema.referential_constraints rc ON kcu.constraint_name = rc.constraint_name;

CREATE OR REPLACE VIEW meta.attribute AS
  SELECT
    c.relname as name,
    json_object_agg(a.attname, format_type(a.atttypid, a.atttypmod)) as attributes
  FROM pg_class c
    JOIN pg_attribute a ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE nspname = 'public' AND (relkind = 'r' OR relkind = 'v') AND a.attstattarget <> 0
  GROUP BY c.relname
  ORDER BY relname;
