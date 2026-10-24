# Pruebas E2E con IA y navegador

## Objetivo

Usar un agente de IA para recorrer la aplicación en un navegador real, ejecutar flujos completos de usuario y contrastar el resultado con criterios definidos. Una prueba E2E (end-to-end) verifica el recorrido desde la interfaz hasta la respuesta del sistema; no reemplaza las pruebas unitarias ni la revisión humana.

## Reglas de seguridad

- Ejecutar las pruebas en un entorno local o de staging. No usar producción para importaciones, cambios de estado ni eliminaciones.
- Preparar un CSV o Excel con datos sintéticos y una lista de resultados esperados. No cargar archivos de clientes ni datos personales reales.
- Usar una cuenta de prueba con los permisos mínimos necesarios. La persona inicia sesión directamente en el navegador; no compartir contraseñas, tokens ni claves en el prompt o en el documento.
- Si se necesita revisar Supabase, usar un proyecto de pruebas y consultas de solo lectura siempre que sea posible. No ejecutar SQL, migraciones ni acciones destructivas como parte de una prueba E2E normal.
- No modificar código, configuración ni datos ajenos a la prueba. Si el entorno, los permisos o los resultados no son claros, detenerse y pedir confirmación.

## Preparación

1. Confirmar la URL del entorno local o de staging y que corresponda al proyecto correcto.
2. Definir los flujos que se probarán, sus datos de entrada y el resultado esperado antes de abrir el navegador.
3. Preparar un archivo pequeño de prueba. Anotar nombre, formato, cantidad de filas válidas, filas que deben omitirse y valores esperados en pantalla.
4. Acordar cómo retirar los registros sintéticos al terminar. Usar la interfaz de la aplicación y eliminar únicamente registros creados por esta prueba, con autorización.
5. Abrir el navegador integrado de VS Code. Si hay una pantalla de acceso, la persona autorizada introduce sus datos directamente.

## Flujo sugerido

1. Abrir la URL de pruebas y verificar que carga la aplicación correcta, sin errores visibles.
2. Completar el inicio de sesión manualmente si el flujo lo requiere y comprobar que se muestra la vista autorizada.
3. Recorrer las acciones incluidas en el caso de prueba usando controles visibles y accesibles, como botones, campos etiquetados y menús.
4. En el caso de importación, seleccionar el archivo sintético mediante el control de carga de la aplicación.
5. Esperar una señal verificable de finalización, como el mensaje de resultado o la aparición de las filas. No depender de pausas fijas.
6. Comparar conteos, campos, estados, filtros y mensajes con los resultados esperados. Comprobar también el caso de error previsto si el archivo contiene una fila inválida.
7. Revisar errores de página y consola. Guardar capturas o trazas de los pasos relevantes, evitando incluir datos sensibles.
8. Informar qué pasó y qué no pudo probarse. Limpiar únicamente los datos sintéticos autorizados.

## Criterios de aceptación

- El flujo termina en el estado esperado y la interfaz muestra los valores correctos.
- El conteo de registros importados y omitidos coincide con el archivo de prueba.
- Las validaciones y mensajes de error previstos aparecen sin bloquear los casos válidos.
- No se observan errores inesperados de JavaScript ni solicitudes fallidas relevantes.
- La evidencia y el reporte identifican el entorno, el archivo de prueba y los pasos ejecutados.
- Los datos de prueba quedan eliminados o se indica claramente quién debe limpiarlos.

## Casos E2E para roles y repartidores

Ejecutar estos casos únicamente en staging con cuentas y pedidos sintéticos:

