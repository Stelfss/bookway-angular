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
import { Premium } from './pages/index/premium/premium';
import { Search } from './pages/index/search/search';
import { About } from './pages/index/about/about';
import { Chat } from './pages/index/chat/chat';
import { Bookshelf } from './pages/index/bookshelf/bookshelf';
import { Leitura } from './pages/index/leitura/leitura';
import { Helpcenter } from './pages/index/helpcenter/helpcenter';
import { TermoAcessibilidade } from './pages/index/termo-acessibilidade/termo-acessibilidade';
import { Faq } from './pages/index/faq/faq';
import { Settings } from './pages/index/settings/settings';
import { UserProfile } from './pages/index/user/user';
import { authGuard } from './core/guards/auth.guard';

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
      { path: 'faq', component: Faq },
      { path: 'contacts-home', component: ContactsHome }
    ]
  },

  // Rotas Internas (Com Header, Sidebar e Footer do MainLayout)
  {
    path: '',
    component: MainLayout,
    children: [
      { path: 'home', component: Home },
      { path: 'premium', component: Premium },
      { path: 'search', component: Search },
      { path: 'about', component: About },
      { path: 'chat', component: Chat },
      { path: 'helpcenter', component: Helpcenter },
      { path: 'termo-acessibilidade', component: TermoAcessibilidade },
      { path: 'bookshelf', component: Bookshelf, canActivate: [authGuard] },
      { path: 'settings', component: Settings, canActivate: [authGuard] },
      { path: 'user', component: UserProfile, canActivate: [authGuard] },
      { path: 'perfil/:username', component: UserProfile, canActivate: [authGuard] }
      // As novas páginas internas (chat, perfil, etc.) entram aqui como filhas
    ]
  },

  // Leitor em tela cheia, fora do MainLayout (igual ao livro.html original)
  { path: 'ler', component: Leitura, canActivate: [authGuard] },

  {
    path: '**',
    redirectTo: ''
  }
];