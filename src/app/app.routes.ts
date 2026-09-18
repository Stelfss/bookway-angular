import { Routes } from '@angular/router';
 import { Home } from './pages/home/home'; 
 import { LoginComponent } from './pages/login/login';
export const routes: Routes = [
  { path: 'home', component: Home },
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
