# Sistema Estancia das Montanhas - V18.4

Versao incremental de correcao e polimento da homologacao cloud, produzida a partir da V18.3.

## Veredito da rodada

A V18.4 preserva a fundacao GitHub Pages/Supabase ja homologada e atua em tres pontos detectados em teste real: mascara de documento no lancamento, leitura financeira de reservas com sinal e remocao completa da moldura vazia do status sincronizado.

## Escopo real da V18.4

- Campos de CPF e CPF/CNPJ passam a aplicar mascara visual durante a digitacao.
- O financeiro passa a exibir valores derivados de reservas sem lancamento financeiro vinculado: sinal como entrada paga e saldo como pendencia.
- Para evitar dupla contagem, reservas que ja possuem lancamento financeiro vinculado nao geram linhas derivadas.
- A pilula de sincronizacao fica totalmente oculta nos estados saudaveis, sem reservar espaco visual.
- Registro Tecnico, identificacao de versao e backup foram alinhados para V18.4.

## Heranca preservada da V18.3/V18.2

- `index.html` carrega `supabase-loader.js` antes dos adapters.
- `auth.js` governa login, restauracao de sessao e logout.
- `repository.js` governa carga e gravacao por adapter.
- `SupabaseRepository` le tabelas com paginacao e nao faz reconciliacao por ausencia.
- `SupabaseRepository.saveState()` segue bloqueado por seguranca; use `upsertRecord()` e `deleteRecord()` por registro.
- Criacao, edicao, exclusao e troca de status sincronizam por registro quando houver repository cloud ativo.
- `config.js` e `config.example.js` continuam sem usuarios locais e sem senhas.

## Limite proposital

Endereco estruturado por rua, numero, bairro, cidade e UF deve entrar em rodada propria, pois envolve formularios, possivel mapeamento cloud e decisao de compatibilidade com dados ja salvos.

## Registro Tecnico

O Registro Tecnico de Evolucao registra a auditoria Genspark, o confronto Claude x Genspark, a decisao de avancar por partes, a trava contra perda de dados em nuvem e os polimentos incrementais posteriores.
