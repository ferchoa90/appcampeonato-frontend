import { Component, Input, OnChanges } from '@angular/core';
import { Router } from '@angular/router';
import { Preferencias } from '../core/models';
import { AuthService } from '../core/services/auth.service';
import { CuentaService } from '../core/services/cuenta.service';
import { ToastService } from '../core/services/toast.service';

/**
 * «Seguir / Dejar de seguir» un equipo o un campeonato (lo agrega a los intereses de notificación).
 * Sin sesión lleva a ingresar y vuelve a la misma página.
 */
@Component({
  selector: 'app-seguir-boton',
  template: `
    <button type="button" class="btn" [ngClass]="siguiendo ? 'btn-soft-secondary' : 'btn-primary'" (click)="alternar()" [disabled]="cargando">
      <span *ngIf="cargando" class="spinner-border spinner-border-sm me-1"></span>
      <i *ngIf="!cargando" [class]="siguiendo ? 'ri-notification-off-line me-1' : 'ri-notification-3-line me-1'"></i>{{ siguiendo ? 'Dejar de seguir' : 'Seguir' }}
    </button>`,
})
export class SeguirBotonComponent implements OnChanges {
  @Input() tipo: 'equipo' | 'campeonato' = 'equipo';
  @Input() id!: number;
  @Input() nombre = '';
  siguiendo = false;
  cargando = false;
  private prefs: Preferencias | null = null;

  constructor(private auth: AuthService, private cuenta: CuentaService, private router: Router, private toast: ToastService) {}

  private get lista(): number[] { return (this.tipo === 'equipo' ? this.prefs?.equipos : this.prefs?.campeonatos) ?? []; }

  ngOnChanges() {
    this.siguiendo = false;
    if (!this.auth.autenticado) { return; }
    this.cuenta.preferencias().subscribe({
      next: p => { this.prefs = p; this.siguiendo = this.lista.includes(this.id); },
      error: () => undefined,
    });
  }

  alternar() {
    if (!this.auth.autenticado) {
      this.router.navigate(['/cuenta/ingresar'], { queryParams: { volver: this.router.url } });
      return;
    }
    // las preferencias se vuelven a leer para no pisar cambios hechos desde otra pestaña
    this.cargando = true;
    this.cuenta.preferencias().subscribe({
      next: p => {
        const campo = this.tipo === 'equipo' ? 'equipos' : 'campeonatos';
        const actual = p[campo];
        const quitar = actual.includes(this.id);
        const nueva = quitar ? actual.filter(x => x !== this.id) : [...actual, this.id];
        // seguir algo activa los avisos «solo lo que yo seleccione»; si ya recibe todo, se conserva ese modo
        const modo = !quitar && p.modo === 'NADA' ? 'SELECCION' : p.modo;
        const tipos = modo !== 'NADA' && !p.tipos.length ? ['ESTADO', 'GOL', 'TARJETA', 'CAMBIO', 'INCIDENCIA'] as Preferencias['tipos'] : p.tipos;
        this.cuenta.guardarPreferencias({ ...p, modo, tipos, [campo]: nueva }).subscribe({
          next: g => {
            this.cargando = false;
            this.prefs = g;
            this.siguiendo = !quitar;
            this.toast.ok(quitar ? `Dejó de seguir ${this.nombre}.` : `Ahora sigue ${this.nombre}. Gestione sus avisos en Mi perfil.`);
          },
          error: () => (this.cargando = false),
        });
      },
      error: () => (this.cargando = false),
    });
  }
}
