import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/supabase';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  encapsulation: ViewEncapsulation.None // <-- Adiciona esta linha
})
export class Login {
  email: string = '';
  password: string = '';

  mensagemStatus: string = '';
  corMensagem: string = 'red';
  mostrarReenvio: boolean = false;
  textoReenvio: string = 'Reenviar e-mail de confirmação';
  
  isLoading: boolean = false;
  private msgTimeoutId: any = null;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  async onLogin(): Promise<void> {
    this.limparMensagem();
    this.isLoading = true;

    try {
      const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
        email: this.email.trim(),
        password: this.password,
      });

      if (error) {
        this.tratarErroLogin(error);
      } else {
        this.exibirMensagem('Login realizado com sucesso! A entrar...', 'green');
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 300);
      }
    } catch (err) {
      console.error('Erro inesperado no login:', err);
      this.exibirMensagem('Ocorreu um erro inesperado. Tente novamente.', 'red');
    } finally {
      this.isLoading = false;
    }
  }

  async reenviarEmail(): Promise<void> {
    this.textoReenvio = 'Reenviando...';
    const { error } = await this.supabaseService.client.auth.resend({
      type: 'signup',
      email: this.email.trim()
    });

    if (error) {
      this.exibirMensagem(`Não foi possível reenviar: ${error.message}`, 'red');
    } else {
      this.exibirMensagem('E-mail de confirmação reenviado! Verifique a sua caixa de entrada.', 'green');
      this.mostrarReenvio = false;
    }
    this.textoReenvio = 'Reenviar e-mail de confirmação';
  }

  async onGoogleLogin(): Promise<void> {
    this.exibirMensagem('A redirecionar para o Google...', 'black');

    const { error } = await this.supabaseService.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/home`
      }
    });

    if (error) {
      this.exibirMensagem(`Erro no Google: ${error.message}`, 'red');
    }
  }

  private tratarErroLogin(error: any): void {
    if (error.message.includes('Email not confirmed')) {
      this.exibirMensagem('Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.', 'red');
      this.mostrarReenvio = true;
      return;
    }

    let msg = error.message;
    if (msg.includes('Invalid login credentials')) {
      msg = 'E-mail ou palavra-passe incorretos.';
    }
    this.exibirMensagem(`Erro ao fazer login: ${msg}`, 'red');
  }

  private exibirMensagem(mensagem: string, cor: string): void {
    this.limparMensagem();
    this.mensagemStatus = mensagem;
    this.corMensagem = cor;

    if (cor === 'red') {
      this.msgTimeoutId = setTimeout(() => {
        this.mensagemStatus = '';
        this.mostrarReenvio = false;
      }, 5000);
    }
  }

  private limparMensagem(): void {
    if (this.msgTimeoutId) {
      clearTimeout(this.msgTimeoutId);
      this.msgTimeoutId = null;
    }
    this.mensagemStatus = '';
    this.mostrarReenvio = false;
  }
}