# Dent Pro Colombia Web Platform

Este repositorio contiene el sitio web y la experiencia de web app para la clínica odontológica Dent Pro Colombia. Todo el trabajo activo se concentra ahora en la rama `main`, que unifica los cambios históricos del proyecto.

## Estructura del proyecto
- `index.html`: Landing page principal y punto de entrada de la aplicación web.
- `css/`: Hojas de estilo globales y componentes responsivos.
- `js/`: Funcionalidades interactivas, agenda inteligente y portal administrativo.
- `images/`: Activos gráficos, logotipo y recursos multimedia.
- `sw.js` y `manifest.webmanifest`: Archivos necesarios para las capacidades tipo PWA.

## Flujo de trabajo
1. Crear nuevas funcionalidades sobre la rama `main`.
2. Para experimentos temporales, crear ramas cortas basadas en `main` y fusionarlas mediante _merge_ o _rebase_ antes de su eliminación.
3. Confirmar que todas las ramas auxiliares se eliminen tras integrarse, manteniendo la historia consolidada en `main`.

## Desarrollo local
1. Instalar una extensión de servidor estático (por ejemplo, `live-server`) o ejecutar:
   ```bash
   python3 -m http.server 8000
   ```
2. Abrir `http://localhost:8000` en el navegador para revisar los cambios.
3. Probar la experiencia móvil usando las herramientas de desarrollador o un dispositivo físico.

## Despliegue
- Subir el contenido del repositorio a un servicio estático (GitHub Pages, Netlify, Vercel, etc.).
- Asegurarse de que los archivos `manifest.webmanifest` y `sw.js` estén disponibles en la raíz para conservar las capacidades PWA.

## Automatizaciones recomendadas
- Configurar _workflows_ de CI que validen el HTML, las hojas de estilo y el JavaScript.
- Agregar pruebas de accesibilidad y _linting_ para mantener la calidad del código.
- Programar recordatorios para renovar certificados y revisar los contenidos de marketing.
