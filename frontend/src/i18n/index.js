import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import esTranslations from './locales/es.json';
import enTranslations from './locales/en.json';
import zhTranslations from './locales/zh.json';

const resources = {
    es: { translation: esTranslations },
    en: { translation: enTranslations },
    zh: { translation: zhTranslations }
};

// Check localStorage for preferred language, default to 'es'
const savedLanguage = localStorage.getItem('toolcrib_lang') || 'es';

i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources,
        lng: savedLanguage, // initial language
        fallbackLng: 'es', // fallback

        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
