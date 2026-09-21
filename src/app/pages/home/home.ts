import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { SupabaseService } from '../../core/supabase';
import { StreakService } from '../../core/streak';

interface Livro {
  id?: number;
  titulo: string;
  autor: string;
  capa: string;
  descricao: string;
  categoria?: string;
}

interface Comunidade {
  id: number;
  titulo: string;
  capa: string;
  descricao: string;
  membros: number;
}

interface HeroSlide {
  img: string;
  badge: string;
  titulo: string;
  texto: string;
}

// Equivalente a home.html + Site/JS/home.js.
// Ainda NÃO portado aqui (fica pro próximo passo, é o resto do base.js):
// comentários/curtidas dentro do modal de livro, comentários +
// inscrever-se/sair dentro do modal de comunidade. Por enquanto os dois
// modais abrem e mostram os dados corretamente, só a parte social ainda
// não está ligada.
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, AfterViewInit, OnDestroy {
  // ---- Hero carousel (era o bloco 3 do home.js) ----
  heroSlides: HeroSlide[] = [
    {
      img: '/imagens/LendoLivro.webp',
      badge: 'DESCUBRA',
      titulo: 'Milhares de histórias em um só lugar',
      texto:
        'Explore um catálogo repleto de livros para todos os gostos. Encontre novos autores, acompanhe suas leituras e mergulhe em histórias inesquecíveis. Experimente 30 dias grátis.',
    },
    {
      img: '/imagens/Biblioteca1.webp',
      badge: 'LEIA',
      titulo: 'Sua próxima grande leitura começa aqui',
      texto:
        'Dos clássicos aos lançamentos, encontre livros que combinam com você. Organize suas leituras e descubra novas aventuras a cada página. Experimente 30 dias grátis.',
    },
    {
      img: '/imagens/EscolhendoLivro.webp',
      badge: 'EXPLORE',
      titulo: 'Um universo de livros ao seu alcance',
      texto:
        'Navegue por diferentes gêneros, descubra recomendações personalizadas e encontre histórias que vão prender sua atenção do início ao fim. Experimente 30 dias grátis.',
    },
    {
      img: '/imagens/LendoLuzQuente.webp',
      badge: 'MERGULHE',
      titulo: 'Histórias que acompanham você',
      texto:
        'Descubra livros incríveis, salve seus favoritos e encontre sua próxima leitura em poucos cliques. Tudo o que você precisa para ler mais e melhor. Experimente 30 dias grátis.',
    },
  ];
  heroIndex = 0;
  private autoPlayInterval?: ReturnType<typeof setInterval>;

  // ---- Vistos recentemente (mantido hardcoded, igual ao home.js original) ----
  vistosRecentemente = [
    {
      id: 1,
      titulo: 'Frieren e a Jornada Para o Além - 02',
      autor: 'por Kamachi, Koyoharu Gotouge',
      capa: '/imagens/Frieren.webp',
      descricao:
        'Frieren é uma aventureira que viaja com seu grupo de amigos em busca de conhecimento e descobertas.',
      lidas: 133,
      total: 200,
    },
    {
      id: 2,
      titulo: 'Hellsing Especial Vol. 01: 1',
      autor: 'por Koyoharu Gotouge',
      capa: '/imagens/Hellsing.webp',
      descricao:
        'A Agência Hellsing é uma organização que tem a missão de acabar com criaturas que ameaçam o Império Britânico e a Igreja Protestante.',
      lidas: 45,
      total: 320,
    },
  ];

  // ---- Dados vindos do Supabase (era carregarLivrosDoSupabase / carregarComunidadesDoSupabase) ----
  mangas: Livro[] = [];
  recomendacoes: Livro[] = [];
  comunidades: Comunidade[] = [];

  // ---- Modal de livro ----
  bookModalAberto = false;
  livroSelecionado: Livro | null = null;

  // ---- Modal de comunidade ----
  commModalAberto = false;
  comunidadeSelecionada: Comunidade | null = null;

  streakMilestones = [1, 15, 30, 45, 60, 90];

  // ---- Setas de scroll das fileiras: em vez do heurístico antigo
  // (quantidade <= 7), agora medimos de verdade se a fileira tem conteúdo
  // pra rolar (scrollWidth > clientWidth), igual ao espírito do
  // configurarCarrosseisHorizontais() original, mas recalculado também
  // quando a janela muda de tamanho/zoom, não só uma vez no load.
  @ViewChild('vistosRow') private vistosRowRef?: ElementRef<HTMLElement>;
  @ViewChild('mangasRow') private mangasRowRef?: ElementRef<HTMLElement>;
  @ViewChild('recRow') private recRowRef?: ElementRef<HTMLElement>;

  scrollOculto = { vistos: true, mangas: true, recomendacoes: true };

  constructor(
    private supabaseService: SupabaseService,
    public streakService: StreakService
  ) {}

  ngOnInit(): void {
    this.carregarLivros().then(() => this.recalcularSetasScroll());
    this.carregarComunidades();
    this.startAutoPlay();
  }

  ngAfterViewInit(): void {
    // Roda depois do 1º render e de novo a cada leve espera, pra cobrir o
    // caso das imagens ainda estarem carregando (o que muda o clientWidth).
    this.recalcularSetasScroll();
    setTimeout(() => this.recalcularSetasScroll(), 300);
  }

  @HostListener('window:resize')
  recalcularSetasScroll(): void {
    this.scrollOculto = {
      vistos: this.rowSemOverflow(this.vistosRowRef),
      mangas: this.rowSemOverflow(this.mangasRowRef),
      recomendacoes: this.rowSemOverflow(this.recRowRef),
    };
  }

  private rowSemOverflow(ref?: ElementRef<HTMLElement>): boolean {
    const el = ref?.nativeElement;
    if (!el) return true;
    // "+1" de folga pra evitar flutuações de sub-pixel escondendo a seta à toa
    return el.scrollWidth <= el.clientWidth + 1;
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  progresso(lidas: number, total: number): number {
    return total > 0 ? (lidas / total) * 100 : 0;
  }

  // ==========================================================================
  // Carrossel hero
  // ==========================================================================
  goToSlide(index: number): void {
    this.heroIndex = index;
  }

  nextSlide(): void {
    this.heroIndex = (this.heroIndex + 1) % this.heroSlides.length;
  }

  prevSlide(): void {
    this.heroIndex = (this.heroIndex - 1 + this.heroSlides.length) % this.heroSlides.length;
  }

  startAutoPlay(): void {
    this.autoPlayInterval = setInterval(() => this.nextSlide(), 25000);
  }

  stopAutoPlay(): void {
    if (this.autoPlayInterval) clearInterval(this.autoPlayInterval);
  }

  // ==========================================================================
  // Carrega livros e comunidades do Supabase
  // ==========================================================================
  private async carregarLivros(): Promise<void> {
    const { data: livros, error } = await this.supabaseService.client.from('livros').select('*');

    if (error) {
      console.error('Erro ao carregar livros do Supabase:', error.message);
      return;
    }

    this.mangas = (livros ?? []).filter((l: Livro) => l.categoria === 'mangas');
    this.recomendacoes = (livros ?? []).filter((l: Livro) => l.categoria === 'livros');
    // Depois que os dados chegam, o *ngFor precisa de um instante pra
    // desenhar os cards antes de medirmos o scrollWidth de verdade.
    setTimeout(() => this.recalcularSetasScroll(), 0);
  }

  private async carregarComunidades(): Promise<void> {
    const { data: comunidades, error } = await this.supabaseService.client
      .from('comunidades')
      .select('*');

    if (error) {
      console.error('Erro ao carregar comunidades:', error.message);
      return;
    }

    this.comunidades = comunidades ?? [];
  }

  // ==========================================================================
  // Modais (abrir/fechar/popular dados) -- equivalente ao "Fluxo A/B/C/D" do
  // gerenciador de modais em home.js + openModal/closeModal do base.js
  // ==========================================================================
  abrirLivroModal(livro: Livro): void {
    this.livroSelecionado = livro;
    this.bookModalAberto = true;
    document.body.style.overflow = 'hidden';
  }

  abrirComunidadeModal(comunidade: Comunidade): void {
    this.comunidadeSelecionada = comunidade;
    this.commModalAberto = true;
    document.body.style.overflow = 'hidden';
    // TODO: próximo passo -- consultar comunidade_membros pra saber se o
    // usuário já está inscrito e trocar o texto do botão (Inscrever-se/Sair),
    // igual ao gerenciarEstadoInscricao() do home.js original.
  }

  fecharModais(): void {
    this.bookModalAberto = false;
    this.commModalAberto = false;
    document.body.style.overflow = '';
  }

  // ==========================================================================
  // Scroll horizontal das fileiras (era configurarCarrosseisHorizontais)
  // ==========================================================================
  scrollRow(rowEl: HTMLElement, direction: 1 | -1): void {
    rowEl.scrollLeft += direction * 380;
  }
}
