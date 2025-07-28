export const translations = {
  en: {
    privacyNote: 'Enabling records anonymous performance data locally only.'
  },
  es: {
    privacyNote: 'Al habilitar, se guardan datos de rendimiento anonimos solo localmente.'
  }
};

export function getCurrentLanguage() {
  return localStorage.getItem('language') || 'en';
}

export function setLanguage(lang) {
  localStorage.setItem('language', lang);
  applyTranslations();
}

export function t(key) {
  const lang = getCurrentLanguage();
  if (translations[lang] && translations[lang][key]) return translations[lang][key];
  return translations['en'][key] || key;
}

export function applyTranslations() {
  const note = document.getElementById('privacyNote');
  if (note) note.innerText = t('privacyNote');
}
