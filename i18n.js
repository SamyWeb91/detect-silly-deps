const i18n = require('i18n');

function setupI18n(langOverride) {
  i18n.configure({
    locales: ['en', 'es'],
    directory: __dirname + '/../locales', // Ajusta si estás en /lib
    defaultLocale: 'en',
    register: global,
    objectNotation: true
  });

  const lang = ['es', 'en'].includes(langOverride) ? langOverride : 'en';
  i18n.setLocale(lang);
}

module.exports = setupI18n;
