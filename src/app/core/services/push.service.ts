import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CuentaService } from './cuenta.service';

export type EstadoPush = 'no_soportado' | 'bloqueado' | 'activado' | 'inactivo';

const SW_URL = '/sw-push.js';
const K_DISPOSITIVO = 'campeonato_push_dispositivo';

/** Convierte la clave pública VAPID (base64url) al formato que pide `pushManager.subscribe`. */
export function claveAUint8Array(base64url: string): Uint8Array {
  const relleno = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const bruto = atob(base64);
  return Uint8Array.from(bruto, c => c.charCodeAt(0));
}

/** Notificaciones del navegador (Web Push) con un service worker propio (`/sw-push.js`). */
@Injectable({ providedIn: 'root' })
export class PushService {
  constructor(private cuenta: CuentaService) {}

  soportado(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /** Web Push exige HTTPS (localhost cuenta como seguro). */
  contextoSeguro(): boolean { return window.isSecureContext; }

  permiso(): NotificationPermission | 'no_soportado' { return this.soportado() ? Notification.permission : 'no_soportado'; }

  async estado(): Promise<EstadoPush> {
    if (!this.soportado() || !this.contextoSeguro()) { return 'no_soportado'; }
    if (Notification.permission === 'denied') { return 'bloqueado'; }
    if (Notification.permission !== 'granted') { return 'inactivo'; }
    const sub = await this.suscripcionActual();
    return sub ? 'activado' : 'inactivo';
  }

  /** Endpoint de la suscripción de este navegador (para reconocer «este dispositivo» en la lista). */
  async endpointActual(): Promise<string | null> {
    return (await this.suscripcionActual())?.endpoint ?? null;
  }

  /** Pide permiso, registra el service worker, se suscribe y registra el dispositivo en el servidor. */
  async activar(): Promise<void> {
    if (!this.soportado()) { throw new Error('Este navegador no admite notificaciones.'); }
    if (!this.contextoSeguro()) { throw new Error('Las notificaciones del navegador requieren una conexión segura (HTTPS).'); }
    const config = await firstValueFrom(this.cuenta.configPublica(true));
    if (!config.vapid_publica) { throw new Error('El servidor aún no tiene claves para notificaciones web.'); }
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      throw new Error(permiso === 'denied'
        ? 'El navegador bloqueó las notificaciones para este sitio. Permítalas desde el candado de la barra de direcciones.'
        : 'No se concedió el permiso de notificaciones.');
    }
    const registro = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;
    let sub = await registro.pushManager.getSubscription();
    if (!sub) {
      sub = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: claveAUint8Array(config.vapid_publica),
      });
    }
    const dispositivo = await firstValueFrom(this.cuenta.registrarDispositivoWeb(sub.toJSON(), this.nombreNavegador()));
    try { localStorage.setItem(K_DISPOSITIVO, String(dispositivo.id)); } catch { /* sin almacenamiento */ }
  }

  /** Cancela la suscripción de este navegador y quita el dispositivo del servidor. */
  async desactivar(): Promise<void> {
    const sub = await this.suscripcionActual();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      const lista = await firstValueFrom(this.cuenta.dispositivos());
      const mio = lista.find(d => d.token === endpoint || d.suscripcion?.endpoint === endpoint);
      if (mio) { await firstValueFrom(this.cuenta.quitarDispositivo(mio.id)); }
    }
    try { localStorage.removeItem(K_DISPOSITIVO); } catch { /* sin almacenamiento */ }
  }

  probar() { return this.cuenta.probarNotificacion(); }

  private async suscripcionActual(): Promise<PushSubscription | null> {
    try {
      const registro = await navigator.serviceWorker.getRegistration(SW_URL);
      return registro ? await registro.pushManager.getSubscription() : null;
    } catch { return null; }
  }

  /** «Chrome en Windows», etc. a partir del user agent (sólo para identificar el dispositivo en la lista). */
  nombreNavegador(): string {
    const ua = navigator.userAgent;
    const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
      : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
    const so = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS'
      : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
    return so ? `${nav} en ${so}` : nav;
  }
}
