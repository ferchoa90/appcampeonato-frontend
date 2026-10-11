import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, Rol, Usuario } from '../models';
import { silentContext } from './api-utils';

const K_ACCESS = 'campeonato_access';
const K_REFRESH = 'campeonato_refresh';
const K_USER = 'campeonato_usuario';

/** Sólo se aceptan rutas internas como destino de «volver» (evita redirecciones a otros sitios). */
export function rutaInternaSegura(ruta: string | null | undefined): string | null {
  return ruta && ruta.startsWith('/') && !ruta.startsWith('//') && !ruta.startsWith('/\\') ? ruta : null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = environment.apiUrl + 'auth/';
  private readonly _usuario = new BehaviorSubject<Usuario | null>(this.leerUsuario());
  readonly usuario$ = this._usuario.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  get usuario(): Usuario | null { return this._usuario.value; }
  get access(): string | null { return localStorage.getItem(K_ACCESS); }
  get refresh(): string | null { return localStorage.getItem(K_REFRESH); }
  get autenticado(): boolean { return !!this.access && !!this.usuario; }

  /** Guarda tokens y usuario de una respuesta de login (correo/contraseña o Google). */
  guardarSesion(r: LoginResponse): void {
    localStorage.setItem(K_ACCESS, r.access);
    localStorage.setItem(K_REFRESH, r.refresh);
    localStorage.setItem(K_USER, JSON.stringify(r.usuario));
    this._usuario.next(r.usuario);
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.base + 'login', { username, password }, { context: silentContext() }).pipe(
      tap(r => this.guardarSesion(r)),
    );
  }

  /** Inicio de sesión con Google Identity Services (ID token). */
  google(credential: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.base + 'google', { credential }, { context: silentContext() }).pipe(
      tap(r => this.guardarSesion(r)),
    );
  }

  refrescar(): Observable<{ access: string }> {
    return this.http.post<{ access: string }>(this.base + 'token/refresh', { refresh: this.refresh }, { context: silentContext() }).pipe(
      tap(r => localStorage.setItem(K_ACCESS, r.access)),
    );
  }

  /** Cierra la sesión: el personal vuelve al login del panel y el aficionado al portal. */
  logout(redirigir = true) {
    const personal = this.esPersonal;
    [K_ACCESS, K_REFRESH, K_USER].forEach(k => localStorage.removeItem(k));
    this._usuario.next(null);
    if (redirigir) { this.router.navigateByUrl(personal ? '/auth/login' : '/'); }
  }

  tieneRol(...roles: Rol[]): boolean {
    const mios = this.usuario?.roles ?? [];
    return roles.some(r => mios.includes(r));
  }

  get esAdmin(): boolean { return this.tieneRol('Administrador'); }
  get esOrganizador(): boolean { return this.tieneRol('Organizador'); }
  get esOperador(): boolean { return this.tieneRol('Operador'); }
  /** Personal del panel (puede entrar a /admin). */
  get esPersonal(): boolean { return this.tieneRol('Administrador', 'Organizador', 'Operador'); }
  /** Cuenta de aficionado sin acceso al panel. */
  get esAficionado(): boolean { return this.tieneRol('Aficionado') && !this.esPersonal; }

  /** Ruta inicial según el rol: el aficionado a su perfil, el operador directo a los partidos. */
  get rutaInicio(): string {
    if (!this.esPersonal) { return '/perfil'; }
    return this.esAdmin || this.esOrganizador ? '/admin/dashboard' : '/admin/partidos';
  }

  /** Auto-registro de un organizador: la cuenta queda pendiente hasta que un administrador la apruebe. */
  registrar(datos: { username: string; password: string; email: string; first_name: string; last_name?: string }):
    Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(this.base + 'registro', datos, { context: silentContext() });
  }

  // ---- Cuentas de aficionados (todas gestionan sus errores en el componente)

  registrarAficionado(datos: { email: string; password: string; first_name: string; last_name?: string }):
    Observable<{ detail: string; requiere_verificacion: boolean }> {
    return this.http.post<{ detail: string; requiere_verificacion: boolean }>(this.base + 'registro-aficionado', datos, { context: silentContext() });
  }

  verificarCorreo(token: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(this.base + 'verificar-correo', { token }, { context: silentContext() });
  }

  reenviarVerificacion(email: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(this.base + 'reenviar-verificacion', { email }, { context: silentContext() });
  }

  olvideClave(email: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(this.base + 'olvide-clave', { email }, { context: silentContext() });
  }

  restablecerClave(uid: string, token: string, password: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(this.base + 'restablecer-clave', { uid, token, password }, { context: silentContext() });
  }

  private leerUsuario(): Usuario | null {
    try { return JSON.parse(localStorage.getItem(K_USER) ?? 'null'); } catch { return null; }
  }
}
