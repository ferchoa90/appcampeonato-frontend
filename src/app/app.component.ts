import { Component } from '@angular/core';
import { ThemeService } from './core/services/theme.service';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-toasts',
  template: `
    <ngb-toast *ngFor="let t of toast.toasts$ | async" class="text-white border-0 mb-2"
               [ngClass]="'bg-' + t.tipo" [autohide]="true" [delay]="t.ms" (hidden)="toast.quitar(t)">
      <div class="d-flex align-items-start">
        <div class="flex-grow-1">{{ t.texto }}</div>
        <button type="button" class="btn-close btn-close-white ms-2" (click)="toast.quitar(t)" aria-label="Cerrar"></button>
      </div>
    </ngb-toast>`,
  host: { class: 'toast-container position-fixed top-0 end-0 p-3', style: 'z-index:2000' },
})
export class ToastsComponent {
  constructor(public toast: ToastService) {}
}

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet><app-toasts></app-toasts>`,
})
export class AppComponent {
  // Instanciar el servicio aplica el tema guardado desde el arranque.
  constructor(_tema: ThemeService) {}
}
