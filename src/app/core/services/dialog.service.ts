import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class DialogService {
  /** Confirmación genérica. Devuelve true si el usuario acepta. */
  async confirmar(titulo: string, texto = '', textoBoton = 'Sí, continuar', peligro = false): Promise<boolean> {
    const r = await Swal.fire({
      title: titulo,
      text: texto,
      icon: peligro ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: textoBoton,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: peligro ? '#f06548' : '#1d7a3b',
      reverseButtons: true,
    });
    return r.isConfirmed;
  }

  /** Confirmación con contenido HTML (el llamador debe escapar lo que venga del usuario). */
  async confirmarHtml(titulo: string, html: string, textoBoton = 'Sí, continuar'): Promise<boolean> {
    const r = await Swal.fire({
      title: titulo, html, icon: 'question', width: 560,
      showCancelButton: true, confirmButtonText: textoBoton, cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1d7a3b', reverseButtons: true,
    });
    return r.isConfirmed;
  }

  /** Aviso informativo con contenido HTML y un solo botón. */
  async avisoHtml(titulo: string, html: string): Promise<void> {
    await Swal.fire({ title: titulo, html, icon: 'info', width: 560, confirmButtonColor: '#1d7a3b', confirmButtonText: 'Entendido' });
  }

  /** Pregunta con varias opciones como tarjetas seleccionables; devuelve el valor elegido o undefined si cancela. */
  async elegirOpcion<T extends string>(
    titulo: string, texto: string, opciones: { valor: T; texto: string; descripcion?: string; icono?: string }[],
    inicial?: T, textoBoton = 'Continuar',
  ): Promise<T | undefined> {
    const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
    const elegido = inicial ?? opciones[0]?.valor;
    const tarjetas = opciones.map(o => `
      <label class="opcion-tarjeta">
        <input type="radio" name="opcion-dialogo" value="${esc(o.valor)}" ${o.valor === elegido ? 'checked' : ''}>
        ${o.icono ? `<i class="${esc(o.icono)} opcion-icono"></i>` : ''}
        <span class="opcion-cuerpo">
          <span class="opcion-titulo">${esc(o.texto)}</span>
          ${o.descripcion ? `<span class="opcion-desc">${esc(o.descripcion)}</span>` : ''}
        </span>
        <span class="opcion-marca"></span>
      </label>`).join('');
    const r = await Swal.fire({
      title: titulo,
      html: `<p class="opcion-intro">${texto}</p><div class="opciones-dialogo">${tarjetas}</div>`,
      showCancelButton: true,
      confirmButtonText: textoBoton,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1d7a3b',
      reverseButtons: true,
      width: 520,
      preConfirm: () => {
        const sel = Swal.getPopup()?.querySelector<HTMLInputElement>('input[name="opcion-dialogo"]:checked');
        if (!sel) { Swal.showValidationMessage('Seleccione una opción'); return false; }
        return sel.value;
      },
    });
    return r.isConfirmed ? (r.value as T) : undefined;
  }

  /** Pregunta con dos opciones; devuelve el valor elegido o undefined si cancela. */
  async elegir<T extends string>(
    titulo: string, texto: string, a: { valor: T; texto: string }, b: { valor: T; texto: string },
  ): Promise<T | undefined> {
    const r = await Swal.fire({
      title: titulo,
      html: texto,
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: a.texto,
      denyButtonText: b.texto,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1d7a3b',
      denyButtonColor: '#299cdb',
    });
    if (r.isConfirmed) { return a.valor; }
    if (r.isDenied) { return b.valor; }
    return undefined;
  }
}
