import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/supabase';
import { StreakService } from '../../core/streak';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayoutComponent implements OnInit {
  termoPesquisa = '';
  avatarUrl = '/imagens/padrao.jpg';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    public streakService: StreakService
  ) {}

  async ngOnInit(): Promise<void> {
    // Equivalente a verificarSessao() do base.js: só quem está logado
    // pode ver as páginas do app. Sem sessão -> volta pro login.
    const {
      data: { session },
    } = await this.supabaseService.client.auth.getSession();

    if (!session) {
      this.router.navigate(['/login']);
      return;
    }

    // Equivalente a carregarFotoGlobal() + carregarDadosUsuario() do base.js
    this.carregarFotoGlobal();
    this.streakService.carregarDadosUsuario();
  }

  private async carregarFotoGlobal(): Promise<void> {
    const {
      data: { user },
    } = await this.supabaseService.client.auth.getUser();
    if (!user) return;

    const { data: perfil } = await this.supabaseService.client
      .from('perfis')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (perfil?.['avatar_url']) {
      this.avatarUrl = perfil['avatar_url'];
    }
  }

  toggleSidebar() {
    document.body.classList.toggle('sidebar-expanded');
  }

  async logout() {
    const { error } = await this.supabaseService.client.auth.signOut();
    if (!error) {
      this.router.navigate(['/login']);
    }
  }

  pesquisar() {
    // TODO: quando a página de busca (search) for convertida,
    // navegar pra ela passando o termo, ex:
    // this.router.navigate(['/search'], { queryParams: { q: this.termoPesquisa } });
    console.log('Pesquisando:', this.termoPesquisa);
  }

  abrirModalComunidade(event: Event) {
    event.preventDefault();
    // TODO: ligar aqui a lógica de abrir o modal "Criar Comunidade"
    // quando o createmodals/modal forem convertidos
  }

  voltarAoTopo() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
