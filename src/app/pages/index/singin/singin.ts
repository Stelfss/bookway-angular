import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/supabase';

@Component({
  selector: 'app-singin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './singin.html',
  styleUrls: ['./singin.css']
})
export class Singin {
  username = '';
  email = '';
  password = '';
  repeatPassword = '';

  mensagemStatus = '';
  mensagemCor = '';
  isLoading = false;
  private msgTimeoutId: any = null;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  async onSubmit() {
    this.limparMensagem();

    const usernameTrimmed = this.username.trim();
    const emailTrimmed = this.email.trim();

    if (usernameTrimmed.length < 3) {
      this.exibirMensagem('O nome de usuário deve ter pelo menos 3 caracteres.', 'red');
      return;
    }

    if (!this.validarEmail(emailTrimmed)) {
      this.exibirMensagem('Por favor, insira um e-mail válido.', 'red');
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

    this.isLoading = true;

    try {
      // 1. VERIFICAÇÃO DE USERNAME
      const { data: usernameExists, error: checkError } = await this.supabaseService.client
        .rpc('check_username_exists', { p_username: usernameTrimmed });

      if (checkError) {
        console.error('Erro ao verificar disponibilidade do username:', checkError);
        this.exibirMensagem('Não foi possível verificar o nome de usuário. Tente novamente.', 'red');
        return;
      }

      if (usernameExists) {
        this.exibirMensagem('Este nome de usuário já está sendo usado. Escolha outro!', 'red');
        return;
      }

      // 2. CADASTRO DE UTILIZADOR
      const { data, error } = await this.supabaseService.client.auth.signUp({
        email: emailTrimmed,
        password: this.password,
        options: {
          data: {
            username: usernameTrimmed,
            display_name: usernameTrimmed
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

      if (data?.user && data.user.identities?.length === 0) {
        this.exibirMensagem('Este e-mail já está cadastrado. Verifique sua caixa de entrada ou faça login.', 'red');
        return;
      }

      this.exibirMensagem('Conta criada com sucesso! Verifique o seu e-mail para confirmar a conta.', '#22c55e');

      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3500);

    } catch (err) {
      console.error('Erro inesperado no cadastro:', err);
      this.exibirMensagem('Ocorreu um erro inesperado. Tente novamente.', 'red');
    } finally {
      this.isLoading = false;
    }
  }

  private validarEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private limparMensagem() {
    if (this.msgTimeoutId) {
      clearTimeout(this.msgTimeoutId);
      this.msgTimeoutId = null;
    }
    this.mensagemStatus = '';
  }

  private exibirMensagem(mensagem: string, cor: string) {
    this.limparMensagem();
    this.mensagemCor = cor;
    this.mensagemStatus = mensagem;

    if (cor === 'red') {
      this.msgTimeoutId = setTimeout(() => {
        this.mensagemStatus = '';
        this.msgTimeoutId = null;
      }, 5000);
    }
  }
}