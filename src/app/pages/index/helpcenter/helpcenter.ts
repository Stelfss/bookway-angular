import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface ArtigoAjuda {
  pergunta: string;
  resposta: string;
}

export const ARTIGOS_AJUDA: ArtigoAjuda[] = [
  {
    pergunta: 'Como faço para me cadastrar e começar a ler?',
    resposta: `Para se cadastrar, clique no botão de login no canto superior, selecione 'Criar Conta' e insira seus dados. Após a confirmação do e-mail, você terá acesso imediato à nossa biblioteca digital.`
  },
  {
    pergunta: 'Quais são as formas de pagamento para assinar o plano premium?',
    resposta: 'Aceitamos cartões de crédito (Visa, MasterCard, Elo), PIX com aprovação instantânea e boleto bancário.'
  },
  {
    pergunta: 'Esqueci minha senha. Como redefini-la?',
    resposta: `Na tela de login, clique em 'Esqueci minha senha'. Enviaremos um link de recuperação diretamente para o e-mail cadastrado na sua conta.`
  },
  {
    pergunta: 'Como funcionam a assinatura premium e o período de trial?',
    resposta: 'O período de teste gratuito dura 7 dias. Caso não cancele antes do término, a assinatura mensal será gerada automaticamente na forma de pagamento escolhida.'
  },
  {
    pergunta: 'Meus livros salvos/progresso de leitura não estão sincronizando. O que fazer?',
    resposta: 'Verifique se você está conectado à internet e se a mesma conta está logada nos seus diferentes dispositivos. Tente atualizar a página ou limpar o cache do navegador.'
  }
];

@Component({
  selector: 'app-helpcenter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './helpcenter.html',
  styleUrl: './helpcenter.css'
})
export class Helpcenter {
  filtro = '';

  get artigosFiltrados(): ArtigoAjuda[] {
    const termo = this.filtro.trim().toLowerCase();
    if (!termo) return ARTIGOS_AJUDA;
    return ARTIGOS_AJUDA.filter(artigo =>
      artigo.pergunta.toLowerCase().includes(termo) ||
      artigo.resposta.toLowerCase().includes(termo)
    );
  }
}
