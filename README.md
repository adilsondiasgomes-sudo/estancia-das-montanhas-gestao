# Sistema Estancia das Montanhas - V18.6

Versao dedicada ao modulo de backup e recuperacao, produzida a partir da V18.5.

## Veredito da rodada

A V18.6 preserva a fundacao GitHub Pages/Supabase homologada e fortalece o modulo Backup com exportacao completa, importacao por mescla, substituicao controlada e zeramento do banco do sistema.

## Escopo real da V18.6

- O modulo Backup passa a exibir contadores de registros antes das operacoes.
- Exportar backup baixa um JSON completo identificado como V18.6.
- Importar e mesclar preserva a base atual, adicionando novos registros e atualizando registros de mesmo ID.
- Substituir base troca a base atual pelo arquivo selecionado, mantendo snapshot local previo.
- Zerar banco exige confirmacao, digitacao de `ZERAR` e cria snapshot local antes da limpeza.
- No modo cloud, as operacoes sincronizam por `upsertRecord()` e `deleteRecord()` por registro, sem reativar `saveState()` em lote.

## Heranca preservada da V18.5/V18.2

- `SupabaseRepository.saveState()` segue bloqueado por seguranca contra gravacao destrutiva em lote.
- `SupabaseRepository` continua lendo tabelas com paginacao e sem reconciliacao por ausencia.
- Login, Auth, RLS, mapeadores e chaves publicaveis seguem a estrutura homologada.
- Trilhas de data/hora de reservas da V18.5 permanecem preservadas.

## Limite proposital

O snapshot criado antes de importar/substituir/zerar fica no navegador local. Ele e uma rede de seguranca imediata, mas nao substitui o arquivo de backup baixado e armazenado fora do sistema.

## Registro Tecnico

O Registro Tecnico de Evolucao registra a V18.6 como a rodada propria de governanca de backup, separada dos polimentos anteriores para reduzir risco de regressao.
