---
"dentpro-colombia": patch
---

Los adjuntos clínicos ahora se validan por su contenido real (magic bytes) además del tipo que declara el navegador: un archivo que no es un PDF, JPG, PNG o WEBP de verdad se rechaza con un 400 y un mensaje en español, tanto en la subida de archivos del historial clínico como en los adjuntos embebidos (dataUrl) de las citas. El panel del profesional muestra el motivo del rechazo (DOG-33).
