# Sistema Estancia das Montanhas - V18.2

Versao de ativacao cloud minima e segura, produzida a partir da V18.1 e orientada pelo parecer Genspark com preservacao das cautelas apontadas pelo Claude.

## Veredito da rodada

A V18.2 nao tenta entregar a nuvem completa de uma vez. Ela liga os pontos de entrada indispensaveis para teste controlado com Supabase, mas trava a operacao que poderia destruir dados: gravacao cloud de estado inteiro. O caminho cloud passa a existir no runtime; a persistencia definitiva continua por operacoes explicitas de registro.

## Escopo real da V18.2

- `index.html` carrega `supabase-loader.js` antes dos adapters.
- `auth.js` passa a governar login, restauracao de sessao e logout.
- `repository.js` passa a governar carga e gravacao por adapter.
- `SupabaseRepository` le tabelas com paginacao e nao faz reconciliacao por ausencia.
- `SupabaseRepository.saveState()` fica bloqueado por seguranca; use `upsertRecord()` e `deleteRecord()` por registro.
- Criacao, edicao, exclusao e troca de status sincronizam por registro quando houver repository cloud ativo.
- `appMode:"cloud"` e `appMode:"cloud-ready"` sao aceitos pelas fabricas, removendo ambiguidade.
- `config.js` e `config.example.js` continuam sem usuarios locais e sem senhas.

## Limite proposital

Sem credenciais reais do Supabase, esta entrega valida o bootstrap, a sintaxe e o comportamento de seguranca do adapter, mas nao substitui o teste em projeto Supabase real com Auth, RLS e dados de homologacao.

## Uso local

O `index.html` principal e o ZIP cloud nao devem carregar `config.local.js`. Para comparacao local privada, use `index.local.html` apenas fora do artefato publico e crie `config.local.js` a partir de `config.local.example.js` no seu ambiente. Esse arquivo privado nao deve ser commitado nem distribuido.

## Registro Tecnico

O Registro Tecnico de Evolucao registra a auditoria Genspark, o confronto Claude x Genspark, a decisao de avancar por partes e a trava contra perda de dados em nuvem.
