import { Component, OnInit, inject, ViewEncapsulation, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../core/services/modal.service';
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
export class MainLayout implements OnInit {

  private modalService = inject(ModalService);
  private baseService = inject(BaseService);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  isSidebarExpanded = false;
  termoPesquisa = '';
  sequencia = 0;
  avatarUrl = './imagens/padrao.jpg';

  async ngOnInit() {
    await this.carregarDadosUsuario();
  }

   buscaAtiva = false;
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

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
  
  async carregarDadosUsuario() {
    const foto = await this.baseService.carregarFotoGlobal();
    if (foto) {
      this.avatarUrl = foto;
    }

    const res = await this.baseService.atualizarSequencia();
    this.sequencia = res.sequencia;
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
    this.modalService.openModal('criar-comunidade');
  }

  abrirModalStreak(event: Event) {
    event.preventDefault();
    this.modalService.openModal('streak-modal');
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