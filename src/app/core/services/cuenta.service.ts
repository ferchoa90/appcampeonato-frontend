import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConfigPublica, Configuracion, Dispositivo, Medio, Perfil, Preferencias } from '../models';
import { silentContext } from './api-utils';

/** Datos de la cuenta del usuario con sesión: perfil, intereses y dispositivos (`mi/…`). */
@Injectable({ providedIn: 'root' })
export class CuentaService {
  private readonly api = environment.apiUrl;
  private config$?: Observable<ConfigPublica>;

  constructor(private http: HttpClient) {}

  /** Configuración pública (Google, VAPID, límites). Se pide una vez por carga de página. */
  configPublica(refrescar = false): Observable<ConfigPublica> {
    if (!this.config$ || refrescar) {
      this.config$ = this.http.get<ConfigPublica>(this.api + 'publico/configuracion', { context: silentContext() }).pipe(shareReplay(1));
    }
    return this.config$;
  }

  perfil(): Observable<Perfil> { return this.http.get<Perfil>(this.api + 'mi/perfil'); }

  actualizarPerfil(datos: { first_name: string; last_name: string }): Observable<Perfil> {
    return this.http.patch<Perfil>(this.api + 'mi/perfil', datos, { context: silentContext() });
  }

  cambiarClave(actual: string, nueva: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(this.api + 'mi/cambiar-clave', { actual, nueva }, { context: silentContext() });
  }

  preferencias(): Observable<Preferencias> { return this.http.get<Preferencias>(this.api + 'mi/preferencias'); }

  guardarPreferencias(p: Pick<Preferencias, 'modo' | 'tipos' | 'campeonatos' | 'equipos'>): Observable<Preferencias> {
    return this.http.put<Preferencias>(this.api + 'mi/preferencias', p);
  }

  dispositivos(): Observable<Dispositivo[]> { return this.http.get<Dispositivo[]>(this.api + 'mi/dispositivos'); }

  registrarDispositivoWeb(suscripcion: unknown, nombre: string): Observable<Dispositivo> {
    return this.http.post<Dispositivo>(this.api + 'mi/dispositivos', { tipo: 'WEB', suscripcion, nombre });
  }

  quitarDispositivo(id: number): Observable<void> { return this.http.delete<void>(`${this.api}mi/dispositivos/${id}`); }

  probarNotificacion(): Observable<{ enviados: number; detail: string }> {
    return this.http.post<{ enviados: number; detail: string }>(this.api + 'mi/probar-notificacion', {});
  }
}

/** Fotos y videos de los partidos. */
@Injectable({ providedIn: 'root' })
export class MedioService {
  private readonly url = environment.apiUrl + 'medios/';

  constructor(private http: HttpClient) {}

  /** Sube un archivo informando el progreso; el error por archivo lo muestra el llamador (silencioso). */
  subir(partido: number, archivo: File, titulo = ''): Observable<HttpEvent<Medio>> {
    const fd = new FormData();
    fd.append('partido', String(partido));
    fd.append('archivo', archivo);
    if (titulo) { fd.append('titulo', titulo); }
    return this.http.post<Medio>(this.url, fd, { reportProgress: true, observe: 'events', context: silentContext() });
  }

  titulo(id: number, titulo: string): Observable<Medio> { return this.http.patch<Medio>(`${this.url}${id}/`, { titulo }); }

  eliminar(id: number): Observable<void> { return this.http.delete<void>(`${this.url}${id}/`); }
}

/** Configuración del sistema (sólo Administrador). */
@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly url = environment.apiUrl + 'configuracion';

  constructor(private http: HttpClient) {}

  obtener(): Observable<Configuracion> { return this.http.get<Configuracion>(this.url); }

  guardar(campos: Partial<Configuracion>): Observable<Configuracion> {
    return this.http.put<Configuracion>(this.url, campos, { context: silentContext() });
  }

  probarCorreo(destino: string): Observable<{ ok: boolean; detail: string }> {
    return this.http.post<{ ok: boolean; detail: string }>(`${this.url}/probar-correo`, { destino }, { context: silentContext() });
  }

  regenerarVapid(): Observable<{ vapid_publica: string; detail: string }> {
    return this.http.post<{ vapid_publica: string; detail: string }>(`${this.url}/regenerar-vapid`, {});
  }
}
