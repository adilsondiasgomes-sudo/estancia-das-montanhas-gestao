# Sistema Estancia das Montanhas - V18.7

Versao dedicada ao Manual de Uso integrado ao Registro Tecnico.

## Veredito da rodada

A V18.7 preserva a fundacao GitHub Pages/Supabase homologada e acrescenta uma area de orientacao para o proprietario e para a operacao da pousada.

## Escopo real da V18.7

- Registro Tecnico ganhou botao para abrir o Manual de Uso.
- A logo da lateral ganhou icone discreto de ajuda para acesso rapido ao manual.
- A identidade visual em tela cheia tambem ganhou atalho para o manual.
- O manual usa linguagem direta e simples, com foco em usuario de escolaridade fundamental.
- A orientacao comeca pelos cadastros basicos: cliente, espaco, reserva e hospedes.
- Depois avanca para agenda, check-in/out, financeiro, documentos e backup.

## Heranca preservada da V18.6

- Modulo Backup com exportacao, mescla, substituicao e zeramento controlado permanece preservado.
- `SupabaseRepository.saveState()` segue bloqueado por seguranca contra gravacao destrutiva em lote.
- Login, Auth, RLS, mapeadores e chaves publicaveis seguem a estrutura homologada.
- Dados locais da V18.6 sao herdados na primeira abertura da V18.7.

## Limite proposital

Esta versao nao altera a estrutura do banco, nem as regras de reserva, financeiro ou backup. O foco e documentacao de uso para facilitar o teste gerencial pelo proprietario.

## Registro Tecnico

O Registro Tecnico de Evolucao registra a V18.7 como a rodada de orientacao de uso, mantendo a historia do sistema junto das auditorias e decisoes tecnicas.
