import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import {Auth, createUserWithEmailAndPassword} from '@angular/fire/auth';
import {Firestore, doc, setDoc} from '@angular/fire/firestore';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class RegisterPage  {

  patientData = {

    name: '',
    dob: '',
    phone: '',
    address: '',
    email: '',
    password: '',
    allergies: '',
    pps: ''
   };
  

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) { }

  async registerPatient() {
    //check if all required fields are filled in
    if (!this.patientData.name || !this.patientData.dob || !this.patientData.phone || !this.patientData.address || !this.patientData.email || !this.patientData.password) {
      //if any are missing, we show this alert
      alert('Please fill in all required fields.');
      return;
    }


    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth, 
        this.patientData.email, 
        this.patientData.password);

        const userID = userCredential.user.uid;

        const userDocRef = doc(this.firestore, `Users/${userID}`);

        await setDoc(userDocRef, {
          name: this.patientData.name,
          dob: this.patientData.dob,
          phone: this.patientData.phone,
          address: this.patientData.address,
          email: this.patientData.email,
          allergies: this.patientData.allergies,
          pps: this.patientData.pps,
          role: 'patient'
         });
        
         alert('Account created successfully!');
         // when the account is created, we navigate to the login page
         this.router.navigate(['/login']);

    } catch (error:any) {
      console.error('Error registering:', error);
      alert('Registration failed: ' + error.message);
    }
  }
  }


