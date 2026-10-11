import { Component, NgModule, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Notificacion, etiquetaTipoNotificacion } from '../../core/models';
import { NotificacionService } from '../../core/services/recursos.service';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-notificaciones',
  template: `
    <app-page-title titulo="Notificaciones enviadas"></app-page-title>
    <div class="card">
      <div class="card-body">
        <p class="text-muted">Bandeja de las notificaciones push generadas al cambiar el estado de los partidos.</p>
        <app-estado-lista [cargando]="cargando" [vacio]="!cargando && !lista.length" mensaje="Aún no se han enviado notificaciones."></app-estado-lista>
        <div class="table-responsive" *ngIf="lista.length">
          <table class="table table-hover align-middle admin-tabla mb-0">
            <thead class="table-light"><tr><th>Fecha</th><th>Tipo</th><th>Título</th><th>Mensaje</th><th class="text-center">Destinatarios</th><th>Envío</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let n of lista">
                <td class="text-nowrap">{{ n.creada | date:'dd/MM/yyyy HH:mm' }}</td>
                <td><span class="badge badge-soft-info">{{ tipo(n.tipo) }}</span></td>
                <td class="fw-medium">{{ n.titulo }}</td>
                <td>{{ n.cuerpo }}</td>
                <td class="text-center" title="Dispositivos de aficionados notificados">{{ n.destinatarios ?? 0 }}</td>
                <td>
                  <span class="badge" [ngClass]="n.enviada ? 'badge-soft-success' : 'badge-soft-warning'" [title]="n.error">{{ n.enviada ? 'Enviada' : 'No enviada' }}</span>
                </td>
                <td class="text-end"><a *ngIf="n.partido" [routerLink]="['/admin/partidos', n.partido]" class="btn btn-sm btn-soft-primary">Ver partido</a></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="card-footer" *ngIf="total > 50">
        <ngb-pagination [collectionSize]="total" [pageSize]="50" [(page)]="pagina" (pageChange)="cargar()" class="d-flex justify-content-end"></ngb-pagination>
      </div>
    </div>`,
})
export class NotificacionesComponent implements OnInit {
  lista: Notificacion[] = [];
  pagina = 1;
  total = 0;
  cargando = true;

  tipo = etiquetaTipoNotificacion;

  constructor(private api: NotificacionService) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando = true;
    this.api.listar({ page: this.pagina }).subscribe({
      next: r => { this.lista = r.results; this.total = r.count; this.cargando = false; },
      error: () => (this.cargando = false),
    });
  }
}

@NgModule({
  declarations: [NotificacionesComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: NotificacionesComponent }])],
})
export class NotificacionesModule {}
