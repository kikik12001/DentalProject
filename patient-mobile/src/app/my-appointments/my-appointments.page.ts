import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, collection, query, where, getDocs, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-my-appointments',
  templateUrl: './my-appointments.page.html',
  styleUrls: ['./my-appointments.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})

export class MyAppointmentsPage implements OnInit {

  futureAppointments: any[] = []; // hold future appt
  pastAppointment: any[] = []; //hold past appt
  selectedSegment: string = 'future';
  selectedAppointmentId: string | null = null;
  currentUid: string | null = null;
  
  constructor(
    private firestore: Firestore,
    private alertController: AlertController,
    private auth: Auth,
    public router: Router
  ) { }

  ngOnInit() {
    // Ask Firebase directly who is logged in
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.currentUid = user.uid;
        console.log('Firebase Auth says user is:', user.uid);
        // We have the real ID Now go get the data.
        this.loadAppointments(user.uid);
      } else {
        console.error('Firebase Auth says: No one is logged in!');
      }
    });
  }
  // Load appointments for the current user
  async loadAppointments(patientId: string) {
    if (!patientId) {
      console.warn('loadAppointments called without a valid patientId');
      return;
    }
    // get today's date
    const today = new Date().toISOString().split('T')[0];

    try {
      // Use the ID we just got from Auth
      const q = query(
        collection(this.firestore, 'appointments'),
        where('patientId', '==', patientId)
      );
      // get the appointments from firestore
      const querySnapshot = await getDocs(q);
      // hold the future and past appointments in separate arrays
      this.futureAppointments = [];
      this.pastAppointment = [];
      
      const matchingAppointments: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        const savedPatientId = data?.patientId?.toString();

        console.log('loaded appointment doc:', doc.id, 'patientId=', savedPatientId, 'status=', data?.status);

        if (savedPatientId !== patientId) {
          console.warn('Skipping appointment because patientId does not match:', doc.id, savedPatientId);
          return;
        }

        matchingAppointments.push({ id: doc.id, ...data });
      });

      console.log('Appointments matching current user:', matchingAppointments.length, 'total docs returned:', querySnapshot.size);
      // separate the matching appointments into past and future based on date and status
      matchingAppointments.forEach((appointment) => {
        if (appointment.status === 'cancelled') {
          this.pastAppointment.push(appointment);
        } else if (appointment.date >= today) {
          this.futureAppointments.push(appointment);
        } else {
          this.pastAppointment.push(appointment);
        }
      });

      this.futureAppointments.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      this.pastAppointment.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

      console.log('Appointments fetched successfully via Auth ID');

    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  }
  // handle segment change between future and past appointment
  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
  }
  // toggle the selected appointment to show details or hide them.
  selectAppointment(appointmentId: string) {
    this.selectedAppointmentId = (this.selectedAppointmentId === appointmentId) ? null : appointmentId;
  }
  
  async cancelAppointment(appointmentId: string, event: Event) {
    event.stopPropagation();
    // give alert to confrim cancel and inform about deposit policy.
    const alert = await this.alertController.create({
      header: 'Cancel Appointment',
      message: `Are you sure you want to cancel this appointment? <br><br>
        <strong> Deposit Warning:</strong> If you paid a deposit, refunds are not automatically processed. The deposit will sit in your account. <br><br>
        <strong>For refund inquiries, please call the practice at 01-000-0000.</strong>`,
      buttons: [{
        text: 'No, Keep Appointment',
        role: 'Cancel'
      },{
        text: 'Yes, Cancel Appointment',
        handler: async () => {
          try {
            //if cancel is confrimed, update appointment status.
            const appointmentRef = doc(this.firestore, 'appointments', appointmentId );
            await updateDoc(appointmentRef, { status: 'cancelled' });

            if (this.auth.currentUser){
              this.loadAppointments(this.auth.currentUser.uid);
            }
          } catch(error) {
            console.error('error cancelling:', error);
          }
        }
      }
      ]
    });
    await alert.present();
  }
}
