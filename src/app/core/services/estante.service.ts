import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase';

export interface ItemEstante {
  id: number | string;
  user_id?: string;
  titulo: string;
  autor?: string;
  capa_url?: string;
  status?: string;
}

export interface ResultadoEstante {
  ok: boolean;
  mensagem: string;
}

// Lógica portada de estante.js / listar-estante.js do projeto original.
// Tabela "estante": user_id, titulo, autor, capa_url, status ('quero_ler').
@Injectable({ providedIn: 'root' })
export class EstanteService {
  private readonly supabaseService = inject(SupabaseService);

  private get supabase() {
    return this.supabaseService.client;
  }

  async listar(): Promise<ItemEstante[]> {
    console.debug('[estante] obtendo usuário logado...');
    const { data: { user } } = await this.withTimeout(
      this.supabase.auth.getUser(),
      15000,
      'auth.getUser'
    );
    if (!user) return [];

    console.debug('[estante] consultando tabela estante...');
    const { data, error } = await this.withTimeout(
      this.supabase
        .from('estante')
        .select('*')
        .eq('user_id', user.id),
      15000,
      'estante listar'
    );

    if (error) {
      console.error('Erro ao buscar estante:', error.message);
      throw new Error(error.message);
    }

    return (data as ItemEstante[] | null) ?? [];
  }

  async adicionar(titulo: string, autor: string, capaUrl: string): Promise<ResultadoEstante> {
    const { data: { user }, error: authError } = await this.withTimeout(
      this.supabase.auth.getUser(),
      15000,
      'auth.getUser'
    );

    if (authError || !user) {
      return { ok: false, mensagem: 'Precisa de fazer login para adicionar livros à estante!' };
    }

    const tituloLimpo = titulo.trim();
    if (!tituloLimpo) {
      return { ok: false, mensagem: 'Livro sem título não pode ser adicionado.' };
    }

    const { error } = await this.withTimeout(
      this.supabase.from('estante').insert([
        {
          user_id: user.id,
          titulo: tituloLimpo,
          autor: autor.trim(),
          capa_url: capaUrl,
          status: 'quero_ler'
        }
      ]),
      15000,
      'estante adicionar'
    );

    if (error) {
      console.error('Erro ao adicionar livro:', error);
      return { ok: false, mensagem: `Erro ao adicionar livro: ${error.message}` };
    }

    return { ok: true, mensagem: `O livro "${tituloLimpo}" foi adicionado à sua estante!` };
  }

  async remover(id: number | string): Promise<boolean> {
    const { data: { user } } = await this.withTimeout(
      this.supabase.auth.getUser(),
      15000,
      'auth.getUser'
    );
    if (!user) return false;

    const { error } = await this.withTimeout(
      this.supabase
        .from('estante')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id),
      15000,
      'estante remover'
    );

    if (error) {
      console.error('Erro ao remover livro da estante:', error.message);
      return false;
    }
    return true;
  }

  // Garante que nenhuma chamada trave a tela em caso de falha de rede.
  private async withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Tempo esgotado em: ${label}`)), ms);
    });
    try {
      return await Promise.race([Promise.resolve(promise), timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
