import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/supabase';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  email = '';
  password = '';
  mensagemStatus = '';
  corMensagem = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async onSubmit() {
    this.mensagemStatus = '';
    const { error } = await this.supabaseService.client.auth.signInWithPassword({
      email: this.email,
      password: this.password
    });

    if (error) {
      this.corMensagem = 'red';
      this.mensagemStatus = error.message.includes('Invalid login credentials')
        ? 'E-mail ou palavra-passe incorretos.'
        : `Erro ao fazer login: ${error.message}`;
    } else {
      this.corMensagem = 'green';
      this.mensagemStatus = 'Login realizado com sucesso! A entrar...';
      setTimeout(() => this.router.navigate(['/home']), 100);
    }
  }
}
