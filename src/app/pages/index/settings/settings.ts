import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/supabase';

interface Aba {
  id: string;
  icone: string;
  rotulo: string;
}

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  private readonly supabaseService = inject(SupabaseService);

  abaAtiva = 'secao-conta';
  abas: Aba[] = [
    { id: 'secao-conta', icone: '/imagens/Vetores/PessoaPreenchidaVetor.svg', rotulo: 'Conta' },
    { id: 'secao-idioma', icone: '/imagens/Vetores/IdiomaVetor.svg', rotulo: 'Idioma do app' },
    { id: 'secao-acessibilidade', icone: '/imagens/Vetores/PrivacidadeVetor.svg', rotulo: 'Acessibilidade' },
    { id: 'secao-notificacoes', icone: '/imagens/Vetores/SinoVetor.svg', rotulo: 'Notificações' },
    { id: 'secao-privacidade', icone: '/imagens/Vetores/Privacidade1Vetor.svg', rotulo: 'Privacidade' },
    { id: 'secao-preferencias', icone: '/imagens/Vetores/PreferenciasVetor.svg', rotulo: 'Preferências' },
    { id: 'secao-admin', icone: '/imagens/Vetores/ModoADMVetor.svg', rotulo: 'Modo Administrador' }
  ];

  // Cartão do usuário (menu lateral)
  userDisplayName = 'Utilizador';
  userEmail = 'utilizador@email.com';
  userAvatar = '/imagens/padrao.jpg';

  // Modal de edição de perfil
  showProfileModal = false;
  savingProfile = false;
  profileFeedback = '';
  profileFeedbackError = false;
  formNome = '';
  formEmail = '';
  formTelefone = '+55 (11) 99999-9999';
  formBio = '';
  memberSinceText = '20 de Jan, 2023';

  // Painel Conta
  contaNome = 'Utilizador';
  contaEmail = 'utilizador@email.com';
  contaTelefone = '+55 (11) 99999-9999';
  senhaAtual = '';
  novaSenha = '';
  pref2FA = false;

  // Painel Idioma
  idioma = 'pt-BR';
  regiao = 'Brasil';

  // Painel Acessibilidade
  altoContraste = false;
  textoAmpliado = false;
  leitorTela = true;

  // Painel Notificações
  push = true;
  emailsNovidades = true;
  lembretes = false;
  atividadeComunidade = true;

  // Painel Privacidade
  perfilPublico = true;
  mostrarProgresso = true;
  mostrarBuscas = false;
  compartilharStats = false;

  // Painel Preferências
  noturnoAuto = true;
  continuarLeitura = true;
  sugestoes = true;

  async ngOnInit(): Promise<void> {
    await this.carregarResumo();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.fecharModalPerfil();
  }

  // Igual ao settings.js original: alterna abas do menu.
  trocarAba(id: string): void {
    this.abaAtiva = id;
  }

  // Igual ao original: o cartão do usuário abre o modal de perfil.
  abrirModalPerfil(): void {
    this.formNome = this.userDisplayName;
    this.formEmail = this.userEmail;
    this.formBio = '';
    this.profileFeedback = '';
    this.profileFeedbackError = false;
    this.showProfileModal = true;
    document.body.style.overflow = 'hidden';
    void this.carregarBioModal();
  }

  fecharModalPerfil(): void {
    this.showProfileModal = false;
    document.body.style.overflow = '';
  }

  private async carregarBioModal(): Promise<void> {
    try {
      const { data: { user } } = await this.withTimeout(
        this.supabaseService.client.auth.getUser(),
        15000,
        'auth.getUser'
      );
      if (!user) return;

      const { data: perfil } = await this.withTimeout(
        this.supabaseService.client
          .from('perfis')
          .select('descricao_perfil')
          .eq('id', user.id)
          .maybeSingle(),
        15000,
        'perfis bio'
      );

      const bio = (perfil as { descricao_perfil?: string } | null)?.descricao_perfil?.trim();
      if (bio && bio !== 'Sem Descrição') this.formBio = bio;
    } catch (error) {
      console.error('[config] falha ao carregar bio:', error);
    }
  }

  async salvarPerfil(): Promise<void> {
    if (this.savingProfile) return;

    const displayName = this.formNome.trim();
    if (!displayName) {
      this.profileFeedback = 'Informe um nome de usuário.';
      this.profileFeedbackError = true;
      return;
    }

    this.savingProfile = true;
    this.profileFeedback = '';
    this.profileFeedbackError = false;

    try {
      const { data: { user } } = await this.withTimeout(
        this.supabaseService.client.auth.getUser(),
        15000,
        'auth.getUser'
      );
      if (!user) {
        this.profileFeedback = 'Sessão expirada. Entre novamente.';
        this.profileFeedbackError = true;
        return;
      }

      const { error } = await this.withTimeout(
        this.supabaseService.client
          .from('perfis')
          .update({
            display_name: displayName,
            descricao_perfil: this.formBio.trim() || 'Sem Descrição'
          })
          .eq('id', user.id),
        15000,
        'perfis salvar'
      );

      if (error) throw error;

      this.userDisplayName = displayName;
      this.contaNome = displayName;
      this.fecharModalPerfil();
    } catch (error) {
      console.error('[config] falha ao salvar perfil:', error);
      this.profileFeedback = 'Não foi possível salvar. Tente novamente.';
      this.profileFeedbackError = true;
    } finally {
      this.savingProfile = false;
    }
  }

  bannerEmBreve(): void {
    this.profileFeedback = 'A troca de banner estará disponível em breve.';
    this.profileFeedbackError = false;
  }

  private async carregarResumo(): Promise<void> {
    try {
      const { data: { user } } = await this.withTimeout(
        this.supabaseService.client.auth.getUser(),
        15000,
        'auth.getUser'
      );
      if (!user) return;

      if (user.email) {
        this.userEmail = user.email;
        this.contaEmail = user.email;
        this.formEmail = user.email;
      }

      const { data: perfil } = await this.withTimeout(
        this.supabaseService.client
          .from('perfis')
          .select('username, display_name, avatar_url, criado_em')
          .eq('id', user.id)
          .maybeSingle(),
        15000,
        'perfis resumo'
      );

      const dados = perfil as {
        username?: string;
        display_name?: string;
        avatar_url?: string;
        criado_em?: string;
      } | null;
      if (!dados) return;

      const nome = dados.display_name || dados.username;
      if (nome) {
        this.userDisplayName = nome;
        this.contaNome = nome;
        this.formNome = nome;
      }
      if (dados.avatar_url) this.userAvatar = dados.avatar_url;
      if (dados.criado_em) this.memberSinceText = this.formatarMembroDesde(dados.criado_em);
    } catch (error) {
      console.error('[config] falha ao carregar resumo:', error);
    }
  }

  private formatarMembroDesde(criadoEm: string): string {
    const data = new Date(criadoEm);
    return `${data.getDate()} de ${MESES_PT[data.getMonth()]}, ${data.getFullYear()}`;
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
