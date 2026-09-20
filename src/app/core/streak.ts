import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export type EstadoStreak = 'seqFeita' | 'seqNaoFeita' | 'seqPerdida';

// Equivalente à seção "9. SEQUÊNCIA (STREAK) E PERFIL DO USUÁRIO" do
// Site/JS/base.js original. Isolado num service porque tanto o header
// (dentro do MainLayoutComponent, presente em toda página logada) quanto
// o modal de detalhe da streak (dentro da Home) precisam dos mesmos dados.
@Injectable({ providedIn: 'root' })
export class StreakService {
  sequenciaAtual = 0;
  paginasLidasDia = 0;
  estadoModal: EstadoStreak = 'seqFeita';
  carregado = false;

  // Estado de "aberto/fechado" do modal de streak. Fica aqui (e não no
  // HomeComponent) porque quem dispara a abertura é o ícone de fogo do
  // header, que vive no MainLayoutComponent -- um componente diferente
  // de onde o modal é desenhado (Home). Ver JS/base.js original: o clique
  // em "#txt-user" (data-open-modal="streak-modal") abria o modal via
  // delegação global de eventos; aqui cada um mexe só no que é seu.
  modalAberto = false;

  abrirModal(): void {
    this.modalAberto = true;
  }

  fecharModal(): void {
    this.modalAberto = false;
  }

  constructor(private supabaseService: SupabaseService) {}

  private horaBrasilia(): string {
    const hojeISO = new Date();
    const horaBoa = hojeISO
      .toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' })
      .replace(' ', 'T');
    return `${horaBoa}-03:00`;
  }

  private async verificarDia(userId: string, dataUltimoAcesso: string | null) {
    if (dataUltimoAcesso === null) {
      const horaNova = this.horaBrasilia();
      const { error } = await this.supabaseService.client
        .from('perfis')
        .update({ data_ultimo_acesso: horaNova, sequencia: 0 })
        .eq('id', userId);
      if (error) console.error('Erro ao atualizar primeiro acesso:', error);
    }
  }

  // Chamado uma vez por carregamento de página (pelo MainLayoutComponent),
  // igual ao carregarDadosUsuario() do base.js original.
  async carregarDadosUsuario(): Promise<void> {
    const {
      data: { user },
    } = await this.supabaseService.client.auth.getUser();
    if (!user) return;

    const { data: perfil, error: perfilError } = await this.supabaseService.client
      .from('perfis')
      .select(
        'data_ultimo_acesso, sequencia, maior_sequencia, objetivos_realizado, pagina_lidas_dia, paginas_lidas_total'
      )
      .eq('id', user.id)
      .single();

    if (perfilError || !perfil) return;

    await this.verificarDia(user.id, perfil.data_ultimo_acesso);
    await this.atualizarSequencia(user.id, perfil);
    this.carregado = true;
  }

  private async atualizarSequencia(userId: string, perfil: any): Promise<void> {
    const supabase = this.supabaseService.client;

    let sequenciaAtual = perfil.sequencia ?? 0;
    const dataUltimoAcesso = perfil.data_ultimo_acesso;
    let objetivosRealizado = perfil.objetivos_realizado;
    let paginasLidasDia = perfil.pagina_lidas_dia ?? 0;
    let paginasLidasTotal = perfil.paginas_lidas_total ?? 0;

    if (objetivosRealizado === null) {
      objetivosRealizado = false;
      await supabase.from('perfis').update({ objetivos_realizado: false }).eq('id', userId);
    }

    const agoraBrasilia = this.horaBrasilia();
    let estadoModal: EstadoStreak = 'seqFeita';

    if (dataUltimoAcesso) {
      const oldDay = new Date(dataUltimoAcesso);
      const newDay = new Date(agoraBrasilia);
      oldDay.setHours(0, 0, 0, 0);
      newDay.setHours(0, 0, 0, 0);

      const diffTime = newDay.getTime() - oldDay.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1 && !objetivosRealizado) {
        estadoModal = 'seqNaoFeita';
        paginasLidasTotal += paginasLidasDia;
        paginasLidasDia = 0;
        await supabase
          .from('perfis')
          .update({ pagina_lidas_dia: paginasLidasDia, paginas_lidas_total: paginasLidasTotal })
          .eq('id', userId);
      } else if (diffDays === 1 && objetivosRealizado) {
        sequenciaAtual += 1;
        objetivosRealizado = false;
        await supabase
          .from('perfis')
          .update({ sequencia: sequenciaAtual, objetivos_realizado: false, data_ultimo_acesso: agoraBrasilia })
          .eq('id', userId);
        estadoModal = 'seqFeita';
      } else if (diffDays > 1) {
        sequenciaAtual = 0;
        objetivosRealizado = false;
        await supabase
          .from('perfis')
          .update({ sequencia: 0, objetivos_realizado: false, data_ultimo_acesso: agoraBrasilia })
          .eq('id', userId);
        estadoModal = 'seqPerdida';
      } else if (diffDays === 0) {
        if (sequenciaAtual === 0 && objetivosRealizado) {
          sequenciaAtual = 1;
          objetivosRealizado = false;
          await supabase
            .from('perfis')
            .update({ sequencia: 1, objetivos_realizado: false, data_ultimo_acesso: agoraBrasilia })
            .eq('id', userId);
          estadoModal = 'seqFeita';
        } else if (sequenciaAtual === 0 && !objetivosRealizado) {
          estadoModal = 'seqPerdida';
        } else {
          estadoModal = 'seqFeita';
        }
      }
    }

    this.sequenciaAtual = sequenciaAtual;
    this.paginasLidasDia = paginasLidasDia;
    this.estadoModal = estadoModal;

    if (sequenciaAtual > (perfil.maior_sequencia ?? 0)) {
      await supabase.from('perfis').update({ maior_sequencia: sequenciaAtual }).eq('id', userId);
    }
  }
}
