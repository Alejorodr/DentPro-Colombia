# Releases

DentPro usa [Changesets](https://changesets.dev/) para versionar la aplicación y mantener `CHANGELOG.md` sincronizado con los cambios aprobados.

## En cada PR

Agrega un changeset cuando el cambio deba generar una versión:

```bash
pnpm run changeset
```

Selecciona el paquete `dentpro-colombia` y el nivel correspondiente:

- `patch`: corrección de bug o ajuste interno.
- `minor`: mejora funcional compatible.
- `major`: cambio incompatible o migración mayor.

El comando crea un archivo Markdown en `.changeset/`. Ese archivo debe viajar dentro del mismo PR que implementa el cambio.

No hace falta changeset para documentación, tooling o cambios que no alteran la aplicación publicada.

## Paso a paso de un release

Requiere la aprobación explícita del dueño. El ticket del release en Linear junta el checklist "Para producción" de cada ticket que entra (ver `CLAUDE.md`).

### 1. Antes del PR

1. Correr knip sobre `develop` y abrir un ticket de saneamiento si hay hallazgos (DOG-61).
2. Verificación completa en `develop`: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` y `pnpm e2e:local`.
3. **Cargar en Vercel las variables nuevas antes del merge.** El deploy de producción arranca en cuanto se mergea; si una variable llega después, ese deploy corre sin ella (DOG-52: se guardaron datos sin cifrar porque las llaves se cargaron tarde).

### 2. PR `develop` → `main`

1. Título `Release vX.Y.Z`, sin el ID del ticket. En el cuerpo, `Refs DOG-123` (DOG-55).
2. Esperar CI en verde: lint, typecheck, unit, build, E2E smoke, CodeQL y gitleaks.
3. Mergear con **Create a merge commit**, nunca con squash (DOG-51). Con squash, `main` recibe un solo commit sin la historia de `develop`, y al traer `main` de vuelta reaparecen los changesets ya publicados.

### 3. PR de versión

GitHub Actions abre el PR `chore(release): version packages`, que actualiza `package.json` y `CHANGELOG.md`. Se mergea también con merge commit. El workflow crea la etiqueta `vX.Y.Z` y el GitHub Release cuando la versión de `package.json` todavía no tiene etiqueta.

### 4. Traer `main` a `develop`

```bash
git checkout develop
git pull --ff-only origin develop
git merge origin/main
git push origin develop
```

Como las historias se comparten, el merge solo trae el commit de versión.

### 5. Verificar producción

1. CI en verde en el push a `main`, y deploy de Vercel en `READY`.
2. **Prueba de humo con un navegador real**, no con curl. El firewall de Vercel responde `429` con `x-vercel-mitigated: challenge` a los clientes que no son navegador, así que curl o un monitor externo dan falsos negativos (DOG-58).
3. Revisar el checklist "Para producción" del ticket del release: migraciones, scripts, datos y pruebas por rol.
4. Cada fallo, desvío o alerta va como sub-ticket del release.
5. Con todo verificado, los tickets del release pasan de "En develop" a "Done", y después se cierra el release.

El workflow no publica paquetes en npm porque DentPro es una aplicación privada.

## Baseline inicial

La versión declarada actualmente es `1.1.0` y no existían tags históricos. Después de fusionar la activación de Changesets, crear una sola vez el tag base:

```bash
git tag v1.1.0
git push origin v1.1.0
```

Desde ese punto, los siguientes releases deben gestionarse mediante el PR automático de Changesets.
