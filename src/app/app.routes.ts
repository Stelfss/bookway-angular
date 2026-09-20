import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { LoginComponent } from './pages/login/login';
import { MainLayoutComponent } from './layout/main-layout/main-layout';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: 'home', component: Home }
      // conforme for convertendo as próximas páginas, adicione aqui, ex:
      // { path: 'bookshelf', component: Bookshelf },
      // { path: 'chat', component: Chat },
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' }
];
