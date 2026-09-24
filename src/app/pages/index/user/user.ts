import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SupabaseService } from '../../../core/supabase';

interface Perfil {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  descricao_perfil?: string;
  maior_sequencia?: number;
  criado_em?: string;
  paginas_lidas_total?: number;
}

interface Favorite {
  src: string;
  alt: string;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user.html',
  styleUrl: './user.css'
})
export class UserProfile implements OnInit, OnDestroy {
  private readonly supabaseService = inject(SupabaseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('avatarInput') private avatarInput?: ElementRef<HTMLInputElement>;

  private routeSubscription?: Subscription;

  loading = true;
  isOwn = false;
  notFound = false;
  notFoundUsername = '';
  errorTitle = 'Perfil não encontrado';

  displayName = 'Carregando...';
  handle = '';
  avatar = '/imagens/padrao.jpg';
  bio = '';
  memberSince = 'Membro desde 2024';
  booksRead = 0;
  pagesRead = 0;
  reviewsCount = 15;
  maxStreak = 0;

  editingBio = false;
  bioDraft = '';
  savingBio = false;
  uploadingAvatar = false;
  feedback = '';
  feedbackError = false;

  favorites: Favorite[] = [
    { src: '/imagens/Frieren.webp', alt: 'Frieren' },
    { src: '/imagens/Hellsing.webp', alt: 'Hellsing' },
    { src: '/imagens/DanDaDan.webp', alt: 'Dandadan' },
    { src: '/imagens/DeathNote.webp', alt: 'Death Note' },
    { src: '/imagens/AttackOnTitan.webp', alt: 'Attack on Titan' }
  ];

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const query = this.route.snapshot.queryParamMap;
      const usernameFromUrl = params.get('username')
        ?? query.get('u')
        ?? query.get('username');
      void this.carregarPerfil(usernameFromUrl);
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  // --- INICIALIZAÇÃO PRINCIPAL (igual ao user.js original) ---
  private async carregarPerfil(usernameFromUrl: string | null): Promise<void> {
    this.loading = true;
    this.notFound = false;
    this.isOwn = false;
    this.editingBio = false;
    this.feedback = '';
    this.errorTitle = 'Perfil não encontrado';

    try {
      console.debug('[perfil] obtendo usuário logado...');
      const { data: { user }, error: authError } = await this.withTimeout(
        this.supabaseService.client.auth.getUser(),
        15000,
        'auth.getUser'
      );
      console.debug('[perfil] usuário logado:', user?.id ?? '(nenhum)');

      if (authError || !user) {
        await this.router.navigate(['/login']);
        return;
      }

      const rawUsername = usernameFromUrl?.trim() ?? '';

      // Sem username na URL -> próprio perfil
      if (!rawUsername) {
        await this.carregarProprioPerfil(user.id);
        return;
      }

      const username = this.normalizarUsername(rawUsername);
      if (!username) {
        this.exibirPerfilNaoEncontrado(rawUsername);
        return;
      }

      console.debug('[perfil] buscando perfil público:', username);
      const { data: perfilAlvo } = await this.withTimeout(
        this.supabaseService.client
          .from('perfis')
          .select('id, username, display_name, avatar_url, descricao_perfil, maior_sequencia, criado_em')
          .eq('username', username)
          .maybeSingle(),
        15000,
        'perfis público'
      );

      if (!perfilAlvo) {
        this.exibirPerfilNaoEncontrado(rawUsername);
        return;
      }

      if (perfilAlvo.id === user.id) {
        await this.carregarProprioPerfil(user.id);
      } else {
        this.carregarPerfilPublico(perfilAlvo as Perfil);
      }
    } catch (error) {
      console.error('[perfil] falha no carregamento:', error);
      this.errorTitle = 'Erro ao carregar perfil';
      this.exibirPerfilNaoEncontrado(usernameFromUrl ?? '');
      this.bio = error instanceof Error
        ? `Não foi possível carregar o perfil: ${error.message}`
        : 'Não foi possível carregar o perfil. Verifique sua conexão e tente novamente.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // --- MODO 1: PRÓPRIO PERFIL (com edição) ---
  private async carregarProprioPerfil(userId: string): Promise<void> {
    this.isOwn = true;

    console.debug('[perfil] buscando próprio perfil...');
    const { data: perfil, error: perfilError } = await this.withTimeout(
      this.supabaseService.client
        .from('perfis')
        .select('id, username, display_name, avatar_url, descricao_perfil, maior_sequencia, criado_em, paginas_lidas_total')
        .eq('id', userId)
        .maybeSingle(),
      15000,
      'perfis próprio'
    );
    console.debug('[perfil] perfil próprio:', perfil ? 'ok' : 'ausente', perfilError ?? '');

    if (perfilError || !perfil) {
      this.displayName = 'Erro ao carregar';
      this.handle = '';
      this.bio = 'Não foi possível carregar os dados do perfil.';
      return;
    }

    this.preencherDadosNaTela(perfil as Perfil);
    await this.carregarOuCriarDescricaoPadrao(userId, (perfil as Perfil).descricao_perfil);

    // Estatísticas do usuário logado (não bloqueiam a tela em caso de erro)
    try {
      await this.paginasLidasTotal(userId);
    } catch (error) {
      console.error('Erro ao carregar páginas lidas:', error);
    }
    try {
      await this.livroLidos(userId);
    } catch (error) {
      console.error('Erro ao carregar livros lidos:', error);
    }
  }

  // --- MODO 2: PERFIL PÚBLICO (somente visualização) ---
  private carregarPerfilPublico(perfil: Perfil): void {
    this.isOwn = false;
    this.preencherDadosNaTela(perfil);
    this.bio = perfil.descricao_perfil?.trim() || 'Sem Descrição';
  }

  // --- PREENCHIMENTO COMUM DE NOME, AVATAR, SEQUÊNCIA E DATA ---
  private preencherDadosNaTela(perfil: Perfil): void {
    this.displayName = perfil.display_name || perfil.username || 'Leitor Bookway';
    // Este campo se chamava "email" no original, mas mostra o @username.
    this.handle = perfil.username ? `@${perfil.username}` : '';
    if (perfil.avatar_url) this.avatar = perfil.avatar_url;
    this.maxStreak = perfil.maior_sequencia ?? 0;

    if (perfil.criado_em) {
      const createdAt = new Date(perfil.criado_em);
      const mes = String(createdAt.getMonth() + 1).padStart(2, '0');
      this.memberSince = `Membro desde ${mes}/${createdAt.getFullYear()}`;
    }
  }

  // --- MENSAGEM DE PERFIL NÃO ENCONTRADO ---
  private exibirPerfilNaoEncontrado(usernameDigitado: string): void {
    this.notFound = true;
    this.notFoundUsername = usernameDigitado;
    this.displayName = 'Perfil não encontrado';
    this.handle = '';
    this.bio = `Não encontramos nenhum usuário com o nome "@${usernameDigitado}".`;
    this.memberSince = '';
    this.maxStreak = 0;
  }

  // --- DESCRIÇÃO (cria valor padrão se necessário, igual ao original) ---
  private async carregarOuCriarDescricaoPadrao(userId: string, descricao?: string): Promise<void> {
    let desc = descricao?.trim();

    if (!desc) {
      desc = 'Sem Descrição';
      await this.supabaseService.client
        .from('perfis')
        .update({ descricao_perfil: desc })
        .eq('id', userId);
    }

    this.bio = desc;
  }

  // --- LÓGICA DE EDIÇÃO DA DESCRIÇÃO ---
  startEditingBio(): void {
    if (!this.isOwn) return;
    this.bioDraft = this.bio === 'Sem Descrição' ? '' : this.bio;
    this.editingBio = true;
  }

  async saveBio(): Promise<void> {
    if (!this.isOwn || this.savingBio) return;

    const newText = this.bioDraft.trim() || 'Sem Descrição';
    if (newText === this.bio) {
      this.editingBio = false;
      return;
    }

    this.savingBio = true;
    const { data: { user } } = await this.supabaseService.client.auth.getUser();

    if (user) {
      const { error } = await this.supabaseService.client
        .from('perfis')
        .update({ descricao_perfil: newText })
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao salvar descrição:', error);
        this.showFeedback('Não foi possível salvar a descrição.', true);
        this.savingBio = false;
        return;
      }
    }

    this.bio = newText;
    this.editingBio = false;
    this.savingBio = false;
  }

  // --- UPLOAD DE AVATAR (igual ao original: bucket "avatars") ---
  openAvatarPicker(): void {
    if (this.isOwn) this.avatarInput?.nativeElement.click();
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.isOwn || this.uploadingAvatar) return;

    const { data: { user } } = await this.supabaseService.client.auth.getUser();
    if (!user) return;

    this.uploadingAvatar = true;

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await this.supabaseService.client.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = this.supabaseService.client.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await this.supabaseService.client
        .from('perfis')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      this.avatar = publicUrl;
      window.dispatchEvent(new CustomEvent('bookway:avatar-updated', {
        detail: { url: publicUrl }
      }));
      this.showFeedback('Foto de perfil atualizada com sucesso!', false);
    } catch (error) {
      console.error('Erro no upload:', error);
      const message = error instanceof Error ? error.message : 'Tente novamente.';
      this.showFeedback(`Erro ao trocar de foto: ${message}`, true);
    } finally {
      this.uploadingAvatar = false;
    }
  }

