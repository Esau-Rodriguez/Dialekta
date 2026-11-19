# Dialekta · Panel de administración para XAMPP

## Actualizar una instalación existente

Copia los archivos de la carpeta `dialekta` del ZIP sobre la carpeta del panel en `htdocs`, conservando tu `config.php`. El constructor utiliza la base existente. Si el navegador todavía muestra el diseño anterior, pulsa **Ctrl + F5**.

## Puesta en marcha en Windows

1. Descomprime el ZIP en una carpeta temporal. Copia únicamente la carpeta `dialekta` a `C:\xampp\htdocs\`. Debe existir `C:\xampp\htdocs\dialekta\index.html`.
2. Abre el panel de XAMPP e inicia **Apache** y **MySQL**.
3. Entra en http://localhost/phpmyadmin/ y abre **Importar**. Selecciona `dialekta-base-de-datos.sql`, que está junto a esta guía, y pulsa **Importar**. El script crea la base `dialekta`, sus tablas y el catálogo.
4. Abre http://localhost/dialekta/ en el navegador. Inicia sesión con **admin@dialekta.edu.mx** y **DialektaAdmin2026!**. Puedes cambiar la contraseña en **Equipo editorial**.

El panel usa PHP 8.2 con PDO MySQL, mbstring y fileinfo, incluidos en la instalación de XAMPP usada para las pruebas. La configuración inicial conecta a MariaDB en `127.0.0.1:3306`, con usuario `root` y contraseña vacía. Si tu instalación emplea otro puerto o credenciales, ajusta `dialekta/config.php`. Si cambiaste el puerto de Apache, inclúyelo en las direcciones del navegador.

## Recorrido de prueba

- **Gestión de Módulos** permite buscar, filtrar por nivel o estado y crear, editar o eliminar módulos. La instalación inicial incluye 12 módulos y 94 lecciones de ejemplo.
- En **Crear nuevo módulo**, escribe un título y elige el nivel. La vista de la ruta muestra las lecciones en su orden actual. Las flechas mueven una lección dentro del módulo.
- **Agregar lección** abre tres pasos. En **Lo esencial**, escribe el título y el nivel; la portada, el nombre en tutunakú y los objetivos son opcionales. En **Palabras**, captura cada palabra en tutunakú con su significado en español. Puedes adjuntar una grabación.
- En **Publicar** puedes probar la actividad como estudiante. Con cuatro pares de vocabulario distintos se habilitan la opción múltiple y la memoria de parejas. La actividad de armar frases utiliza las frases que agregues. Puedes guardar una lección incompleta como borrador y retomarla desde **Editar**.
- **Publicar lección** registra la lección dentro de su módulo. Para publicar el módulo, elige **Publicado** en **Opciones del módulo** y pulsa **Guardar módulo**. Los materiales del constructor anterior se pueden abrir en **Editar contenido avanzado**.
- Los archivos de imagen y sonido de hasta 2 MiB se guardan en MariaDB. Adjunta el archivo y guarda el módulo. Una copia de seguridad de la base incluye los medios.
- Para probar **¿Olvidó su contraseña?**, cierra sesión, escribe el correo de prueba y abre el enlace de la bandeja local. El enlace vence a los 20 minutos y admite un solo uso. La recuperación está diseñada para ejecutarse en `localhost` sin SMTP.
- **Equipo editorial** administra las cuentas que pueden editar el catálogo. Todas las cuentas de este panel tienen permisos de administración.

## Contenido recuperado y reconstruido

La carpeta `fuentes-del-chat` conserva los archivos HTML, CSS y JavaScript visibles en el hilo, los parches y un registro de cuáles pudieron aplicarse. La carpeta `dialekta` contiene el panel ejecutable reconstruido y adapta elementos visuales de la maqueta. El catálogo usa los títulos, niveles, descripciones y cantidades de lecciones recuperados del chat. Las consignas de las lecciones y las evaluaciones son ejemplos editables preparados para esta entrega. El PHP y el SQL se reconstruyeron porque la copia compartida describía su funcionamiento y sólo mostraba la ruta del ZIP anterior.

