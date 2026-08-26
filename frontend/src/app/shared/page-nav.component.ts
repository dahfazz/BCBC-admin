import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-page-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './page-nav.component.html',
  styleUrl: './page-nav.component.scss',
})
export class PageNavComponent {}
