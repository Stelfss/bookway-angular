import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SupabaseService } from '../../../core/supabase';
import { EstanteService } from '../../../core/services/estante.service';

interface Livro {
  id: number | string;
  titulo: string;
  autor?: string;
  capa?: string;
  descricao?: string;
  categoria?: string;
}

interface Comunidade {
  id: number | string;
  titulo: string;
  capa?: string;
  descricao?: string;
  membros: number;
}

interface AutorResumo {
  nome: string;
  obras: number;
}

type Filtro = 'todos' | 'comunidades' | 'livros' | 'mangas' | 'autores';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search.html',
  styleUrls: ['./search.css']
})
export class Search implements OnInit, OnDestroy {
  private supabaseService = inject(SupabaseService);
  private estanteService = inject(EstanteService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private querySub?: Subscription;

  termo = '';
  filtro: Filtro = 'todos';

  livros: Livro[] = [];
  comunidades: Comunidade[] = [];

  loading = false;
  erro = '';
  buscaExecutada = false;

  private cacheTermo: string | null = null;
  private contadorBuscas = 0;

  // --- Modais (mesmo padrão do home.ts) ---
  showBookModal = false;
  selectedBook: Livro | null = null;
  shelfFeedback = '';
  addingToShelf = false;

  showCommunityModal = false;
  selectedCommunity: Comunidade | null = null;
  isSubscribedToCommunity = false;

  ngOnInit(): void {
    this.querySub = this.route.queryParams.subscribe(params => {
      const q = params['q'] ?? params['query'] ?? '';
      this.termo = String(q);
      this.atualizarResultados();
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
  }

  // ---------- Helpers (iguais ao search.js original) ----------
  private semAcento(texto: string): string {
    return String(texto ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }

  ehManga(livro: Livro): boolean {
    return this.semAcento(livro.categoria ?? '').startsWith('mang');
  }

  get livrosFiltrados(): Livro[] {
    return this.livros.filter(l => !this.ehManga(l));
  }

  get mangas(): Livro[] {
    return this.livros.filter(l => this.ehManga(l));
  }

  get autores(): AutorResumo[] {
    const contagem = new Map<string, number>();
    this.livros.forEach(livro => {
      const nome = String(livro.autor ?? '').trim();
      if (nome) contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
    });
    return [...contagem].map(([nome, obras]) => ({ nome, obras }));
  }

  get totalResultados(): number {
    if (this.filtro === 'livros') return this.livrosFiltrados.length;
    if (this.filtro === 'mangas') return this.mangas.length;
    if (this.filtro === 'comunidades') return this.comunidades.length;
    if (this.filtro === 'autores') return this.autores.length;
    return this.livros.length + this.comunidades.length + this.autores.length;
  }

  mostrarSecao(secao: Filtro): boolean {
    return this.filtro === 'todos' || this.filtro === secao;
  }

  // ---------- Busca (igual ao buscarNoBanco do search.js) ----------
  private async buscarNoBanco(termo: string): Promise<{ livros: Livro[]; comunidades: Comunidade[] }> {
    const padrao = `%${termo}%`;
    const client = this.supabaseService.client;

    const [porTitulo, porAutor, comunidades] = await Promise.all([
      client.from('livros').select('*').ilike('titulo', padrao),
      client.from('livros').select('*').ilike('autor', padrao),
      client.from('comunidades').select('*').ilike('titulo', padrao)
    ]);

    [porTitulo, porAutor, comunidades].forEach(r => {
      if ((r as any).error) console.error('Erro na busca:', (r as any).error);
    });
    if ((porTitulo as any).error && (porAutor as any).error && (comunidades as any).error) {
      throw (porTitulo as any).error;
    }

    const livrosPorId = new Map<number | string, Livro>();
    [...((porTitulo as any).data ?? []), ...((porAutor as any).data ?? [])].forEach((livro: Livro) => {
      livrosPorId.set(livro.id, livro);
    });

    return {
      livros: [...livrosPorId.values()],
      comunidades: (comunidades as any).data ?? []
    };
  }

  async atualizarResultados(): Promise<void> {
    const termo = this.termo.trim();
    this.erro = '';

    if (this.cacheTermo !== termo) {
      const idBusca = ++this.contadorBuscas;
      this.loading = true;
      this.buscaExecutada = true;
      this.cdr.detectChanges();

      try {
        const dados = await this.buscarNoBanco(termo);
        if (idBusca !== this.contadorBuscas) return;
        this.livros = dados.livros;
        this.comunidades = dados.comunidades;
        this.cacheTermo = termo;
      } catch (e) {
        if (idBusca !== this.contadorBuscas) return;
        console.error('Erro na busca:', e);
        this.erro = 'Erro ao processar busca.';
        this.livros = [];
        this.comunidades = [];
      } finally {
        if (idBusca === this.contadorBuscas) {
          this.loading = false;
          this.cdr.detectChanges();
        }
      }
      return;
    }

    // Só trocou o filtro: redesenha sem ir ao banco (igual ao original)
    this.buscaExecutada = true;
    this.cdr.detectChanges();
  }

  onFiltroChange(): void {
    this.atualizarResultados();
  }

  buscarPorAutor(nome: string): void {
    this.termo = nome;
    this.filtro = 'todos';
    this.atualizarResultados();
  }

  // ---------- Scroll horizontal (igual ao home.ts) ----------
  scrollLeft(element: HTMLDivElement): void {
    element.scrollBy({ left: -380, behavior: 'smooth' });
  }

  scrollRight(element: HTMLDivElement): void {
    element.scrollBy({ left: 380, behavior: 'smooth' });
  }

  // ---------- Modais (mesmo padrão do home.ts) ----------
  openBookModal(livro: Livro): void {
    this.selectedBook = livro;
    this.showBookModal = true;
    this.shelfFeedback = '';
    document.body.style.overflow = 'hidden';
  }

  // Equivale ao irParaLeitura() do original: abre o leitor com id/título.
  lerLivro(): void {
    if (!this.selectedBook) return;
    const livro = this.selectedBook;
    this.closeAllModals();
    void this.router.navigate(['/ler'], {
      queryParams: { id: String(livro.id ?? ''), titulo: livro.titulo ?? '' }
    });
  }

  // Portado de estante.js: salva o livro do modal na tabela "estante".
  async adicionarNaEstante(): Promise<void> {
    if (!this.selectedBook || this.addingToShelf) return;

    this.addingToShelf = true;
    this.shelfFeedback = 'Salvando na estante...';

    const resultado = await this.estanteService.adicionar(
      this.selectedBook.titulo,
      this.selectedBook.autor ?? '',
      this.selectedBook.capa ?? ''
    );

    this.addingToShelf = false;
    this.shelfFeedback = resultado.mensagem;
    this.cdr.detectChanges();
  }

  async openCommunityModal(comm: Comunidade): Promise<void> {
    this.selectedCommunity = comm;
    this.showCommunityModal = true;
    document.body.style.overflow = 'hidden';
    await this.gerenciarEstadoInscricao(comm.id);
  }

  async gerenciarEstadoInscricao(idComunidade: number | string): Promise<void> {
    const { data: dadosComm } = await this.supabaseService.client
      .from('comunidades')
      .select('membros')
      .eq('id', idComunidade)
      .single();

    if (dadosComm && this.selectedCommunity) {
      this.selectedCommunity.membros = (dadosComm as any).membros;
    }

    const { data: { user } } = await this.supabaseService.client.auth.getUser();
    if (!user) return;

    const { data: inscricao } = await this.supabaseService.client
      .from('comunidade_membros')
      .select('*')
      .eq('comunidade_id', idComunidade)
      .eq('usuario_id', user.id)
      .maybeSingle();

    this.isSubscribedToCommunity = !!inscricao;
  }

  async toggleInscricaoComunidade(): Promise<void> {
    if (!this.selectedCommunity) return;

    if (this.isSubscribedToCommunity) {
      const { error } = await this.supabaseService.client.rpc('sair_comunidade', { p_comunidade_id: this.selectedCommunity.id });
      if (error) console.error('Erro ao sair:', error.message);
    } else {
      const { error } = await this.supabaseService.client.rpc('entrar_comunidade', { p_comunidade_id: this.selectedCommunity.id });
      if (error) console.error('Erro ao entrar:', error.message);
    }

    await this.gerenciarEstadoInscricao(this.selectedCommunity.id);
  }

  closeAllModals(): void {
    this.showBookModal = false;
    this.showCommunityModal = false;
    document.body.style.overflow = '';
  }
}
