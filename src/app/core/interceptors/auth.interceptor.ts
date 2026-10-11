import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SILENT, mensajeError } from '../services/api-utils';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/** Endpoints de autenticación que van siempre sin Bearer (un token vencido haría fallar un login o registro). */
const AUTH_SIN_TOKEN = /auth\/(login|token\/refresh|registro|registro-aficionado|verificar-correo|reenviar-verificacion|google|olvide-clave|restablecer-clave)$/;
/** Zonas de la aplicación donde la sesión se envía aunque se consulten datos públicos. */
const RUTAS_CON_SESION = ['/admin', '/perfil', '/cuenta'];

/** Añade el Bearer, refresca el token ante un 401 y muestra un toast con los errores. */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private refrescando = false;
  private nuevoToken$ = new BehaviorSubject<string | null>(null);

  constructor(private auth: AuthService, private toast: ToastService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!req.url.startsWith(environment.apiUrl)) { return next.handle(req); }
    const esAuth = AUTH_SIN_TOKEN.test(req.url);

    return next.handle(esAuth ? req : this.conToken(req)).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 && !esAuth && this.auth.refresh && this.llevaToken(req)) {
          return this.reintentar(req, next);
        }
        this.notificar(req, err);
        return throwError(() => err);
      }),
    );
  }

  /**
   * El portal público se consulta como visitante (un usuario con sesión ve lo mismo que el público). El token se envía
   * sólo en el panel (/admin), en /perfil y /cuenta, y en los endpoints personales (`mi/…`, `auth/me`).
   */
  private llevaToken(req: HttpRequest<unknown>): boolean {
    const url = req.url;
    if (url.includes('publico/')) { return false; }
    if (url.includes('/mi/') || url.endsWith('auth/me')) { return true; }
    const ruta = window.location.pathname;
    return RUTAS_CON_SESION.some(p => ruta === p || ruta.startsWith(p + '/'));
  }

  private conToken(req: HttpRequest<unknown>, token = this.auth.access) {
    return token && this.llevaToken(req) ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  }

  private reintentar(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.refrescando) {
      this.refrescando = true;
      this.nuevoToken$.next(null);
      return this.auth.refrescar().pipe(
        switchMap(r => {
          this.refrescando = false;
          this.nuevoToken$.next(r.access);
          return next.handle(this.conToken(req, r.access));
        }),
        catchError(e => {
          this.refrescando = false;
          this.auth.logout();
          this.toast.aviso('Su sesión expiró. Inicie sesión nuevamente.');
          return throwError(() => e);
        }),
      );
    }
    return this.nuevoToken$.pipe(
      filter((t): t is string => t !== null),
      take(1),
      switchMap(t => next.handle(this.conToken(req, t))),
    );
  }

  private notificar(req: HttpRequest<unknown>, err: HttpErrorResponse) {
    if (req.context.get(SILENT) || err.status === 401) { return; }
    this.toast.error(mensajeError(err));
  }
}
