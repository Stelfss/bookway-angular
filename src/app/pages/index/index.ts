import { Component, ElementRef, ViewChild, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

interface Recurso {
  icon: string;
  titulo: string;
  descricao: string;
}

interface Comunidade {
  nome: string;
  membros: string;
  imagem: string;
}

interface Livro {
  titulo: string;
  genero: string;
  imagem: string;
}

@Component({
  selector: 'app-index',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './index.html',
  styleUrl: './index.css'
})
export class Index implements AfterViewInit {
  currentSection: string = 'inicio';

  recursos: Recurso[] = [
    {
      icon: '/imagens/Vetores/EstanteVetor.svg',
      titulo: 'Estante Inteligente',
      descricao: 'Organize suas leituras atuais, livros desejados e gerencie o progresso de páginas lidas de forma visual e simples.'
    },
    {
      icon: '/imagens/Vetores/ComunidadeVetor.svg',
      titulo: 'Comunidades Engajadas',
      descricao: 'Crie ou participe de círculos de leitores focados nos seus gêneros, mangás e universos favoritos.'
    },
    {
      icon: '/imagens/Vetores/DesafiosVetor.svg',
      titulo: 'Desafios e Quests',
      descricao: 'Mantenha sua rotina de leitura activa completando desafios saudáveis e acumulando dias de ofensiva premiados.'
    }
  ];

  comunidades: Comunidade[] = [
    { nome: 'Comunidade Hellsing', membros: '5k membros', imagem: '/imagens/hellsingcomunidade.webp' },
    { nome: 'Percy Jackson Brasil', membros: '15k membros', imagem: '/imagens/percyjackson.webp' },
    { nome: 'Jujutsu Kaisen Club', membros: '3.2k membros', imagem: '/imagens/jujutsu.webp' }
  ];

  livros: Livro[] = [
    { titulo: 'Frieren e a Jornada Para o Além', genero: 'Mangá / Fantasia', imagem: '/imagens/Frieren.webp' },
    { titulo: 'Hellsing Especial Vol. 01', genero: 'Mangá / Sobrenatural', imagem: '/imagens/Hellsing.webp' },
    { titulo: 'Dandadan 01', genero: 'Mangá / Ação', imagem: '/imagens/DanDaDan.webp' },
    { titulo: 'Death Note Black Edition', genero: 'Mangá / Suspense', imagem: '/imagens/DeathNote.webp' },
    { titulo: 'Attack on Titan Vol. 1', genero: 'Mangá / Distopia', imagem: '/imagens/AttackOnTitan.webp' }
  ];

  @ViewChild('booksWrapper') booksWrapper!: ElementRef;

  constructor(private router: Router) {}

  setSection(section: string): void {
    this.currentSection = section;
  }

  slideLeft(): void {
    if (this.booksWrapper) {
      this.booksWrapper.nativeElement.scrollBy({ left: -300, behavior: 'smooth' });
    }
  }

  slideRight(): void {
    if (this.booksWrapper) {
      this.booksWrapper.nativeElement.scrollBy({ left: 300, behavior: 'smooth' });
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const sections = document.querySelectorAll('section');
    sections.forEach((section) => {
      const sectionTop = (section as HTMLElement).offsetTop;
      if (window.scrollY >= sectionTop - 120) {
        this.currentSection = section.getAttribute('id') || '';
      }
    });
  }

  ngAfterViewInit(): void {
    this.initStatsObserver();
  }

  private initStatsObserver(): void {
    const statsSection = document.querySelector('.stats-section');
    const counters = document.querySelectorAll('.stat-number');

    if (statsSection && counters.length > 0) {
      const statsObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.startCounting(counters);
              statsObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );

      statsObserver.observe(statsSection);
    }
  }

  private startCounting(counters: NodeListOf<Element>): void {
    counters.forEach((counter) => {
      const target = +(counter.getAttribute('data-target') || 0);

      const updateCount = () => {
        const current = +(counter as HTMLElement).innerText.replace(/[^\d]/g, '');
        const increment = target / 35;

        if (current < target) {
          const nextValue = Math.ceil(current + increment);
          if (nextValue >= target) {
            (counter as HTMLElement).innerText = '+' + target.toLocaleString('pt-BR');
          } else {
            (counter as HTMLElement).innerText = '+' + nextValue.toLocaleString('pt-BR');
            setTimeout(updateCount, 25);
          }
        } else {
          (counter as HTMLElement).innerText = '+' + target.toLocaleString('pt-BR');
        }
      };

      updateCount();
    });
  }
}