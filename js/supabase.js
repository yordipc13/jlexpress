const stagingRequested = new URLSearchParams(window.location.search).get('supabase') === 'staging';
const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const productionConfig = {
  url: 'https://swpvtfjbseftynnhflfi.supabase.co',
  anonKey: 'sb_publishable_7Ig-tiFQ1S7zt_wna6tL5A_0UXQ3eUi',
};

if (stagingRequested && !localHost) {
  window.supabaseClient = null;
  console.error('El modo staging solo está disponible en localhost.');
} else if (stagingRequested && !window.JL_EXPRESS_STAGING_CONFIG) {
  window.supabaseClient = null;
  console.error('No se pudo cargar la configuración local de staging.');
} else if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  window.supabaseClient = null;
  console.warn('Supabase no está disponible: falta cargar el SDK antes de este archivo.');
} else {
  const config = stagingRequested ? window.JL_EXPRESS_STAGING_CONFIG : productionConfig;
  if (!config.url || !config.anonKey) {
    window.supabaseClient = null;
    console.warn('Supabase no está configurado: faltan URL o clave pública.');
  } else {
    window.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  }
}
