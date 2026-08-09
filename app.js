const APP_VERSION = "V18.3";
const storageKey = "estancia-das-montanhas-gestao-v18-3";
const authStorageKey = "estancia-das-montanhas-auth-v18-3";
const config = window.ESTANCIA_CONFIG || {};
// V17.2: celulas de tabela escapam texto por padrao; HTML do sistema exige marcador rawHtml().
const appMode = config.appMode || "local-assisted";
const demoMode = config.demoMode === true;
const environmentMode = config.environmentMode || (demoMode ? "demo" : "operational");
const rememberSession = config.rememberSession === true;
const authSessionStore = rememberSession ? localStorage : sessionStorage;
const sessionMinutes = Number(config.sessionMinutes || 120);
const appInstanceId = crypto.randomUUID();
const activeRepository = window.EstanciaRepository?.createRepository?.(config, storageKey);
const activeAuth = window.EstanciaAuth?.createAuth?.(config, authSessionStore, authStorageKey);

let loadedRevision = 0;
let externalChangePending = false;
let loginFailures = Number(sessionStorage.getItem("estancia-login-failures") || 0);
const hasLocalApi = ["127.0.0.1:8080", "localhost:8080"].includes(window.location.host);
let syncStatus = {state:hasLocalApi ? "pending" : "browser", message:hasLocalApi ? "Sincronizacao local pendente." : "Modo navegador local."};
let currentUser = null;
let currentView = "dashboard";
let dataMode = "browser";
let selectedClientId = null;
let selectedCalendarReservationId = null;
let selectedCalendarDay = null;
let selectedCalendarMonth = new Date().toISOString().slice(0,7);
let workflowReservationId = null;
let workflowMode = "checkin";
let guestDetailView = null;
let reservationFilterMode = "all";
let reservationDetailId = null;
let documentsReservationId = null;
let activeDocument = null;
let activeReport = null;
let financeFilters = {from:"",to:"",type:"all",status:"all",category:"all",clientId:"all",reservationId:"all"};
let checkinSort = {key:"entry",dir:"asc"};
let checkinFilters = {q:"",status:"all"};

const emptyState = { systemFlags:{demoSeedApplied:false,mode:"operational"}, meta:{revision:0,updatedAt:null,lastWriterId:null}, clients: [], spaces: [], reservations: [], guests: [], transactions: [], maintenance: [], cleaning: [], laundry: [], inventory: [], utilities: [], employees: [] };
const uid = () => crypto.randomUUID();
const seed = () => {
  const c1 = uid(), c2 = uid(), s1 = uid(), s2 = uid(), r1 = uid(), r2 = uid();
  return {
    clients: [
      { id:c1, name:"Mariana Alves", phone:"31 99999-1020", document:"123.456.789-00", email:"mariana@email.com", origin:"Instagram", notes:"Contratante de final de semana" },
      { id:c2, name:"Roberto Martins", phone:"31 98888-2040", document:"987.654.321-00", email:"roberto@email.com", origin:"Indicação", notes:"Evento corporativo" }
    ],
    spaces: [
      { id:s1, name:"Locação integral da pousada", type:"Hospedagem e eventos", capacity:20, baseRate:3200, status:"Disponível" },
      { id:s2, name:"Área gourmet e piscina", type:"Day use / evento", capacity:35, baseRate:1800, status:"Disponível" }
    ],
    reservations: [
      { id:r1, clientId:c1, spaceId:s1, type:"Aniversário", packageName:"Locação integral - final de semana", start:"2026-04-17", end:"2026-04-18", guests:20, total:3200, paid:1200, status:"Confirmada", checklist:"Contrato enviado; sinal recebido" },
      { id:r2, clientId:c2, spaceId:s2, type:"Confraternização", packageName:"Day use / evento", start:"2026-04-21", end:"2026-04-21", guests:20, total:1800, paid:600, status:"Pré-reserva", checklist:"Aguardando cardápio" }
    ],
    guests: [
      { id:uid(), clientId:c1, contractorCpf:"123.456.789-00", reservationId:r1, fullName:"Mariana Alves", cpf:"123.456.789-00", address:"Rua das Flores, 120 - Ipatinga/MG", stayStart:"2026-04-17", stayEnd:"2026-04-18", notes:"Responsável pela reserva" },
      { id:uid(), clientId:c1, contractorCpf:"123.456.789-00", reservationId:r1, fullName:"João Alves", cpf:"111.222.333-44", address:"Rua das Flores, 120 - Ipatinga/MG", stayStart:"2026-04-17", stayEnd:"2026-04-18", notes:"Hóspede indicado pela contratante" }
    ],
    transactions: [
      { id:uid(), date:"2026-04-02", type:"Entrada", category:"Sinal de reserva", description:"Sinal aniversário Mariana", amount:1200, status:"Pago" },
      { id:uid(), date:"2026-04-05", type:"Saída", category:"Manutenção", description:"Reparo iluminação da piscina", amount:380, status:"Pago" }
    ],
    maintenance: [{ id:uid(), due:"2026-04-15", area:"Piscina", system:"Hidráulica", priority:"Alta", responsible:"Equipe manutenção", status:"Pendente", description:"Revisar bomba, filtro e vazamentos." }],
    cleaning: [{ id:uid(), date:"2026-04-16", area:"Sede completa", type:"Pré-evento", responsible:"Diarista", status:"Pendente", notes:"Faxina geral antes da entrada." }],
    laundry: [{ id:uid(), date:"2026-04-19", item:"Toalhas de banho", qty:18, status:"A lavar", cost:126, notes:"Retorno previsto em 24h" }],
    inventory: [{ id:uid(), item:"Cadeiras dobráveis", category:"Mobiliário", qty:50, minimum:40, condition:"Bom", location:"Depósito", replacementValue:3500 }],
    utilities: [{ id:uid(), month:"2026-04", type:"Energia", reading:1280, amount:860, notes:"Uso de bomba e iluminação externa." }],
    employees: [{ id:uid(), name:"Carlos Silva", role:"Manutenção geral", phone:"31 97777-1111", payType:"Diária", rate:180, status:"Ativo" }]
  };
};
function ensureDemoData(data){
  const add = (list,item) => { if(!data[list].some(x=>x.id===item.id)) data[list].push(item); };
  const clients = [
    { id:"demo-client-luciana", name:"Luciana Ferreira", phone:"31 98611-2300", document:"321.654.987-10", email:"luciana.ferreira@email.com", origin:"WhatsApp", notes:"Reserva familiar com crianças e idosos." },
    { id:"demo-client-carlos", name:"Carlos Henrique Souza", phone:"31 97544-3312", document:"456.789.123-55", email:"carlos.souza@email.com", origin:"Indicação", notes:"Casamento intimista; exige check-list completo de fornecedores." },
    { id:"demo-client-patricia", name:"Patrícia Lima Andrade", phone:"31 99802-4410", document:"741.852.963-00", email:"patricia.andrade@email.com", origin:"Instagram", notes:"Aniversário de 40 anos com day use." },
    { id:"demo-client-felipe", name:"Felipe Rocha Campos", phone:"31 98770-2201", document:"852.963.741-22", email:"felipe.campos@email.com", origin:"Google", notes:"Confraternização empresarial com emissão de recibo." },
    { id:"demo-client-amanda", name:"Amanda Queiroz", phone:"31 99122-8080", document:"159.753.486-20", email:"amanda.queiroz@email.com", origin:"Cliente antigo", notes:"Solicitou bloqueio preventivo para feriado prolongado." }
  ];
  clients.forEach(c=>add("clients",c));
  add("spaces",{ id:"demo-space-churrasqueira", name:"Quiosque gourmet e churrasqueira", type:"Evento / apoio", capacity:30, baseRate:950, status:"Disponível" });
  const reservations = [
    { id:"demo-res-familia-agosto", clientId:"demo-client-luciana", spaceId:"demo-space-churrasqueira", type:"Reunião familiar", packageName:"Locação integral - final de semana", start:"2026-08-07", end:"2026-08-10", guests:15, total:4200, paid:2100, status:"Em estadia", checklist:"Check-in liberado; vistoria inicial realizada; atenção a berço e quarto térreo." },
    { id:"demo-res-casamento-agosto", clientId:"demo-client-carlos", spaceId:"demo-space-churrasqueira", type:"Casamento", packageName:"Locação integral - final de semana", start:"2026-08-21", end:"2026-08-23", guests:20, total:6800, paid:3000, status:"Confirmada", checklist:"Cerimonialista confirmada; iluminação externa; fornecedores devem apresentar lista." },
    { id:"demo-res-aniversario-julho", clientId:"demo-client-patricia", spaceId:"demo-space-churrasqueira", type:"Aniversário", packageName:"Day use / evento", start:"2026-07-18", end:"2026-07-18", guests:28, total:2400, paid:2400, status:"Finalizada", checklist:"Evento finalizado; pendente revisar itens de cozinha." },
    { id:"demo-res-corporativo-setembro", clientId:"demo-client-felipe", spaceId:"demo-space-churrasqueira", type:"Confraternização", packageName:"Locação integral - final de semana", start:"2026-09-11", end:"2026-09-13", guests:18, total:5200, paid:1000, status:"Pré-reserva", checklist:"Aguardando contrato assinado e confirmação do cardápio." },
    { id:"demo-res-feriado-outubro", clientId:"demo-client-amanda", spaceId:"demo-space-churrasqueira", type:"Hospedagem", packageName:"Locação integral - feriado", start:"2026-10-10", end:"2026-10-12", guests:20, total:7600, paid:0, status:"Solicitada", checklist:"Bloqueio comercial sem sinal; confirmar até 20/09." },
    { id:"demo-res-cancelada-agosto", clientId:"demo-client-patricia", spaceId:"demo-space-churrasqueira", type:"Day use", packageName:"Day use / evento", start:"2026-08-30", end:"2026-08-30", guests:22, total:1900, paid:0, status:"Cancelada", checklist:"Cancelada por indisponibilidade do grupo." }
  ];
  reservations.forEach(r=>add("reservations",r));
  [
    ["demo-guest-luciana-1","demo-client-luciana","321.654.987-10","demo-res-familia-agosto","Luciana Ferreira","321.654.987-10","Rua Diamantina, 44 - Ipatinga/MG"],
    ["demo-guest-luciana-2","demo-client-luciana","321.654.987-10","demo-res-familia-agosto","Bruno Ferreira","222.111.333-90","Rua Diamantina, 44 - Ipatinga/MG"],
    ["demo-guest-luciana-3","demo-client-luciana","321.654.987-10","demo-res-familia-agosto","Helena Ferreira","333.222.111-80","Rua Diamantina, 44 - Ipatinga/MG"],
    ["demo-guest-luciana-4","demo-client-luciana","321.654.987-10","demo-res-familia-agosto","Dona Marta Ribeiro","444.555.666-70","Av. Brasil, 1880 - Coronel Fabriciano/MG"],
    ["demo-guest-carlos-1","demo-client-carlos","456.789.123-55","demo-res-casamento-agosto","Carlos Henrique Souza","456.789.123-55","Rua Marfim, 77 - Ipatinga/MG"],
    ["demo-guest-carlos-2","demo-client-carlos","456.789.123-55","demo-res-casamento-agosto","Renata Castro Souza","555.444.333-20","Rua Marfim, 77 - Ipatinga/MG"],
    ["demo-guest-carlos-3","demo-client-carlos","456.789.123-55","demo-res-casamento-agosto","Márcio Alvarenga","666.777.888-11","Rua Palmeiras, 510 - Timóteo/MG"],
    ["demo-guest-carlos-4","demo-client-carlos","456.789.123-55","demo-res-casamento-agosto","Daniela Viana","777.888.999-22","Rua Ipê, 95 - Santana do Paraíso/MG"],
    ["demo-guest-patricia-1","demo-client-patricia","741.852.963-00","demo-res-aniversario-julho","Patrícia Lima Andrade","741.852.963-00","Rua Turmalina, 345 - Ipatinga/MG"],
    ["demo-guest-patricia-2","demo-client-patricia","741.852.963-00","demo-res-aniversario-julho","Sofia Andrade Lima","888.999.000-33","Rua Turmalina, 345 - Ipatinga/MG"],
    ["demo-guest-felipe-1","demo-client-felipe","852.963.741-22","demo-res-corporativo-setembro","Felipe Rocha Campos","852.963.741-22","Av. Pedro Linhares, 1550 - Ipatinga/MG"],
    ["demo-guest-felipe-2","demo-client-felipe","852.963.741-22","demo-res-corporativo-setembro","Camila Torres Nunes","999.000.111-44","Rua Siderúrgica, 212 - Ipatinga/MG"]
  ].forEach(([id,clientId,contractorCpf,reservationId,fullName,cpf,address])=>{
    const r=reservations.find(x=>x.id===reservationId);
    add("guests",{id,clientId,contractorCpf,reservationId,fullName,cpf,address,stayStart:r.start,stayEnd:r.end,notes:"Registro fictício para testes."});
  });
  [
    { id:"demo-tr-entrada-luciana", date:"2026-08-02", type:"Entrada", category:"Sinal de reserva", description:"Sinal reunião familiar Luciana", amount:2100, status:"Pago" },
    { id:"demo-tr-saida-faxina", date:"2026-08-06", type:"Saída", category:"Limpeza", description:"Faxina pré-estadia agosto", amount:420, status:"Pago" },
    { id:"demo-tr-entrada-casamento", date:"2026-08-03", type:"Entrada", category:"Sinal de reserva", description:"Sinal casamento Carlos", amount:3000, status:"Pago" },
    { id:"demo-tr-pendente-corporativo", date:"2026-09-01", type:"Entrada", category:"Saldo pendente", description:"Previsão de pagamento confraternização Felipe", amount:4200, status:"Pendente" },
    { id:"demo-tr-saida-manutencao", date:"2026-08-12", type:"Saída", category:"Manutenção", description:"Revisão elétrica da área externa", amount:680, status:"Pendente" }
  ].forEach(t=>add("transactions",t));
  [
    { id:"demo-maint-eletrica", due:"2026-08-12", area:"Área externa", system:"Elétrica", priority:"Alta", responsible:"Jorge Eletricista", status:"Agendada", description:"Revisar refletores, tomadas da área gourmet e quadro da piscina." },
    { id:"demo-maint-hidraulica", due:"2026-08-18", area:"Piscina", system:"Hidráulica", priority:"Média", responsible:"Equipe manutenção", status:"Pendente", description:"Conferir bomba, filtro e retorno de água antes do casamento." }
  ].forEach(m=>add("maintenance",m));
  [
    { id:"demo-clean-pos-luciana", date:"2026-08-10", area:"Sede completa", type:"Pós-evento", responsible:"Equipe Ana", status:"Agendada", notes:"Limpeza pós hospedagem familiar; revisar banheiros e cozinha." },
    { id:"demo-clean-pre-casamento", date:"2026-08-20", area:"Área gourmet e piscina", type:"Pré-evento", responsible:"Equipe Ana", status:"Pendente", notes:"Preparação para casamento; atenção ao deck e salão." }
  ].forEach(c=>add("cleaning",c));
  [
    { id:"demo-laundry-agosto", date:"2026-08-10", item:"Lençóis casal e solteiro", qty:22, status:"A lavar", cost:264, notes:"Enxoval usado na reunião familiar." },
    { id:"demo-laundry-casamento", date:"2026-08-24", item:"Toalhas de banho e rosto", qty:34, status:"Em lavanderia", cost:340, notes:"Previsão de retorno em 48h." }
  ].forEach(l=>add("laundry",l));
  [
    { id:"demo-utility-agua-ago", month:"2026-08", type:"Água", reading:94, amount:312.45, notes:"Uso estimado para duas locações no mês." },
    { id:"demo-utility-energia-ago", month:"2026-08", type:"Energia", reading:1510, amount:980.2, notes:"Iluminação externa e bomba da piscina." }
  ].forEach(u=>add("utilities",u));
  [
    { id:"demo-employee-ana", name:"Ana Paula Costa", role:"Coordenação de limpeza", phone:"31 96666-4455", payType:"Diária", rate:220, status:"Ativo" },
    { id:"demo-employee-jorge", name:"Jorge Martins", role:"Eletricista parceiro", phone:"31 97772-1100", payType:"Por serviço", rate:680, status:"Ativo" }
  ].forEach(e=>add("employees",e));
  return data;
}
let state = loadStateSync();

