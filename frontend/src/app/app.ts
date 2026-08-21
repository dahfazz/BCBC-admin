import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

export const DEFAULT_COTISATION_DUE = 260;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
