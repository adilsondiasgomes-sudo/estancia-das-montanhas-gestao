# Auditoria solicitada ao Genspark - Sistema Estancia das Montanhas V18.7

## Artefato auditado

- Sistema: Estancia das Montanhas | Gestao
- Versao: V18.7
- Link publico: https://adilsondiasgomes-sudo.github.io/estancia-das-montanhas-gestao/
- Repositorio: https://github.com/adilsondiasgomes-sudo/estancia-das-montanhas-gestao
- Situacao: homologacao com GitHub Pages e Supabase.

## Finalidade

Fazer uma auditoria independente da V18.7, comparando risco pratico, experiencia de uso do proprietario e preservacao das funcoes ja aprovadas. A auditoria deve procurar regressao e inconsistencia, nao sugerir uma reconstrucao completa.

## Criterios de avaliacao

### 1. Funcionamento geral

- O sistema abre no link publico?
- A tela de login aparece corretamente?
- O usuario autenticado chega ao painel operacional?
- O sistema carrega dados reais/homologacao do Supabase?
- Ha mensagens de erro visiveis quando algo falha?

### 2. Manual de Uso

- O Manual de Uso esta acessivel pelo Registro Tecnico?
- O icone discreto na logo chama o Manual de Uso?
- A linguagem e simples o bastante para um usuario nao tecnico?
- A ordem apresentada e adequada: cliente, espaco, reserva, hospedes, agenda, check-in/out, financeiro, documentos e backup?
- O Manual ajuda no teste do proprietario sem poluir a operacao diaria?

### 3. Preservacao da V18.6

- Exportacao de backup continua funcionando?
- Importacao por mescla continua protegida?
- Substituir base continua com confirmacao?
- Zerar banco exige confirmacao forte?
- O sistema evita gravacao destrutiva em lote no Supabase?

### 4. Operacao real da pousada

Verificar coerencia dos fluxos:

- cadastrar contratante;
- cadastrar endereco e documentos;
- criar reserva;
- associar reserva ao espaco;
- cadastrar hospedes/convidados vinculados;
- consultar agenda;
- realizar check-in/check-out;
- conferir financeiro;
- emitir documentos da reserva;
- exportar backup.

### 5. Dados e seguranca

- Nao deve haver service role no front-end.
- RLS e perfis devem continuar coerentes.
- Login deve continuar obrigatorio.
- Operacoes destrutivas devem ter barreira de confirmacao.
- O sistema nao deve apagar dados cloud por estar localmente vazio.

## Formato da resposta

Favor responder com:

1. Veredito final.
2. Lista numerada de achados.
3. Grau de severidade de cada achado: critico, alto, medio ou baixo.
4. Evidencia objetiva de cada achado.
5. Se ha divergencia entre risco teorico e risco pratico.
6. Recomendacao de proxima versao, mantendo evolucao por partes.

## Fora de escopo

- Redesign completo.
- Novos modulos.
- Alteracoes extensas de banco que nao sejam necessarias para corrigir risco real.
- Sugestoes genericas sem evidencia.
