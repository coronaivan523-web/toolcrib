# CHECKLIST: P2 - INTERNACIONALIZACIÓN (I18N)

**Objetivo:** Desacoplar Textos en UI del Código React, logrando diccionarios dinámicos en Múltiples Idiomas y manejo coherente de Tiempo (TZ).

## ETAPA 1: UI ABSTRACTIONS (DUMB FRONTEND)
- [ ] Instalación de librería corporativa (Ej: `react-i18next` o Vite equivalentes).
- [ ] Crear archivos de diccionarios locales: `public/locales/es/translation.json`, `/en/`, `/zh/`.
- [ ] Reemplazar hardcodes `{ "Tickets " }` por `{ t("menu.tickets") }` en toda la app React (`src/pages/*`, `src/components/*`).

## ETAPA 2: NORMALIZACIÓN DE ZONAS HORARIAS (TZ) EN DB/BACKEND
- [ ] Verificar que TODOS los timestamp transaccionales se almacenan en bloque UTC puro `timezone('utc'::text, now())`.
- [ ] Backend convierte al retornar JSON hacia la TZ del tenant/planta (Usando Datetime utils) o el Frontend decide con la configuración del perfil (`Intl.DateTimeFormat().resolvedOptions().timeZone`).

## ETAPA 3: TESTING DE VISTA LOCAL
- [ ] Simular log in de Operador Inglés, Chino y Español.
- [ ] Reportes (Kardex, Requisiciones impresas) se muestran en la fecha/hora esperada según su sede, previniendo eventos con 'T+24H'. 
