import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase';

export interface AutorComentario {
  display_name?: string;
  username?: string;
  avatar_url?: string;
}

export interface Comentario {
  id: number | string;
  usuario_id: string;
  conteudo: string;
  criado_em: string;
  autor: AutorComentario;
  totalCurtidas: number;
  jaCurtido: boolean;
  eAutor: boolean;
}

export interface ComentarioComunidade {
  id: number | string;
  usuario_id: string;
  conteudo: string;
  criado_em: string;
  autor: AutorComentario;
  eAutor: boolean;
}

export interface Livro {
  id: number | string;
  titulo: string;
  autor?: string;
  capa?: string;
  descricao?: string;
  categoria?: string;
}

export interface Comunidade {
  id: number | string;
  titulo: string;
  capa?: string;
  descricao?: string;
  membros: number;
}

@Injectable({
  providedIn: 'root'
})
export class BaseService {
  private supabaseService = inject(SupabaseService);

  private get client() {
    return (this.supabaseService as any).client || 
           (this.supabaseService as any).supabaseClient || 
           this.supabaseService;
  }

  // ==========================================
  // 1. SESSÃO E PERFIL DO UTILIZADOR
  // ==========================================
  async verificarSessao(): Promise<boolean> {
    const { data: { session } } = await this.client.auth.getSession();
    return !!session;
  }

  async carregarFotoGlobal(): Promise<string | null> {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) return null;

