import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ARTIGOS_AJUDA } from '../helpcenter/helpcenter';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './faq.html',
  styleUrls: ['../helpcenter/helpcenter.css']
})
export class Faq {
  filtro = '';

  get artigosFiltrados() {
    const termo = this.filtro.trim().toLowerCase();
    if (!termo) return ARTIGOS_AJUDA;
    return ARTIGOS_AJUDA.filter(artigo =>
      artigo.pergunta.toLowerCase().includes(termo) ||
      artigo.resposta.toLowerCase().includes(termo)
    );
  }
}
