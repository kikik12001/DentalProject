import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

// connect to firebase authentication
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  //import modules to HTML can use Ionic components and forms
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class LoginPage {
  //variables to hold what the ueser types in the email and passwrd fields
  email = '';
  password = '';

  //constructor injects the tools (auth and router) into this page
  constructor(private auth: Auth, private router: Router) { }

  //function that runs when the user clicks login button
  async login() {
    try {
      //this firebase function sends the date to server to check if the email and password are correct
      await signInWithEmailAndPassword(this.auth, this.email, this.password);
      
      //if the login is successful, navigate to the home page
      this.router.navigate(['/home']);
    } catch (error:any) {
      //if firebase says "no", we show an error message to the user
      alert('Login failed: ' + error.message);
    }
  }
}
