import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/supabase';

@Component({
  selector: 'app-singin',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './singin.html',
  styleUrl: './singin.css'
})
export class SinginComponent {
  username = '';
  email = '';
  password = '';
  repeatPassword = '';
  mensagemStatus = '';
  corMensagem = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  private exibirMensagem(mensagem: string, cor: string) {
    this.corMensagem = cor;
    this.mensagemStatus = mensagem;

    if (cor === 'red') {
      setTimeout(() => {
        this.mensagemStatus = '';
      }, 5000);
    }
  }

  async onSubmit() {
    this.mensagemStatus = '';

    const usernameInput = this.username.trim();
    const emailInput = this.email.trim();

    // Validações básicas, iguais ao singin.js original
    if (usernameInput.length < 3) {
      this.exibirMensagem('O nome de usuário deve ter pelo menos 3 caracteres.', 'red');
      return;
    }

    if (this.password.length < 6) {
      this.exibirMensagem('A senha deve ter pelo menos 6 caracteres.', 'red');
      return;
    }

    if (this.password !== this.repeatPassword) {
      this.exibirMensagem('As senhas não coincidem!', 'red');
      return;
    }

    // 1. Verifica no banco se o username já existe
    const { data: usernameExists, error: checkError } = await this.supabaseService.client
      .rpc('check_username_exists', { p_username: usernameInput });

    if (checkError) {
      console.error('Erro ao verificar disponibilidade do username:', checkError);
    }

    if (usernameExists) {
      this.exibirMensagem('Este nome de usuário já está sendo usado. Escolha outro!', 'red');
      return;
    }

    // 2. Cadastro + verificação de e-mail
    const { error } = await this.supabaseService.client.auth.signUp({
      email: emailInput,
      password: this.password,
      options: {
        data: {
          username: usernameInput
        }
      }
    });

    if (error) {
      let msg = error.message;
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        msg = 'Este e-mail já está em uso.';
      }
      this.exibirMensagem(msg, 'red');
      return;
    }

    // 3. Sucesso
    this.exibirMensagem(
      'Conta criada com sucesso! Verifique o seu e-mail para confirmar a conta.',
      'green'
    );

    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 3500);
  }
}
