import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about-login',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about-login.html',
  styleUrls: [
    './about-login.css',
    '../index.css'  
  ]
})
export class AboutLogin implements AfterViewInit {
  leitoresFormatado = '+0';
  private target = 15000;

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.iniciarContagem();
    }, 400);
  }

  private iniciarContagem(): void {
    let current = 0;
    const increment = this.target / 40;

    const updateCount = () => {
      if (current < this.target) {
        current = Math.ceil(current + increment);
        if (current >= this.target) {
          this.leitoresFormatado = '+' + this.target.toLocaleString('pt-BR');
        } else {
          this.leitoresFormatado = '+' + current.toLocaleString('pt-BR');
          setTimeout(updateCount, 30);
        }
      } else {
        this.leitoresFormatado = '+' + this.target.toLocaleString('pt-BR');
      }
    };

    updateCount();
  }
}