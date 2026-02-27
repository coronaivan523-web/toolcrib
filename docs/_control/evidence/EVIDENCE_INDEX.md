# EVIDENCE INDEX (REGISTRO FORENSE)

Registro de PRUEBAS fehacientes (Archivos extraídos, Logs de Crash, Outputs de Comandos) previas o posteriores a intervenciones críticas en Base de Datos.

## INSTRUCCIONES:
1. Al correr una prueba unitaria, un clone o un volcado, referenciar el archivo `.log`, `.txt` o el query resultante aquí.
   **REGLA ESPECIAL CLONACIÓN (V7.x):** Toda corrida de clonación DEBE registrar: versión del script, fecha, resultado, ruta de logs sanitizados y commit hash asociado.
2. Formato por Evidencia:
   - **ID Evidencia**: EVI-XXX
   - **Fecha**: YYYY-MM-DD
   - **Tópico/Tarea**: P0_DROP_FK, etc.
   - **Ruta de Evidencia**: (Dónde se ubica en filesystem, por defecto `./docs/_control/evidence/raw_...`)
   - **Veredicto / Concesión**: Pass / Fail-Closed / Warning

| ID EVI | Fecha | Tópico | Ruta / Output | Veredicto |
|---|---|---|---|---|
| EVI-001 | 2026-02-27 | Peritaje_Fase1 | `C:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib_peritaje_fase1.txt` | FAIL-CLOSED CLONE DETECTED |
| | | | | |
| | | | | |
| | | | | |
