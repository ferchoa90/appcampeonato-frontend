import { Injectable } from '@angular/core';

/** Modo claro/oscuro (atributo data-layout-mode de Velzon). */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly clave = 'campeonato_tema';
  modo: 'light' | 'dark' = 'light';

  constructor() {
    let guardado: string | null = null;
    try { guardado = localStorage.getItem(this.clave); } catch { /* sin almacenamiento */ }
    const oscuro = guardado ? guardado === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    this.aplicar(oscuro ? 'dark' : 'light');
  }

  alternar() { this.aplicar(this.modo === 'dark' ? 'light' : 'dark'); }

  private aplicar(m: 'light' | 'dark') {
    this.modo = m;
    document.documentElement.setAttribute('data-layout-mode', m);
    try { localStorage.setItem(this.clave, m); } catch { /* sin almacenamiento */ }
  }
}
