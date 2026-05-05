import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline} from 'ionicons/icons';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LoginPage {
  // connect to firebase Auth
  private auth: Auth = inject(Auth);

  email = '';
  password = '';


  constructor(private router: Router) { 
    addIcons({
      'mail-outline': mailOutline,
      'lock-closed-outline': lockClosedOutline
    })
  }
  // function to handle the login, email and password required.
  async loginStaff(){
    if (!this.email || !this.password) {
      alert('Please enter both email and password.');
      return;
    }

    try{
      //ask firebase to verify the credentials
      await signInWithEmailAndPassword(this.auth, this.email, this.password);

      console.log('Login successful');
      
      //clear the form
      this.email ='';
      this.password = '';
      
      //if login successful, navigate to dashboard page
      this.router.navigate(['/dashboard']);

    } catch (error: any){
      console.error('Login Failed:', error.message);
      alert('Login Failed. Please check your email and password');
    }

    }
  }