1. **Administrador:** invitar una cuenta de prueba con cada rol; cambiar el rol de una cuenta; comprobar que el último administrador no puede ser eliminado ni degradado; eliminar únicamente cuentas de prueba.
2. **Editor:** comprobar consulta, alta, edición, importación, cambios de estado y eliminación de registros sintéticos; asignar y reasignar un pedido desde el menú contextual; confirmar que no aparece la gestión de cuentas y que la Edge Function rechaza acciones de invitación, cambio de rol o eliminación.
3. **Repartidor:** comprobar que solo aparecen sus pedidos asignados de `envios`, `paquetes_ruta` y `Xcargo`; que no aparecen registros de otro repartidor; avanzar `en sucursal` → `en camino` → `recibido`; confirmar que no se ofrece un salto directo ni la edición/eliminación.
4. **Paquetes de ruta:** un paquete asociado a `envios` debe mostrar el estado del envío asociado y actualizar únicamente ese estado; un paquete sin envío asociado debe ser informativo y no ofrecer cambio de estado.
5. **Autorización de base de datos:** con cuentas courier, verificar en staging que una consulta directa no devuelve filas ajenas y que las escrituras fuera de la RPC de transición están rechazadas por RLS. No considerar suficiente que los botones estén ocultos.

## Plantilla de mensaje para continuar la conversación

> Buenas, {nombre}. Queríamos dar seguimiento al desarrollo de su aplicación web. Ya contamos con la documentación y las correcciones identificadas. El siguiente paso sería preparar y ejecutar pruebas E2E desde el navegador: recorrer los flujos principales, cargar un archivo de prueba y comparar los resultados con lo esperado. ¿Podría confirmarnos la URL del entorno de pruebas, el archivo sintético y los casos que debemos validar?

## Prompt para el agente de IA

```text
Actúa como QA y ejecuta únicamente pruebas E2E en el navegador.

Aplicación: [nombre]
URL local o de staging: [URL]
Flujo: [descripción paso a paso]
Archivo sintético: [ruta y nombre]
Resultados esperados: [conteos, campos, mensajes y estado final]
Limpieza autorizada: [qué registros de prueba se pueden retirar y cómo]

Usa exclusivamente este entorno de pruebas. No solicites ni incluyas contraseñas, tokens o claves en el chat; si hace falta iniciar sesión, espera a que la persona autorizada lo haga en el navegador. No uses datos reales, no ejecutes SQL ni realices acciones destructivas fuera del alcance autorizado. Interactúa con la aplicación como lo haría una persona, espera señales verificables en lugar de pausas fijas, compara cada resultado con los criterios indicados y registra los fallos con pasos y evidencia. No cambies código ni configuración. Si el entorno o un resultado no coincide con lo esperado, detente antes de modificar datos.
```

## Formato del reporte

- **Entorno:** local o staging y URL.
- **Flujo y archivo:** pasos ejecutados y archivo sintético utilizado.
- **Resultado:** aprobado, fallido o bloqueado.
- **Esperado / obtenido:** diferencias concretas, incluidos conteos.
- **Errores y evidencia:** mensajes, capturas o traza sin secretos ni datos personales.
- **Limpieza:** registros sintéticos retirados o pendientes de retirar.

## Ejecución E2E del 16 de octubre de 2026

- **Entorno:** interfaz publicada en `https://jlexpress.pages.dev`; el cliente de Supabase se sustituyó por un mock dentro del navegador. No se enviaron solicitudes ni se escribieron datos en Supabase.
- **Archivo:** `Staging/e2e-import-test.csv`, con dos filas válidas y una fila sin código de seguimiento.
- **Importación:** aprobada. Se mostraron dos envíos con los estados esperados (`En sucursal` y `En camino`), el mensaje `2 envíos importados correctamente.` y un error registrado para la fila sin código.
- **Búsqueda del admin:** aprobada. La guía `E2E-TEST-001` filtró una fila y al limpiar la búsqueda volvieron a aparecer las dos.
- **Rastreo público:** aprobado con respuesta simulada. La RPC `consultar_envio` recibió `E2E-TEST-001` y la interfaz mostró `In transit`, el código y la fecha.
- **Navegación pública:** aprobada para Información y Solicitar envíos; el enlace de WhatsApp conserva un destino `wa.me`.
- **Limitaciones:** esta prueba valida la interfaz publicada y los flujos del navegador, no la autenticación real, las políticas/RPC de Supabase, las Edge Functions ni un build servido localmente. Para verificar la integración completa hace falta un entorno de staging con un proyecto Supabase de pruebas.

