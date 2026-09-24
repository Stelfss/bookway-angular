import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/supabase';

interface Amigo {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

interface Mensagem {
  id: number | string;
  sender_id: string;
  receiver_id: string;
  conteudo: string;
  lido: boolean;
  created_at: string;
}

interface Toast {
  id: number;
  texto: string;
  erro: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css']
})
export class Chat implements OnInit, OnDestroy {
  private supabaseService = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  private get supabase() {
    return this.supabaseService.client;
  }

  usuarioLogadoId: string | null = null;

  amigos: Amigo[] = [];
  solicitacoes: Amigo[] = [];
  contatoAtivo: Amigo | null = null;
  mensagens: Mensagem[] = [];

  mensagemTexto = '';
  addUsername = '';
  addStatus = '';
  addStatusErro = false;

  usuariosOnline = new Set<string>();
  digitando = false;

  gravandoAudio = false;
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];

  toasts: Toast[] = [];
  private toastSeq = 0;

  removerConfirmando = false;
  private removerTimer: any = null;

  contatosOcultos = false;

  private canalRealtime: any = null;
  private canalPresenca: any = null;
  private timerDigitando: any = null;
  private mensagensNaoLidas = 0;
  private tituloOriginal = 'Bookway - Chat';
  private onVisibilidade = () => {
    if (!document.hidden) {
      this.mensagensNaoLidas = 0;
      document.title = this.tituloOriginal;
    }
  };

  @ViewChild('historico') historicoRef?: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  avatarPadrao = './imagens/padrao.jpg';

  async ngOnInit(): Promise<void> {
    this.tituloOriginal = document.title;
    document.addEventListener('visibilitychange', this.onVisibilidade);

    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;
    this.usuarioLogadoId = user.id;

    this.contatosOcultos = document.body.classList.contains('sidebar-expanded') || window.innerWidth <= 768;
    this.iniciarPresenca();
    await this.carregarAmigos();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilidade);
    if (this.removerTimer) clearTimeout(this.removerTimer);
    if (this.timerDigitando) clearTimeout(this.timerDigitando);
    if (this.canalRealtime) this.supabase.removeChannel(this.canalRealtime);
    if (this.canalPresenca) this.supabase.removeChannel(this.canalPresenca);
    document.title = this.tituloOriginal;
  }

  // ---------- Amizades (port do amizades.js) ----------
  normalizarUsername(texto: string): string {
    return (texto || '')
      .trim()
      .replace('@', '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');
  }

  nomeAmigo(a: Amigo): string {
    return a.display_name || a.username || 'Usuário';
  }

  avatarAmigo(a: Amigo | null): string {
    return a?.avatar_url || this.avatarPadrao;
  }

  isOnline(id: string): boolean {
    return this.usuariosOnline.has(id);
  }

  async carregarAmigos(): Promise<void> {
    if (!this.usuarioLogadoId) return;

    const [amigos, solicitacoes] = await Promise.all([
      this.obterAmigosConfirmados(),
      this.obterSolicitacoesPendentes()
    ]);

    this.amigos = amigos;
    this.solicitacoes = solicitacoes;

    if (amigos.length > 0) {
      const ultimo = await this.obterUltimoAmigoConversado(amigos);
      if (ultimo) await this.abrirConversa(ultimo);
    } else {
      this.contatoAtivo = null;
      this.mensagens = [];
    }
    this.cdr.detectChanges();
  }

  private async obterAmigosConfirmados(): Promise<Amigo[]> {
    const userId = this.usuarioLogadoId!;
    const { data: amizades, error } = await this.supabase
      .from('amizades')
      .select('solicitante_id, recebedor_id')
      .eq('status', 'aceito')
      .or(`solicitante_id.eq.${userId},recebedor_id.eq.${userId}`);

    if (error || !amizades || amizades.length === 0) return [];

    const ids = (amizades as any[]).map(item =>
      item.solicitante_id === userId ? item.recebedor_id : item.solicitante_id
    );

    const { data: perfis } = await this.supabase
      .from('perfis')
      .select('id, username, display_name, avatar_url')
      .in('id', ids);

    return (perfis as Amigo[]) || [];
  }

  private async obterSolicitacoesPendentes(): Promise<Amigo[]> {
    const userId = this.usuarioLogadoId!;
    const { data: solicitacoes, error } = await this.supabase
      .from('amizades')
      .select('solicitante_id, created_at')
      .eq('recebedor_id', userId)
      .eq('status', 'pendente');

    if (error || !solicitacoes || solicitacoes.length === 0) return [];

    const ids = (solicitacoes as any[]).map(s => s.solicitante_id);
    const { data: perfis } = await this.supabase
      .from('perfis')
      .select('id, username, display_name, avatar_url')
      .in('id', ids);

    return (perfis as Amigo[]) || [];
  }

  async enviarSolicitacao(): Promise<void> {
    const valor = this.addUsername.trim();
    if (!valor || !this.usuarioLogadoId) return;

    const nomeNormalizado = this.normalizarUsername(valor);
    if (nomeNormalizado.length < 3) {
      this.addStatus = 'Digite um nome de usuário válido.';
      this.addStatusErro = true;
      return;
    }

    this.addStatus = 'Enviando...';
    this.addStatusErro = false;

    const { data: perfil, error: erroPerfil } = await this.supabase
      .from('perfis')
      .select('id, username, display_name')
      .eq('username', nomeNormalizado)
      .maybeSingle();

    if (erroPerfil || !perfil) {
      this.addStatus = 'Usuário não encontrado.';
      this.addStatusErro = true;
      return;
    }
    if ((perfil as any).id === this.usuarioLogadoId) {
      this.addStatus = 'Você não pode adicionar a si mesmo!';
      this.addStatusErro = true;
      return;
    }

    const { error } = await this.supabase.from('amizades').insert([{
      solicitante_id: this.usuarioLogadoId,
      recebedor_id: (perfil as any).id,
      status: 'pendente'
    }]);

    if (error) {
      this.addStatus = (error as any).code === '23505'
        ? 'Já existe uma solicitação ou amizade com este usuário.'
        : 'Não foi possível enviar a solicitação.';
      this.addStatusErro = true;
      return;
    }

    const nomeExibicao = (perfil as any).display_name || (perfil as any).username;
    this.addStatus = `Solicitação enviada para ${nomeExibicao} (@${(perfil as any).username})!`;
    this.addStatusErro = false;
    this.addUsername = '';
    setTimeout(() => { this.addStatus = ''; this.cdr.detectChanges(); }, 4000);
  }

  async aceitarSolicitacao(sol: Amigo): Promise<void> {
    const { error } = await this.supabase
      .from('amizades')
      .update({ status: 'aceito' })
      .eq('solicitante_id', sol.id)
      .eq('recebedor_id', this.usuarioLogadoId!);

    this.mostrarToast(error ? 'Erro ao aceitar solicitação.' : 'Amizade aceita!', !!error);
    await this.carregarAmigos();
  }

  async recusarSolicitacao(sol: Amigo): Promise<void> {
    await this.removerAmigoPorId(sol.id);
    this.mostrarToast('Solicitação recusada', false);
    await this.carregarAmigos();
  }

  private async removerAmigoPorId(idAmigo: string): Promise<boolean> {
    const userId = this.usuarioLogadoId!;
    const { error } = await this.supabase
      .from('amizades')
      .delete()
      .or(`and(solicitante_id.eq.${userId},recebedor_id.eq.${idAmigo}),and(solicitante_id.eq.${idAmigo},recebedor_id.eq.${userId})`);
    return !error;
  }

  clicarRemoverAmigo(): void {
    if (!this.contatoAtivo) return;
    if (!this.removerConfirmando) {
      this.removerConfirmando = true;
      this.removerTimer = setTimeout(() => {
        this.removerConfirmando = false;
        this.cdr.detectChanges();
      }, 4000);
      return;
    }
    clearTimeout(this.removerTimer);
    this.removerConfirmando = false;
    this.confirmarRemocao();
  }

  private async confirmarRemocao(): Promise<void> {
    if (!this.contatoAtivo) return;
    const ok = await this.removerAmigoPorId(this.contatoAtivo.id);
    this.mostrarToast(ok ? 'Removido com sucesso.' : 'Não foi possível remover.', !ok);
    if (ok) {
      this.contatoAtivo = null;
      this.mensagens = [];
      await this.carregarAmigos();
    }
  }

  // ---------- Conversa ----------
  private async obterUltimoAmigoConversado(lista: Amigo[]): Promise<Amigo | null> {
    if (!lista || lista.length === 0) return null;
    const { data: ultimaMsg } = await this.supabase
      .from('mensagens')
      .select('sender_id, receiver_id, created_at')
      .or(`sender_id.eq.${this.usuarioLogadoId},receiver_id.eq.${this.usuarioLogadoId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ultimaMsg) return lista[0];
    const m = ultimaMsg as any;
    const ultimoId = m.sender_id === this.usuarioLogadoId ? m.receiver_id : m.sender_id;
    return lista.find(a => a.id === ultimoId) || lista[0];
  }

  async abrirConversa(amigo: Amigo): Promise<void> {
    this.contatoAtivo = amigo;
    this.removerConfirmando = false;
    await this.buscarHistorico();
    await this.marcarComoLidas();
    this.conectarRealtime();
    if (window.innerWidth <= 768 || document.body.classList.contains('sidebar-expanded')) this.contatosOcultos = true;
    this.cdr.detectChanges();
  }

  private async buscarHistorico(): Promise<void> {
    if (!this.contatoAtivo || !this.usuarioLogadoId) return;
    this.mensagens = [];
    const { data, error } = await this.supabase
      .from('mensagens')
      .select('*')
      .or(`and(sender_id.eq.${this.usuarioLogadoId},receiver_id.eq.${this.contatoAtivo.id}),and(sender_id.eq.${this.contatoAtivo.id},receiver_id.eq.${this.usuarioLogadoId})`)
      .order('created_at', { ascending: true });

    if (!error && data) {
      this.mensagens = data as Mensagem[];
      this.rolarParaFinal();
    }
  }

  async enviarMensagem(): Promise<void> {
    const texto = this.mensagemTexto.trim();
    if (!texto || !this.contatoAtivo || !this.usuarioLogadoId) return;
    this.mensagemTexto = '';

    const { data, error } = await this.supabase
      .from('mensagens')
      .insert([{
        sender_id: this.usuarioLogadoId,
        receiver_id: this.contatoAtivo.id,
        conteudo: texto,
        lido: false
      }])
      .select()
      .single();

    if (error) {
      this.mostrarToast('Erro ao enviar: ' + error.message, true);
    } else if (data) {
      this.adicionarOuAtualizarBalao(data as Mensagem);
      this.rolarParaFinal();
    }
  }

  private async marcarComoLidas(): Promise<void> {
    if (!this.contatoAtivo || !this.usuarioLogadoId) return;
    await this.supabase
      .from('mensagens')
      .update({ lido: true })
      .eq('sender_id', this.contatoAtivo.id)
      .eq('receiver_id', this.usuarioLogadoId)
      .eq('lido', false);
  }

  // ---------- Realtime + presença (port do chat.js) ----------
  private iniciarPresenca(): void {
    this.canalPresenca = this.supabase.channel('online-users');
    this.canalPresenca
      .on('presence', { event: 'sync' }, () => {
        const state = this.canalPresenca.presenceState();
        this.usuariosOnline.clear();
        Object.values(state).forEach((presencas: any) => {
          presencas.forEach((p: any) => this.usuariosOnline.add(p.user_id));
        });
        this.cdr.detectChanges();
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await this.canalPresenca.track({ user_id: this.usuarioLogadoId });
        }
      });
  }

  private conectarRealtime(): void {
    if (!this.contatoAtivo || !this.usuarioLogadoId) return;
    if (this.canalRealtime) this.supabase.removeChannel(this.canalRealtime);

    const contatoId = this.contatoAtivo.id;
    const meuId = this.usuarioLogadoId;

    this.canalRealtime = this.supabase
      .channel(`chat-sala-${contatoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens' }, (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const msg = payload.new as Mensagem;
          if (
            (msg.sender_id === contatoId && msg.receiver_id === meuId) ||
            (msg.sender_id === meuId && msg.receiver_id === contatoId)
          ) {
            this.adicionarOuAtualizarBalao(msg);
            if (payload.eventType === 'INSERT') {
              this.rolarParaFinal();
              if (msg.sender_id === contatoId) {
                this.tocarSom();
                this.notificarAba();
                this.marcarComoLidas();
              }
            }
            this.cdr.detectChanges();
          }
        }
      })
      .on('broadcast', { event: 'digitando' }, (p: any) => {
        if (p.payload.sender_id === contatoId) {
          this.digitando = true;
          this.cdr.detectChanges();
        }
      })
      .on('broadcast', { event: 'parou_digitando' }, (p: any) => {
        if (p.payload.sender_id === contatoId) {
          this.digitando = false;
          this.cdr.detectChanges();
        }
      })
      .subscribe();
  }

  onDigitando(): void {
    if (!this.contatoAtivo || !this.canalRealtime || !this.usuarioLogadoId) return;
    this.canalRealtime.send({
      type: 'broadcast',
      event: 'digitando',
      payload: { sender_id: this.usuarioLogadoId }
    });
    clearTimeout(this.timerDigitando);
    this.timerDigitando = setTimeout(() => {
      this.canalRealtime?.send({
        type: 'broadcast',
        event: 'parou_digitando',
        payload: { sender_id: this.usuarioLogadoId }
      });
    }, 2000);
  }

  // ---------- Anexos + áudio ----------
  clicarAnexar(): void {
    if (!this.contatoAtivo) {
      this.mostrarToast('Selecione um contato primeiro.', true);
      return;
    }
    this.fileInputRef?.nativeElement.click();
  }

  async onArquivoSelecionado(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.contatoAtivo || !this.usuarioLogadoId) return;

    if (file.size > 5 * 1024 * 1024) {
      this.mostrarToast('O arquivo deve ter no máximo 5MB.', true);
      input.value = '';
      return;
    }

    this.mostrarToast('Enviando anexo...', false);
    const ext = file.name.split('.').pop();
    const nome = `${this.usuarioLogadoId}/${Date.now()}.${ext}`;

    const { error } = await this.supabase.storage.from('anexos').upload(nome, file);
    if (error) {
      this.mostrarToast('Erro: ' + error.message, true);
      input.value = '';
      return;
    }

    const { data: publicData } = this.supabase.storage.from('anexos').getPublicUrl(nome);
    const { data: msgData } = await this.supabase
      .from('mensagens')
      .insert([{
        sender_id: this.usuarioLogadoId,
        receiver_id: this.contatoAtivo.id,
        conteudo: publicData.publicUrl,
        lido: false
      }])
      .select()
      .single();

    if (msgData) {
      this.adicionarOuAtualizarBalao(msgData as Mensagem);
      this.rolarParaFinal();
    }
    input.value = '';
  }

  async alternarGravacaoAudio(): Promise<void> {
    if (!this.contatoAtivo) {
      this.mostrarToast('Selecione um contato para gravar áudio.', true);
      return;
    }

    if (!this.gravandoAudio) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];
        this.mediaRecorder.ondataavailable = (e: any) => this.audioChunks.push(e.data);
        this.mediaRecorder.onstop = async () => {
          const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
          await this.enviarAudio(blob);
          stream.getTracks().forEach(t => t.stop());
        };
        this.mediaRecorder.start();
        this.gravandoAudio = true;
        this.mostrarToast('Gravando áudio...', false);
      } catch {
        this.mostrarToast('Permissão de microfone negada.', true);
      }
    } else {
      this.mediaRecorder?.stop();
      this.gravandoAudio = false;
    }
  }

  private async enviarAudio(blob: Blob): Promise<void> {
    if (!this.contatoAtivo || !this.usuarioLogadoId) return;
    this.mostrarToast('Enviando áudio...', false);
    const nome = `${this.usuarioLogadoId}/${Date.now()}_audio.webm`;

    const { error } = await this.supabase.storage
      .from('anexos')
      .upload(nome, blob, { contentType: 'audio/webm' });

    if (error) {
      this.mostrarToast('Erro ao enviar áudio: ' + error.message, true);
      return;
    }

    const { data: publicData } = this.supabase.storage.from('anexos').getPublicUrl(nome);
    const { data: msgData, error: msgError } = await this.supabase
      .from('mensagens')
      .insert([{
        sender_id: this.usuarioLogadoId,
        receiver_id: this.contatoAtivo.id,
        conteudo: publicData.publicUrl,
        lido: false
      }])
      .select()
      .single();

    if (!msgError && msgData) {
      this.adicionarOuAtualizarBalao(msgData as Mensagem);
      this.rolarParaFinal();
    }
  }

  // ---------- Render helpers ----------
  ehMinha(msg: Mensagem): boolean {
    return msg.sender_id === this.usuarioLogadoId;
  }

  formatarHora(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  ehUrl(texto: string): boolean {
    return !!texto && (texto.startsWith('http://') || texto.startsWith('https://'));
  }

  ehImagem(texto: string): boolean {
    if (!this.ehUrl(texto)) return false;
    const ext = texto.split('?')[0].toLowerCase().split('.').pop() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  }

  ehAudio(texto: string): boolean {
    if (!this.ehUrl(texto)) return false;
    const ext = texto.split('?')[0].toLowerCase().split('.').pop() || '';
    return ['webm', 'mp3', 'ogg', 'wav', 'm4a'].includes(ext);
  }

  abrirAnexo(url: string): void {
    window.open(url, '_blank');
  }

  private adicionarOuAtualizarBalao(msg: Mensagem): void {
    const i = this.mensagens.findIndex(m => m.id === msg.id);
    if (i >= 0) this.mensagens[i] = msg;
    else this.mensagens.push(msg);
  }

  private rolarParaFinal(): void {
    setTimeout(() => {
      const el = this.historicoRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  // ---------- Toast / som / aba ----------
  mostrarToast(texto: string, erro = false): void {
    const id = ++this.toastSeq;
    this.toasts.push({ id, texto, erro });
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
      this.cdr.detectChanges();
    }, 3000);
  }

  private tocarSom(): void {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch { /* bloqueado pelo navegador */ }
  }

  private notificarAba(): void {
    if (document.hidden) {
      this.mensagensNaoLidas++;
      document.title = `(${this.mensagensNaoLidas}) Nova mensagem!`;
    }
  }

  // ---------- Mobile ----------
  toggleContatos(): void {
    this.contatosOcultos = !this.contatosOcultos;
  }

  toggleSidebar(): void {
    document.body.classList.toggle('sidebar-expanded');
  }
}