  // --- ESTATÍSTICAS DO USUÁRIO LOGADO (igual ao original) ---
  private async paginasLidasTotal(userId: string): Promise<void> {
    const { data: perfil } = await this.supabaseService.client
      .from('perfis')
      .select('paginas_lidas_total')
      .eq('id', userId)
      .maybeSingle();

    let total = (perfil as { paginas_lidas_total?: number } | null)?.paginas_lidas_total;
    if (total == null) {
      total = 0;
      await this.supabaseService.client
        .from('perfis')
        .update({ paginas_lidas_total: 0 })
        .eq('id', userId);
    }
    this.pagesRead = total;
  }

  private async livroLidos(userId: string): Promise<void> {
    const { count } = await this.supabaseService.client
      .from('progresso_tabela')
      .select('id', { count: 'exact', head: true })
      .eq('id_user', userId)
      .eq('terminado', true);

    this.booksRead = count ?? 0;
  }

  // Garante que nenhuma chamada ao Supabase trave a tela no loading.
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

  private normalizarUsername(value: string): string {    return value
      .trim()
      .replace(/^@/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');
  }

  private showFeedback(message: string, isError: boolean): void {
    this.feedback = message;
    this.feedbackError = isError;
    window.setTimeout(() => {
      this.feedback = '';
    }, 4000);
  }
}