const modules = [
  ["dashboard","Visão Geral","IN",["manager","operator"]], ["reservations","Reservas","RS",["manager","operator"]], ["calendar","Agenda","AG",["manager","operator"]], ["reservationFilters","Filtros de Reservas","RF",["manager","operator"]], ["reservationDocuments","Documentos da Reserva","DC",["manager","operator"]], ["checkin","Check-in/out","OK",["manager","operator"]], ["stayWorkflow","Conferência da estadia","OK",["manager","operator"]], ["guests","Hóspedes","HP",["manager","operator"]], ["clients","Clientes","CL",["manager","operator"]], ["spaces","Espaços","ES",["manager","operator"]], ["finance","Financeiro","$",["manager"]], ["maintenance","Manutenção","MT",["manager","operator"]], ["cleaning","Limpeza","LX",["manager","operator"]], ["laundry","Lavanderia","LV",["manager","operator"]], ["inventory","Inventário","IV",["manager","operator"]], ["utilities","Consumos","CO",["manager","operator"]], ["employees","Equipe","EQ",["manager"]], ["reports","Relatórios","RP",["manager"]], ["backup","Backup","BK",["manager"]], ["technical","Registro Técnico","VT",["manager","operator"]]
];
const evolutionLog = [
  ["V1","Primeiro protótipo local com estrutura inicial do sistema."],
  ["V2","Ampliação conceitual dos módulos profissionais da pousada."],
  ["V3","Preparação para hospedagem futura em GitHub/Supabase e testes locais."],
  ["V4","Inclusão de login gerencial/operacional e uso da identidade visual da Estância."],
  ["V5","Ajustes da tela de login com foto de capa e marca em destaque."],
  ["V6","Melhoria da faixa lateral para preservar a identidade visual sem textos redundantes."],
  ["V7","Criação das abas de operação, financeiro, manutenção, limpeza, lavanderia, inventário e backup."],
  ["V8","Separação do módulo Backup para exportação e recuperação de dados."],
  ["V9","Modelagem da locação integral por período e capacidade padrão de 20 hóspedes."],
  ["V10","Cadastro individual de hóspedes vinculados ao contratante e CPF."],
  ["V11","Reconstrução funcional com dados locais, módulos e preparação para API local."],
  ["V12","Correção do cadastro de hóspedes com preenchimento automático de CPF e período."],
  ["V13","Reformulação da tela Clientes com lista interna e ficha/histórico do contratante."],
  ["V14","Registro Técnico de Evolução, remoção de botões redundantes, paleta sóbria e agenda responsiva com detalhes."],
  ["V15.1","Novo padrão de versão decimal, selo transparente na logo, agenda mensal dinâmica e paleta mais escura."],
  ["V15.2","Paleta marrom e dourada, selo de versão mais discreto e cards da visão geral como atalhos responsivos."],
  ["V15.3","Profundidade visual sutil nos cards e fluxos dedicados para check-in e check-out."],
  ["V15.4","Moldura de aplicação com rolagem interna para deixar as telas mais harmônicas."],
  ["V15.5","Logo lateral ajustada, agenda integral sem rolagem e detalhe de evento com materialização."],
  ["V15.6","Cadastro sequencial de convidados com contratante em destaque e efeito magnético real nos cards iniciais."],
  ["V15.7","Tela cheia para lista de convidados, sem redundância de contratante, e massa fictícia ampliada para testes."],
  ["V15.8","Aba de hóspedes reorganizada por reserva/contratante e camada visual translúcida com textura de cristal."],
  ["V15.9","Contratante removido da repetição na lista de convidados, cards com telas de detalhe e retroiluminação reforçada."],
  ["V16","Visão geral reorganizada por afinidade, página de filtros de reservas e numeração hierárquica das relações."],
  ["V16.1","Refinamento da marca, filtros responsivos com detalhe do evento e exclusão de convidados."],
  ["V16.2","Refinamento exclusivo da identidade visual: texto interno corrigido e remoção de escrita externa."],
  ["V16.3","Correção do dashboard com próximas reservas reais, capacidade do espaço, métricas ajustadas e painel de pendências."],
  ["V16.4","Documentos imprimíveis por reserva: recibo, contrato-resumo, ficha de hóspedes e comprovante de check-in/check-out."],
  ["V16.5","Logo própria para impressão e substituição das siglas do menu por ícones lineares refinados."],
  ["V16.6","Redesign tipográfico dos documentos em estilo papel timbrado e correção do colapso de colunas na impressão."],
  ["V16.7","Remoção de CSS legado de impressão, documentos financeiros restritos ao gerencial e reforços de segurança em dados/backup."],
  ["V16.8","Ações compactas por ícones nas tabelas, encerrando o empilhamento de botões nas linhas."],
  ["V16.9","Correção do estouro da tabela na ficha de hóspedes, preservando a folha e a impressão."],
  ["V17","Fechamento técnico de integridade: demo isolado, restore validado, concorrência entre abas, sessão local e exclusões com vínculo bloqueadas."],
  ["V17.1","Homologação assistida com massa simulada inicial, menu Reservas antes de Agenda e atalhos claros para contratante, reserva e hóspedes."],
  ["V17.2","Correção da regressão das tabelas: HTML confiável marcado explicitamente, botões de linha restaurados e snapshots limitados."],
  ["V17.3","Aprimoramento operacional com titular destacado, pessoas enumeradas no check-in, financeiro filtrável, relatórios gerenciais, conflitos de agenda e cadastro de cliente ampliado."],
  ["V17.4","Agenda limpa por contador diário de agendamentos, detalhe materializado por data e botões simétricos no fluxo de reservas."],
  ["V17.5","Check-in/out com numeração, filtros e ordenação por coluna; agenda com relatório imprimível; financeiro com filtros automáticos sem botões redundantes. Esta versão também abriu a fase de auditorias comparadas Claude/Genspark, que apontaram riscos de regressão, massa demo, persistência, segurança e preparação Supabase."],
  ["V17.6","Saneamento técnico homologado por auditoria executável: demo isolado, versão alinhada, sessão obediente à configuração, sincronização visível e validação referencial ampliada. Auditorias Claude e Genspark consolidaram a V17.6 como base local assistida estável."],
  ["V18","Abertura da fase cloud por camadas: higiene de configuração, repositório limpo, schema Supabase completo com RLS, adapters preparatórios e Registro Técnico enriquecido com governança das auditorias."],
  ["V18.1","Correção pós-auditoria Genspark e confronto Claude: pacote cloud sem config.local.js, mappers reescritos, seleção de repository corrigida para não quebrar GitHub Pages, permissões alinhadas ao app e SQL ajustado para idempotência, bootstrap e coerência com o modelo local."],
  ["V18.2","Ativação cloud mínima e segura: login/sessão passam por auth.js, estado passa pelo repository, Supabase loader entra no runtime cloud e SupabaseRepository bloqueia gravação em lote destrutiva, usando leitura paginada e upsert/delete explícitos por registro."],
  ["V18.3","Polimento da interface de homologação cloud: a mensagem técnica de estado sincronizado deixa de aparecer na barra superior e a tela de reservas remove botões redundantes do bloco de orientação, mantendo as ações principais no topo e na linha de cada reserva."]
];
const schemaByView = { reservations:"reservation", guests:"guest", clients:"client", spaces:"space", finance:"transaction", maintenance:"maintenance", cleaning:"cleaning", laundry:"laundry", inventory:"inventory", utilities:"utility", employees:"employee" };
const moneyFields = new Set(["baseRate","total","paid","amount","cost","replacementValue","rate"]);
const requiredFields = {
  reservation:["clientId","spaceId","type","start","end","total","status"],
  guest:["reservationId","fullName","cpf"],
  client:["name","document"],
  space:["name","capacity"],
  transaction:["date","type","category","amount","status"],
  maintenance:["due","area","system","status"],
  cleaning:["date","area","type","status"],
  laundry:["date","item","qty","status"],
  inventory:["item","category","qty","condition"],
  utility:["month","type","amount"],
  employee:["name","role","status"]
};

const schemas = {
 reservation:{title:"Reserva",list:"reservations",fields:[["clientId","Cliente/contratante","select",()=>state.clients.map(c=>[c.id,c.name])],["spaceId","Espaço","select",()=>state.spaces.map(s=>[s.id,s.name])],["type","Tipo de reserva","select",["Hospedagem","Casamento","Aniversário","Confraternização","Reunião familiar","Day use","Outro"]],["packageName","Pacote/precificação","select",["Locação integral - final de semana","Locação integral - feriado","Day use / evento","Pacote personalizado"]],["start","Entrada","date"],["startTime","Horário de entrada","time"],["end","Saída","date"],["endTime","Horário de saída","time"],["guests","Quantidade de hóspedes","number"],["exclusiveUse","Locação exclusiva","select",["Sim","Não"]],["confirmationDeadline","Confirmar pré-reserva até","date"],["total","Valor total","currency"],["paid","Valor pago/sinal","currency"],["status","Status","select",["Solicitada","Pré-reserva","Confirmada","Em estadia","Finalizada","Cancelada"]],["checklist","Checklist e observações","textarea",null,"span-2"]]},
 guest:{title:"Hóspede",list:"guests",fields:[["clientId","Contratante que apresentou a lista","select",()=>state.clients.map(c=>[c.id,c.name])],["contractorCpf","CPF do contratante","text"],["reservationId","Reserva / período","select",()=>state.reservations.map(r=>[r.id,`${byId(state.clients,r.clientId).name||"Cliente"} - ${dateBr(r.start)} a ${dateBr(r.end)}`])],["fullName","Nome completo","text"],["cpf","CPF do hóspede","text"],["address","Endereço do hóspede","text",null,"span-2"],["stayStart","Entrada no período","date"],["stayEnd","Saída no período","date"],["notes","Observações","textarea",null,"span-2"]]},
 client:{title:"Cliente",list:"clients",fields:[["name","Nome completo / razão social","text"],["phone","Telefone / WhatsApp","text"],["document","CPF/CNPJ","text"],["email","E-mail","email"],["birthDate","Nascimento / abertura","date"],["preferredContact","Contato preferencial","select",["WhatsApp","Telefone","E-mail"]],["address","Endereço completo","text",null,"span-2"],["city","Cidade","text"],["state","UF","text"],["origin","Origem","select",["Instagram","WhatsApp","Indicação","Google","Cliente antigo","Outro"]],["notes","Observações","textarea",null,"span-2"]]},
 space:{title:"Espaço",list:"spaces",fields:[["name","Nome","text"],["type","Tipo","text"],["capacity","Capacidade","number"],["baseRate","Valor base","currency"],["status","Status","select",["Disponível","Manutenção","Bloqueado"]]]},
 transaction:{title:"Lançamento financeiro",list:"transactions",fields:[["date","Data","date"],["type","Tipo","select",["Entrada","Saída"]],["clientId","Contratante vinculado","select",()=>state.clients.map(c=>[c.id,c.name])],["reservationId","Reserva vinculada","select",()=>state.reservations.map(r=>[r.id,`${byId(state.clients,r.clientId).name||"Cliente"} - ${dateBr(r.start)} a ${dateBr(r.end)}`])],["category","Categoria","text"],["description","Descrição","text"],["amount","Valor","currency"],["status","Status","select",["Pago","Pendente","Vencido"]]]},
 maintenance:{title:"Manutenção",list:"maintenance",fields:[["due","Vencimento","date"],["area","Área","text"],["system","Sistema","select",["Elétrica","Hidráulica","Piscina","Jardinagem","Pintura","Equipamento","Estrutura","Outro"]],["priority","Prioridade","select",["Baixa","Média","Alta","Urgente"]],["responsible","Responsável","text"],["status","Status","select",["Pendente","Agendada","Concluída"]],["description","Descrição","textarea",null,"span-2"]]},
 cleaning:{title:"Limpeza/Faxina",list:"cleaning",fields:[["date","Data","date"],["area","Área","text"],["type","Tipo","select",["Pré-evento","Pós-evento","Hospedagem","Faxina pesada","Piscina","Cozinha","Banheiros"]],["responsible","Responsável","text"],["status","Status","select",["Pendente","Agendada","Concluída"]],["notes","Notas","textarea",null,"span-2"]]},
 laundry:{title:"Lavanderia",list:"laundry",fields:[["date","Data","date"],["item","Item","text"],["qty","Quantidade","number"],["status","Status","select",["A lavar","Em lavanderia","Retornou","Perdido","Danificado"]],["cost","Custo","currency"],["notes","Notas","textarea",null,"span-2"]]},
 inventory:{title:"Inventário",list:"inventory",fields:[["item","Item","text"],["category","Categoria","select",["Mobiliário","Utensílios","Enxoval","Equipamento","Decoração","Piscina","Cozinha","Outro"]],["qty","Quantidade","number"],["minimum","Estoque mínimo","number"],["condition","Estado","select",["Novo","Bom","Atenção","Danificado","Baixado"]],["location","Localização","text"],["replacementValue","Valor de reposição","currency"]]},
 utility:{title:"Consumo",list:"utilities",fields:[["month","Mês","month"],["type","Tipo","select",["Energia","Água","Gás","Internet","Telefone","Outro"]],["reading","Leitura/uso","number"],["amount","Valor","currency"],["notes","Notas","textarea",null,"span-2"]]},
 employee:{title:"Equipe/Fornecedor",list:"employees",fields:[["name","Nome","text"],["role","Função","text"],["phone","Telefone","text"],["payType","Tipo de pagamento","select",["Diária","Mensal","Por serviço","Contrato"]],["rate","Valor","currency"],["status","Status","select",["Ativo","Inativo"]]]}
};

