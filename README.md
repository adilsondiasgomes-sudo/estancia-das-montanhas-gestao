# Sistema Estancia das Montanhas - V18.5

Versao incremental de polimento operacional, produzida a partir da V18.4.

## Veredito da rodada

A V18.5 preserva a fundacao GitHub Pages/Supabase ja homologada e acrescenta uma trilha temporal simples para reservas: data/hora de lancamento e data/hora de ultima alteracao.

## Escopo real da V18.5

- Reservas novas recebem `createdAt` no momento do cadastro.
- Reservas editadas recebem `updatedAt` no momento da alteracao.
- O mapeador Supabase reconhece `created_at` e `updated_at`, colunas ja existentes no schema cloud.
- Os detalhes de agendamento exibem os carimbos de tempo para o perfil gerencial.
- A pagina de filtros de reservas exibe a data/hora de lancamento de cada reserva.
- Registro Tecnico, identificacao de versao e backup exportado foram alinhados para V18.5.

## Heranca preservada da V18.4/V18.2

- `index.html` carrega `supabase-loader.js` antes dos adapters.
- `auth.js` governa login, restauracao de sessao e logout.
- `repository.js` governa carga e gravacao por adapter.
- `SupabaseRepository` le tabelas com paginacao e nao faz reconciliacao por ausencia.
- `SupabaseRepository.saveState()` segue bloqueado por seguranca; use `upsertRecord()` e `deleteRecord()` por registro.
- Criacao, edicao, exclusao e troca de status sincronizam por registro quando houver repository cloud ativo.
- `config.js` e `config.example.js` continuam sem usuarios locais e sem senhas.
- Mascara de CPF/CPF-CNPJ, financeiro derivado de reserva e supressao da moldura vazia do status sincronizado permanecem preservados.

## Limite proposital

A versao dedicada ao backup foi mantida separada. Backup e restauracao mexem em persistencia e recuperacao de dados, por isso devem receber uma rodada propria de implementacao e testes.

## Registro Tecnico

O Registro Tecnico de Evolucao registra a auditoria Genspark, o confronto Claude x Genspark, a decisao de avancar por partes, a trava contra perda de dados em nuvem e os polimentos incrementais posteriores.
