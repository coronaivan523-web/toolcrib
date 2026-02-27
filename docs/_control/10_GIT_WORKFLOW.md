# 10 GIT WORKFLOW (POLÍTICA CORPORATIVA)

Reglas estrictas de control de versiones para proteger la base de código.

## 1. PRINCIPIO "MAIN ES SAGRADO"
- **Regla Cero:** NUNCA se realiza un push directo a `main`. Todo el trabajo ocurre en ramas (branches).
- **Merge a Main:** Un Pull Request (PR) hacia `main` SOLO será aceptado cuando cumpla todos los *Release Gates* y cuando la **Fase P0 (Identity Decouple) esté 100% pasando el Audit**.

## 2. ESTRATEGIA DE RAMAS
- Ramas de Características: `feature/<nombre-descriptivo>` (Ej. `feature/tenant-isolation`).
- Ramas de Corrección: `fix/<nombre-descriptivo>`.
- Ramas de Hardening: `hardening/<nombre-fase>`.

## 3. CONVENCIÓN DE COMMITS
Todos los commits deben ser descriptivos e incluir contexto. Preferiblemente formato Conventional Commits:
- `feat(auth): decouple profiles from auth.users`
- `fix(cloning): add proper --clean flags without dropping public schema`
- `docs(control): setup audit playbook`
- `chore: update dependencies`

## 4. LA REGLA DE LA EVIDENCIA OBLIGATORIA
CADA ejecución importante de scripts destructivos o de despliegues (ej. Clonar Supabase Prod a Staging) **DEBE** ir acompañada por un commit que suba la evidencia generada a `docs/_control/evidence/`.
- **Flujo:** Correr script local -> Generar log de output -> Guardar en `evidence/EVIDENCE_XYZ.log` -> Git Add evidencia -> Git Commit "chore: add evidence for clone V7.3".
- **FAIL-CLOSED:** Si no hay evidencia en Git, la ejecución se considera insegura y el cambio se asume defectuoso.
