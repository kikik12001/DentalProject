import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router'; 
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  calendarOutline,
  addCircleOutline,
  documentTextOutline,
  notificationsOffOutline,
  cardOutline,
  chatbubbleEllipsesOutline,
  medkitOutline
} from 'ionicons/icons';
import { Firestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit } from '@angular/fire/firestore';
import { Auth, authState, signOut } from '@angular/fire/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
})
export class HomePage implements OnInit, OnDestroy {
  patientName: string = 'Patient';
  upcomingAppointment: any = null;
  private authSubscription!: Subscription;

  constructor(private auth: Auth, private firestore: Firestore, private router: Router) {
    // Registering all icons used in the dashboard
    addIcons({
      'log-out-outline': logOutOutline,
      'calendar-outline': calendarOutline,
      'add-circle-outline': addCircleOutline,
      'document-text-outline': documentTextOutline,
      'notifications-off-outline': notificationsOffOutline,
      'card-outline': cardOutline,           
      'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
      'medkit-outline': medkitOutline
    });
  }

  ngOnInit() {
    this.authSubscription = authState(this.auth).subscribe((user) => {
      if (user) {
        this.loadPatientData(user.uid);
        this.loadNearestAppointment(user.uid);
      } else {
        // if someone try to get in kick back to login
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  async loadPatientData(uid: string) {
    try {
      const userSnap = await getDoc(doc(this.firestore, `Users/${uid}`));
      if (userSnap.exists()) {
        this.patientName = userSnap.data()['name'];
      }
    } catch (error) {
      console.error("Error loading patient name:", error);
    }
  }

  async loadNearestAppointment(uid: string) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const apptRef = collection(this.firestore, 'appointments');

      // ask for the patient's appointments
      const q = query(
        apptRef,
        where('patientId', '==', uid)
      );

      const querySnapshot = await getDocs(q);
      const validStatuses = ['Awaiting Deposit', 'pending', 'confirmed'];

      let validAppointments: any[] = [];

      // Check the date and status here
      querySnapshot.forEach((doc) => {
        const appt = doc.data() as any;
        if (appt.date >= today && validStatuses.includes(appt.status)) {
          validAppointments.push(appt);
        }
      });

      // Sort by date and time 
      validAppointments.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

      // get the nearest one
      this.upcomingAppointment = validAppointments.length > 0 ? validAppointments[0] : null;

      console.log('Successfully loaded nearest appointment:', this.upcomingAppointment);

    } catch (error) {
      console.error("Error loading appointment:", error);
      this.upcomingAppointment = null;
    }
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  goToBookAppointment() {
    this.router.navigate(['/book-appointment']);
  }

  goToMyAppointments() {
    this.router.navigate(['/my-appointments']);
  }

  goToReceipts() {
  this.router.navigate(['/receipts']);
}

  goToContact() {
    this.router.navigate(['/contact']);
  }

  goToPostOp() {
    this.router.navigate(['/post-op']);
}
}