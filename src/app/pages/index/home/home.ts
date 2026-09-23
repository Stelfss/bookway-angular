import { Component, OnInit, OnDestroy, ElementRef, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/supabase';

interface HeroSlide {
  imagem: string;
  badge: string;
  titulo: string;
  descricao: string;
}

interface Livro {
  id: number;
  titulo: string;
  autor: string;
  capa: string;
  descricao: string;
  categoria?: string;
}

interface ItemProgresso {
  id_livro: number;
  maior_pagina_lida: number;
  paginas_totais: number;
  porcentagem: number;
  livro: Livro;
}

interface Comunidade {
  id: number;
  titulo: string;
  capa: string;
  membros: number;
  descricao: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit, OnDestroy {
  private supabaseService = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  heroSlides: HeroSlide[] = [
    {
      imagem: './imagens/LendoLivro.webp',
      badge: 'DESCUBRA',
      titulo: 'Milhares de histórias em um só lugar',
      descricao: 'Explore um catálogo repleto de livros para todos os gostos. Encontre novos autores, acompanhe suas leituras e mergulhe em histórias inesquecíveis. Experimente 30 dias grátis.'
    },
    {
      imagem: './imagens/Biblioteca1.webp',
      badge: 'LEIA',
      titulo: 'Sua próxima grande leitura começa aqui',
      descricao: 'Dos clássicos aos lançamentos, encontre livros que combinam com você. Organize suas leituras e descubra novas aventuras a cada página. Experimente 30 dias grátis.'
    },
    {
      imagem: './imagens/EscolhendoLivro.webp',
      badge: 'EXPLORE',
      titulo: 'Um universo de livros ao seu alcance',
      descricao: 'Navegue por diferentes gêneros, descubra recomendações personalizadas e encontre histórias que vão prender sua atenção do início ao fim. Experimente 30 dias grátis.'
    },
    {
      imagem: './imagens/LendoLuzQuente.webp',
      badge: 'MERGULHE',
      titulo: 'Histórias que acompanham você',
      descricao: 'Descubra livros incríveis, salve seus favoritos e encontre sua próxima leitura em poucos cliques. Tudo o que você precisa para ler mais e melhor. Experimente 30 dias grátis.'
    }
  ];

  currentHeroIndex = 0;
  private autoPlayTimer: ReturnType<typeof setInterval> | null = null;

  // Listas de dados do Supabase
  livrosEmAndamento: ItemProgresso[] = [];
  comunidades: Comunidade[] = [];
  livrosRecomendados: Livro[] = [];

  // Estado dos Modais
  showBookModal = false;
  selectedBook: Livro | null = null;

  showCommunityModal = false;
  selectedCommunity: Comunidade | null = null;
  isSubscribedToCommunity = false;

  showCreateCommunityModal = false;
  showStreakModal = false;

  // Formulário de comunidade
  newComm = {
    name: '',
    desc: '',
    color: '#3b82f6',
    image: ''
  };

  // Referências para scroll horizontal
  @ViewChild('lendoRow') lendoRow!: ElementRef<HTMLDivElement>;
  @ViewChild('recomendacoesRow') recomendacoesRow!: ElementRef<HTMLDivElement>;

  ngOnInit(): void {
    this.startHeroAutoPlay();
    this.carregarDadosSupabase();
  }

  ngOnDestroy(): void {
    this.stopHeroAutoPlay();
  }

  // --- CARREGAMENTO VIA SUPABASE SERVICE ---
  async carregarDadosSupabase(): Promise<void> {
    await Promise.all([
      this.carregarLivrosLidos(),
      this.carregarComunidades(),
      this.carregarRecomendacoes()
    ]);
    this.cdr.detectChanges();
  }

  async carregarRecomendacoes(): Promise<void> {
    const { data, error } = await this.supabaseService.client.from('livros').select('*');
    if (error) {
      console.error('Erro ao carregar livros do Supabase:', error.message);
      return;
    }
    if (data) {
      this.livrosRecomendados = data.filter((livro: any) => livro.categoria === 'livros');
    }
  }

  async carregarComunidades(): Promise<void> {
    const { data, error } = await this.supabaseService.client.from('comunidades').select('*');
    if (error) {
      console.error('Erro ao carregar comunidades:', error.message);
      return;
    }
    if (data) {
      this.comunidades = data;
    }
  }

  async carregarLivrosLidos(): Promise<void> {
    const { data: { user }, error: authError } = await this.supabaseService.client.auth.getUser();
    if (authError || !user) return;

    const { data, error } = await this.supabaseService.client
      .from('progresso_tabela')
      .select('id_livro, maior_pagina_lida, paginas_totais, livros (titulo, autor, capa, descricao)')
      .eq('id_user', user.id)
      .eq('terminado', false);

    if (error) {
      console.error('Erro ao buscar progresso:', error.message);
      return;
    }

    if (data) {
      this.livrosEmAndamento = data.map((item: any) => {
        const pagAtual = item.maior_pagina_lida || 0;
        const totalPaginas = item.paginas_totais || 0;
        const pct = totalPaginas > 0 ? (pagAtual / totalPaginas) * 100 : 0;
        const livroData = Array.isArray(item.livros) ? item.livros[0] : item.livros;

        return {
          id_livro: item.id_livro,
          maior_pagina_lida: pagAtual,
          paginas_totais: totalPaginas,
          porcentagem: pct,
          livro: livroData || { id: item.id_livro, titulo: '', autor: '', capa: '', descricao: '' }
        };
      });
    }
  }

  // --- CARROSSEL HERO 3D ---
  getPrevIndex(): number {
    return (this.currentHeroIndex - 1 + this.heroSlides.length) % this.heroSlides.length;
  }

  getNextIndex(): number {
    return (this.currentHeroIndex + 1) % this.heroSlides.length;
  }

  goHeroNext(): void {
    this.currentHeroIndex = this.getNextIndex();
  }

  goHeroPrev(): void {
    this.currentHeroIndex = this.getPrevIndex();
  }

  setHeroIndex(index: number): void {
    this.currentHeroIndex = index;
  }

  startHeroAutoPlay(): void {
    this.autoPlayTimer = setInterval(() => {
      this.goHeroNext();
    }, 25000);
  }

  stopHeroAutoPlay(): void {
    if (this.autoPlayTimer) clearInterval(this.autoPlayTimer);
  }

  // --- SCROLL HORIZONTAL ---
  scrollLeft(element: HTMLDivElement): void {
    element.scrollBy({ left: -380, behavior: 'smooth' });
  }

  scrollRight(element: HTMLDivElement): void {
    element.scrollBy({ left: 380, behavior: 'smooth' });
  }

  // --- MODAIS ---
  openBookModal(livro: Livro): void {
    this.selectedBook = livro;
    this.showBookModal = true;
    document.body.style.overflow = 'hidden';
  }

  async openCommunityModal(comm: Comunidade): Promise<void> {
    this.selectedCommunity = comm;
    this.showCommunityModal = true;
    document.body.style.overflow = 'hidden';
    await this.gerenciarEstadoInscricao(comm.id);
  }

  async gerenciarEstadoInscricao(idComunidade: number): Promise<void> {
    const { data: dadosComm } = await this.supabaseService.client
      .from('comunidades')
      .select('membros')
      .eq('id', idComunidade)
      .single();

    if (dadosComm && this.selectedCommunity) {
      this.selectedCommunity.membros = dadosComm.membros;
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
    await this.carregarComunidades();
  }

  closeAllModals(): void {
    this.showBookModal = false;
    this.showCommunityModal = false;
    this.showCreateCommunityModal = false;
    this.showStreakModal = false;
    document.body.style.overflow = '';
  }

  openCreateCommunityModal(e: Event): void {
    e.preventDefault();
    this.showCreateCommunityModal = true;
  }

  openStreakModal(e: Event): void {
    e.preventDefault();
    this.showStreakModal = true;
  }

  async criarComunidade(): Promise<void> {
    if (!this.newComm.name.trim()) return;

    const { error } = await this.supabaseService.client
      .from('comunidades')
      .insert({
        titulo: this.newComm.name,
        descricao: this.newComm.desc,
        capa: this.newComm.image || './imagens/default-community.png',
        membros: 1
      });

    if (error) {
      console.error('Erro ao criar comunidade:', error.message);
      return;
    }

    this.newComm = { name: '', desc: '', color: '#3b82f6', image: '' };
    this.closeAllModals();
    await this.carregarComunidades();
  }
}