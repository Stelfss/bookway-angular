   import { Component } from '@angular/core';
   import { CommonModule } from '@angular/common';
   import { RouterLink } from '@angular/router';

   @Component({
     selector: 'app-premium',
     standalone: true,
     imports: [CommonModule, RouterLink],
     templateUrl: './premium.html',
     styleUrls: ['./premium.css']
   })
   export class Premium {}