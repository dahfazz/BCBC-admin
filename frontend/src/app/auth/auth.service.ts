import { Injectable, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { environment } from '../../environments/environment';

const ALLOWED_EMAILS = ['fabien.zibi@gmail.com', 'bcbc92270@gmail.com', 'baaamadou928@gmail.com'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private app = initializeApp(environment.firebase);
  private auth = getAuth(this.app);

  readonly user = signal<User | null>(null);
  readonly initializing = signal(true);
  readonly error = signal('');

  readonly ready: Promise<void>;

  constructor() {
    this.ready = new Promise((resolve) => {
      onAuthStateChanged(this.auth, (user) => {
        if (user && !this.isAllowed(user.email)) {
          this.error.set("Ce compte n'est pas autorisé à accéder à l'administration.");
          signOut(this.auth);
          this.user.set(null);
        } else {
          this.user.set(user);
        }
        this.initializing.set(false);
        resolve();
      });
    });
  }

  private isAllowed(email: string | null): boolean {
    return !!email && ALLOWED_EMAILS.includes(email);
  }

  async signInWithGoogle(): Promise<void> {
    this.error.set('');
    try {
      await signInWithPopup(this.auth, new GoogleAuthProvider());
    } catch (err) {
      console.error('Sign-in failed:', err);
      this.error.set('La connexion a échoué. Réessayez.');
    }
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  getIdToken(): Promise<string | null> {
    return this.auth.currentUser ? this.auth.currentUser.getIdToken() : Promise.resolve(null);
  }
}
