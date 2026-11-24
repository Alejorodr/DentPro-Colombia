---
"dentpro-colombia": patch
---

Rendimiento percibido del portal (DOG-12): skeletons accesibles en lugar de textos "Cargando…" y `loading.tsx` para todo el portal; debounce en el buscador de la agenda de recepción y cancelación de búsquedas viejas en los buscadores globales; consultas independientes en paralelo en la ficha del paciente y la impresión de episodios; actualización optimista (con reversión) al cambiar el estado de una cita y al leer o borrar notificaciones; el dashboard del profesional ya no recarga la agenda al elegir otra cita ni autoguarda notas sin cambios. `fetchWithTimeout` conserva su timeout cuando se le pasa un `signal`.
