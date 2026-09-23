import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-contacts-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './contacts-home.html',
  styleUrls: [
    './contacts-home.css',
    '../index.css'
  ]
})
export class ContactsHome {

  abrirChat(event: Event): void {
    event.preventDefault();
    alert('Para acessar o nosso chat ao vivo, você precisa estar conectado à sua conta Bookway. Faça o login ou crie sua conta gratuitamente!');
  }
}