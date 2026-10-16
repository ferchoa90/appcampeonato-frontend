import { Component } from '@angular/core';

/** Correo de contacto para consultas sobre datos personales. */
const CONTACTO = 'goalscore@acepsistemas.com';
const ACTUALIZADO = '16 de octubre de 2026';

/** Política de privacidad pública (la pide Google Play y la ley de protección de datos). */
@Component({
  selector: 'app-privacidad',
  template: `
    <div class="pub-contenedor legal">
      <h1 class="h3 mb-1">Política de privacidad</h1>
      <p class="text-muted">GoalScore · AcepSistemas · Última actualización: ${ACTUALIZADO}</p>

      <p>Esta política explica qué datos personales trata <strong>GoalScore</strong> (el sitio web
        <em>goalscore.acepsistemas.com</em> y la aplicación móvil del mismo nombre), para qué los usa y qué derechos tiene usted.
        El responsable del tratamiento es <strong>AcepSistemas</strong>. Contacto: <a href="mailto:${CONTACTO}">${CONTACTO}</a>.</p>

      <h2 class="h5 mt-4">1. Qué datos recopilamos</h2>
      <ul>
        <li><strong>Consultar campeonatos, tablas y resultados no requiere cuenta</strong> y no pedimos ningún dato personal para hacerlo.</li>
        <li><strong>Cuenta de aficionado (opcional):</strong> nombre, apellido, correo electrónico y contraseña. La contraseña se guarda
          cifrada (no podemos verla). Si ingresa con Google, recibimos de Google su nombre y su correo.</li>
        <li><strong>Intereses de notificación:</strong> los campeonatos o equipos que desea seguir y los tipos de aviso que quiere recibir.</li>
        <li><strong>Datos del dispositivo para avisos:</strong> el identificador de notificaciones de su teléfono (token de Firebase Cloud
          Messaging) o la suscripción de su navegador, para poder enviarle los avisos que eligió.</li>
        <li><strong>Personal de organización (administradores, organizadores y operadores):</strong> usuario, nombre, correo y la información
          que cargan: equipos, jugadores (nombre, número, posición, fecha de nacimiento, nacionalidad, foto), resultados, fotos y videos de los partidos.</li>
        <li><strong>Datos técnicos:</strong> dirección IP y registros del servidor, que usamos únicamente para la seguridad y para limitar
          intentos abusivos.</li>
      </ul>
      <p>No recopilamos su ubicación, sus contactos ni sus mensajes. La aplicación solo usa la cámara o la galería si una persona del personal
        decide subir una foto o un video a un partido.</p>

      <h2 class="h5 mt-4">2. Para qué usamos los datos</h2>
      <ul>
        <li>Crear y mantener su cuenta, y confirmar su correo.</li>
        <li>Enviarle los avisos de partidos (inicio, goles, tarjetas, resultados) que usted eligió, y los correos de confirmación y de
          recuperación de contraseña.</li>
        <li>Mostrar al público los campeonatos publicados (equipos, jugadores, resultados, fotos y videos), por decisión de sus organizadores.</li>
        <li>Proteger el servicio contra usos indebidos.</li>
      </ul>
      <p>No vendemos sus datos ni los usamos para publicidad ni para elaborar perfiles.</p>

      <h2 class="h5 mt-4">3. Con quién los compartimos</h2>
      <ul>
        <li><strong>Google</strong>, solo si usted usa «Ingresar con Google» y para entregar notificaciones en el teléfono (Firebase Cloud Messaging).</li>
        <li>Nuestro proveedor de alojamiento y de correo, que procesa los datos por encargo nuestro y no puede usarlos para otros fines.</li>
        <li>Autoridades, cuando la ley lo exija.</li>
      </ul>

      <h2 class="h5 mt-4">4. Cuánto tiempo los conservamos</h2>
      <p>Mientras su cuenta esté activa. Si la elimina, borramos su cuenta, sus intereses y sus dispositivos de inmediato; las copias de seguridad
        se descartan automáticamente en un máximo de 14 días. Los datos deportivos de los campeonatos (resultados y estadísticas) los conservan
        sus organizadores como historial del torneo.</p>

      <h2 class="h5 mt-4">5. Seguridad</h2>
      <p>Toda la comunicación viaja cifrada (HTTPS), las contraseñas se guardan cifradas y el acceso al panel está limitado por roles.
        Ningún sistema es infalible; si detectáramos un incidente que le afecte, se lo comunicaremos.</p>

      <h2 class="h5 mt-4">6. Sus derechos</h2>
      <p>Usted puede acceder a sus datos, corregirlos, oponerse a su uso, pedir que los eliminemos y retirar su consentimiento en cualquier momento.</p>
      <ul>
        <li>Puede corregir sus datos y gestionar sus avisos desde <a routerLink="/perfil">Mi perfil</a>.</li>
        <li>Puede <strong>eliminar su cuenta</strong> usted mismo: <a routerLink="/eliminar-cuenta">cómo eliminar mi cuenta</a>.</li>
        <li>Para cualquier otra solicitud escriba a <a href="mailto:${CONTACTO}">${CONTACTO}</a>; respondemos en un máximo de 15 días.</li>
      </ul>

      <h2 class="h5 mt-4">7. Niñas, niños y adolescentes</h2>
      <p>La creación de cuentas no está dirigida a menores de 13 años. Los organizadores que registren jugadores menores de edad son responsables
        de contar con la autorización de sus representantes legales.</p>

      <h2 class="h5 mt-4">8. Cambios en esta política</h2>
      <p>Si la modificamos, publicaremos la nueva versión en esta página con su fecha de actualización.</p>
    </div>`,
  styles: [`.legal { max-width: 820px; padding-top: 1.5rem; padding-bottom: 3rem; line-height: 1.6; } .legal li { margin-bottom: .35rem; }`],
})
export class PrivacidadComponent {}

