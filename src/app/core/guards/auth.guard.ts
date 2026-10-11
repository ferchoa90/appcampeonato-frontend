import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Protege el panel: exige sesión de personal; un aficionado se redirige a su perfil. */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (!this.auth.autenticado) { return this.router.createUrlTree(['/auth/login']); }
    return this.auth.esPersonal || this.router.createUrlTree(['/perfil']);
  }

  canActivateChild() { return this.canActivate(); }
}

/** Protege /perfil: cualquier usuario con sesión; sin ella se lleva a ingresar y se vuelve aquí después. */
@Injectable({ providedIn: 'root' })
export class SesionGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(_: unknown, estado: RouterStateSnapshot): boolean | UrlTree {
    return this.auth.autenticado || this.router.createUrlTree(['/cuenta/ingresar'], { queryParams: { volver: estado.url } });
  }
}
