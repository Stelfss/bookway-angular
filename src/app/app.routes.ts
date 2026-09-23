import { Routes } from '@angular/router';
import { PublicLayout } from './layout/public-layout/public-layout';
import { MainLayout } from './layout/main-layout/main-layout'
import { Index } from './pages/index/index';
import { Login } from './pages/index/login/login';
import { Singin } from './pages/index/singin/singin';
import { AboutLogin } from './pages/index/about-login/about-login';
import { FaqHome } from './pages/index/faq-home/faq-home';
import { ContactsHome } from './pages/index/contacts-home/contacts-home';
import { Home } from './pages/index/home/home';

export const routes: Routes = [
  // Rotas Públicas (Landing Page e Visitantes)
  {
    path: '',
    component: PublicLayout,
    children: [
      { path: '', component: Index },
      { path: 'login', component: Login },
      { path: 'singin', component: Singin },
      { path: 'about-login', component: AboutLogin },
      { path: 'faq-home', component: FaqHome },
      { path: 'contacts-home', component: ContactsHome }
    ]
  },

  // Rotas Internas (Com Header, Sidebar e Footer do MainLayout)
  {
    path: '',
    component: MainLayout,
    children: [
      { path: 'home', component: Home }
      // As novas páginas internas (chat, perfil, etc.) entram aqui como filhas
    ]
  },

  // Fallback para caminhos desconhecidos
  {
    path: '**',
    redirectTo: ''
  }
];