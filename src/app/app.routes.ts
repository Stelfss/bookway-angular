import { Routes } from '@angular/router';
import { Index } from './pages/index/index';
import { Login } from './pages/index/login/login';

export const routes: Routes = [
  { path: '', component: Index },
  { path: 'login', component: Login }
];