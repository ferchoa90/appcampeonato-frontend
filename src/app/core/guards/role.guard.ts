import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { Rol } from '../models';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/** Exige alguno de los roles indicados en data.roles de la ruta. */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router, private toast: ToastService) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const roles = (route.data['roles'] ?? []) as Rol[];
    if (!roles.length || this.auth.tieneRol(...roles)) { return true; }
    this.toast.aviso('No tiene permisos para acceder a esa sección.');
    return this.router.parseUrl(this.auth.rutaInicio);
  }
}

/** Redirige /admin a la pantalla inicial que corresponde al rol. */
@Injectable({ providedIn: 'root' })
export class InicioGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): UrlTree { return this.router.parseUrl(this.auth.rutaInicio); }
}
