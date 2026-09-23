import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-faq-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './faq-home.html',
  styleUrls: [
    './faq-home.css',
    '../index.css'
  ]
})
export class FaqHome {
  openIndex: number | null = null;

  toggleFaq(index: number, event: Event): void {
    const button = event.currentTarget as HTMLElement;
    const faqItem = button.parentElement;
    const faqAnswer = faqItem?.querySelector('.faq-answer') as HTMLElement;

    // Se já estiver aberto, fecha
    if (this.openIndex === index) {
      this.openIndex = null;
      if (faqAnswer) {
        faqAnswer.style.maxHeight = '0px';
      }
      return;
    }

   
    const allAnswers = document.querySelectorAll('.faq-answer') as NodeListOf<HTMLElement>;
    allAnswers.forEach(ans => ans.style.maxHeight = '0px');


    this.openIndex = index;
    if (faqAnswer) {
      faqAnswer.style.maxHeight = (faqAnswer.scrollHeight + 40) + 'px';
    }
  }
}