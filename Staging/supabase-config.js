(() => {
  if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) return;

  window.JL_EXPRESS_STAGING_CONFIG = Object.freeze({
    url: 'https://ofxwstrxvaangrqbgajb.supabase.co',
    anonKey: 'sb_publishable_O7Xn1xWF0KtV3LYh3xMB3Q_QcAYzsQr',
  });
})();