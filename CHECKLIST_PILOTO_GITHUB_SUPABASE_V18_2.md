# Checklist de subida controlada - V18.2

## Veredito operacional

A V18.2 pode subir para piloto tecnico controlado em GitHub/Supabase. Nao deve ser usada ainda em producao, nem para migrar a base real da pousada.

## Antes do push

- Confirmar repositorio GitHub de destino.
- Confirmar que o artefato publico nao contem `config.local.js`.
- Confirmar que o `index.html` principal nao carrega `config.local.js`.
- Preencher `supabaseUrl` no `config.js` somente com o projeto de homologacao.
- Preencher `supabaseAnonKey` no `config.js` somente com a anon key publica do projeto de homologacao.
- Manter `appMode: "cloud"`.
- Nao incluir usuarios/senhas locais no pacote publico.

## Supabase - preparo minimo

- Criar projeto Supabase novo de homologacao.
- Executar `supabase-schema.sql`.
- Criar usuarios reais pelo Supabase Auth.
- Criar registros correspondentes em `public.profiles`.
- Testar um perfil `manager`.
- Testar um perfil `operator`.
- Manter RLS ativa.

## Prova de que o piloto esta em cloud

- Abrir DevTools no navegador.
- Confirmar que `window.supabase` existe.
- Confirmar login via Supabase Auth real.
- Confirmar que `activeRepository` e do tipo `SupabaseRepository`.
- Confirmar que nao ha chamada pratica para `/api/state` durante o teste hospedado.
- Confirmar que a pilula de sincronizacao mostra status coerente.

## Testes permitidos no piloto

- Criar cliente ficticio.
- Criar espaco ficticio.
- Criar reserva ficticia.
- Cadastrar hospedes ficticios.
- Editar um registro ficticio.
- Excluir apenas registro ficticio e permitido pela policy.
- Conferir cada mudanca diretamente nas tabelas do Supabase.

## Testes negativos obrigatorios

- Tentar login com usuario inexistente.
- Tentar login com perfil inativo.
- Testar acao gerencial com operador.
- Confirmar que RLS bloqueia leitura/escrita indevida.
- Confirmar que `SupabaseRepository.saveState()` continua bloqueando gravacao cloud em lote.

## Fora do piloto V18.2

- Nao migrar base real.
- Nao usar restore como carga cloud.
- Nao cadastrar usuarios reais da operacao.
- Nao substituir rotina da pousada por esta build.

## Proxima versao

A proxima rodada deve criar uma operacao explicita, autorizada e auditavel para migracao local -> Supabase e restore cloud em lote, sem reaproveitar a gravacao comum por registro.
