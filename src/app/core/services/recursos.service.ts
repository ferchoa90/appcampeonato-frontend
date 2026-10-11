import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Equipo, EstadoPartido, Evento, Feriado, Jugador, Notificacion, Partido, Usuario } from '../models';
import { silentContext } from './api-utils';
import { CrudService } from './crud.service';

@Injectable({ providedIn: 'root' })
export class FeriadoService extends CrudService<Feriado> {
  constructor(http: HttpClient) { super(http, 'feriados'); }
}

@Injectable({ providedIn: 'root' })
export class EquipoService extends CrudService<Equipo> {
  constructor(http: HttpClient) { super(http, 'equipos'); }

  /** Elimina sin mostrar el aviso automático: el 409 (equipo con partidos) lo gestiona el llamador. */
  eliminarSinAviso(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}${id}/`, { context: silentContext() });
  }
}

@Injectable({ providedIn: 'root' })
export class JugadorService extends CrudService<Jugador> {
  constructor(http: HttpClient) { super(http, 'jugadores'); }
}

@Injectable({ providedIn: 'root' })
export class UsuarioService extends CrudService<Usuario> {
  constructor(http: HttpClient) { super(http, 'usuarios'); }

  /** Organizadores: para elegir el propietario de un campeonato o equipo (sólo lo usa el Administrador). */
  organizadores(): Observable<Usuario[]> {
    return this.todos().pipe(map(us => us.filter(u => u.roles.includes('Organizador'))));
  }

  /** Elimina sin el aviso automático: el 409 (usuario con campeonatos) lo gestiona el llamador. */
  eliminarSinAviso(id: number, rol?: string): Observable<void> {
    return this.http.delete<void>(`${this.url}${id}/`, { context: silentContext(), params: rol ? { rol } : {} });
  }

  /** Las cuentas de aficionados sólo son accesibles con `?rol=Aficionado` (por defecto el API no las incluye). */
  actualizarAficionado(id: number, datos: Partial<Usuario>): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.url}${id}/`, datos, { params: { rol: 'Aficionado' } });
  }
}

@Injectable({ providedIn: 'root' })
export class NotificacionService extends CrudService<Notificacion> {
  constructor(http: HttpClient) { super(http, 'notificaciones'); }
}

@Injectable({ providedIn: 'root' })
export class EventoService extends CrudService<Evento> {
  constructor(http: HttpClient) { super(http, 'eventos'); }
}

@Injectable({ providedIn: 'root' })
export class PartidoService extends CrudService<Partido> {
  constructor(http: HttpClient) { super(http, 'partidos'); }

  /** `silencioso`: para el refresco periódico, sin toasts de error. */
  enVivo(silencioso = false): Observable<Partido[]> {
    return this.http.get<Partido[]>(`${this.url}en-vivo/`, { context: silencioso ? silentContext() : undefined });
  }

  /** Detalle con `eventos[]`. */
  detalle(id: number, silencioso = false): Observable<Partido> {
    return this.http.get<Partido>(`${this.url}${id}/`, { context: silencioso ? silentContext() : undefined });
  }

  /** Para POSTERGADO el `motivo` es obligatorio y `fechaHora` (ISO) es la nueva fecha (omitida = por definir). */
  cambiarEstado(id: number, estado: EstadoPartido, opciones: { motivo?: string; fechaHora?: string } = {}): Observable<Partido> {
    return this.http.post<Partido>(`${this.url}${id}/cambiar-estado/`, {
      estado,
      ...(opciones.motivo ? { motivo: opciones.motivo } : {}),
      ...(opciones.fechaHora ? { fecha_hora: opciones.fechaHora } : {}),
    });
  }

  /** Reprograma un partido postergado: nueva fecha y vuelve a PENDIENTE. */
  reprogramar(id: number, fechaHoraIso: string): Observable<Partido> {
    return this.actualizar(id, { fecha_hora: fechaHoraIso, estado: 'PENDIENTE' });
  }
}
