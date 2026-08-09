# Evidencias V18.2

## Parecer considerado

- Genspark apontou que a V18.1 ainda precisava ativar o caminho real de Auth e Repository.
- Claude destacou riscos destrutivos no `SupabaseRepository`: reconciliacao por ausencia, leitura sem paginacao e gravacao de estado inteiro sem transacao.
- A decisao aplicada foi incremental: ligar o caminho cloud, mas bloquear qualquer gravacao em lote que possa apagar dados remotos.

## Correcoes aplicadas

- `supabase-loader.js` incluido no runtime principal.
- `auth.js` passou a governar login, restore e logout.
- `repository.js` passou a selecionar Supabase para `appMode:"cloud"` e `appMode:"cloud-ready"` quando houver chaves e SDK.
- Leitura Supabase com paginacao por `.range()`.
- `SupabaseRepository.saveState()` bloqueado por seguranca.
- Escrita cloud limitada a `upsertRecord()` e `deleteRecord()` por registro.
- `removeItem()`, salvamento de formulario e status de reserva enviam contexto de sincronizacao.
- `README.md`, `VERSION.txt`, `MIGRACAO_JSON_SUPABASE.md`, `supabase-schema.sql` e Registro Tecnico atualizados.

## Limites de teste

- Sem credenciais reais do Supabase nesta rodada, nao foi executado teste vivo de Auth/RLS.
- Foi validado que o caminho perigoso de gravacao cloud em lote falha de forma explicita.
- O pacote cloud nao deve conter `config.local.js`.

## Testes executados

- `node --check`: `app.js`, `auth.js`, `repository.js`, `mappers.js`, `permissions.js`, `state-validation.js`, `server.js` e `supabase-loader.js`.
- Smoke test com Supabase simulado: `SupabaseRepository.loadState()` leu 1005 registros de clientes em paginas `0-999` e `1000-1999`.
- Smoke test com Supabase simulado: `SupabaseRepository.saveState()` recusou gravacao cloud em lote.
- Conferencia do ZIP: ausencia de `index.local.html`, `config.local.example.js`, `config.local.js`, `admin123` e `operacao123`.