    const { data: perfil } = await this.client
      .from('perfis')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    return perfil?.avatar_url || null;
  }

  // ==========================================
  // 2. LIVROS E BUSCA POR TÍTULO
  // ==========================================
  async obterIdPeloTitulo(tituloDoLivro: string): Promise<number | string | null> {
    if (!tituloDoLivro) return null;
    const { data, error } = await this.client
      .from('livros')
      .select('id')
      .eq('titulo', tituloDoLivro)
      .single();

    if (error || !data) {
      console.error('Livro não encontrado no banco pelo título:', error);
      return null;
    }
    return data.id;
  }

  // ==========================================
  // 3. COMENTÁRIOS E CURTIDAS (LIVROS)
  // ==========================================
  async carregarComentariosModal(livroId: string | number): Promise<Comentario[]> {
    const { data: { user } } = await this.client.auth.getUser();
    const idTratado = isNaN(Number(livroId)) ? livroId : parseInt(String(livroId), 10);

    const { data: comentarios, error } = await this.client
      .from('comentarios')
      .select(`
        id,
        usuario_id,
        conteudo,
        criado_em,
        perfis ( username, display_name, avatar_url ),
        curtidas_comentarios ( usuario_id )
      `)
      .eq('livro_id', idTratado)
      .order('criado_em', { ascending: false });

    if (error || !comentarios) {
      console.error('Erro ao carregar comentários:', error?.message);
      return [];
    }

    return comentarios.map((item: any) => {
      const autor = item.perfis || { display_name: 'Usuário', username: 'Usuário', avatar_url: './imagens/padrao.jpg' };
      const curtidas = item.curtidas_comentarios || [];
      return {
        id: item.id,
        usuario_id: item.usuario_id,
        conteudo: item.conteudo,
        criado_em: item.criado_em,
        autor,
        totalCurtidas: curtidas.length,
        jaCurtido: user ? curtidas.some((c: any) => c.usuario_id === user.id) : false,
        eAutor: user ? user.id === item.usuario_id : false
      };
    });
  }

  async enviarComentarioLivro(livroId: string | number, conteudo: string): Promise<{ sucesso: boolean; mensagem?: string }> {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) return { sucesso: false, mensagem: 'Você precisa estar logado para comentar!' };

    const idTratado = isNaN(Number(livroId)) ? livroId : parseInt(String(livroId), 10);

    const { error } = await this.client.from('comentarios').insert({
      livro_id: idTratado,
      usuario_id: user.id,
      conteudo: conteudo.trim()
    });

    if (error) {
      return { sucesso: false, mensagem: error.message };
    }

    return { sucesso: true };
  }

  async deletarComentarioLivro(comentarioId: string | number): Promise<boolean> {
    const { error } = await this.client
      .from('comentarios')
      .delete()
      .eq('id', comentarioId);

    if (error) {
      console.error('Erro ao excluir comentário:', error.message);
      return false;
    }
    return true;
  }

  async alternarCurtidaComentario(comentarioId: string | number, estaCurtido: boolean): Promise<boolean> {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) return false;

    if (estaCurtido) {
      await this.client
        .from('curtidas_comentarios')
        .delete()
        .eq('comentario_id', comentarioId)
        .eq('usuario_id', user.id);
    } else {
      await this.client.from('curtidas_comentarios').insert({
        comentario_id: comentarioId,
        usuario_id: user.id
      });
    }

    return true;
  }

  // ==========================================
  // 4. COMENTÁRIOS DE COMUNIDADE
  // ==========================================
  async carregarComentariosComunidadeModal(comunidadeId: string | number): Promise<ComentarioComunidade[]> {
    const { data: { user } } = await this.client.auth.getUser();
    const idTratado = isNaN(Number(comunidadeId)) ? comunidadeId : parseInt(String(comunidadeId), 10);

    const { data: comentarios, error } = await this.client
      .from('comentarios_comunidades')
      .select(`
        id,
        usuario_id,
        conteudo,
        criado_em,
        perfis ( username, display_name, avatar_url )
      `)
      .eq('comunidade_id', idTratado)
      .order('criado_em', { ascending: false });

    if (error || !comentarios) {
      console.error('Erro ao carregar comentários da comunidade:', error?.message);
      return [];
    }

    return comentarios.map((item: any) => {
      const autor = item.perfis || { display_name: 'Usuário', username: 'Usuário', avatar_url: './imagens/padrao.jpg' };
      return {
        id: item.id,
        usuario_id: item.usuario_id,
        conteudo: item.conteudo,
        criado_em: item.criado_em,
        autor,
        eAutor: user ? user.id === item.usuario_id : false
      };
    });
  }

  async enviarComentarioComunidade(comunidadeId: string | number, conteudo: string): Promise<{ sucesso: boolean; mensagem?: string }> {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) return { sucesso: false, mensagem: 'Você precisa estar logado para comentar!' };

    const idTratado = isNaN(Number(comunidadeId)) ? comunidadeId : parseInt(String(comunidadeId), 10);

    const { error } = await this.client.from('comentarios_comunidades').insert({
      comunidade_id: idTratado,
      usuario_id: user.id,
      conteudo: conteudo.trim()
    });

    if (error) {
      return { sucesso: false, mensagem: error.message };
    }

    return { sucesso: true };
  }

  async deletarComentarioComunidade(comentarioId: string | number): Promise<boolean> {
    const { error } = await this.client
      .from('comentarios_comunidades')
      .delete()
      .eq('id', comentarioId);

    if (error) {
      console.error('Erro ao excluir comentário da comunidade:', error.message);
      return false;
    }
    return true;
  }

  // ==========================================
  // 5. PESQUISA NO ACERVO
  // ==========================================
  async realizarBuscaAcervo(termoBusca: string = '', categoriaSelecionada: string = 'todos'): Promise<{ livros: Livro[]; comunidades: Comunidade[] }> {
    let livros: Livro[] = [];
    let comunidades: Comunidade[] = [];

    const termo = termoBusca.trim();

    try {
      if (categoriaSelecionada === 'todos') {
        const buscaLivros = this.client.from('livros').select('*').ilike('titulo', `%${termo}%`);
        const buscaComunidades = this.client.from('comunidades').select('*').ilike('titulo', `%${termo}%`);

        const [resLivros, resComunidades] = await Promise.all([buscaLivros, buscaComunidades]);

        if (!resLivros.error) livros = resLivros.data || [];
        if (!resComunidades.error) comunidades = resComunidades.data || [];
      } else if (categoriaSelecionada.toLowerCase() === 'comunidades') {
        let queryComms = this.client.from('comunidades').select('*');
        if (termo !== '') queryComms = queryComms.ilike('titulo', `%${termo}%`);

        const { data, error } = await queryComms;
        if (!error) comunidades = data || [];
      } else {
        let queryLivros = this.client.from('livros').select('*');

        if (categoriaSelecionada !== 'autores') {
          queryLivros = queryLivros.eq('categoria', categoriaSelecionada);
        }

        if (termo !== '') {
          if (categoriaSelecionada === 'autores') {
            queryLivros = queryLivros.ilike('autor', `%${termo}%`);
          } else {
            queryLivros = queryLivros.ilike('titulo', `%${termo}%`);
          }
        }

        const { data, error } = await queryLivros;
        if (!error) livros = data || [];
      }
    } catch (erro) {
      console.error('Erro na busca:', erro);
    }

    return { livros, comunidades };
  }

  // ==========================================
  // 6. INSCRIÇÃO EM COMUNIDADES
  // ==========================================
  async alternarInscricaoComunidade(comunidadeId: string | number, usuarioJaInscrito: boolean): Promise<boolean> {
    const idTratado = typeof comunidadeId === 'string' ? parseInt(comunidadeId, 10) : comunidadeId;

    if (usuarioJaInscrito) {
      const { error } = await this.client.rpc('sair_comunidade', { p_comunidade_id: idTratado });
      if (error) console.error('Erro ao sair:', error.message);
      return !error;
    } else {
      const { error } = await this.client.rpc('entrar_comunidade', { p_comunidade_id: idTratado });
      if (error) console.error('Erro ao entrar:', error.message);
      return !error;
    }
  }

  async verificarInscricaoComunidade(comunidadeId: string | number): Promise<{ inscrito: boolean; membros: number }> {
    const idTratado = typeof comunidadeId === 'string' ? parseInt(comunidadeId, 10) : comunidadeId;

    const [resComunidade, resUser] = await Promise.all([
      this.client.from('comunidades').select('membros').eq('id', idTratado).single(),
      this.client.auth.getUser()
    ]);

    const membros = resComunidade.data?.membros || 0;
    const user = resUser.data?.user;

    if (!user) return { inscrito: false, membros };

    const { data: inscricao } = await this.client
      .from('comunidade_membros')
      .select('*')
      .eq('comunidade_id', idTratado)
      .eq('usuario_id', user.id)
      .maybeSingle();

    return { inscrito: !!inscricao, membros };
  }

  // ==========================================
  // 7. STREAK / SEQUÊNCIA E HORA DE BRASÍLIA
  // ==========================================
  horaBrasilia(): string {
    const hojeISO = new Date();
    const horaBoa = hojeISO.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
    return `${horaBoa}-03:00`;
  }

  async verificarDia(userId: string, dataUltimoAcesso: string | null) {
    if (dataUltimoAcesso === null) {
      const horaNova = this.horaBrasilia();
      await this.client.from('perfis').update({
        data_ultimo_acesso: horaNova,
        sequencia: 0
      }).eq('id', userId);
    }
  }

  async atualizarSequencia(): Promise<{ sequencia: number; paginasLidasDia: number; estadoModal: string }> {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) return { sequencia: 0, paginasLidasDia: 0, estadoModal: 'seqNaoFeita' };

    const { data: perfil, error: perfilError } = await this.client
      .from('perfis')
      .select('data_ultimo_acesso, sequencia, maior_sequencia, objetivos_realizado, pagina_lidas_dia, paginas_lidas_total')
      .eq('id', user.id)
      .single();

    if (perfilError || !perfil) return { sequencia: 0, paginasLidasDia: 0, estadoModal: 'seqNaoFeita' };

    let sequenciaAtual = perfil.sequencia ?? 0;
    let dataUltimoAcesso = perfil.data_ultimo_acesso;
    let objetivosRealizado = perfil.objetivos_realizado;
    let paginasLidasDia = perfil.pagina_lidas_dia ?? 0;
    let paginasLidasTotal = perfil.paginas_lidas_total ?? 0;

    if (objetivosRealizado === null) {
      objetivosRealizado = false;
      await this.client.from('perfis').update({ objetivos_realizado: false }).eq('id', user.id);
    }

    const agoraBrasilia = this.horaBrasilia();
    let estadoModal = 'seqFeita';

    if (dataUltimoAcesso) {
      const oldDay = new Date(dataUltimoAcesso);
      const newDay = new Date(agoraBrasilia);
      oldDay.setHours(0, 0, 0, 0);
      newDay.setHours(0, 0, 0, 0);

      const diffTime = newDay.getTime() - oldDay.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1 && !objetivosRealizado) {
        estadoModal = 'seqNaoFeita';
        paginasLidasTotal += paginasLidasDia;
        paginasLidasDia = 0;
        await this.client.from('perfis').update({
          pagina_lidas_dia: paginasLidasDia,
          paginas_lidas_total: paginasLidasTotal
        }).eq('id', user.id);
      } else if (diffDays === 1 && objetivosRealizado) {
        sequenciaAtual += 1;
        objetivosRealizado = false;
        await this.client.from('perfis').update({
          sequencia: sequenciaAtual,
          objetivos_realizado: false,
          data_ultimo_acesso: agoraBrasilia
        }).eq('id', user.id);
        estadoModal = 'seqFeita';
      } else if (diffDays > 1) {
        sequenciaAtual = 0;
        objetivosRealizado = false;
        await this.client.from('perfis').update({
          sequencia: 0,
          objetivos_realizado: false,
          data_ultimo_acesso: agoraBrasilia
        }).eq('id', user.id);
        estadoModal = 'seqPerdida';
      } else if (diffDays === 0) {
        if (sequenciaAtual === 0 && objetivosRealizado) {
          sequenciaAtual = 1;
          objetivosRealizado = false;
          await this.client.from('perfis').update({
            sequencia: 1,
            objetivos_realizado: false,
            data_ultimo_acesso: agoraBrasilia
          }).eq('id', user.id);
          estadoModal = 'seqFeita';
        } else if (sequenciaAtual === 0 && !objetivosRealizado) {
          estadoModal = 'seqPerdida';
        } else {
          estadoModal = 'seqFeita';
        }
      }
    }

    if (sequenciaAtual > (perfil.maior_sequencia ?? 0)) {
      await this.client.from('perfis').update({ maior_sequencia: sequenciaAtual }).eq('id', user.id);
    }

    return { sequencia: sequenciaAtual, paginasLidasDia, estadoModal };
  }
}