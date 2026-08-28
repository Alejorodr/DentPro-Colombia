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

## Release automático

Después de fusionar cambios con changesets en `main`, GitHub Actions crea o actualiza el PR `chore(release): version packages`. Ese PR actualiza `package.json` y `CHANGELOG.md`. Al fusionarlo, la versión queda establecida en `main`, el workflow crea el tag `vX.Y.Z` y el GitHub Release, y Vercel despliega normalmente ese commit.

El workflow no publica paquetes en npm porque DentPro es una aplicación privada.

## Baseline inicial

La versión declarada actualmente es `1.1.0` y no existían tags históricos. Después de fusionar la activación de Changesets, crear una sola vez el tag base:

```bash
git tag v1.1.0
git push origin v1.1.0
```

Desde ese punto, los siguientes releases deben gestionarse mediante el PR automático de Changesets.
