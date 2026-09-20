import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { LoginComponent } from './pages/login/login';
import { IntroComponent } from './pages/intro/intro';
import { MainLayoutComponent } from './layout/main-layout/main-layout';
import { PublicLayoutComponent } from './layout/public-layout/public-layout';

export const routes: Routes = [
  {
    // Páginas "públicas" (antes de logar): intro, login, singin...
    // usam o PublicLayoutComponent (header + footer do site)
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', component: IntroComponent },
      { path: 'login', component: LoginComponent }
      // quando converter o singin, adicione aqui:
      // { path: 'singin', component: Singin },
    ]
  },
  {
    // Páginas do app (depois de logar): home, bookshelf, chat...
    // usam o MainLayoutComponent (sidebar + header do app)
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: 'home', component: Home }
      // conforme for convertendo, adicione aqui, ex:
      // { path: 'bookshelf', component: Bookshelf },
    ]
  }
];