/** Cómo eliminar la cuenta (URL que Google Play pide para la eliminación de cuentas y datos). */
@Component({
  selector: 'app-eliminar-cuenta-info',
  template: `
    <div class="pub-contenedor legal">
      <h1 class="h3 mb-1">Eliminar mi cuenta de GoalScore</h1>
      <p class="text-muted">GoalScore · AcepSistemas</p>
      <p>Usted puede eliminar su cuenta y sus datos en cualquier momento. Hay tres formas:</p>

      <h2 class="h5 mt-4">Desde la aplicación móvil</h2>
      <ol>
        <li>Abra <strong>Ajustes</strong> e ingrese con su cuenta.</li>
        <li>Pulse <strong>Eliminar mi cuenta</strong> y confirme con su contraseña.</li>
      </ol>

      <h2 class="h5 mt-4">Desde el sitio web</h2>
      <ol>
        <li><a routerLink="/cuenta/ingresar">Ingrese</a> con su cuenta y abra <a routerLink="/perfil">Mi perfil</a>.</li>
        <li>En <strong>Mis datos</strong>, al final, pulse <strong>Eliminar mi cuenta</strong> y confirme.</li>
      </ol>

      <h2 class="h5 mt-4">Escribiéndonos</h2>
      <p>Si no puede ingresar, escriba a <a href="mailto:${CONTACTO}">${CONTACTO}</a> desde el correo con el que se registró,
        con el asunto «Eliminar mi cuenta». La eliminaremos en un máximo de 15 días y se lo confirmaremos por correo.</p>

      <h2 class="h5 mt-4">Qué se elimina</h2>
      <ul>
        <li>Su cuenta, nombre, correo y contraseña.</li>
        <li>Sus intereses de notificación y los dispositivos registrados para recibir avisos.</li>
        <li>Las copias de seguridad que contengan esos datos se descartan en un máximo de 14 días.</li>
      </ul>
      <p>Las cuentas del personal (administradores, organizadores y operadores) las elimina el administrador: escríbanos al mismo correo.</p>
      <p>Más información en la <a routerLink="/privacidad">política de privacidad</a>.</p>
    </div>`,
  styles: [`.legal { max-width: 820px; padding-top: 1.5rem; padding-bottom: 3rem; line-height: 1.6; } .legal li { margin-bottom: .35rem; }`],
})
export class EliminarCuentaInfoComponent {}
