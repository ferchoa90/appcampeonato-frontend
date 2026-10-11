import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  texto: string;
  tipo: 'success' | 'danger' | 'warning' | 'info';
  ms: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this._toasts.asObservable();

  ok(texto: string) { this.mostrar({ texto, tipo: 'success', ms: 3500 }); }
  error(texto: string) { this.mostrar({ texto, tipo: 'danger', ms: 7000 }); }
  aviso(texto: string) { this.mostrar({ texto, tipo: 'warning', ms: 5000 }); }
  info(texto: string) { this.mostrar({ texto, tipo: 'info', ms: 4000 }); }

  quitar(t: Toast) { this._toasts.next(this._toasts.value.filter(x => x !== t)); }

  private mostrar(t: Toast) {
    // evita apilar mensajes idénticos
    if (this._toasts.value.some(x => x.texto === t.texto)) { return; }
    this._toasts.next([...this._toasts.value, t]);
  }
}
