# Mapeamento JSON local -> Supabase

Esta versao prepara a migracao sem substituir a persistencia local homologada. Na V18.1, os mappers foram corrigidos para refletir os campos reais do app e do `supabase-schema.sql`. Na V18.2, o caminho cloud foi ligado de forma minima: leitura paginada, login por `auth.js` e gravacao por registro, mantendo bloqueada a gravacao de estado inteiro para evitar perda de dados.

## Listas principais

- `clients` -> `public.clients`
- `spaces` -> `public.spaces`
- `reservations` -> `public.reservations`
- `guests` -> `public.guests`
- `transactions` -> `public.transactions`
- `maintenance` -> `public.maintenance`
- `cleaning` -> `public.cleaning`
- `laundry` -> `public.laundry`
- `inventory` -> `public.inventory`
- `utilities` -> `public.utilities`
- `employees` -> `public.employees`

## Arquivos de apoio

- `mappers.js`: conversao entre nomes camelCase do app e snake_case do banco.
- `state-validation.js`: validacao referencial antes de salvar/importar.
- `repository.js`: interface operacional para LocalStorage, servidor local e Supabase, com escrita cloud apenas por registro.
- `auth.js`: interface operacional para login local privado e Supabase Auth quando configurado.

## Proxima etapa recomendada

Executar teste em projeto Supabase real: aplicar schema/RLS, criar perfis de homologacao, migrar JSON para tabelas e validar login, leitura, upsert e exclusao explicita.
