import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstanteService, ItemEstante } from '../../../core/services/estante.service';

@Component({
  selector: 'app-bookshelf',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './bookshelf.html',
  styleUrl: './bookshelf.css'
})
export class Bookshelf implements OnInit {
  private readonly estanteService = inject(EstanteService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = true;
  erro = '';
  livros: ItemEstante[] = [];
  confirmandoRemocao: number | string | null = null;
  private confirmTimer?: ReturnType<typeof setTimeout>;
  feedback = '';

  async ngOnInit(): Promise<void> {
    await this.carregarEstante();
  }

  // Portado de listar-estante.js: busca os livros do usuário logado.
  async carregarEstante(): Promise<void> {
    this.loading = true;
    this.erro = '';
    this.feedback = '';

    try {
      console.debug('[estante] carregando livros do usuário...');
      this.livros = await this.estanteService.listar();
      console.debug(`[estante] ${this.livros.length} livro(s) na estante.`);
    } catch (error) {
      console.error('[estante] falha no carregamento:', error);
      this.erro = error instanceof Error
        ? `Não foi possível carregar sua estante: ${error.message}`
        : 'Não foi possível carregar sua estante. Tente novamente.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // Remoção com confirmação em dois cliques (mesmo padrão do chat).
  async clicarRemover(livro: ItemEstante): Promise<void> {
    if (this.confirmandoRemocao !== livro.id) {
      this.confirmandoRemocao = livro.id;
      if (this.confirmTimer) clearTimeout(this.confirmTimer);
      this.confirmTimer = setTimeout(() => {
        this.confirmandoRemocao = null;
      }, 4000);
      return;
    }

    if (this.confirmTimer) clearTimeout(this.confirmTimer);
    this.confirmandoRemocao = null;

    const ok = await this.estanteService.remover(livro.id);
    if (ok) {
      this.livros = this.livros.filter(item => item.id !== livro.id);
      this.feedback = `"${livro.titulo}" foi removido da sua estante.`;
    } else {
      this.feedback = 'Não foi possível remover o livro. Tente novamente.';
    }
  }
}
