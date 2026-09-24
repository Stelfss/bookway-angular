import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  inject
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SupabaseService } from '../../../core/supabase';

// Portado de livro.js do projeto original. Os estilos usam ViewEncapsulation.None
// (como o MainLayout) e vão todos prefixados com .leitura-page para não vazar.
@Component({
  selector: 'app-leitura',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leitura.html',
  styleUrl: './leitura.css',
  encapsulation: ViewEncapsulation.None
})
export class Leitura implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabaseService = inject(SupabaseService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('textoHistoria') private textoHistoria?: ElementRef<HTMLElement>;

  tituloLivro = '';
  conteudoHtml: SafeHtml | null = null;
  loading = true;
  erro = '';

  paginaAtual = 1;
  totalPaginas = 0;
  horaTexto = '00:00';
  uiOculta = false;
  avisoTempo = '';

  private livroId: string | null = null;
  private maiorPaginaLida = 0;
  private paginasEls: HTMLElement[] = [];
  private salvandoProgresso = false;
  private salvamentoPendente = false;
  private tempoEntradaPagina = Date.now();
  private relogioTimer?: ReturnType<typeof setInterval>;
  private avisoTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.livroId = params.get('id');
    this.tituloLivro = params.get('titulo') ?? '';
    this.ligarRelogio();
    void this.abrirLivro();
  }

  ngOnDestroy(): void {
    if (this.relogioTimer) clearInterval(this.relogioTimer);
    if (this.avisoTimer) clearTimeout(this.avisoTimer);
    document.body.style.overflow = '';
    void this.salvarProgresso();
  }

  get indicadorTexto(): string {
    return this.totalPaginas > 0
      ? `Página ${this.paginaAtual} de ${this.totalPaginas}`
      : 'Nenhuma página';
  }

  voltar(): void {
    void this.salvarProgresso();
    if (window.history.length > 1) {
      window.history.back();
    } else {
      void this.router.navigate(['/home']);
    }
  }

  alternarUI(): void {
    this.uiOculta = !this.uiOculta;
  }

  // Setas do teclado viram páginas: direita avança, esquerda volta.
  // Ignora quando o foco está em campo de texto.
  @HostListener('document:keydown', ['$event'])
  navegarTeclado(event: KeyboardEvent): void {
    const alvo = event.target as HTMLElement | null;
    if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)) {
      return;
    }
    if (event.key === 'ArrowRight') {
      this.mudarPagina(1);
    } else if (event.key === 'ArrowLeft') {
      this.mudarPagina(-1);
    }
  }

  mudarPagina(direcao: -1 | 1): void {
    const novaPagina = this.paginaAtual + direcao;
    if (novaPagina < 1 || novaPagina > this.totalPaginas) return;

    // O tempo mínimo só se aplica ao AVANÇAR; voltar é sempre livre.
    if (direcao > 0) {
      const tempoNaPagina = Date.now() - this.tempoEntradaPagina;
      const minimoNecessario = this.tempoMinimoParaPagina(this.paginaAtual);

      if (tempoNaPagina < minimoNecessario) {
        const segundosRestantes = Math.ceil((minimoNecessario - tempoNaPagina) / 1000);
        this.avisarTempoMinimo(segundosRestantes);
        return;
      }
    }

    this.exibirPagina(novaPagina);
  }

  private exibirPagina(numPagina: number): void {
    if (numPagina < 1 || numPagina > this.totalPaginas) return;

    this.paginaAtual = numPagina;
    this.tempoEntradaPagina = Date.now();

    this.paginasEls.forEach(el => {
      const pageAttr = parseInt(el.getAttribute('data-page') ?? '0', 10);
      el.classList.toggle('active', pageAttr === this.paginaAtual);
    });

    // Salva no banco imediatamente sempre que trocar de página.
    void this.salvarProgresso();
  }

  private async abrirLivro(): Promise<void> {
    this.loading = true;
    this.erro = '';

    try {
      const id = this.livroId;
      const titulo = this.tituloLivro.trim();

      if (!id && !titulo) {
        this.erro = 'Nenhum livro selecionado.';
        return;
      }

      let query = this.supabaseService.client.from('livros').select('html_paginado_url');
      query = id ? query.eq('id', id) : query.eq('titulo', titulo);

      // .maybeSingle() é essencial: sem ele o data vem como array
      // (igual ao .single() do livro.js original).
      const { data, error } = await this.withTimeout(query.maybeSingle(), 15000, 'livros html');
      const url = (data as { html_paginado_url?: string } | null)?.html_paginado_url;

      if (error || !url) {
        this.erro = 'Livro não encontrado no banco de dados.';
        return;
      }

      const resposta = await this.withTimeout(fetch(url), 20000, 'baixar livro');
      if (!resposta.ok) throw new Error(`Status HTTP: ${resposta.status}`);

      const htmlTexto = await resposta.text();
      this.conteudoHtml = this.sanitizer.bypassSecurityTrustHtml(htmlTexto);
      this.cdr.detectChanges();

      const container = this.textoHistoria?.nativeElement;
      this.paginasEls = container
        ? Array.from(container.querySelectorAll<HTMLElement>('.pg-page'))
        : [];
      this.totalPaginas = this.paginasEls.length;

      if (this.totalPaginas === 0) {
        this.erro = 'Este livro ainda não possui páginas para exibir.';
        return;
      }

      const { data: { user } } = await this.withTimeout(
        this.supabaseService.client.auth.getUser(),
        15000,
        'auth.getUser'
      );

      let paginaInicial = 1;
      if (user && id) {
        const { paginaSalva, maiorPaginaSalva } = await this.obterProgressoSalvo(user.id, id);
        paginaInicial = paginaSalva;
        this.maiorPaginaLida = maiorPaginaSalva;
      } else {
        this.maiorPaginaLida = paginaInicial;
      }

      this.exibirPagina(paginaInicial);
      await this.atualizarPags();
    } catch (err) {
      console.error('[leitura] erro ao carregar o livro:', err);
      this.erro = 'Erro ao baixar e exibir o conteúdo do livro.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private async salvarProgresso(): Promise<void> {
    if (this.salvandoProgresso) {
      this.salvamentoPendente = true;
      return;
    }
    this.salvandoProgresso = true;
    const paginaAlvo = this.paginaAtual;

    try {
      const { data: { user }, error: authError } = await this.withTimeout(
        this.supabaseService.client.auth.getUser(),
        15000,
        'auth.getUser'
      );
      if (authError || !user) return;

      const livroId = this.livroId;
      if (!livroId) return;

      const horarioAtual = this.horaBrasilia();
      const pontoMaisAvancado = Math.max(paginaAlvo, this.maiorPaginaLida);
      const foiTerminado = this.totalPaginas > 0 && pontoMaisAvancado >= this.totalPaginas;

      const { error } = await this.withTimeout(
        this.supabaseService.client
          .from('progresso_tabela')
          .update({
            paginas_lidas: paginaAlvo,
            data_ultima_vez_lido: horarioAtual,
            terminado: foiTerminado,
            ...(foiTerminado ? { data_terminado: horarioAtual } : {})
          })
          .eq('id_user', user.id)
          .eq('id_livro', livroId),
        15000,
        'progresso salvar'
      );

      if (error) console.error('[leitura] erro ao salvar progresso:', error.message);

      await this.atualizarPaginasDia(user.id, livroId, paginaAlvo);
    } catch (err) {
      console.error('[leitura] falha no salvamento:', err);
    } finally {
      this.salvandoProgresso = false;
      if (this.salvamentoPendente) {
        this.salvamentoPendente = false;
        void this.salvarProgresso();
      }
    }
  }

  private async atualizarPaginasDia(userId: string, livroId: string, paginaAlvo: number): Promise<void> {
    if (paginaAlvo <= this.maiorPaginaLida) return;

    const paginasNovasLidas = paginaAlvo - this.maiorPaginaLida;

    const { data: userinfo, error: userError } = await this.withTimeout(
      this.supabaseService.client
        .from('perfis')
        .select('pagina_lidas_dia')
        .eq('id', userId)
        .single(),
      15000,
      'perfis páginas dia'
    );

    if (userError) {
      console.error('[leitura] erro ao buscar total de páginas do dia:', userError.message);
      return;
    }

    const acumuladoAtual = (userinfo as { pagina_lidas_dia?: number } | null)?.pagina_lidas_dia || 0;
    const novoTotalDia = acumuladoAtual + paginasNovasLidas;

    const { error: updateError } = await this.withTimeout(
      this.supabaseService.client
        .from('perfis')
        .update({ pagina_lidas_dia: novoTotalDia })
        .eq('id', userId),
      15000,
      'perfis atualizar dia'
    );

    if (updateError) {
      console.error('[leitura] erro ao atualizar paginas_lida_dia:', updateError.message);
      return;
    }

    this.maiorPaginaLida = paginaAlvo;

    const { error: maiorPaginaError } = await this.withTimeout(
      this.supabaseService.client
        .from('progresso_tabela')
        .update({ maior_pagina_lida: this.maiorPaginaLida })
        .eq('id_user', userId)
        .eq('id_livro', livroId),
      15000,
      'progresso recorde'
    );

    if (maiorPaginaError) {
      console.error('[leitura] erro ao atualizar maior_pagina_lida:', maiorPaginaError.message);
    }

    if (novoTotalDia >= 20) {
      const { error: objetivoError } = await this.withTimeout(
        this.supabaseService.client
          .from('perfis')
          .update({ objetivos_realizado: true })
          .eq('id', userId),
        15000,
        'perfis objetivo'
      );

      if (objetivoError) {
        console.error('[leitura] erro ao atualizar objetivos_realizado:', objetivoError.message);
      }
    }
  }

  private async obterProgressoSalvo(userId: string, livroId: string): Promise<{ paginaSalva: number; maiorPaginaSalva: number }> {
    const { data, error } = await this.withTimeout(
      this.supabaseService.client
        .from('progresso_tabela')
        .select('paginas_lidas, maior_pagina_lida')
        .eq('id_user', userId)
        .eq('id_livro', livroId)
        .maybeSingle(),
      15000,
      'progresso salvo'
    );

    if (error) {
      console.error('[leitura] erro ao buscar progresso salvo:', error.message);
    }

    const paginaSalva = (data as { paginas_lidas?: number } | null)?.paginas_lidas || 1;
    const maiorPaginaSalva = (data as { maior_pagina_lida?: number } | null)?.maior_pagina_lida || paginaSalva;

    return { paginaSalva, maiorPaginaSalva };
  }

  private async atualizarPags(): Promise<void> {
    const { data: { user }, error: authError } = await this.withTimeout(
      this.supabaseService.client.auth.getUser(),
      15000,
      'auth.getUser'
    );
    if (authError || !user || !this.livroId) return;

    const { data: verificar } = await this.withTimeout(
      this.supabaseService.client
        .from('progresso_tabela')
        .select('id')
        .eq('id_user', user.id)
        .eq('id_livro', this.livroId)
        .maybeSingle(),
      15000,
      'progresso verificar'
    );

    const { data: livro } = await this.withTimeout(
      this.supabaseService.client
        .from('livros')
        .select('total_paginas')
        .eq('id', this.livroId)
        .maybeSingle(),
      15000,
      'livros total'
    );

    if (!verificar) {
      const horarioAtual = this.horaBrasilia();
      await this.withTimeout(
        this.supabaseService.client.from('progresso_tabela').insert([
          {
            id_livro: this.livroId,
            id_user: user.id,
            paginas_lidas: this.paginaAtual,
            maior_pagina_lida: this.paginaAtual,
            paginas_totais: (livro as { total_paginas?: number } | null)?.total_paginas ?? 0,
            data_inicial: horarioAtual,
            data_ultima_vez_lido: horarioAtual,
            data_terminado: null,
            terminado: false
          }
        ]),
        15000,
        'progresso criar'
      );
    }
  }

  private tempoMinimoParaPagina(pagina: number): number {
    const pertoDoInicio = pagina <= 5;
    const pertoDoFim = this.totalPaginas > 0 && pagina > this.totalPaginas - 5;
    if (pertoDoInicio || pertoDoFim) return 500;
    return 5000;
  }

  private avisarTempoMinimo(segundosRestantes: number): void {
    this.avisoTempo = `Aguarde mais ${segundosRestantes}s para virar a página`;
    if (this.avisoTimer) clearTimeout(this.avisoTimer);
    this.avisoTimer = setTimeout(() => {
      this.avisoTempo = '';
    }, 1500);
  }

  private ligarRelogio(): void {
    const atualizarHora = (): void => {
      const agora = new Date();
      const horas = String(agora.getHours()).padStart(2, '0');
      const minutos = String(agora.getMinutes()).padStart(2, '0');
      this.horaTexto = `${horas}:${minutos}`;
      this.cdr.detectChanges();
    };
    atualizarHora();
    this.relogioTimer = setInterval(atualizarHora, 60000);
  }

  private horaBrasilia(): string {
    const horaBoa = new Date()
      .toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' })
      .replace(' ', 'T');
    return `${horaBoa}-03:00`;
  }

  private async withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Tempo esgotado em: ${label}`)), ms);
    });
    try {
      return await Promise.race([Promise.resolve(promise), timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
