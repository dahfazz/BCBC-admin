import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  error = this.auth.error;

  async signIn(): Promise<void> {
    await this.auth.signInWithGoogle();
    if (this.auth.user()) {
      this.router.navigateByUrl('/');
    }
  }
}
