import { Component, OnInit, OnDestroy, inject, ViewEncapsulation, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseService } from '../../core/services/base.service';
import { SupabaseService } from '../../core/supabase';


@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, FormsModule],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.css'],
  encapsulation: ViewEncapsulation.None 
})
export class MainLayout implements OnInit, OnDestroy {

  private baseService = inject(BaseService);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  isSidebarExpanded = false;
  termoPesquisa = '';
  sequencia = 0;
  paginasLidasDia = 0;
  estadoModal = 'seqPerdida';
  avatarUrl = './imagens/padrao.jpg';

  // --- MODAIS QUE VIVEM NO LAYOUT ---
  showCreateCommunityModal = false;
  showStreakModal = false;

  // Posição do dropdown de sequência, calculada a partir do botão que o abriu
  // (replica o comportamento do base.js original: card ancorado embaixo do ícone)
  streakDropdownStyle = { top: '0px', right: '0px' };

  newComm = {
    name: '',
    desc: '',
    color: '#3b82f6',
    image: ''
  };

  buscaAtiva = false;
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  private readonly avatarUpdatedListener = (event: Event): void => {
    const url = (event as CustomEvent<{ url?: string }>).detail?.url;
    if (url) this.avatarUrl = url;
  };

  async ngOnInit() {
    window.addEventListener('bookway:avatar-updated', this.avatarUpdatedListener);
    await this.carregarDadosUsuario();
  }

  ngOnDestroy(): void {
    window.removeEventListener('bookway:avatar-updated', this.avatarUpdatedListener);
  }

  async carregarDadosUsuario() {
    const foto = await this.baseService.carregarFotoGlobal();
    if (foto) {
      this.avatarUrl = foto;
    }

    const res = await this.baseService.atualizarSequencia();
    this.sequencia = res.sequencia;
    this.paginasLidasDia = res.paginasLidasDia;
    this.estadoModal = res.estadoModal;
  }

  toggleBusca() {
    if (!this.buscaAtiva) {
      this.buscaAtiva = true;
      setTimeout(() => this.searchInputRef?.nativeElement.focus());
      return;
    }
    if (this.termoPesquisa.trim()) {
      this.pesquisar();
    } else {
      this.buscaAtiva = false;
    }
  }

  toggleSidebar() {
    this.isSidebarExpanded = !this.isSidebarExpanded;
    document.body.classList.toggle('sidebar-expanded', this.isSidebarExpanded);
  }

  pesquisar() {
    if (this.termoPesquisa.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.termoPesquisa } });
    }
  }

  abrirModalCriarComunidade(event: Event) {
    event.preventDefault();
    this.showCreateCommunityModal = true;
  }

  abrirModalStreak(event: Event) {
    event.preventDefault();
    // Ancora o dropdown embaixo/à esquerda do ícone clicado, igual ao base.js original
    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    this.streakDropdownStyle = {
      top: `${rect.bottom + 8}px`,
      right: `${window.innerWidth - rect.right}px`
    };
    this.showStreakModal = true;
  }

  fecharModais(): void {
    this.showCreateCommunityModal = false;
    this.showStreakModal = false;
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
    this.fecharModais();
  }

  async logout() {
    // Utiliza a instância do SupabaseService para realizar o logout
    const client = (this.supabaseService as any).client || (this.supabaseService as any).supabaseClient || this.supabaseService;
    if (client.auth) {
      await client.auth.signOut();
    } else if (typeof (this.supabaseService as any).signOut === 'function') {
      await (this.supabaseService as any).signOut();
    }
    
    this.router.navigate(['/login']);
  }

  voltarAoTopo() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}