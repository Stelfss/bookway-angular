import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/supabase';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayoutComponent {
  streak = 0;
  termoPesquisa = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

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
}
