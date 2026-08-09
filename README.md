# Sistema Estancia das Montanhas - V18.3

Versao de polimento controlado da homologacao cloud, produzida a partir da V18.2 depois da validacao bem-sucedida em GitHub Pages e Supabase.

## Veredito da rodada

A V18.3 preserva a fundacao cloud homologada e evita alteracoes estruturais. O foco foi limpar a interface sem tocar em schema, RLS, Auth, mapeadores ou persistencia por registro.

## Escopo real da V18.3

- A mensagem tecnica de estado sincronizado deixa de aparecer na barra superior.
- A pilula de sincronizacao continua ativa para estados que exigem atencao: carregamento, pendencia ou erro.
- A tela de Reservas remove botoes redundantes no bloco de orientacao.
- O fluxo principal permanece claro: nova reserva no topo e acoes especificas por reserva nos icones da linha.
- Registro Tecnico, identificacao de versao e backup foram alinhados para V18.3.

## Heranca preservada da V18.2

- `index.html` carrega `supabase-loader.js` antes dos adapters.
- `auth.js` governa login, restauracao de sessao e logout.
- `repository.js` governa carga e gravacao por adapter.
- `SupabaseRepository` le tabelas com paginacao e nao faz reconciliacao por ausencia.
- `SupabaseRepository.saveState()` segue bloqueado por seguranca; use `upsertRecord()` e `deleteRecord()` por registro.
- Criacao, edicao, exclusao e troca de status sincronizam por registro quando houver repository cloud ativo.
- `config.js` e `config.example.js` continuam sem usuarios locais e sem senhas.

## Limite proposital

Melhorias de mascara CPF/CNPJ e endereco estruturado ficaram fora desta rodada porque envolvem formularios, dados e possivel ajuste de mapeamento. Devem entrar em versao propria para reduzir risco de regressao.

## Registro Tecnico

O Registro Tecnico de Evolucao registra a auditoria Genspark, o confronto Claude x Genspark, a decisao de avancar por partes, a trava contra perda de dados em nuvem e os polimentos incrementais posteriores.
