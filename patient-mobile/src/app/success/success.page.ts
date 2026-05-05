import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, doc, updateDoc, collection, addDoc, getDoc } from '@angular/fire/firestore';
import { IonicModule } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Router } from '@angular/router';
import { closeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-success',
  templateUrl: './success.page.html',
  styleUrls: ['./success.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class SuccessPage implements OnInit {

  constructor(private firestore: Firestore, private router: Router) { }

  ngOnInit() {
    //ask if it has a saved booking Id in local storage
    const savedBookingId = localStorage.getItem('pendingBookingId');
    console.log('SuccessPage initialized. Found pendingBookingId in local storage:', savedBookingId);
    // if it does, run the function to confrim payment. if not, log an error message.
    if (savedBookingId) {
      this.confrimPaymentInDatabase(savedBookingId);
    } else {
      console.error('No pending booking ID found in local storage');
    }
  }

  async confrimPaymentInDatabase(bookingId: string) {
  try {
    // Setup the receipt details
    const todayStr = new Date().toLocaleDateString();
    const depositAmount = 30; // Your deposit amount
    const generatedReceipt = `Receipt for Deposit paid on ${todayStr}. Amount: €${depositAmount}.`;

    // Read the appointment to find out WHO the patient is and WHAT they booked
    const appointmentRef = doc(this.firestore, 'appointments', bookingId);
    const appointmentSnap = await getDoc(appointmentRef);
    
    let currentPatientId = 'Unknown';
    let currentProcedure = 'Treatment';

    if (appointmentSnap.exists()) {
      const data = appointmentSnap.data();
      currentPatientId = data['patientId'];
      currentProcedure = data['procedure'];
    }

    // Change status and attach the receipt text/paid badge
    await updateDoc(appointmentRef, { 
      status: 'confirmed',
      depositPaid: true,
      isPaid: false,
      receiptText: generatedReceipt
    });

    // Create the accounting ledger entry
    const receiptData = {
      appointmentId: bookingId,
      amount: depositAmount,
      paymentMethod: 'Stripe',
      type: 'Deposit',
      date: new Date().toISOString(),
      status: 'Successful',
      receiptText: generatedReceipt,
    
      patientId: currentPatientId,
      description: 'Deposit for ' + currentProcedure 
    };
    await addDoc(collection(this.firestore, 'transactions'), receiptData);

    // remove pendingbookingID from local storage
    localStorage.removeItem('pendingBookingId');
    console.log('payment verified, slot secured, and transaction logged in firebase');

    // Run your reminder function
    await this.scheduleReminder();

  } catch (error) {
    console.error('Error confirming payment in database:', error);
  }
}

  goMyAppointments(){
    this.router.navigate(['/my-appointments']);
  }

  async scheduleReminder() {
    if (!Capacitor.isNativePlatform()) {
      console.log('skipping phone notification');
      return;
    }

    try {
      let permStatus = await LocalNotifications.requestPermissions();
      if (permStatus.display === 'prompt') {
        permStatus = await LocalNotifications.requestPermissions();
      }
      if (permStatus.display !== 'granted') return;
      // getting reminder time calculate.
      const testTime = new Date(Date.now() + 1000 * 10);
      await LocalNotifications.schedule({
        notifications: [{
          title: 'Appointment Confrimed',
          body : 'We look forward to seeing you at your appointment! ',
          id: Math.floor(Math.random() * 10000), 
          schedule: { at: testTime },
        }]
      });
      console.log('reminder set successfully');
    } catch (error) {
      console.error('error setting reminder:', error);
    }
  }
}
