;(function(){
  function createSupabaseClient(config){
    if(!config?.supabaseUrl || !config?.supabaseAnonKey) return null;
    const factory = window.supabase?.createClient;
    return factory ? factory(config.supabaseUrl, config.supabaseAnonKey) : null;
  }

  class LocalConfigAuth{
    constructor(config, store, key){
      this.config = config || {};
      this.store = store;
      this.key = key;
    }
    async signIn(email, password){
      const user = this.config.users?.[email];
      if(!user || user.password !== password) throw new Error("Credenciais locais inválidas.");
      const session = { id:email, email, name:user.name || email, role:user.role || "operator", expiresAt:Date.now()+Number(this.config.sessionMinutes || 120)*60000 };
      this.store?.setItem(this.key, JSON.stringify(session));
      return session;
    }
    async restoreSession(){
      const saved = JSON.parse(this.store?.getItem(this.key) || "null");
      return saved?.expiresAt > Date.now() ? saved : null;
    }
    async signOut(){
      localStorage.removeItem(this.key);
      sessionStorage.removeItem(this.key);
      return true;
    }
  }

  class SupabaseAuthAdapter{
    constructor(config){
      this.config = config || {};
      this.client = createSupabaseClient(config);
    }
    enabled(){
      return Boolean(this.client);
    }
    async profileFor(user){
      const { data, error } = await this.client.from("profiles").select("id,email,name,role,status").eq("id", user.id).maybeSingle();
      if(error) throw new Error(`Falha ao ler perfil do usuário: ${error.message}`);
      if(!data || data.status === "inactive") throw new Error("Perfil não encontrado ou inativo.");
      return { id:user.id, email:user.email, name:data.name || user.email, role:data.role || "operator" };
    }
    async signIn(email, password){
      if(!this.client) throw new Error("Supabase não configurado em config.js.");
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if(error) throw new Error(error.message);
      return this.profileFor(data.user);
    }
    async restoreSession(){
      if(!this.client) return null;
      const { data, error } = await this.client.auth.getSession();
      if(error || !data?.session?.user) return null;
      return this.profileFor(data.session.user);
    }
    async getCurrentUser(){
      return this.restoreSession();
    }
    async signOut(){
      if(!this.client) return true;
      const { error } = await this.client.auth.signOut();
      if(error) throw new Error(error.message);
      return true;
    }
  }

  function createAuth(config, store, key){
    if(["cloud","cloud-ready"].includes(config?.appMode) && config.supabaseUrl && config.supabaseAnonKey && window.supabase) return new SupabaseAuthAdapter(config);
    return new LocalConfigAuth(config, store, key);
  }

  window.EstanciaAuth = { LocalConfigAuth, SupabaseAuthAdapter, createAuth, createSupabaseClient };
})();