function normalizeState(data,{allowDemo=false}={}){
  const base={...emptyState,...(data||{})};
  base.systemFlags={...emptyState.systemFlags,...(data?.systemFlags||{}),mode:allowDemo?'demo':'operational'};
  base.meta={...emptyState.meta,...(data?.meta||{})};
  Object.keys(emptyState).forEach(k=>{ if(Array.isArray(emptyState[k]) && !Array.isArray(base[k])) base[k]=[]; });
  return base;
}
function hasOperationalRecords(data){
  return ["clients","spaces","reservations","guests","transactions","maintenance","cleaning","laundry","inventory","utilities","employees"].some(k=>Array.isArray(data?.[k]) && data[k].length>0);
}
function loadStateSync(){
  const fallbackKeys=[
    storageKey,
    "estancia-das-montanhas-gestao-v18-2",
    "estancia-das-montanhas-gestao-v18-1",
    "estancia-das-montanhas-gestao-v18",
    "estancia-das-montanhas-gestao-v17-6",
    "estancia-das-montanhas-gestao-v17-5",
    "estancia-das-montanhas-gestao-v17-4",
    "estancia-das-montanhas-gestao-v17-3",
    "estancia-das-montanhas-gestao-v17-2",
    "estancia-das-montanhas-gestao-v17-1",
    "estancia-das-montanhas-gestao-v17",
    "estancia-das-montanhas-gestao-v16-9",
    "estancia-das-montanhas-gestao-v16-8",
    "estancia-das-montanhas-gestao-v16-7",
    "estancia-das-montanhas-gestao-v16-6",
    "estancia-das-montanhas-gestao-v16-5",
    "estancia-das-montanhas-gestao-v16-4",
    "estancia-das-montanhas-gestao-v16-3",
    "estancia-das-montanhas-gestao-v16-2",
    "estancia-das-montanhas-gestao-v16-1",
    "estancia-das-montanhas-gestao-v16",
    "estancia-das-montanhas-gestao-v15-9",
    "estancia-das-montanhas-gestao-v15-8",
    "estancia-das-montanhas-gestao-v15-7",
    "estancia-das-montanhas-gestao-v15-6",
    "estancia-das-montanhas-gestao-v15-5",
    "estancia-das-montanhas-gestao-v15-4",
    "estancia-das-montanhas-gestao-v15-3",
    "estancia-das-montanhas-gestao-v15-2",
    "estancia-das-montanhas-gestao-v15-1",
    "estancia-das-montanhas-gestao-v14",
    "estancia-das-montanhas-gestao-v13",
    "estancia-das-montanhas-gestao-v12"
  ];
  try{
    for(const key of fallbackKeys){
      const saved=localStorage.getItem(key);
      if(!saved) continue;
      const parsed=JSON.parse(saved);
      let migrated=normalizeState(parsed,{allowDemo:parsed?.systemFlags?.mode==="demo"});
      if(demoMode && environmentMode==="demo" && migrated.systemFlags?.mode==="demo" && !hasOperationalRecords(migrated)) migrated=normalizeState(ensureDemoData(seed()),{allowDemo:true});
      loadedRevision=Number(migrated.meta.revision||0);
      localStorage.setItem(storageKey,JSON.stringify(migrated));
      return migrated;
    }
  }catch(err){ throw new Error("Erro de leitura da base local: "+err.message); }
  const initial=demoMode && environmentMode==="demo"
    ? normalizeState(ensureDemoData(seed()),{allowDemo:true})
    : normalizeState(emptyState,{allowDemo:false});
  initial.systemFlags.demoSeedApplied=demoMode && environmentMode==="demo";
  loadedRevision=0;
  localStorage.setItem(storageKey,JSON.stringify(initial));
  return initial;
}
function saveState({force=false,sync=null}={}){
  const current=activeRepository?.readLocalSnapshot?.() || localStorage.getItem(storageKey);
  if(current){
    try{
      const currentMeta=JSON.parse(current).meta||{};
      const currentRev=Number(currentMeta.revision||0);
      if(!force && currentRev>loadedRevision && currentMeta.lastWriterId!==appInstanceId){
        externalChangePending=true;
        if(!confirm("Outra aba alterou a base depois que esta tela foi aberta. Deseja sobrescrever mesmo assim?")) return false;
      }
    }catch{}
  }
  state=normalizeState(state,{allowDemo:demoMode && state.systemFlags?.mode==="demo"});
  const integrityError=validateReferentialIntegrity(state);
  if(integrityError){ alert(`Gravação bloqueada por integridade dos dados: ${integrityError}`); return false; }
  state.meta={revision:Number(state.meta.revision||0)+1,updatedAt:new Date().toISOString(),lastWriterId:appInstanceId};
  loadedRevision=state.meta.revision;
  externalChangePending=false;
  localStorage.setItem(storageKey,JSON.stringify(state));
  if(activeRepository){
    setSyncStatus("syncing","Salvo no navegador; sincronizando repositório ativo...");
    const operation = sync?.delete
      ? activeRepository.deleteRecord(sync.list,sync.id)
      : sync?.list && sync?.item
        ? activeRepository.upsertRecord(sync.list,sync.item,state)
        : activeRepository.saveState(state);
    operation
      .then(payload=>setSyncStatus("synced",`Sincronizado com repositório ativo · rev. ${payload?.revision??state.meta.revision}`))
      .catch(err=>setSyncStatus("error",`Falha na sincronização do repositório: ${err.message}`));
  } else {
    setSyncStatus("browser","Salvo somente no navegador.");
  }
  return true;
}
function byId(list,id){ return list.find(x=>x.id===id)||{}; }
function isManager(){ return currentUser?.role==='manager'; }
function canAccess(view){ if(view==='managerialReport') return activeReport==='agenda' || isManager(); return modules.find(([id])=>id===view)?.[3].includes(currentUser?.role); }
function allowedModules(){ return modules.filter(([, , , roles])=>roles.includes(currentUser?.role)); }
function applyV173Enhancements(data){
  const clientDefaults={
    "demo-client-luciana":{address:"Rua Diamantina, 44",city:"Ipatinga",state:"MG",preferredContact:"WhatsApp"},
    "demo-client-carlos":{address:"Rua Marfim, 77",city:"Ipatinga",state:"MG",preferredContact:"Telefone"},
    "demo-client-patricia":{address:"Rua Turmalina, 345",city:"Ipatinga",state:"MG",preferredContact:"WhatsApp"},
    "demo-client-felipe":{address:"Av. Pedro Linhares, 1550",city:"Ipatinga",state:"MG",preferredContact:"E-mail"},
    "demo-client-amanda":{address:"Rua das Acácias, 88",city:"Coronel Fabriciano",state:"MG",preferredContact:"WhatsApp"}
  };
  data.clients.forEach(c=>Object.assign(c,clientDefaults[c.id]||{},c));
  data.reservations.forEach(r=>{
    if(!r.startTime) r.startTime=r.type==="Day use"?"09:00":"14:00";
    if(!r.endTime) r.endTime=r.type==="Day use"?"18:00":"12:00";
    if(!r.exclusiveUse) r.exclusiveUse=String(byId(data.spaces,r.spaceId).name||"").toLowerCase().includes("integral")?"Sim":"Não";
    if(r.status==="Pré-reserva" && !r.confirmationDeadline) r.confirmationDeadline=addDaysIso(todayIso(),7);
  });
  const link=(id,clientId,reservationId)=>{ const t=data.transactions.find(x=>x.id===id); if(t){t.clientId=clientId;t.reservationId=reservationId;} };
  link("demo-tr-entrada-luciana","demo-client-luciana","demo-res-familia-agosto");
  link("demo-tr-entrada-casamento","demo-client-carlos","demo-res-casamento-agosto");
  link("demo-tr-pendente-corporativo","demo-client-felipe","demo-res-corporativo-setembro");
  return data;
}
state=applyV173Enhancements(state);
localStorage.setItem(storageKey,JSON.stringify(state));
function money(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function parseCurrency(v){
  const cleaned=String(v||'').trim().replace(/[^\d,.-]/g,'');
  if(!cleaned) return 0;
  if(cleaned.includes(',')) return Number(cleaned.replace(/\./g,'').replace(',','.'))||0;
  if(cleaned.includes('.')){
    const last=cleaned.lastIndexOf('.');
    return Number(cleaned.length-last-1===2 ? cleaned : cleaned.replace(/\./g,''))||0;
  }
  return Number(cleaned)||0;
}
function formatCurrencyInputValue(v){
  const digits=String(v||'').replace(/\D/g,'');
  if(!digits) return '';
  return (Number(digits)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}
function wireCurrencyInputs(root=document){
  root.querySelectorAll('[data-currency-input="true"]').forEach(input=>{
    input.addEventListener('input',()=>{
      input.value=formatCurrencyInputValue(input.value);
      input.setSelectionRange(input.value.length,input.value.length);
    });
    input.addEventListener('blur',()=>{ input.value=formatCurrencyInputValue(input.value); });
  });
}
function parseNumber(v){ return Number(String(v||'').replace(',','.'))||0; }
function normalizeDoc(v){ return String(v||'').replace(/\D/g,''); }
function esc(v){ return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function rawHtml(html){ return {__rawHtml:String(html??'')}; }
function safeCell(v){ return (v && typeof v==='object' && '__rawHtml' in v) ? v.__rawHtml : esc(String(v??'')); }
function dateBr(v){ return v ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR') : '-'; }
function monthLabel(key){ const [y,m]=key.split('-').map(Number); return new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}); }
function shiftMonth(delta){ const [y,m]=selectedCalendarMonth.split('-').map(Number); const d=new Date(y,m-1+delta,1); selectedCalendarMonth=d.toISOString().slice(0,7); }
function syncCalendarMonthFromReservation(r){ if(r?.start) selectedCalendarMonth=String(r.start).slice(0,7); }
function monthCells(key){
  const [year,month]=key.split('-').map(Number);
  const first=new Date(year,month-1,1);
  const total=new Date(year,month,0).getDate();
  const cells=[];
  for(let i=0;i<first.getDay();i++) cells.push(null);
  for(let day=1;day<=total;day++) cells.push(`${key}-${String(day).padStart(2,'0')}`);
  while(cells.length%7!==0) cells.push(null);
  return cells;
}
function badge(t){ const v=String(t||'-'); let cls=''; if(['Alta','Pendente','A lavar','Pré-reserva'].includes(v)) cls='warn'; if(['Cancelada','Vencido','Urgente'].includes(v)) cls='danger'; if(['Agendada','Em estadia'].includes(v)) cls='blue'; if(['Pago','Concluída','Confirmada','Finalizada','Ativo','Disponível','Bom'].includes(v)) cls='done'; return `<span class="badge ${cls}">${esc(v)}</span>`; }
function metric(label,value,note,target){ return `<button class="card metric metric-link" data-action="go-view" data-id="${esc(target)}"><span>${esc(label)}</span><strong>${safeCell(value)}</strong><em>${esc(note)}</em></button>`; }
function fact(label,value){ return `<div class="fact"><span>${esc(label)}</span><strong>${safeCell(value)}</strong></div>`; }
const ICON_ATTRS='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const svgIcon = paths => `<svg ${ICON_ATTRS}>${paths}</svg>`;
const SVG_EDIT = svgIcon('<path d="M14.7 6.3l3 3"/><path d="M4 20l5.8-1.5L19 9.3 14.7 5 5.5 14.2z"/>');
const SVG_DELETE = svgIcon('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/>');
const SVG_GUESTS = svgIcon('<path d="M16 11a4 4 0 1 0-8 0"/><path d="M5 20a7 7 0 0 1 14 0"/><path d="M18 8a3 3 0 0 1 2 5"/>');
const SVG_DOCS = svgIcon('<path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2z"/><path d="M9 9h6M9 13h6"/>');
function navIcon(id){
  const attrs='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const icons={
    dashboard:'<path d="M4 13h6V4H4z"/><path d="M14 20h6V4h-6z"/><path d="M4 20h6v-3H4z"/>',
    calendar:'<path d="M7 3v3M17 3v3"/><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M4 10h16"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
    reservations:'<path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2z"/><path d="M9 9h6M9 13h6"/>',
    checkin:'<path d="M4 12l4 4L20 5"/><path d="M4 20h16"/>',
    guests:'<path d="M16 11a4 4 0 1 0-8 0"/><path d="M5 20a7 7 0 0 1 14 0"/><path d="M18 8a3 3 0 0 1 2 5"/>',
    clients:'<path d="M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/><path d="M4 21a7 7 0 0 1 14 0"/><path d="M18 8h3M19.5 6.5v3"/>',
    spaces:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    finance:'<path d="M12 3v18"/><path d="M17 7.5c0-1.7-1.8-3-5-3s-5 1.3-5 3 1.8 3 5 3 5 1.3 5 3-1.8 3-5 3-5-1.3-5-3"/>',
    maintenance:'<path d="M14.7 6.3l3 3"/><path d="M4 20l5.8-1.5L19 9.3 14.7 5 5.5 14.2z"/><path d="M13 7l4 4"/>',
    cleaning:'<path d="M7 4h10"/><path d="M9 4v7l-4 8h14l-4-8V4"/><path d="M7 16h10"/>',
    laundry:'<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 7h.01M11 7h.01"/><circle cx="12" cy="14" r="4"/>',
    inventory:'<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/>',
    utilities:'<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
    employees:'<path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M2 21a6 6 0 0 1 12 0"/><path d="M17 7h5M19.5 4.5v5M17 15h5M17 19h5"/>',
    reports:'<path d="M5 20V4h14v16z"/><path d="M9 16v-4M12 16V8M15 16v-6"/>',
    backup:'<path d="M12 3v10"/><path d="M8 9l4 4 4-4"/><path d="M5 17a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4"/>',
    technical:'<path d="M12 3l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/>'
  };
  return `<svg ${attrs}>${icons[id]||'<circle cx="12" cy="12" r="8"/>'}</svg>`;
}

function render(){ if(!canAccess(currentView)) currentView=allowedModules()[0][0]; document.querySelector('#page-title').textContent=modules.find(([id])=>id===currentView)?.[1]||'Documentos'; document.querySelector('#active-role').textContent=isManager()?'Gerencial':'Operacional'; document.querySelectorAll('.logo-version').forEach(el=>el.textContent=APP_VERSION); renderSyncStatus(); renderNav(); setQuickAction(); const views={dashboard,calendar,reservations,reservationFilters,reservationDocuments,checkin,stayWorkflow,guests,clients,spaces,finance,managerialReport,maintenance,cleaning,laundry,inventory,utilities,employees,reports,backup,technical}; document.querySelector('#view').innerHTML=views[currentView](); }
function renderSyncStatus(){
  const el=document.querySelector('#sync-status');
  if(!el) return;
  const quietStates = new Set(["synced","browser"]);
  if(quietStates.has(syncStatus.state)){
    el.hidden = true;
    el.textContent = "";
    el.dataset.state = syncStatus.state;
    return;
  }
  el.hidden = false;
  el.textContent=syncStatus.message;
  el.dataset.state=syncStatus.state;
}
function setSyncStatus(state,message){ syncStatus={state,message}; renderSyncStatus(); }
function renderNav(){ document.querySelector('#nav').innerHTML=allowedModules().filter(([id])=>!['technical','stayWorkflow','reservationFilters','reservationDocuments','managerialReport'].includes(id)).map(([id,label])=>`<button class="${id===currentView?'active':''}" data-action="go-view" data-id="${id}"><span class="icon">${navIcon(id)}</span><span>${label}</span></button>`).join(''); }
function setQuickAction(){ const map={dashboard:['Nova reserva','add-reservation'],calendar:['Nova reserva','add-reservation'],reservations:['Nova reserva','add-reservation'],reservationFilters:['Nova reserva','add-reservation'],guests:['Novo convidado','add-guest'],checkin:['Novo hóspede','add-guest'],clients:['Novo cliente','add-client'],spaces:['Novo espaço','add-space'],finance:['Novo lançamento','add-transaction'],maintenance:['Nova manutenção','add-maintenance'],cleaning:['Nova faxina','add-cleaning'],laundry:['Nova lavanderia','add-laundry'],inventory:['Novo item','add-inventory'],utilities:['Novo consumo','add-utility'],employees:['Novo colaborador','add-employee']}; const b=document.querySelector('#quick-action'), a=map[currentView]; if(!a || currentView==='stayWorkflow' || (!isManager() && ['finance','employees','spaces'].includes(currentView))){b.style.display='none';return} b.style.display=''; b.textContent=a[0]; b.dataset.action=a[1]; }

function fieldsPanel(view){ return ''; }
function fieldInput([name,label,type,options,extra='']){
  const safeName=esc(name), safeLabel=esc(label), safeType=esc(type||'text');
  if(type==='select'){
    const opts=typeof options==='function'?options():options.map(v=>[v,v]);
    return `<label class="${extra}">${safeLabel}<select data-prototype-field="${safeName}">${opts.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select></label>`;
  }
  if(type==='textarea') return `<label class="${extra}">${safeLabel}<textarea data-prototype-field="${safeName}"></textarea></label>`;
  if(type==='currency') return `<label class="${extra}">${safeLabel}<input data-prototype-field="${safeName}" type="text" inputmode="decimal" placeholder="R$ 0,00"></label>`;
  return `<label class="${extra}">${safeLabel}<input data-prototype-field="${safeName}" type="${safeType}" placeholder="${safeLabel}"></label>`;
}
function table(headers,rows){ if(!rows.length) return '<p class="muted">Nenhum registro cadastrado ainda.</p>'; return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${safeCell(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
function section(title,subtitle,action,content){ return `<section class="card"><div class="section-head"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div></div>${content}</section>`; }
function iconAction(action,id,label,svg,cls=''){ return `<button class="icon-action ${cls}" data-action="${esc(action)}" data-id="${esc(id)}" title="${esc(label)}" aria-label="${esc(label)}">${svg}</button>`; }
function rowActions(type,id,extras=[]){
  const buttons=[
    ...extras.map(([action,label,svg,cls=''])=>iconAction(action,id,label,svg,cls)),
    ...(type?[iconAction(`edit-${type}`,id,'Editar',SVG_EDIT)]:[]),
    ...(type && isManager()?[iconAction(`delete-${type}`,id,'Excluir',SVG_DELETE,'danger')]:[])
  ];
  return `<div class="row-actions">${buttons.join('')}</div>`;
}
function todayIso(){ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function addDaysIso(iso,days){ const d=new Date(`${iso}T12:00:00`); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
function capacityForReservation(r){ const space=byId(state.spaces,r?.spaceId); return Number(space.capacity||r?.guests||20); }
function reservationTimeStart(r){ return `${r.start||''}T${r.startTime||'00:00'}`; }
function reservationTimeEnd(r){ return `${r.end||r.start||''}T${r.endTime||'23:59'}`; }
function isExpiredPreReservation(r){ return r.status==='Pré-reserva' && r.confirmationDeadline && String(r.confirmationDeadline)<todayIso(); }
function blocksAgenda(r){ return r && !['Cancelada','Finalizada'].includes(r.status) && !isExpiredPreReservation(r); }
function reservationsOverlap(a,b){
  if(!a.start||!a.end||!b.start||!b.end) return false;
  return reservationTimeStart(a)<=reservationTimeEnd(b) && reservationTimeEnd(a)>=reservationTimeStart(b);
}
function reservationConflict(values,id=null){
  if(!values.start||!values.end||!values.spaceId) return null;
  const candidate={...values,exclusiveUse:values.exclusiveUse||'Sim'};
  return state.reservations.find(r=>{
    if(r.id===id || !blocksAgenda(r) || !reservationsOverlap(candidate,r)) return false;
    const sameSpace=r.spaceId===candidate.spaceId;
    const exclusive=(r.exclusiveUse||'Sim')==='Sim' || candidate.exclusiveUse==='Sim';
    return sameSpace || exclusive;
  }) || null;
}
function scheduleLabel(r){
  const time=r.startTime||r.endTime?` · ${r.startTime||'--:--'}-${r.endTime||'--:--'}`:'';
  return `${dateBr(r.start)} a ${dateBr(r.end)}${time}`;
}
function dateWithTime(iso,time){ return `${dateBr(iso)}${time?` · ${time}`:''}`; }
function upcomingReservations(limit=5){
  const today=todayIso();
  return state.reservations
    .filter(r=>!['Cancelada','Finalizada'].includes(r.status) && String(r.end||r.start||'')>=today)
    .sort((a,b)=>String(a.start||'9999-12-31').localeCompare(String(b.start||'9999-12-31')))
    .slice(0,limit);
}
function dashboardPendingItems(){
  const today=todayIso(), tomorrow=addDaysIso(today,1);
  return {
    maintenance: state.maintenance.filter(m=>m.status!=='Concluída' && (m.priority==='Urgente' || String(m.due||'9999-12-31')<today)),
    finance: state.transactions.filter(t=>t.status==='Vencido'),
    cleaning: state.cleaning.filter(c=>c.status==='Pendente' && [today,tomorrow].includes(String(c.date||'')))
  };
}
function pendingList(title,items,target,renderItem){
  const attr=target?` data-action="go-view" data-id="${target}"`:'';
  return `<button class="card dashboard-pending-card" type="button"${attr}><span>${title}</span><strong>${items.length}</strong>${items.length?`<ul>${items.slice(0,3).map(renderItem).join('')}</ul>`:'<em>Nenhuma pendência crítica.</em>'}</button>`;
}

function dashboard(){
  const activeReservations=state.reservations.filter(r=>r.status!=='Cancelada');
  const cancelledCount=state.reservations.filter(r=>r.status==='Cancelada').length;
  const nextWeek=addDaysIso(todayIso(),7);
  const nextCheckins=state.reservations.filter(r=>r.status==='Confirmada' && String(r.start||'')>=todayIso() && String(r.start||'')<=nextWeek).length;
  const upcoming=upcomingReservations(5);
  const revenue=state.transactions.filter(t=>t.type==='Entrada').reduce((s,t)=>s+Number(t.amount),0);
  const expense=state.transactions.filter(t=>t.type==='Saída').reduce((s,t)=>s+Number(t.amount),0);
  const pending=dashboardPendingItems();
  const upcomingContent=upcoming.length?upcoming.map((r,i)=>dashboardUpcomingCard(r,i)).join(''):'<p class="muted">Nenhuma chegada futura em aberto. Cadastre a próxima locação integral pelo botão principal.</p>';
  const pendingContent=`<div class="dashboard-pending-grid">
    ${pendingList('Manutenção urgente ou vencida',pending.maintenance,'maintenance',m=>`<li>${m.area||'-'} · ${dateBr(m.due)} · ${m.priority||'-'}</li>`)}
    ${pendingList('Financeiro vencido',pending.finance,isManager()?'finance':'',t=>`<li>${dateBr(t.date)} · ${esc(t.description||t.category||'-')} · ${isManager()?money(t.amount):'pendente'}</li>`)}
    ${pendingList('Faxina hoje/amanhã',pending.cleaning,'cleaning',c=>`<li>${dateBr(c.date)} · ${c.area||'-'} · ${c.type||'-'}</li>`)}
  </div>`;
  return `<div class="grid cols-4 dashboard-cards">${metric('Reservas ativas',activeReservations.length,cancelledCount?`${cancelledCount} cancelada(s) no histórico`:'Nenhuma cancelada','reservationFilters')}${metric('Hóspedes',state.guests.length,'Abrir listas de hóspedes','guests')}${metric(isManager()?'Saldo financeiro':'Check-ins próximos',isManager()?money(revenue-expense):nextCheckins,isManager()?'Abrir financeiro':'Próximos 7 dias confirmados',isManager()?'finance':'calendar')}${metric('Manutenções abertas',state.maintenance.filter(m=>m.status!=='Concluída').length,'Abrir manutenção','maintenance')}</div><section class="card ops-hero dashboard-upcoming"><h2>Próximas reservas e hóspedes vinculados</h2><div class="dashboard-reservation-list">${upcomingContent}</div><div class="ops-actions"><button data-action="go-view" data-id="reservationFilters">Abrir filtros de reservas</button><button data-action="go-view" data-id="guests">Ver hóspedes</button><button data-action="go-view" data-id="calendar">Ver agenda</button></div></section><section class="card dashboard-pending"><div class="section-head"><div><h2>Pendências</h2><p>Alertas operacionais reunidos a partir dos módulos já cadastrados.</p></div></div>${pendingContent}</section>`;
}
function dashboardUpcomingCard(r,index=0){
  const group=guestGroups().find(g=>g.reservation.id===r.id);
  const guests=state.guests.filter(g=>g.reservationId===r.id);
  const invited=group?invitedGuests(group):guests;
  const capacity=capacityForReservation(r);
  const count=guests.length;
  const seq=String(index+1).padStart(2,'0');
  return `<article class="dashboard-stay-card">${numberedStayPreview(r,group,invited,seq)}<div class="progress-bar" style="--progress:${Math.min(100,count/capacity*100)}%"><span></span></div><strong>${count}/${capacity} pessoas vinculadas à reserva</strong><div class="ops-actions"><button data-action="add-guest-reservation" data-id="${r.id}">Cadastrar hóspede desta reserva</button><button data-action="reservation-detail" data-id="${r.id}">Detalhar evento</button></div></article>`;
}
function numberedStayPreview(r,group,invited,seq='01'){
  const c=byId(state.clients,r.clientId);
  const s=byId(state.spaces,r.spaceId);
  const rows=invited.slice(0,5).map((g,i)=>`<li><strong>${seq}.${i+1}</strong><span>${esc(g.fullName||'-')} · CPF ${esc(g.cpf||'-')}</span></li>`).join('');
  const more=invited.length>5?`<li><strong>...</strong><span>Mais ${invited.length-5} convidado(s) na lista completa.</span></li>`:'';
  return `<div class="numbered-relation"><div class="relation-root"><strong>${seq}</strong><span><b class="reservation-holder">${esc(c.name||'-')}</b> · ${esc(s.name||'Espaço não informado')} · ${scheduleLabel(r)}</span></div><ol>${rows||`<li><strong>${seq}.1</strong><span>Nenhum convidado adicional cadastrado.</span></li>`}${more}</ol></div>`;
}
function calendar(){
  const reservationsInMonth=state.reservations.filter(r=>String(r.start||'').slice(0,7)===selectedCalendarMonth || String(r.end||'').slice(0,7)===selectedCalendarMonth || (r.start<=`${selectedCalendarMonth}-31` && r.end>=`${selectedCalendarMonth}-01`));
  const selectedDay=selectedCalendarDay&&selectedCalendarDay.startsWith(selectedCalendarMonth)?selectedCalendarDay:null;
  const days=monthCells(selectedCalendarMonth).map(iso=>{ if(!iso) return `<div class="day empty"></div>`; const bookings=reservationsForDay(iso); const day=Number(iso.slice(-2)); return `<div class="day ${bookings.length?'has-booking':''} ${iso===selectedDay?'active-day':''}"><span class="day-number">${day}</span>${bookings.length?calendarDayButton(iso,bookings):''}</div>`; }).join('');
  return `<section class="agenda-focus">
    <div class="agenda-main card">
      <div class="section-head agenda-head"><div><h2>Agenda</h2><p>Ocupação por data, cliente e tipo de evento.</p></div><div class="month-controls"><button class="small" data-action="calendar-prev">Anterior</button><strong>${monthLabel(selectedCalendarMonth)}</strong><button class="small" data-action="calendar-next">Próximo</button><button class="small" data-action="open-report" data-id="agenda">Imprimir agenda</button></div></div>
      <div class="calendar">${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=>`<div class="day-name">${d}</div>`).join('')}${days}</div>
    </div>
    ${selectedDay ? `<div class="event-materializer"><article class="agenda-detail materialized card">${agendaDayDetail(selectedDay)}</article></div>` : ''}
  </section>`;
}
function reservationsForDay(iso){ return state.reservations.filter(r=>iso>=r.start&&iso<=r.end).sort((a,b)=>reservationTimeStart(a).localeCompare(reservationTimeStart(b))); }
function calendarDayButton(iso,bookings){
  const active=bookings.filter(r=>blocksAgenda(r)).length;
  const expired=bookings.length-active;
  return `<button class="calendar-count ${expired?'has-expired':''}" data-action="select-calendar-day" data-id="${esc(iso)}" title="Abrir agendamentos de ${dateBr(iso)}"><strong>${bookings.length}</strong><span>${bookings.length===1?'agendamento':'agendamentos'}</span>${expired?`<em>${expired} vencido(s)</em>`:''}</button>`;
}
function agendaDayDetail(iso){
  const bookings=reservationsForDay(iso);
  return `<button class="ghost material-close" data-action="close-calendar-detail" data-id="">Fechar</button><p class="eyebrow">Agenda do dia</p><h2>${dateBr(iso)}</h2><p class="muted">${bookings.length} ${bookings.length===1?'agendamento encontrado':'agendamentos encontrados'}.</p><div class="agenda-day-list">${bookings.map((r,i)=>agendaDayRow(r,i)).join('')}</div>`;
}
function agendaDayRow(r,index=0){
  const c=byId(state.clients,r.clientId), s=byId(state.spaces,r.spaceId), guests=state.guests.filter(g=>g.reservationId===r.id);
  return `<article class="agenda-day-row ${isExpiredPreReservation(r)?'expired':''}"><strong>${String(index+1).padStart(2,'0')}</strong><div><h3>${esc(c.name||'-')}</h3><p>${esc(r.type||'-')} · ${esc(s.name||'-')}</p><span>${scheduleLabel(r)}</span></div><div class="agenda-day-meta">${badge(isExpiredPreReservation(r)?'Prazo expirado':r.status)}<span>${guests.length}/${capacityForReservation(r)} pessoas</span><span>${r.exclusiveUse==='Não'?'Uso compartilhável':'Uso exclusivo'}</span></div><div class="row-actions"><button class="small" data-action="reservation-detail" data-id="${esc(r.id)}">Detalhar</button><button class="small" data-action="add-guest-reservation" data-id="${esc(r.id)}">Hóspedes</button><button class="small" data-action="edit-reservation" data-id="${esc(r.id)}">Editar</button></div></article>`;
}
function calendarChip(r){ const c=byId(state.clients,r.clientId); const expired=isExpiredPreReservation(r); return `<button class="booking-chip ${r.id===selectedCalendarReservationId?'active':''} ${expired?'expired':''}" data-action="select-calendar-reservation" data-id="${esc(r.id)}"><strong>${esc(c.name)}</strong><span>${esc(r.type)}${expired?' · prazo expirado':''}</span></button>`; }
function agendaDetail(r,closeAction='close-calendar-detail'){
  if(!r.id) return `<h2>Detalhes</h2><p class="muted">Nenhum agendamento cadastrado.</p>`;
  const c=byId(state.clients,r.clientId), s=byId(state.spaces,r.spaceId), guests=state.guests.filter(g=>g.reservationId===r.id);
  return `<button class="ghost material-close" data-action="${esc(closeAction)}" data-id="">Fechar</button><p class="eyebrow">Detalhe do agendamento</p><h2>${esc(c.name)}</h2><p class="muted">${esc(r.type)} · ${esc(r.packageName)}</p><div class="client-facts agenda-facts">${fact('Período',`${dateBr(r.start)} a ${dateBr(r.end)}`)}${fact('Espaço',s.name||'-')}${fact('Hóspedes',`${guests.length}/${capacityForReservation(r)}`)}${isManager()?fact('Valor',`${money(r.paid)} / ${money(r.total)}`):fact('Status',r.status)}</div><div class="notice"><strong>${badge(r.status)}</strong><span>${esc(r.checklist||'Sem checklist registrado.')}</span></div><div class="actions"><button data-action="add-guest-reservation" data-id="${esc(r.id)}">Cadastrar hóspede</button><button data-action="reservation-documents" data-id="${esc(r.id)}">Documentos</button><button data-action="edit-reservation" data-id="${esc(r.id)}">Editar reserva</button></div>`;
}
function reservations(){
  const workflow=`<div class="reservation-workflow">
    <div><strong>Fluxo de cadastramento</strong><span>Cadastre primeiro o contratante, depois a reserva, e por fim os hóspedes/convidados vinculados ao CPF do contratante.</span></div>
  </div>`;
  const content=workflow + table(isManager()?['Cliente','Espaço','Período','Pacote','Hóspedes','Valor','Status','']:['Cliente','Espaço','Período','Pacote','Hóspedes','Status',''], state.reservations.map(r=>{const row=[byId(state.clients,r.clientId).name,byId(state.spaces,r.spaceId).name,`${dateBr(r.start)} a ${dateBr(r.end)}`,r.packageName,r.guests]; if(isManager()) row.push(`${money(r.paid)} / ${money(r.total)}`); row.push(rawHtml(badge(r.status)),rawHtml(rowActions('reservation',r.id,[['add-guest-reservation','Hóspedes',SVG_GUESTS],['reservation-documents','Documentos',SVG_DOCS]]))); return row;}));
  return section('Reservas','Controle de agenda, contratante, pacote, valores em Real, status e capacidade.','add-reservation', content);
}
function reservationFilters(){
  const groups=[
    ['all','Todas',state.reservations],
    ['open','Em aberto',state.reservations.filter(r=>['Solicitada','Pré-reserva','Confirmada','Em estadia'].includes(r.status))],
    ['confirmed','Confirmadas',state.reservations.filter(r=>['Confirmada','Em estadia'].includes(r.status))],
    ['finished','Finalizadas',state.reservations.filter(r=>r.status==='Finalizada')],
    ['cancelled','Canceladas',state.reservations.filter(r=>r.status==='Cancelada')]
  ];
  const selected=groups.find(([id])=>id===reservationFilterMode)||groups[0];
  const cards=`<div class="guest-overview reservation-filter-cards">${groups.map(([id,label,items],i)=>`<button class="fact guest-stat-card ${id===reservationFilterMode?'active':''}" data-action="reservation-filter" data-id="${id}"><span>${String(i+1).padStart(2,'0')} · ${label}</span><strong>${items.length}</strong><em>Filtrar reservas</em></button>`).join('')}</div>`;
  const detail=reservationDetailId?reservationEventDetail(reservationDetailId):'';
  const list=`<div class="reservation-filter-list">${selected[2].map((r,i)=>reservationFilterRow(r,i)).join('')||'<p class="muted">Nenhuma reserva neste filtro.</p>'}</div>`;
  return section('Filtros de Reservas',`Filtro atual: ${selected[1]}.`,'add-reservation',`${cards}${detail}${list}`);
}
function reservationFilterRow(r,i){
  const c=byId(state.clients,r.clientId), guests=state.guests.filter(g=>g.reservationId===r.id), seq=String(i+1).padStart(2,'0');
  return `<article class="reservation-filter-row"><strong>${seq}</strong><div><button class="text-link contractor-link" data-action="reservation-detail" data-id="${esc(r.id)}">${esc(c.name||'Contratante não identificado')}</button><span>${esc(r.type||'-')} · ${dateBr(r.start)} a ${dateBr(r.end)}</span></div><div>${badge(r.status)}</div><div><span>${guests.length}/${capacityForReservation(r)} pessoas</span>${isManager()?`<strong>${money(r.paid)} / ${money(r.total)}</strong>`:''}</div><div class="row-actions"><button class="small" data-action="add-guest-reservation" data-id="${esc(r.id)}">Hóspedes</button><button class="small" data-action="reservation-documents" data-id="${esc(r.id)}">Documentos</button><button class="small" data-action="edit-reservation" data-id="${esc(r.id)}">Editar</button></div></article>`;
}
function reservationEventDetail(id){
  const r=byId(state.reservations,id);
  if(!r.id) return '';
  return `<article class="card reservation-detail-card">${agendaDetail(r,'reservation-detail')}</article>`;
}
function reservationDocuments(){
  const r=byId(state.reservations,documentsReservationId);
  if(!r.id) return `<section class="card"><h2>Documentos da reserva</h2><p class="muted">Reserva não encontrada.</p></section>`;
  if(activeDocument) return documentView(activeDocument,r);
  const c=byId(state.clients,r.clientId);
  const options=[
    ['receipt','Recibo de pagamento','Valor pago, total e saldo, com data de emissão.'],
    ['contract','Contrato-resumo da locação','Período, espaço, pacote e valores contratados.'],
    ['guestSheet','Ficha de hóspedes','Nome, CPF e endereço de todos os hóspedes vinculados.'],
    ['stayReceipt','Comprovante de check-in/check-out','Registro de entrada e saída conferidos.']
  ].filter(([id])=>isManager() || !['receipt','contract'].includes(id));
  return `<section class="card"><div class="section-head"><div><h2>Documentos — ${esc(c.name||'-')}</h2><p>${esc(r.type||'-')} · ${dateBr(r.start)} a ${dateBr(r.end)}</p></div><button data-action="go-view" data-id="reservationFilters">Voltar</button></div><div class="grid cols-2 document-options">${options.map(([id,label,desc])=>`<button class="card document-option" data-action="open-document" data-id="${r.id}" data-status="${id}"><strong>${esc(label)}</strong><span>${esc(desc)}</span></button>`).join('')}</div></section>`;
}
function dateTimeBr(v){ return v ? new Date(v).toLocaleString('pt-BR') : 'Não registrado'; }
function documentNumber(r){ const start=String(r.start||''); const y=start.slice(0,4)||String(new Date().getFullYear()); const mmdd=start.slice(5,10).replace('-','')||'0000'; const suffix=String(r.id||'0000').replace(/[^a-z0-9]/gi,'').slice(0,4).toUpperCase().padEnd(4,'0'); return `${y}-${mmdd}-${suffix}`; }
function documentTitle(type){ return {receipt:'Recibo de pagamento',contract:'Contrato-resumo',guestSheet:'Ficha de hóspedes',stayReceipt:'Comprovante de check-in/check-out'}[type]||'Documento da reserva'; }
function documentTitlePrint(type){ return {receipt:'RECIBO DE PAGAMENTO',contract:'CONTRATO-RESUMO',guestSheet:'FICHA DE HÓSPEDES',stayReceipt:'COMPROVANTE DE CHECK-IN/CHECK-OUT'}[type]||'DOCUMENTO DA RESERVA'; }
function docField(label,value){ return `<div class="doc-field"><span>${esc(label)}</span><strong>${esc(value??'-')}</strong></div>`; }
function docSection(title,content){ return `<section class="document-section"><h3>${esc(title)}</h3>${content}</section>`; }
function documentValues(r){ return `<div class="document-values">${docField('Valor total',money(r.total))}${docField('Valor pago',money(r.paid))}${docField('Saldo',money(Number(r.total||0)-Number(r.paid||0)))}</div>`; }
function documentTable(headers,rows){ return `<table class="document-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${esc(cell??'')}</td>`).join('')}</tr>`).join('')}</tbody></table>`; }
function signatureBlock(left='Recebido por',right='Contratante'){ return `<div class="document-signatures"><div><span>${esc(left)}</span></div><div><span>${esc(right)}</span></div></div>`; }
function documentView(type,r){
  if(!isManager() && ['receipt','contract'].includes(type)){ activeDocument=null; return reservationDocuments(); }
  const c=byId(state.clients,r.clientId), s=byId(state.spaces,r.spaceId), guests=state.guests.filter(g=>g.reservationId===r.id);
  const title=documentTitle(type);
  const today=dateBr(todayIso());
  let body='';
  if(type==='receipt'){
    body=`${docSection('Contratante',`<div class="document-grid">${docField('Nome',c.name||'-')}${docField('CPF/CNPJ',c.document||'-')}${docField('Telefone',c.phone||'-')}</div>`)}${docSection('Reserva',`<div class="document-grid">${docField('Espaço',s.name||'-')}${docField('Período',`${dateBr(r.start)} a ${dateBr(r.end)}`)}${docField('Tipo',r.type||'-')}${docField('Pacote',r.packageName||'-')}</div>`)}${documentValues(r)}<p class="document-plain">Recibo referente aos valores pagos até a data de emissão. Este documento não substitui nota fiscal.</p>${signatureBlock('Recebido por','Contratante')}`;
  }
  if(type==='contract'){
    body=`${docSection('Contratante',`<div class="document-grid">${docField('Nome',c.name||'-')}${docField('CPF/CNPJ',c.document||'-')}${docField('Telefone',c.phone||'-')}${docField('E-mail',c.email||'-')}</div>`)}${docSection('Reserva',`<div class="document-grid">${docField('Espaço',s.name||'-')}${docField('Tipo de reserva',r.type||'-')}${docField('Pacote',r.packageName||'-')}${docField('Capacidade',capacityForReservation(r))}${docField('Período',`${dateBr(r.start)} a ${dateBr(r.end)}`)}${docField('Status atual',r.status||'-')}</div>`)}${documentValues(r)}${docSection('Observações',`<div class="document-note"><p>${esc(r.checklist||'Sem observações registradas.')}</p></div>`)}${signatureBlock('Contratante','Responsável pela pousada')}`;
  }
  if(type==='guestSheet'){
    const rows=guests.length?guests.map(g=>[g.fullName||'-',g.cpf||'-',g.address||'-',`${dateBr(g.stayStart)} a ${dateBr(g.stayEnd)}`]):[[c.name||'-',c.document||'-','-',`${dateBr(r.start)} a ${dateBr(r.end)}`]];
    body=`${docSection('Contratante',`<div class="document-grid">${docField('Nome',c.name||'-')}${docField('CPF/CNPJ',c.document||'-')}${docField('Período',`${dateBr(r.start)} a ${dateBr(r.end)}`)}${docField('Reserva',r.type||'-')}</div>`)}${docSection('Hóspedes',`${documentTable(['Nome completo','CPF','Endereço','Período de estadia'],rows)}<p class="document-footnote">Ficha preenchida conforme dados informados pelo contratante.</p>`)}`;
  }
  if(type==='stayReceipt'){
    body=`${docSection('Contratante',`<div class="document-grid">${docField('Nome',c.name||'-')}${docField('CPF/CNPJ',c.document||'-')}</div>`)}${docSection('Estadia',`<div class="document-grid">${docField('Espaço',s.name||'-')}${docField('Período contratado',`${dateBr(r.start)} a ${dateBr(r.end)}`)}${docField('Check-in',dateTimeBr(r.checkinAt))}${docField('Check-out',dateTimeBr(r.checkoutAt))}${docField('Hóspedes vinculados',`${guests.length}/${capacityForReservation(r)}`)}</div>`)}${docSection('Observações',`<div class="document-note"><p>${esc(r.checklist||'Sem observações registradas.')}</p></div>`)}${signatureBlock('Responsável pela conferência','Contratante')}`;
  }
  return `<div class="document-shell"><div class="document-toolbar no-print"><button data-action="trigger-print">Imprimir</button><button data-action="close-document">Voltar</button></div><div class="card print-document"><header class="document-header"><div class="document-brand"><img class="document-logo" src="assets/print-logo.png" alt="Estância das Montanhas"><div><strong>ESTÂNCIA DAS MONTANHAS</strong><span>POUSADA & EVENTOS · IPATINGA/MG</span></div></div><div class="document-meta"><strong>${documentTitlePrint(type)}</strong><span>Nº ${documentNumber(r)}</span><span>Emissão ${today}</span></div></header><main class="document-body">${body}</main><footer class="document-footer"><span>ESTÂNCIA DAS MONTANHAS · POUSADA & EVENTOS</span><span>WHATSAPP 31 98693-2446 · IPATINGA/MG</span></footer></div></div>`;
}
function guestGroups(){
  const map = new Map();
  state.guests.forEach(g=>{
    const r=byId(state.reservations,g.reservationId), c=byId(state.clients,g.clientId||r.clientId);
    const key=r.id||`historico-${g.contractorCpf||c.document||g.clientId||g.id}`;
    if(!map.has(key)) map.set(key,{key,reservation:r,client:c,guests:[]});
    map.get(key).guests.push(g);
  });
  return [...map.values()].sort((a,b)=>String(a.reservation.start||'9999-12-31').localeCompare(String(b.reservation.start||'9999-12-31')));
}
function docOnly(v){ return String(v||'').replace(/\D/g,''); }
function isContractorGuest(g,c){ return (docOnly(g.cpf)&&docOnly(g.cpf)===docOnly(c.document||g.contractorCpf)) || String(g.fullName||'').trim().toLowerCase()===String(c.name||'').trim().toLowerCase(); }
function invitedGuests(group){ return group.guests.filter(g=>!isContractorGuest(g,group.client)); }
function guestStatCard(label,value,note,detail){ return `<button class="fact guest-stat-card" data-action="guest-detail" data-id="${esc(detail)}"><span>${esc(label)}</span><strong>${esc(value)}</strong><em>${esc(note)}</em></button>`; }
function guests(){
  const groups=guestGroups();
  if(guestDetailView) return guestDetailScreen(groups);
  const total=groups.reduce((sum,g)=>sum+invitedGuests(g).length,0);
  const active=groups.filter(g=>['Confirmada','Em estadia','Pré-reserva','Solicitada'].includes(g.reservation.status)).length;
  const content = `<div class="guest-overview">
    ${guestStatCard('Listas de estadia',groups.length,'Abrir listas por reserva','lists')}
    ${guestStatCard('Convidados cadastrados',total,'Listar convidados sem contratante','invited')}
    ${guestStatCard('Reservas em aberto',active,'Ver listas ativas','open')}
  </div>
  <div class="guest-guidance"><strong>Lista de convidados por reserva</strong><span>O contratante aparece somente como referência da reserva. A lista abaixo mostra apenas os convidados/hóspedes adicionais.</span></div>
  <div class="guest-group-list">${groups.length?groups.map((group,i)=>guestGroupCard(group,i)).join(''):'<p class="muted">Nenhuma lista de hóspedes cadastrada ainda.</p>'}</div>`;
  return section('Hóspedes','Listas organizadas por reserva e contratante.','add-guest',content);
}
function guestGroupCard(group,index=0){
  const r=group.reservation, c=group.client;
  const capacity=capacityForReservation(r);
  const invited=invitedGuests(group);
  const totalPeople=group.guests.length;
  const seq=String(index+1).padStart(2,'0');
  return `<article class="guest-group-card">
    <header class="guest-group-head">
      <div><p class="eyebrow">${seq} · Reserva / contratante</p><h3>${seq}. ${esc(c.name||'Contratante não identificado')}</h3><span>${esc(c.document||group.guests[0]?.contractorCpf||'CPF não informado')} · ${esc(c.phone||'telefone não informado')}</span></div>
      <div class="guest-group-meta">${fact('Período',r.id?`${dateBr(r.start)} a ${dateBr(r.end)}`:'Histórico')}${fact('Status',rawHtml(badge(r.status||'Histórico')))}${fact('Ocupação',`${totalPeople}/${capacity}`)}</div>
    </header>
    <div class="progress-bar" style="--progress:${Math.min(100,totalPeople/capacity*100)}%"><span></span></div>
    <div class="guest-person-list">${invited.length?invited.map((g,i)=>guestPersonRow(g,`${seq}.${i+1}`)).join(''):'<div class="guest-person-row empty"><div><strong>${seq}.1 Nenhum convidado adicional cadastrado.</strong><span>O contratante já está identificado no cabeçalho desta reserva.</span></div></div>'}</div>
    <div class="actions"><button class="primary small" data-action="add-guest-reservation" data-id="${r.id||''}">Adicionar convidado nesta reserva</button><button class="small" data-action="guest-detail" data-id="group:${group.key}">Ver detalhes da lista</button></div>
  </article>`;
}
function guestPersonRow(g,seq=''){
  return `<div class="guest-person-row">
    <div><strong>${seq?`${seq} · `:''}${esc(g.fullName||'Nome não informado')}</strong><span>CPF: ${esc(g.cpf||'-')} · Endereço: ${esc(g.address||'-')}</span></div>
    <p>${esc(g.notes||'Sem observações.')}</p>
    <div class="row-actions"><button class="small" data-action="edit-guest" data-id="${g.id}">Editar</button>${isManager()?`<button class="small danger" data-action="delete-guest" data-id="${g.id}">Excluir</button>`:''}</div>
  </div>`;
}
function guestDetailScreen(groups){
  const back='<button class="small ghost" data-action="guest-detail" data-id="">Voltar para hóspedes</button>';
  if(guestDetailView?.startsWith('group:')){
    const key=guestDetailView.slice(6), group=groups.find(g=>g.key===key);
    if(!group) return section('Hóspedes','Detalhe da lista.','add-guest',`${back}<p class="muted">Lista não encontrada.</p>`);
    const c=group.client, r=group.reservation, invited=invitedGuests(group);
    const groupIndex=groups.findIndex(g=>g.key===key);
    const seq=String(groupIndex+1).padStart(2,'0');
    return section('Detalhe da lista','Contratante separado dos convidados.','add-guest',`${back}<article class="guest-group-card detail"><header class="guest-group-head"><div><p class="eyebrow">${seq} · Contratante responsável</p><h3>${seq}. ${esc(c.name||'-')}</h3><span>${esc(c.document||'-')} · ${esc(c.phone||'-')}</span></div><div class="guest-group-meta">${fact('Período',r.id?`${dateBr(r.start)} a ${dateBr(r.end)}`:'Histórico')}${fact('Status',rawHtml(badge(r.status||'Histórico')))}${fact('Convidados',invited.length)}</div></header><div class="guest-person-list expanded">${invited.length?invited.map((g,i)=>guestPersonRow(g,`${seq}.${i+1}`)).join(''):'<p class="muted">Nenhum convidado adicional nesta reserva.</p>'}</div></article>`);
  }
  const openStatuses=['Confirmada','Em estadia','Pré-reserva','Solicitada'];
  let title='Listas de estadia', subtitle='Todas as listas por reserva e contratante.', content='';
  if(guestDetailView==='invited'){
    const rows=groups.flatMap(g=>invitedGuests(g).map(guest=>({guest,group:g})));
    title='Convidados cadastrados'; subtitle='Somente convidados adicionais, sem repetir o contratante.';
    content=rows.length?`<div class="guest-person-list expanded">${rows.map(({guest,group},i)=>`<div class="guest-person-row"><div><strong>${String(i+1).padStart(2,'0')} · ${esc(guest.fullName)}</strong><span>CPF: ${esc(guest.cpf||'-')} · Contratante: ${esc(byId(state.clients,guest.clientId||group.reservation.clientId).name||'não identificado')}</span></div><p>${esc(guest.address||'Endereço não informado')}</p><div class="row-actions"><button class="small" data-action="edit-guest" data-id="${esc(guest.id)}">Editar</button>${isManager()?`<button class="small danger" data-action="delete-guest" data-id="${esc(guest.id)}">Excluir</button>`:''}</div></div>`).join('')}</div>`:'<p class="muted">Nenhum convidado adicional cadastrado.</p>';
  } else {
    const filtered=guestDetailView==='open'?groups.filter(g=>openStatuses.includes(g.reservation.status)):groups;
    if(guestDetailView==='open'){ title='Reservas em aberto'; subtitle='Listas ativas ou pendentes.'; }
    content=`<div class="guest-group-list compact">${filtered.map((group,i)=>guestGroupCard(group,i)).join('')||'<p class="muted">Nenhum registro nesta seleção.</p>'}</div>`;
  }
  return section(title,subtitle,'add-guest',`${back}${content}`);
}
function linkedPeopleList(r){
  const c=byId(state.clients,r.clientId);
  const guests=state.guests.filter(g=>g.reservationId===r.id);
  const people=guests.length?guests:[{fullName:c.name,cpf:c.document}];
  return `<ol class="linked-people">${people.map((g,i)=>`<li><span>${i+1}.</span><strong>${esc(g.fullName||'-')}</strong><em>${esc(g.cpf||'-')}</em></li>`).join('')}</ol>`;
}
function checkinPeopleCount(r){ return state.guests.filter(g=>g.reservationId===r.id).length || 1; }
function checkinValue(r,key){
  const c=byId(state.clients,r.clientId);
  if(key==='client') return c.name||'';
  if(key==='entry') return reservationTimeStart(r);
  if(key==='exit') return reservationTimeEnd(r);
  if(key==='people') return checkinPeopleCount(r);
  if(key==='balance') return Number(r.total||0)-Number(r.paid||0);
  if(key==='status') return r.status||'';
  return '';
}
function sortedCheckinReservations(){
  const q=normalizeDoc(checkinFilters.q) || String(checkinFilters.q||'').toLowerCase().trim();
  return [...state.reservations].filter(r=>{
    const c=byId(state.clients,r.clientId);
    if(checkinFilters.status!=='all' && r.status!==checkinFilters.status) return false;
    if(!q) return true;
    const text=[c.name,c.document,r.type,r.status,r.packageName].join(' ').toLowerCase();
    const docs=normalizeDoc([c.document,...state.guests.filter(g=>g.reservationId===r.id).map(g=>g.cpf)].join(' '));
    return text.includes(q) || docs.includes(q);
  }).sort((a,b)=>{
    const av=checkinValue(a,checkinSort.key), bv=checkinValue(b,checkinSort.key);
    const result=typeof av==='number'||typeof bv==='number' ? Number(av)-Number(bv) : String(av).localeCompare(String(bv),'pt-BR');
    return checkinSort.dir==='desc' ? -result : result;
  });
}
function sortableCheckinHeader(key,label){
  const active=checkinSort.key===key;
  const arrow=active ? (checkinSort.dir==='asc'?'▲':'▼') : '↕';
  return `<button class="sortable-th ${active?'active':''}" data-action="checkin-sort" data-id="${esc(key)}">${esc(label)}<span>${arrow}</span></button>`;
}
function checkin(){
  const rows=sortedCheckinReservations();
  const statuses=['all','Solicitada','Pré-reserva','Confirmada','Em estadia','Finalizada','Cancelada'];
  const filters=`<div class="checkin-filters">
    <label>Busca por cliente, CPF ou reserva<input data-checkin-filter="q" type="search" value="${esc(checkinFilters.q)}" placeholder="Digite e pressione Enter ou saia do campo"></label>
    <label>Status<select data-checkin-filter="status">${statuses.map(s=>`<option value="${esc(s)}" ${s===checkinFilters.status?'selected':''}>${s==='all'?'Todos':esc(s)}</option>`).join('')}</select></label>
  </div>`;
  const header=`<thead><tr><th>Nº</th><th>${sortableCheckinHeader('client','Cliente')}</th><th>${sortableCheckinHeader('entry','Entrada')}</th><th>${sortableCheckinHeader('exit','Saída')}</th><th>${sortableCheckinHeader('people','Pessoas vinculadas')}</th><th>${isManager()?sortableCheckinHeader('balance','Saldo'):'Checklist'}</th><th>${sortableCheckinHeader('status','Status')}</th><th></th></tr></thead>`;
  const body=rows.map((r,i)=>`<tr><td><span class="sequence-number">${String(i+1).padStart(2,'0')}</span></td><td>${esc(byId(state.clients,r.clientId).name||'-')}</td><td>${dateWithTime(r.start,r.startTime)}</td><td>${dateWithTime(r.end,r.endTime)}</td><td>${linkedPeopleList(r)}</td><td>${isManager()?money(Number(r.total)-Number(r.paid)):esc(r.checklist||'-')}</td><td>${badge(r.status)}</td><td><div class="row-actions flow-actions"><button class="small" data-action="open-stay-workflow" data-id="${esc(r.id)}" data-status="checkin">Check-in</button><button class="small" data-action="open-stay-workflow" data-id="${esc(r.id)}" data-status="checkout">Check-out</button></div></td></tr>`).join('');
  const tableHtml=rows.length?`<div class="table-wrap checkin-table"><table>${header}<tbody>${body}</tbody></table></div>`:'<p class="muted">Nenhuma reserva encontrada para os filtros selecionados.</p>';
  return section('Check-in e check-out','Chegada, saída e conferência operacional com etapa de confirmação.','add-guest',`${filters}${tableHtml}`);
}
function stayWorkflow(){
  const r=byId(state.reservations,workflowReservationId) || state.reservations[0] || {};
  if(!r.id) return `<section class="card"><h2>Conferência da estadia</h2><p class="muted">Nenhuma reserva disponível para conferência.</p></section>`;
  const c=byId(state.clients,r.clientId), s=byId(state.spaces,r.spaceId), guests=state.guests.filter(g=>g.reservationId===r.id);
  const isOut=workflowMode==='checkout';
  const title=isOut?'Conferência de check-out':'Confirmação de check-in';
  const target=isOut?'Finalizada':'Em estadia';
  const items=isOut?[
    ['Conferir saída de todos os hóspedes',`${guests.length} pessoa${guests.length===1?'':'s'} vinculada${guests.length===1?'':'s'}`],
    ['Vistoriar móveis e utensílios','Registrar avarias antes de encerrar'],
    ['Conferir enxoval e lavanderia','Toalhas, roupas de cama e itens extraviados'],
    ['Apurar consumo e saldo',isManager()?`Saldo estimado: ${money(Number(r.total||0)-Number(r.paid||0))}`:'Registrar pendências para o gerencial'],
    ['Programar limpeza pós-estadia','Acionar faxina e manutenção se necessário']
  ]:[
    ['Confirmar dados do contratante',`${c.name||'-'} · ${c.document||'-'}`],
    ['Validar período contratado',`${dateBr(r.start)} a ${dateBr(r.end)}`],
    ['Conferir lista de hóspedes',`${guests.length}/${capacityForReservation(r)} cadastrados`],
    ['Orientar regras de uso','Piscina, área gourmet, som, estacionamento e horários'],
    ['Registrar entrega da propriedade','Chaves, controles, Wi-Fi e checklist inicial']
  ];
  return `<section class="workflow-shell">
    <div class="card workflow-main">
      <div class="section-head"><div><p class="eyebrow">${isOut?'Encerramento':'Entrada'}</p><h2>${title}</h2><p>${esc(c.name||'Cliente')} · ${esc(r.type||'-')} · ${badge(r.status)}</p></div><button data-action="go-view" data-id="checkin">Voltar</button></div>
      <div class="client-facts workflow-facts">${fact('Cliente',c.name||'-')}${fact('CPF/CNPJ',c.document||'-')}${fact('Espaço',s.name||'-')}${fact('Período',`${dateBr(r.start)} a ${dateBr(r.end)}`)}${fact('Hóspedes',`${guests.length}/${capacityForReservation(r)}`)}${fact('Pacote',r.packageName||'-')}${isManager()?fact('Valor',`${money(r.paid)} / ${money(r.total)}`):fact('Status',r.status)}${fact('Checklist',r.checklist||'-')}</div>
      <div class="workflow-list">${items.map(([a,b])=>`<label class="workflow-check"><input type="checkbox"><span><strong>${a}</strong><em>${b}</em></span></label>`).join('')}</div>
      <label>Observações da conferência<textarea id="workflow-notes" placeholder="${isOut?'Ex.: avarias, itens faltantes, limpeza acionada, consumo pendente.':'Ex.: documentos conferidos, orientações entregues, pendências iniciais.'}"></textarea></label>
      <div class="actions"><button class="primary" data-action="confirm-stay-status" data-id="${r.id}" data-status="${target}">${isOut?'Confirmar check-out':'Confirmar check-in'}</button><button data-action="add-guest-reservation" data-id="${r.id}">Cadastrar hóspede</button></div>
    </div>
    <aside class="card workflow-side"><h3>Pessoas vinculadas</h3>${guests.length?guests.map(g=>`<div class="mini-person"><strong>${g.fullName}</strong><span>${g.cpf}</span></div>`).join(''):'<p class="muted">Nenhum hóspede vinculado ainda.</p>'}</aside>
  </section>`;
}
function clients(){
  if(!state.clients.length) return `<section class="card"><div class="section-head"><div><h2>Clientes</h2><p>Contratantes, contatos e histórico.</p></div></div><p class="muted">Nenhum cliente cadastrado ainda.</p></section>`;
  if(!selectedClientId || !byId(state.clients,selectedClientId).id) selectedClientId=state.clients[0].id;
  const selected=byId(state.clients,selectedClientId);
  const reservations=state.reservations.filter(r=>r.clientId===selected.id);
  const guests=state.guests.filter(g=>g.clientId===selected.id || g.contractorCpf===selected.document);
  const total=reservations.reduce((s,r)=>s+Number(r.total||0),0);
  const paid=reservations.reduce((s,r)=>s+Number(r.paid||0),0);
  return `<section class="clients-workspace">
    <div class="client-list-panel">
      <div class="section-head compact"><div><h2>Clientes</h2><p>Lista de contratantes cadastrados.</p></div><button class="small" data-action="open-report" data-id="clients">Relatório</button></div>
      <div class="client-scroll-list">${state.clients.map((c,i)=>{
        const count=state.reservations.filter(r=>r.clientId===c.id).length;
        return `<button class="client-list-item ${c.id===selected.id?'active':''}" data-action="select-client" data-id="${c.id}">
          <strong><span class="client-seq">${String(i+1).padStart(2,'0')}</span>${esc(c.name)}</strong><span>${esc(c.document||'CPF/CNPJ não informado')}</span><em>${count} reserva${count===1?'':'s'}</em>
        </button>`;
      }).join('')}</div>
    </div>
    <div class="client-detail-panel">
      <div class="client-detail-head">
        <div><p class="eyebrow">Ficha do cliente</p><h2>${esc(selected.name)}</h2><p>${esc(selected.notes||'Sem observações registradas.')}</p></div>
        <div class="actions">${rowActions('client',selected.id)}</div>
      </div>
      <div class="client-facts">
        ${fact('Telefone',selected.phone||'-')}${fact('CPF/CNPJ',selected.document||'-')}${fact('E-mail',selected.email||'-')}${fact('Endereço',selected.address||'-')}${fact('Cidade/UF',[selected.city,selected.state].filter(Boolean).join('/')||'-')}${fact('Contato preferencial',selected.preferredContact||'-')}${fact('Origem',selected.origin||'-')}${fact('Reservas',reservations.length)}${fact('Valor contratado',money(total))}${fact('Valor pago',money(paid))}${fact('Saldo',money(total-paid))}
      </div>
      <div class="client-history">
        <h3>Hospedagens e eventos</h3>
        ${reservations.length?table(['Período','Tipo','Pacote','Hóspedes','Valor','Status',''], reservations.map(r=>[`${dateBr(r.start)} a ${dateBr(r.end)}`,r.type,r.packageName,r.guests,money(r.total),rawHtml(badge(r.status)),rawHtml(rowActions(null,r.id,[['add-guest-reservation','Hóspedes',SVG_GUESTS]]))])):'<p class="muted">Nenhuma reserva vinculada a este cliente.</p>'}
      </div>
      <div class="client-history">
        <h3>Pessoas indicadas pelo contratante</h3>
        ${guests.length?table(['Pessoa','CPF','Período','Observações',''], guests.map(g=>[g.fullName,g.cpf,`${dateBr(g.stayStart)} a ${dateBr(g.stayEnd)}`,g.notes,rawHtml(rowActions('guest',g.id))])):'<p class="muted">Nenhum hóspede vinculado ao CPF deste contratante.</p>'}
      </div>
    </div>
  </section>`;
}
function spaces(){
  const headers=isManager()?['Nome','Tipo','Capacidade','Valor base','Status','']:['Nome','Tipo','Capacidade','Status',''];
  const rows=state.spaces.map(s=>isManager()?[s.name,s.type,s.capacity,money(s.baseRate),rawHtml(badge(s.status)),rawHtml(rowActions('space',s.id))]:[s.name,s.type,s.capacity,rawHtml(badge(s.status)),rawHtml(rowActions('space',s.id))]);
  return section('Espaços','Estrutura locável, capacidade e valor base.','add-space', table(headers,rows));
}
function transactionClient(t){
  if(t.clientId) return byId(state.clients,t.clientId);
  const r=byId(state.reservations,t.reservationId);
  return byId(state.clients,r.clientId);
}
function filteredTransactions(){
  return state.transactions.filter(t=>{
    if(financeFilters.from && String(t.date||'')<financeFilters.from) return false;
    if(financeFilters.to && String(t.date||'')>financeFilters.to) return false;
    if(financeFilters.type!=='all' && t.type!==financeFilters.type) return false;
    if(financeFilters.status!=='all' && t.status!==financeFilters.status) return false;
    if(financeFilters.category!=='all' && t.category!==financeFilters.category) return false;
    if(financeFilters.reservationId!=='all' && t.reservationId!==financeFilters.reservationId) return false;
    if(financeFilters.clientId!=='all'){
      const r=byId(state.reservations,t.reservationId);
      if(t.clientId!==financeFilters.clientId && r.clientId!==financeFilters.clientId) return false;
    }
    return true;
  }).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
}
function defaultFinanceFilters(){ return {from:"",to:"",type:"all",status:"all",category:"all",clientId:"all",reservationId:"all"}; }
function setSingleFinanceFilter(name,value){
  const current={...financeFilters};
  financeFilters=defaultFinanceFilters();
  if(name==='from' || name==='to'){
    financeFilters.from=name==='from'?value:current.from;
    financeFilters.to=name==='to'?value:current.to;
  } else {
    financeFilters[name]=value || 'all';
  }
}
function financeFilterSelect(name,label,options,value){
  return `<label>${label}<select name="${name}" data-finance-filter="${esc(name)}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
}
function financeFiltersPanel(){
  const categories=[...new Set(state.transactions.map(t=>t.category).filter(Boolean))].sort();
  const reservationOptions=[['all','Todas'],...state.reservations.map(r=>[r.id,`${byId(state.clients,r.clientId).name||'Cliente'} · ${dateBr(r.start)} a ${dateBr(r.end)}`])];
  return `<form id="finance-filters" class="finance-filters">
    <label>De<input type="date" name="from" data-finance-filter="from" value="${esc(financeFilters.from)}"></label>
    <label>Até<input type="date" name="to" data-finance-filter="to" value="${esc(financeFilters.to)}"></label>
    ${financeFilterSelect('type','Tipo',[['all','Todos'],['Entrada','Entradas'],['Saída','Saídas']],financeFilters.type)}
    ${financeFilterSelect('status','Status',[['all','Todos'],['Pago','Pago'],['Pendente','Pendente'],['Vencido','Vencido']],financeFilters.status)}
    ${financeFilterSelect('category','Categoria',[['all','Todas'],...categories.map(c=>[c,c])],financeFilters.category)}
    ${financeFilterSelect('clientId','Contratante',[['all','Todos'],...state.clients.map(c=>[c.id,c.name])],financeFilters.clientId)}
    ${financeFilterSelect('reservationId','Reserva',reservationOptions,financeFilters.reservationId)}
    <div class="filter-actions"><span class="filter-hint">Filtros aplicados automaticamente; ao escolher outro campo, os demais são limpos.</span><button data-action="open-report" data-id="finance">Relatório gerencial</button></div>
  </form>`;
}
function financeSummaryCards(rows){
  const entradas=rows.filter(t=>t.type==='Entrada').reduce((s,t)=>s+Number(t.amount||0),0);
  const saidas=rows.filter(t=>t.type==='Saída').reduce((s,t)=>s+Number(t.amount||0),0);
  const pendentes=rows.filter(t=>['Pendente','Vencido'].includes(t.status)).reduce((s,t)=>s+Number(t.amount||0),0);
  return `<div class="grid cols-4 finance-summary">${fact('Entradas filtradas',money(entradas))}${fact('Saídas filtradas',money(saidas))}${fact('Saldo filtrado',money(entradas-saidas))}${fact('Pendências',money(pendentes))}</div>`;
}
function finance(){ 
  const rows=filteredTransactions();
  const content=`${financeSummaryCards(rows)}${financeFiltersPanel()}${table(['Data','Tipo','Contratante','Reserva','Categoria','Descrição','Valor','Status',''], rows.map(t=>{
    const c=transactionClient(t), r=byId(state.reservations,t.reservationId);
    return [dateBr(t.date),t.type,c.name||'-',r.id?`${dateBr(r.start)} a ${dateBr(r.end)}`:'-',t.category,t.description,rawHtml(`<span class="${t.type==='Entrada'?'money-positive':'money-negative'}">${money(t.amount)}</span>`),rawHtml(badge(t.status)),rawHtml(rowActions('transaction',t.id))];
  }))}`;
  return section('Financeiro','Movimentação estruturada com filtros por período, contratante, reserva, categoria e status.','add-transaction', content); 
}
function managerialReport(){
  if(activeReport==='agenda') return agendaReportView();
  if(!isManager()) return `<section class="card"><h2>Relatório gerencial</h2><p class="muted">Acesso restrito ao perfil gerencial.</p></section>`;
  if(activeReport==='clients') return clientsReportView();
  return financeReportView();
}
function reportShell(title,subtitle,body,back='finance'){
  return `<div class="document-shell"><div class="document-toolbar no-print"><button data-action="trigger-print">Imprimir</button><button data-action="close-report" data-id="${esc(back)}">Voltar</button></div><div class="card print-document manager-print"><header class="document-header"><div class="document-brand"><img class="document-logo" src="assets/print-logo.png" alt="Estância das Montanhas"><div><strong>ESTÂNCIA DAS MONTANHAS</strong><span>POUSADA & EVENTOS · IPATINGA/MG</span></div></div><div class="document-meta"><strong>${esc(title)}</strong><span>${esc(subtitle)}</span><span>Emissão ${dateBr(todayIso())}</span></div></header><main class="document-body">${body}</main><footer class="document-footer"><span>ESTÂNCIA DAS MONTANHAS · RELATÓRIO GERENCIAL</span><span>WHATSAPP 31 98693-2446 · IPATINGA/MG</span></footer></div></div>`;
}
function financeReportView(){
  const rows=filteredTransactions();
  const body=`${docSection('Resumo financeiro',financeSummaryCards(rows))}${docSection('Lançamentos filtrados',documentTable(['Data','Tipo','Contratante','Categoria','Descrição','Valor','Status'],rows.map(t=>[dateBr(t.date),t.type,transactionClient(t).name||'-',t.category||'-',t.description||'-',money(t.amount),t.status||'-'])))}`
  return reportShell('Relatório financeiro','Movimentação por filtros aplicados',body,'finance');
}
function clientsReportView(){
  const rows=state.clients.map((c,i)=>{
    const reservations=state.reservations.filter(r=>r.clientId===c.id);
    const total=reservations.reduce((s,r)=>s+Number(r.total||0),0);
    return [String(i+1).padStart(2,'0'),c.name||'-',c.document||'-',c.phone||'-',`${c.city||'-'}/${c.state||'-'}`,reservations.length,money(total)];
  });
  const body=`${docSection('Contratantes cadastrados',documentTable(['Nº','Cliente','CPF/CNPJ','Telefone','Cidade/UF','Reservas','Valor contratado'],rows))}`;
  return reportShell('Relatório de clientes','Contratantes, contatos e histórico resumido',body,'clients');
}
function agendaReportView(){
  const [year,month]=selectedCalendarMonth.split('-').map(Number);
  const from=`${selectedCalendarMonth}-01`;
  const to=`${selectedCalendarMonth}-${String(new Date(year,month,0).getDate()).padStart(2,'0')}`;
  const rows=state.reservations
    .filter(r=>String(r.start||'')<=to && String(r.end||r.start||'')>=from)
    .sort((a,b)=>reservationTimeStart(a).localeCompare(reservationTimeStart(b)))
    .map((r,i)=>{
      const c=byId(state.clients,r.clientId), s=byId(state.spaces,r.spaceId), guests=state.guests.filter(g=>g.reservationId===r.id);
      return [String(i+1).padStart(2,'0'),dateWithTime(r.start,r.startTime),dateWithTime(r.end,r.endTime),c.name||'-',s.name||'-',r.type||'-',`${guests.length}/${capacityForReservation(r)}`,r.status||'-'];
    });
  const body=`${docSection(`Agenda de ${monthLabel(selectedCalendarMonth)}`,documentTable(['Nº','Entrada','Saída','Contratante','Espaço','Evento','Pessoas','Status'],rows))}`;
  return reportShell('Relatório da agenda','Agendamentos do mês selecionado',body,'calendar');
}
function maintenance(){ return section('Manutenção','Elétrica, hidráulica, piscina e estrutura.','add-maintenance', table(['Vencimento','Área','Sistema','Prioridade','Responsável','Status','Descrição',''], state.maintenance.map(m=>[dateBr(m.due),m.area,m.system,rawHtml(badge(m.priority)),m.responsible,rawHtml(badge(m.status)),m.description,rawHtml(rowActions('maintenance',m.id))]))); }
function cleaning(){ return section('Limpeza','Faxina pré-evento, pós-evento e rotinas.','add-cleaning', table(['Data','Área','Tipo','Responsável','Status','Notas',''], state.cleaning.map(c=>[dateBr(c.date),c.area,c.type,c.responsible,rawHtml(badge(c.status)),c.notes,rawHtml(rowActions('cleaning',c.id))]))); }
function laundry(){ return section('Lavanderia','Enxoval, toalhas, perdas e custo.','add-laundry', table(['Data','Item','Qtd.','Status','Custo','Notas',''], state.laundry.map(l=>[dateBr(l.date),l.item,l.qty,rawHtml(badge(l.status)),money(l.cost),l.notes,rawHtml(rowActions('laundry',l.id))]))); }
function inventory(){
  const headers=isManager()?['Item','Categoria','Qtd.','Mínimo','Estado','Local','Reposição','']:['Item','Categoria','Qtd.','Mínimo','Estado','Local',''];
  const rows=state.inventory.map(i=>isManager()?[i.item,i.category,i.qty,i.minimum,rawHtml(badge(i.condition)),i.location,money(i.replacementValue),rawHtml(rowActions('inventory',i.id))]:[i.item,i.category,i.qty,i.minimum,rawHtml(badge(i.condition)),i.location,rawHtml(rowActions('inventory',i.id))]);
  return section('Inventário','Mobiliário, utensílios e equipamentos.','add-inventory', table(headers,rows));
}
function utilities(){ return section('Consumos','Energia, água, gás e contas.','add-utility', table(isManager()?['Mês','Tipo','Leitura','Valor','Notas','']:['Mês','Tipo','Leitura','Notas',''], state.utilities.map(u=>isManager()?[u.month,u.type,u.reading,money(u.amount),u.notes,rawHtml(rowActions('utility',u.id))]:[u.month,u.type,u.reading,u.notes,rawHtml(rowActions('utility',u.id))]))); }
function employees(){ return section('Equipe','Diaristas e fornecedores.','add-employee', table(['Nome','Função','Telefone','Pagamento','Valor','Status',''], state.employees.map(e=>[e.name,e.role,e.phone,e.payType,money(e.rate),rawHtml(badge(e.status)),rawHtml(rowActions('employee',e.id))]))); }
function reports(){ return `<div class="grid cols-3">${metric('Reservas',state.reservations.length,'Abrir reservas','reservations')}${metric('Hóspedes',state.guests.length,'Abrir hóspedes','guests')}${metric('Inventário',money(state.inventory.reduce((s,i)=>s+Number(i.replacementValue||0),0)),'Abrir inventário','inventory')}</div><section class="card"><h2>Relatório executivo</h2><p class="muted">Resumo gerencial de ocupação, hóspedes, patrimônio, consumos e financeiro.</p></section>`; }
function backup(){ return `<section class="card"><div class="section-head"><div><h2>Backup e recuperação</h2><p>Exportação e importação ficam apenas neste módulo.</p></div></div><div class="grid cols-2"><div class="card"><h3>Exportar</h3><button class="primary" data-action="export-backup">Baixar backup completo</button></div><div class="card"><h3>Recuperar</h3><button data-action="choose-restore">Selecionar arquivo de backup</button></div></div></section>`; }
function technical(){
  const governance=`<div class="tech-intro audit-governance"><strong>Governança técnica das auditorias</strong><span>A partir da V17.5, o Registro Técnico também documenta auditorias externas por IA, especialmente Claude e Genspark. As análises apontaram riscos de massa demo, configuração, sessão, sincronização local, Supabase incompleto e RLS ausente. A decisão adotada foi avançar por partes: V17.6 saneou a base local sem degradar funcionalidades; V18 iniciou a fundação cloud sem substituir abruptamente o fluxo estável; V18.1 corrigiu bloqueadores de pacote; V18.2 ativa o caminho cloud mínimo com trava contra gravação destrutiva em lote.</span></div>`;
  return `<section class="card tech-page"><div class="section-head"><div><p class="eyebrow">Documentação técnica</p><h2>Registro Técnico de Evolução</h2><p>Histórico das versões, auditorias e principais decisões de governança do sistema.</p></div></div><div class="tech-intro"><strong>Termo adotado</strong><span>Registro Técnico de Evolução: mais preciso que inventário para narrar a evolução versionada do sistema, e menos amplo que manual técnico.</span></div>${governance}<div class="version-timeline">${evolutionLog.map(([version,text],i)=>`<article class="version-entry ${version===APP_VERSION?'current':''}"><span>${version}</span><div><strong>${version===APP_VERSION?'Versão atual':'Marco '+(i+1)}</strong><p>${text}</p></div></article>`).join('')}</div></section>`;
}


async function signIn(email,password){
  if(loginFailures>=5) throw new Error("Muitas tentativas inválidas. Aguarde alguns instantes e tente novamente.");
  if(!activeAuth) throw new Error("Camada de autenticação indisponível.");
  const user=await activeAuth.signIn(email,password);
  loginFailures=0; sessionStorage.removeItem("estancia-login-failures");
  return user.expiresAt ? user : {...user,expiresAt:Date.now()+sessionMinutes*60*1000};
}
function validateFormValues(type,values,id=null){
  const missing=(requiredFields[type]||[]).filter(k=>String(values[k]??'').trim()==='');
  if(missing.length) return `Campos obrigatórios ausentes: ${missing.join(', ')}.`;
  const datePairs=[['start','end'],['stayStart','stayEnd']];
  for(const [a,b] of datePairs){ if(values[a]&&values[b]&&String(values[b])<String(values[a])) return 'A data final não pode ser menor que a data inicial.'; }
  for(const [k,v] of Object.entries(values)){ if(moneyFields.has(k) && Number(v)<0) return 'Valores monetários não podem ser negativos.'; }
  ['guests','capacity','qty','minimum','reading'].forEach(k=>{ if(values[k]!==undefined && String(values[k])!=='' && parseNumber(values[k])<0) values[k]=0; });
  if(type==='reservation'){
    if(values.clientId && !byId(state.clients,values.clientId).id) return 'Cliente vinculado não encontrado.';
    if(values.spaceId && !byId(state.spaces,values.spaceId).id) return 'Espaço vinculado não encontrado.';
    if(values.status==='Pré-reserva' && values.confirmationDeadline && values.confirmationDeadline<todayIso()) return 'Pré-reserva precisa ter prazo de confirmação futuro ou vigente.';
    const conflict=reservationConflict(values,id);
    if(conflict){
      const c=byId(state.clients,conflict.clientId), s=byId(state.spaces,conflict.spaceId);
      return `Conflito de agenda com ${c.name||'cliente'} em ${s.name||'espaço'} (${scheduleLabel(conflict)}). Ajuste período, horário, espaço ou locação exclusiva.`;
    }
  }
  if(type==='guest'){
    const r=byId(state.reservations,values.reservationId);
    if(!r.id) return 'Reserva vinculada não encontrada.';
    if(values.cpf) values.cpf=normalizeCpf(values.cpf);
  }
  return '';
}
function normalizeCpf(v){ const d=normalizeDoc(v).slice(0,11); return d.length===11?d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'):String(v||''); }
function linkedImpact(type,id){
  if(type==='client'){
    const active=state.reservations.filter(r=>r.clientId===id && !['Cancelada','Finalizada'].includes(r.status)).length;
    const all=state.reservations.filter(r=>r.clientId===id).length;
    const guests=state.guests.filter(g=>g.clientId===id).length;
    const transactions=state.transactions.filter(t=>t.clientId===id || state.reservations.some(r=>r.id===t.reservationId && r.clientId===id)).length;
    if(active||all||guests||transactions) return `Cliente possui ${all} reserva(s), ${active} ativa(s), ${guests} hóspede(s) e ${transactions} lançamento(s) financeiro(s) vinculado(s).`;
  }
  if(type==='reservation'){
    const guests=state.guests.filter(g=>g.reservationId===id).length;
    const transactions=state.transactions.filter(t=>t.reservationId===id).length;
    if(guests||transactions) return `Reserva possui ${guests} hóspede(s) e ${transactions} lançamento(s) financeiro(s) vinculado(s).`;
  }
  if(type==='space'){
    const all=state.reservations.filter(r=>r.spaceId===id).length;
    const active=state.reservations.filter(r=>r.spaceId===id && !['Cancelada','Finalizada'].includes(r.status)).length;
    if(all) return `Espaço possui ${all} reserva(s), sendo ${active} ativa(s).`;
  }
  return '';
}
function openForm(type,id=null,defaults={}){
  if(!canUseForm(type)) return alert('Este cadastro é restrito ao perfil gerencial.');
  const schema=schemas[type], list=state[schema.list], item=id?list.find(x=>x.id===id):smartDefaults(type,defaults);
  document.querySelector('#modal-title').textContent=id?`Editar ${schema.title}`:`Novo ${schema.title}`;
  document.querySelector('#modal-body').innerHTML=type==='guest' ? guestSequenceLayout(item,id) : `<div class="form-grid">${schema.fields.map(f=>formField(f,item)).join('')}</div>`;
  const modal=document.querySelector('#modal');
  modal.classList.toggle('guest-modal',type==='guest');
  document.querySelector('.modal-actions .ghost').textContent=type==='guest'&&!id?'Concluir lista':'Cancelar';
  document.querySelector('#modal-save').textContent=type==='guest'&&!id?'Salvar convidado':'Salvar';
  modal.showModal();
  wireCurrencyInputs(document.querySelector('#modal-form'));
  if(type==='guest') wireGuestForm(item);
  document.querySelector('#modal-save').onclick=e=>{
    e.preventDefault();
    const values=Object.fromEntries(new FormData(document.querySelector('#modal-form')).entries());
    schema.fields.forEach(([n,,t])=>{if(t==='currency') values[n]=parseCurrency(values[n])});
    const error=validateFormValues(type,values,id);
    if(error) return alert(error);
    const saved=id?Object.assign(item,values):{id:uid(),...values};
    if(!id) list.push(saved);
    if(type==='reservation'){ selectedCalendarReservationId=saved.id; selectedCalendarDay=saved.start||null; syncCalendarMonthFromReservation(saved); }
    if(!saveState({sync:{list:schema.list,item:saved}})) return;
    if(type==='guest'&&!id){ afterSequentialGuestSave(saved); return; }
    modal.close();
    render();
  };
}
function smartDefaults(type,d){
  const n={...d};
  if(type==='reservation'){
    n.startTime=n.startTime||'14:00';
    n.endTime=n.endTime||'12:00';
    n.exclusiveUse=n.exclusiveUse||'Sim';
    n.confirmationDeadline=n.confirmationDeadline||addDaysIso(todayIso(),7);
  }
  if(type==='guest'&&n.reservationId){
    const r=byId(state.reservations,n.reservationId), c=byId(state.clients,r.clientId);
    n.clientId=r.clientId; n.contractorCpf=c.document; n.stayStart=r.start; n.stayEnd=r.end;
  }
  return n;
}
function formField([name,label,type,options,extra=''],item){
  const val=item[name]??'';
  const safeName=esc(name), safeLabel=esc(label), safeType=esc(type||'text');
  if(type==='select'){
    const opts=typeof options==='function'?options():options.map(v=>[v,v]);
    const empty=`<option value="">Selecione</option>`;
    return `<label class="${extra}">${safeLabel}<select name="${safeName}">${empty}${opts.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(val)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
  }
  if(type==='textarea') return `<label class="${extra}">${safeLabel}<textarea name="${safeName}">${esc(val)}</textarea></label>`;
  if(type==='currency') return `<label class="${extra}">${safeLabel}<input name="${safeName}" type="text" inputmode="numeric" data-currency-input="true" value="${val?esc(money(val)):''}" placeholder="R$ 0,00"></label>`;
  return `<label class="${extra}">${safeLabel}<input name="${safeName}" type="${safeType}" value="${esc(val)}"></label>`;
}
function guestSequenceLayout(item,id){
  const visibleNames = new Set(["fullName","cpf","address","notes"]);
  const visibleFields = schemas.guest.fields.filter(([name])=>visibleNames.has(name));
  const hidden = ["clientId","contractorCpf","stayStart","stayEnd"].map(name=>hiddenField(name,item[name])).join('') + (item.reservationId?hiddenField("reservationId",item.reservationId):'');
  const reservationPicker = item.reservationId ? '' : `<label class="contract-reservation-picker">Reserva / período<select name="reservationId"><option value="">Selecione</option>${state.reservations.map(r=>`<option value="${esc(r.id)}">${esc(byId(state.clients,r.clientId).name||"Cliente")} - ${dateBr(r.start)} a ${dateBr(r.end)}</option>`).join('')}</select></label>`;
  return `<div class="guest-sequence">
    <div id="guest-contract-summary">${guestContractSummary(item,reservationPicker)}</div>
    <div class="guest-sequence-grid">
      <section class="guest-entry-panel"><h3>${id?'Editar hóspede':'Cadastrar hóspede/convidado'}</h3><p class="muted">Lance cada pessoa individualmente. O contratante fica no cabeçalho da reserva e os demais hóspedes entram nesta lista.</p><div class="technical-fields">${hidden}</div><div class="form-grid guest-only-fields">${visibleFields.map(f=>formField(f,item)).join('')}</div><p class="sequence-status" id="sequence-status"></p></section>
      <aside class="guest-list-panel"><h3>Lista de hóspedes</h3><div id="guest-sequence-list">${guestSequenceList(item.reservationId,item.contractorCpf)}</div></aside>
    </div>
  </div>`;
}
function hiddenField(name,value=''){ return `<input type="hidden" name="${esc(name)}" value="${esc(value||'')}">`; }
function guestContractSummary(item,reservationPicker=''){
  const r=byId(state.reservations,item.reservationId), c=byId(state.clients,item.clientId||r.clientId);
  const linked=state.guests.filter(g=>(item.reservationId&&g.reservationId===item.reservationId)||(!item.reservationId&&item.contractorCpf&&g.contractorCpf===item.contractorCpf));
  return `<section class="contract-summary"><div><p class="eyebrow">Contratante</p><h3>${esc(c.name||'Selecione uma reserva')}</h3><span>${esc(c.document||item.contractorCpf||'CPF não informado')} · ${esc(c.phone||'telefone não informado')}</span>${reservationPicker}</div><div>${fact('Período',r.id?`${dateBr(r.start)} a ${dateBr(r.end)}`:'Sem reserva vinculada')}${fact('Capacidade',`${linked.length}/${capacityForReservation(r)}`)}</div></section>`;
}
function guestSequenceList(reservationId,contractorCpf){
  const guests=state.guests.filter(g=>(reservationId&&g.reservationId===reservationId)||(!reservationId&&contractorCpf&&g.contractorCpf===contractorCpf));
  if(!guests.length) return `<p class="muted">Nenhum convidado lançado ainda.</p>`;
  return guests.map((g,i)=>`<div class="guest-sequence-item"><strong>${i+1}. ${esc(g.fullName||'-')}</strong><span>CPF: ${esc(g.cpf||'-')}</span><span>Endereço: ${esc(g.address||'-')}</span></div>`).join('');
}
function afterSequentialGuestSave(saved){
  const form=document.querySelector('#modal-form');
  ['fullName','cpf','address','notes'].forEach(name=>{ if(form.elements[name]) form.elements[name].value=''; });
  if(form.elements.fullName) form.elements.fullName.focus();
  const list=document.querySelector('#guest-sequence-list');
  if(list) list.innerHTML=guestSequenceList(saved.reservationId,saved.contractorCpf);
  const summary=document.querySelector('#guest-contract-summary');
  if(summary) summary.innerHTML=guestContractSummary(saved);
  const status=document.querySelector('#sequence-status');
  if(status) status.textContent='Convidado salvo. Continue lançando o próximo hóspede da lista.';
}
function wireGuestForm(item){
  const form=document.querySelector('#modal-form');
  const client=form.elements.clientId, cpf=form.elements.contractorCpf, reservation=form.elements.reservationId;
  const stayStart=form.elements.stayStart, stayEnd=form.elements.stayEnd;
  const currentGuestItem=()=>({clientId:client?.value||'',contractorCpf:cpf?.value||'',reservationId:reservation?.value||'',stayStart:stayStart?.value||'',stayEnd:stayEnd?.value||''});
  const refreshGuestSequence=()=>{
    const itemNow=currentGuestItem();
    const summary=document.querySelector('#guest-contract-summary');
    const list=document.querySelector('#guest-sequence-list');
    if(summary) summary.innerHTML=guestContractSummary(itemNow);
    if(list) list.innerHTML=guestSequenceList(itemNow.reservationId,itemNow.contractorCpf);
  };
  const fillClientCpf=(force=false)=>{
    const c=byId(state.clients,client?.value);
    if(cpf && c.document && (force || !cpf.value)) cpf.value=c.document;
    refreshGuestSequence();
  };
  const fillFromReservation=()=>{
    const r=byId(state.reservations,reservation?.value);
    if(!r.id) return;
    const c=byId(state.clients,r.clientId);
    if(client) client.value=r.clientId || '';
    if(cpf) cpf.value=c.document || '';
    if(stayStart) stayStart.value=r.start || '';
    if(stayEnd) stayEnd.value=r.end || '';
    refreshGuestSequence();
  };
  if(!item.clientId && client) client.value='';
  client?.addEventListener('change',()=>fillClientCpf(true));
  reservation?.addEventListener('change',fillFromReservation);
  cpf?.addEventListener('input',refreshGuestSequence);
  if(item.reservationId) fillFromReservation();
  refreshGuestSequence();
}
function canUseForm(type){ return isManager() || !['transaction','employee','space'].includes(type); }
function removeItem(type,id){ if(!isManager()) return alert('Exclusões são restritas ao perfil gerencial.'); const impact=linkedImpact(type,id); if(impact) return alert(`Exclusão bloqueada para preservar integridade referencial. ${impact}`); const schema=schemas[type]; state[schema.list]=state[schema.list].filter(x=>x.id!==id); if(saveState({sync:{list:schema.list,id,delete:true}})) render(); }
function exportBackup(){ const blob=new Blob([JSON.stringify({app:'estancia-das-montanhas',version:"18.3",exportedAt:new Date().toISOString(),data:state},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`backup-estancia-v18-3-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href); }
function validateReferentialIntegrity(data){
  const clientIds=new Set((data.clients||[]).map(x=>x.id).filter(Boolean));
  const spaceIds=new Set((data.spaces||[]).map(x=>x.id).filter(Boolean));
  const reservationIds=new Set((data.reservations||[]).map(x=>x.id).filter(Boolean));
  const seen=new Set();
  for(const list of ["clients","spaces","reservations","guests","transactions","maintenance","cleaning","laundry","inventory","utilities","employees"]){
    for(const item of data[list]||[]){
      if(!item.id) return `${list} possui registro sem identificador.`;
      const key=`${list}:${item.id}`;
      if(seen.has(key)) return `${list} possui identificador duplicado: ${item.id}.`;
      seen.add(key);
    }
  }
  for(const r of data.reservations||[]){
    if(!r.clientId||!r.spaceId) return 'Reserva sem cliente ou espaço.';
    if(!clientIds.has(r.clientId)) return 'Reserva referencia cliente inexistente.';
    if(!spaceIds.has(r.spaceId)) return 'Reserva referencia espaço inexistente.';
    if(r.start&&r.end&&r.end<r.start) return 'Reserva com período invertido.';
  }
  for(const g of data.guests||[]){
    if(g.reservationId && !reservationIds.has(g.reservationId)) return 'Hóspede referencia reserva inexistente.';
    if(g.clientId && !clientIds.has(g.clientId)) return 'Hóspede referencia cliente inexistente.';
    if(g.stayStart&&g.stayEnd&&g.stayEnd<g.stayStart) return 'Hóspede com período invertido.';
  }
  for(const t of data.transactions||[]){
    if(t.clientId && !clientIds.has(t.clientId)) return 'Lançamento financeiro referencia cliente inexistente.';
    if(t.reservationId && !reservationIds.has(t.reservationId)) return 'Lançamento financeiro referencia reserva inexistente.';
    if(t.amount!==undefined && Number(t.amount)<0) return 'Lançamento financeiro com valor negativo.';
  }
  return '';
}
function validateImportedState(data){
  const requiredLists=["clients","spaces","reservations","guests","transactions","maintenance","cleaning","laundry","inventory","utilities","employees"];
  for(const k of requiredLists){ if(data[k]!==undefined && !Array.isArray(data[k])) return `${k} deve ser uma lista.`; }
  return validateReferentialIntegrity(data);
}
function pruneRestoreSnapshots(){
  const prefix=`${storageKey}-snapshot-`;
  const keys=[];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(key?.startsWith(prefix)) keys.push(key);
  }
  keys.sort().reverse().slice(2).forEach(key=>localStorage.removeItem(key));
}
function restoreBackup(file){ file.text().then(text=>{
  let parsed;
  try{ parsed=JSON.parse(text); }catch(err){ alert('Arquivo de backup inválido.'); return; }
  const data=parsed.data || parsed;
  const valid=parsed.app==='estancia-das-montanhas' && Array.isArray(data?.reservations);
  if(!valid){ alert('Arquivo de backup inválido ou incompatível com este sistema.'); return; }
  const error=validateImportedState(data);
  if(error){ alert(`Backup rejeitado: ${error}`); return; }
  if(!confirm('A recuperação substituirá os dados atuais do sistema. Deseja continuar?')) return;
  const snapshotKey=`${storageKey}-snapshot-${new Date().toISOString()}`;
  localStorage.setItem(snapshotKey,JSON.stringify(state));
  pruneRestoreSnapshots();
  const previous=state;
  try{
    state=normalizeState(data,{allowDemo:false});
    if(!saveState({force:true})) throw new Error('Gravação cancelada.');
    render(); alert(`Backup recuperado com sucesso. Snapshot anterior salvo em ${snapshotKey}.`);
  }catch(err){ state=previous; localStorage.setItem(storageKey,JSON.stringify(previous)); alert(`Falha na restauração. Snapshot anterior preservado. ${err.message}`); }
}).catch(()=>alert('Não foi possível ler o arquivo de backup.')); }

async function handle(action,id,status){
  if(action==='open-brand') return document.querySelector('#brand-viewer')?.showModal();
  if(action==='close-brand') return document.querySelector('#brand-viewer')?.close();
  if(action==='go-technical-logo'){ document.querySelector('#brand-viewer')?.close(); currentView='technical'; guestDetailView=null; reservationDetailId=null; documentsReservationId=null; activeDocument=null; return render(); }
  if(action==='go-view'){currentView=id; if(id!=='guests') guestDetailView=null; if(id!=='reservationFilters') reservationDetailId=null; if(id!=='reservationDocuments'){documentsReservationId=null;activeDocument=null;} return render()}
  if(action==='reservation-filter'){reservationFilterMode=id||'all'; reservationDetailId=null; currentView='reservationFilters'; return render()}
  if(action==='reservation-detail'){reservationDetailId=id||null; currentView='reservationFilters'; return render()}
  if(action==='reservation-documents'){documentsReservationId=id; activeDocument=null; currentView='reservationDocuments'; return render()}
  if(action==='open-document'){documentsReservationId=id||documentsReservationId; activeDocument=status; currentView='reservationDocuments'; return render()}
  if(action==='close-document'){activeDocument=null; return render()}
  if(action==='trigger-print'){
    const r=byId(state.reservations,documentsReservationId);
    const previousTitle=document.title;
    if(r.id && activeDocument) document.title=`${documentTitlePrint(activeDocument)} ${documentNumber(r)}`;
    window.print();
    setTimeout(()=>{document.title=previousTitle;},250);
    return;
  }
  if(action==='guest-detail'){guestDetailView=id||null; currentView='guests'; return render()}
  if(action==='calendar-prev'){selectedCalendarReservationId=null;selectedCalendarDay=null;shiftMonth(-1);return render()}
  if(action==='calendar-next'){selectedCalendarReservationId=null;selectedCalendarDay=null;shiftMonth(1);return render()}
  if(action==='close-calendar-detail'){selectedCalendarReservationId=null;selectedCalendarDay=null;return render()}
  if(action==='select-calendar-day'){selectedCalendarDay=id;selectedCalendarReservationId=null;return render()}
  if(action==='select-calendar-reservation'){selectedCalendarReservationId=id;selectedCalendarDay=null;syncCalendarMonthFromReservation(byId(state.reservations,id));return render()}
  if(action==='select-client'){selectedClientId=id;return render()}
  if(action==='open-stay-workflow'){workflowReservationId=id;workflowMode=status;currentView='stayWorkflow';return render()}
  if(action==='checkin-sort'){
    checkinSort={key:id,dir:checkinSort.key===id && checkinSort.dir==='asc'?'desc':'asc'};
    currentView='checkin';
    return render();
  }
  if(action==='confirm-stay-status'){
    const r=byId(state.reservations,id);
    r.status=status;
    if(status==='Em estadia') r.checkinAt=new Date().toISOString();
    if(status==='Finalizada') r.checkoutAt=new Date().toISOString();
    const notes=document.querySelector('#workflow-notes')?.value.trim();
    if(notes) r.checklist=[r.checklist,`${new Date().toLocaleString('pt-BR')} - ${notes}`].filter(Boolean).join(' | ');
    saveState({sync:{list:"reservations",item:r}}); currentView='checkin'; return render();
  }
  if(action==='go-guests'){currentView='guests';return render()}
  if(action==='apply-finance-filters'){
    const form=document.querySelector('#finance-filters');
    if(form) financeFilters={...financeFilters,...Object.fromEntries(new FormData(form).entries())};
    currentView='finance'; return render();
  }
  if(action==='clear-finance-filters'){ financeFilters=defaultFinanceFilters(); currentView='finance'; return render(); }
  if(action==='open-report'){ activeReport=id||'finance'; currentView='managerialReport'; return render(); }
  if(action==='close-report'){ currentView=id||'finance'; activeReport=null; return render(); }
  if(action==='status-reservation'){const r=byId(state.reservations,id); r.status=status; saveState({sync:{list:"reservations",item:r}}); return render()}
  if(action==='add-guest-reservation') return openForm('guest',null,{reservationId:id});
  if(action==='export-backup') return exportBackup();
  if(action==='choose-restore') return document.querySelector('#restore-file').click();
  if(action?.startsWith('add-')) return openForm(action.replace('add-',''));
  if(action?.startsWith('edit-')) return openForm(action.replace('edit-',''),id);
  if(action?.startsWith('delete-')) return removeItem(action.replace('delete-',''),id);
}
document.addEventListener('click',e=>{const t=e.target.closest('[data-action]'); if(t){e.preventDefault(); handle(t.dataset.action,t.dataset.id,t.dataset.status)}});
document.addEventListener('change',e=>{
  const finance=e.target.closest('[data-finance-filter]');
  if(finance){
    setSingleFinanceFilter(finance.dataset.financeFilter,finance.value);
    currentView='finance';
    return render();
  }
  const check=e.target.closest('[data-checkin-filter]');
  if(check){
    checkinFilters={...checkinFilters,[check.dataset.checkinFilter]:check.value};
    currentView='checkin';
    return render();
  }
});
document.addEventListener('pointermove',e=>{
  const el=e.target.closest('.dashboard-cards .metric-link,.ops-actions button');
  if(!el || currentView!=='dashboard') return;
  const rect=el.getBoundingClientRect();
  const dx=(e.clientX-(rect.left+rect.width/2))/rect.width*10;
  const dy=(e.clientY-(rect.top+rect.height/2))/rect.height*8;
  el.style.transform=`translate(${dx}px,${dy}px) translateY(-3px) scale(1.01)`;
});
document.addEventListener('pointerout',e=>{
  const el=e.target.closest('.dashboard-cards .metric-link,.ops-actions button');
  if(el) el.style.transform='';
});
document.querySelector('#restore-file').addEventListener('change',e=>{const f=e.target.files[0]; e.target.value=''; if(f) restoreBackup(f);});
window.addEventListener('storage',e=>{
  if(e.key!==storageKey || !e.newValue) return;
  try{
    const incoming=JSON.parse(e.newValue);
    if(incoming.meta?.lastWriterId!==appInstanceId && Number(incoming.meta?.revision||0)>loadedRevision){
      externalChangePending=true;
      if(document.querySelector('#external-change-notice')) return;
      const box=document.querySelector('#view');
      if(box) box.insertAdjacentHTML('afterbegin','<div class="notice" id="external-change-notice"><strong>Alteração detectada em outra aba.</strong><span>Recarregue a página antes de continuar para evitar sobrescrita silenciosa.</span></div>');
    }
  }catch{}
});
async function logout(){try{await activeAuth?.signOut?.();}catch(err){setSyncStatus("error",`Falha ao encerrar sessão: ${err.message}`)} currentUser=null;localStorage.removeItem(authStorageKey);sessionStorage.removeItem(authStorageKey);document.body.classList.add('locked')}
function checkSession(){ if(currentUser?.expiresAt && Date.now()>currentUser.expiresAt){ alert('Sessão expirada por segurança. Faça login novamente.'); logout(); } }
setInterval(checkSession,60000);
document.querySelector('#logout').addEventListener('click',logout);
document.querySelector('#login-form').addEventListener('submit',async e=>{e.preventDefault(); const box=document.querySelector('#login-error'); box.textContent=''; try{currentUser=await signIn(document.querySelector('#login-email').value.trim(),document.querySelector('#login-password').value); localStorage.removeItem(authStorageKey); sessionStorage.removeItem(authStorageKey); authSessionStore.setItem(authStorageKey,JSON.stringify(currentUser)); await hydrateStateFromRepository(); document.body.classList.remove('locked'); render();}catch(err){loginFailures++; sessionStorage.setItem("estancia-login-failures",String(loginFailures)); box.textContent=err.message; if(loginFailures>=5) setTimeout(()=>{loginFailures=0;sessionStorage.removeItem("estancia-login-failures");},30000);}});
async function hydrateStateFromRepository(){
  if(!activeRepository) return;
  try{
    const remote=await activeRepository.loadState();
    if(remote){ state=applyV173Enhancements(normalizeState(remote,{allowDemo:remote.systemFlags?.mode==="demo"})); loadedRevision=Number(state.meta?.revision||0); localStorage.setItem(storageKey,JSON.stringify(state)); setSyncStatus("synced",""); }
  }catch(err){ setSyncStatus("error",`Falha ao carregar repositório ativo: ${err.message}`); }
}
(async function boot(){
  try{
    const restored=await activeAuth?.restoreSession?.();
    if(restored){ currentUser=restored.expiresAt ? restored : {...restored,expiresAt:Date.now()+sessionMinutes*60*1000}; await hydrateStateFromRepository(); document.body.classList.remove('locked'); render(); }
  }catch(err){ setSyncStatus("error",`Falha ao restaurar sessão: ${err.message}`); }
  document.body.dataset.boot="ready";
})();





