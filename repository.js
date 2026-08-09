;(function(){
  const listTypes = {
    clients:"client",
    spaces:"space",
    reservations:"reservation",
    guests:"guest",
    transactions:"transaction",
    maintenance:"maintenance",
    cleaning:"cleaning",
    laundry:"laundry",
    inventory:"inventory",
    utilities:"utility",
    employees:"employee"
  };
  const tableNames = {
    clients:"clients",
    spaces:"spaces",
    reservations:"reservations",
    guests:"guests",
    transactions:"transactions",
    maintenance:"maintenance",
    cleaning:"cleaning",
    laundry:"laundry",
    inventory:"inventory",
    utilities:"utilities",
    employees:"employees"
  };
  const listByType = Object.entries(listTypes).reduce((acc,[list,type]) => ({...acc,[type]:list}), {});

  function validate(state){
    const error = window.EstanciaStateValidation?.validateReferentialIntegrity?.(state);
    if(error) throw new Error(error);
  }

  function nowIso(){
    return new Date().toISOString();
  }

  class LocalStorageRepository{
    constructor(storageKey){
      this.storageKey = storageKey;
    }
    readLocalSnapshot(){
      return localStorage.getItem(this.storageKey);
    }
    async loadState(){
      const raw = this.readLocalSnapshot();
      return raw ? JSON.parse(raw) : null;
    }
    async saveState(state){
      validate(state);
      localStorage.setItem(this.storageKey, JSON.stringify(state));
      return { ok:true, revision:state.meta?.revision };
    }
    async upsertRecord(list, item, state){
      if(state) validate(state);
      return { ok:true, list, id:item?.id };
    }
    async deleteRecord(list, id){
      return { ok:true, list, id };
    }
  }

  class LocalApiRepository extends LocalStorageRepository{
    async loadState(){
      const res = await fetch("/api/state", { cache:"no-store" });
      if(!res.ok) throw new Error("Falha ao carregar base local assistida.");
      return res.json();
    }
    async saveState(state){
      validate(state);
      localStorage.setItem(this.storageKey, JSON.stringify(state));
      const res = await fetch("/api/state", {
        method:"PUT",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify(state)
      });
      if(!res.ok) throw new Error((await res.json().catch(()=>({}))).error || "Falha ao salvar base local assistida.");
      return res.json();
    }
  }

  class SupabaseRepository{
    constructor(config, storageKey){
      this.config = config || {};
      this.storageKey = storageKey;
      this.client = window.EstanciaAuth?.createSupabaseClient?.(config);
      this.pageSize = Number(config.supabasePageSize || 1000);
    }
    readLocalSnapshot(){
      return localStorage.getItem(this.storageKey);
    }
    enabled(){
      return Boolean(this.client);
    }
    tableFor(list){
      const table = tableNames[list];
      if(!table) throw new Error(`Lista sem tabela Supabase: ${list}`);
      return table;
    }
    typeFor(list){
      const type = listTypes[list];
      if(!type) throw new Error(`Lista sem mapper Supabase: ${list}`);
      return type;
    }
    async pageAll(table){
      if(!this.client) throw new Error("Supabase não configurado em config.js.");
      const rows = [];
      for(let from = 0;; from += this.pageSize){
        const to = from + this.pageSize - 1;
        const { data, error } = await this.client
          .from(table)
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending:true })
          .range(from, to);
        if(error) throw new Error(`Falha ao carregar ${table}: ${error.message}`);
        rows.push(...(data || []));
        if(!data || data.length < this.pageSize) break;
      }
      return rows;
    }
    buildMeta(rowsByList){
      const dates = Object.values(rowsByList)
        .flatMap(rows => rows.map(row => row.updated_at || row.created_at).filter(Boolean))
        .sort();
      const updatedAt = dates.at(-1) || null;
      return { revision:updatedAt ? Date.parse(updatedAt) || 0 : 0, updatedAt, lastWriterId:null };
    }
    async loadState(){
      if(!this.client) throw new Error("Supabase não configurado em config.js.");
      const state = { systemFlags:{demoSeedApplied:false,mode:"operational"} };
      const rowsByList = {};
      for(const [list,type] of Object.entries(listTypes)){
        const rows = await this.pageAll(this.tableFor(list));
        rowsByList[list] = rows;
        state[list] = rows.map(row => window.EstanciaMappers.fromDatabase(type, row));
      }
      state.meta = this.buildMeta(rowsByList);
      localStorage.setItem(this.storageKey, JSON.stringify(state));
      return state;
    }
    async saveState(){
      throw new Error("Gravação cloud em lote desativada na V18.2 para evitar perda de dados. Use upsertRecord/deleteRecord por registro.");
    }
    async upsertRecord(list, item, stateForValidation){
      if(!this.client) throw new Error("Supabase não configurado em config.js.");
      if(stateForValidation) validate(stateForValidation);
      const type = this.typeFor(list);
      const row = window.EstanciaMappers.toDatabase(type, item);
      const { error } = await this.client.from(this.tableFor(list)).upsert(row, { onConflict:"id" });
      if(error) throw new Error(`Falha ao gravar ${list}/${item?.id}: ${error.message}`);
      return { ok:true, list, id:item?.id };
    }
    async deleteRecord(list, id){
      if(!this.client) throw new Error("Supabase não configurado em config.js.");
      if(!id) throw new Error("Exclusão cloud exige id explícito.");
      const { error } = await this.client.from(this.tableFor(list)).update({ deleted_at:nowIso() }).eq("id", id);
      if(error) throw new Error(`Falha ao excluir ${list}/${id}: ${error.message}`);
      return { ok:true, list, id };
    }
  }

  function createRepository(config, storageKey){
    if(["cloud","cloud-ready"].includes(config?.appMode) && config.supabaseUrl && config.supabaseAnonKey && window.supabase) return new SupabaseRepository(config, storageKey);
    if(["127.0.0.1:8080","localhost:8080"].includes(location.host)) return new LocalApiRepository(storageKey);
    return new LocalStorageRepository(storageKey);
  }

  window.EstanciaRepository = { listTypes, tableNames, listByType, LocalStorageRepository, LocalApiRepository, SupabaseRepository, createRepository };
})();
