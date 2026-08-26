import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

export const DEFAULT_COTISATION_DUE = 260;
export const MAX_ADHERENTS_PER_CATEGORY = 16;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
