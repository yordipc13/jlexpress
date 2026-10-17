# JI Express Staging

This folder keeps the staging-only database, configuration, E2E assets, and results together for project `ofxwstrxvaangrqbgajb`.

## Contents

- `000_base_schema.sql`: staging baseline; never apply to Production.
- `supabase-config.js`: public client configuration, loaded only for `?supabase=staging` on localhost.
- `e2e-import-test.csv`: synthetic import test data with two valid rows and one invalid row.
- `E2E-RESULTADOS.md`: real staging test results, cleanup, and outstanding limitations.

The general E2E procedure is documented in [`Informacion/Pruebas-E2E-con-IA.md`](../Informacion/Pruebas-E2E-con-IA.md).

## Local test URL

`http://localhost:5500/JI%20Express/Admin/admin.html?supabase=staging`

The public site uses the same query parameter for local tracking tests. Without it, the application uses Production. Staging selection is disabled on published hosts.

Never place service-role keys, database passwords, customer records, or production exports in this folder.