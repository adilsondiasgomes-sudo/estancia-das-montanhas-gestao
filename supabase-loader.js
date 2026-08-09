;(function(){
  const config = window.ESTANCIA_CONFIG || {};
  const shouldLoad = ["cloud","cloud-ready"].includes(config.appMode) && config.supabaseUrl && config.supabaseAnonKey && !window.supabase;
  if(!shouldLoad) return;
  document.write('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><\\/script>');
})();