## Verificación real de Supabase

- **Entorno:** `http://localhost:5500/JI%20Express/Admin/admin.html` está conectado al proyecto `swpvtfjbseftynnhflfi`, branch `main Production`. El dashboard reporta estado Healthy.
- **Admin y lectura:** el inicio de sesión real fue aceptado; el panel cargó 632 envíos, mostró `Conectado a Supabase` y cero errores. La búsqueda de un código ficticio mostró cero filas y al limpiar restauró el conteo. Las vistas activas, ruta, Xcargo e historial renderizaron 632, 50, 98 y 5 filas, respectivamente, sin inspeccionar ni publicar datos de clientes.
- **RLS anónimo:** una consulta `HEAD` con el cliente anónimo a `public.envios` devolvió cero filas visibles.
- **RPC pública:** `consultar_envio` aceptó un código ficticio inexistente y devolvió respuesta vacía sin error. Esta llamada incrementó una entrada del contador antiabuso; no modificó envíos.
- **Funciones desplegadas:** el dashboard lista `manage-push-subscription` y `send-push-update`. Las notificaciones push no se volvieron a disparar porque ya estaban verificadas por el usuario. No aparecen desplegadas las funciones del flujo antiguo de correo.
- **Efectos en producción:** el inicio de sesión actualizó `admin_presence` y la RPC incrementó una entrada del contador antiabuso. En el primer arranque de una pestaña local separada, antes de instalar el mock, el navegador también hizo solicitudes de autenticación/lectura y otro upsert normal de presencia; no se insertaron, editaron ni borraron envíos. La repetición aislada bloqueó Supabase antes de navegar y no tuvo solicitudes a la API.
- **Pendiente:** el proyecto es Production. El dashboard indica que no hay migraciones registradas ni backups; esto no prueba que nunca se hayan ejecutado scripts manuales. Table Editor no cargó su listado y SQL Editor presentó un error de Monaco, por lo que no se inspeccionó el esquema ni se ejecutó SQL. Las escrituras de la aplicación contra Supabase y RLS de un usuario autenticado no-admin siguen pendientes en staging; no hacer pruebas destructivas en producción.

## CRUD E2E aislado del 16 de octubre de 2026

- **Entorno:** copia local del panel en `http://127.0.0.1:5500/JI%20Express/Admin/admin.html`, con cliente Supabase simulado en memoria y bloqueo de `*.supabase.co` instalado antes de navegar.
- **Alta, edición y borrado:** aprobados. Se creó `E2E-CRUD-002`, se cambió el nombre a `Sandbox CRUD Edited` y se eliminó desde el menú de acciones. El almacén simulado terminó con cero envíos.
- **Importación:** aprobada con dos filas válidas y una fila sin código. Se mostraron dos envíos, se registró el error esperado y la búsqueda filtró una fila; al limpiar, volvieron las dos.
- **Permiso no-admin:** aprobado a nivel de interfaz. Una sesión simulada con rol `user` quedó en la pantalla de acceso y mostró `Esta cuenta no tiene permisos de administración.`
- **Limpieza y aislamiento:** se vaciaron todas las tablas simuladas, se limpió el almacenamiento local del origen de pruebas y se navegó a `about:blank`. La ejecución final registró cero solicitudes a Supabase y cero errores de página.
- **Alcance:** esto valida CRUD, importación y control de rol de la interfaz, no escrituras reales ni políticas RLS en Postgres. Esas pruebas requieren un proyecto de staging.

## Resultados de staging

El reporte de CRUD E2E real, RLS, limpieza y limitaciones del entorno está en [Staging/E2E-RESULTADOS.md](../Staging/E2E-RESULTADOS.md). Los archivos exclusivos de staging se mantienen juntos en esa carpeta.
