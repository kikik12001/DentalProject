import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Firestore, collection, addDoc, query, where, getDocs, doc, getDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { bicycle } from 'ionicons/icons';

@Component({
  selector: 'app-book-appointment',
  templateUrl: './book-appointment.page.html',
  styleUrls: ['./book-appointment.page.scss'],
  standalone: true,
  imports:  [IonicModule, CommonModule, FormsModule]
})
export class BookAppointmentPage implements OnInit {
  // link to the cloud
  private firestore: Firestore = inject(Firestore);
  private auth: Auth = inject(Auth);

  clinicians = [
    { id: 1,
      name: 'Dr.Tadhg Carey',
      role: 'Dentist',
      image: 'https://i.pinimg.com/1200x/7b/bb/88/7bbb888925db75d16ca19bb90d29fb86.jpg',
      procedures: [
        {name: 'Exam', duration: 20, price: 50},
        {name: 'Filling', duration: 30, price: 130},
        {name: 'Extraction', duration: 30, price: 180},
        {name: 'Root Canal Treatment', duration: 60, price: 600}
      ]
    },
    { id: 2,
      name: 'Dr.Sarah O Connor',
      role: 'Dentist',
      image: 'https://i.pinimg.com/1200x/b4/8c/12/b48c12e4826a521b08feacd22db8683a.jpg',
      procedures: [
        {name: 'Exam', duration: 20, price: 50},
        {name: 'Filling', duration: 30, price: 130},
        {name: 'Extraction', duration: 30, price: 180},
        {name: 'Composite Bonding', duration: 120, price: 250}
      ]
    },
    {
      id: 3,
      name: 'Dr.Lee Murphy',
      role: 'Dentist',
      image: 'https://i.pinimg.com/736x/c8/80/7d/c8807dc2690976f075ecca5aa22455f2.jpg',
      procedures:[
        {name: 'Exam', duration: 20, price: 50},
        {name: 'Filling', duration: 30, price: 130},
        {name: 'Extraction', duration: 30, price: 180},
        {name: 'Dental Implant', duration: 120, price: 1200},
        {name: 'Crown', duration: 60, price: 900}
      ]
    },
    {
      id: 4,
      name: 'Emily Brown',
      role: 'Hygienist',
      image: 'https://i.pinimg.com/736x/6a/a4/48/6aa448849c75ccf4449e104a595a7180.jpg',
      procedures:[
        {name: 'Scale and Polish', duration: 30, price: 80}
      ]
    }      
  ];

  selectedClinician: any = null;
  selectedProcedure: any = null;
  selectedDate: string = '';
  availableSlots: string[] =[];
  selectedTime: string ='';
  

  readonly lunchBreakStartMinutes = 12 * 60 + 30;
  readonly lunchBreakEndMinutes = 13 * 60 + 30;
  readonly businessOpenMinutes = 9 * 60;
  readonly businessCloseMinutes = 17 * 60;

  constructor() { }

  ngOnInit() {}
// this function will run when the patient clicks one of the card.
  selectClinician(clinician: any) {
    this.selectedClinician = clinician; //this saves the clicked dentist
    this.selectedProcedure = null; // reset procedure if they change dentist
    console.log('Patient selected:', clinician.name);
  
  }

  parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(part => Number(part));
    return hours * 60 + minutes;
  }

  getProcedureDurationByName(name: string): number | undefined {
    const procedure = this.selectedClinician?.procedures?.find((proc: any) => proc.name === name);
    return procedure?.duration;
  }

  doesRangeOverlapLunch(startMinutes: number, duration: number): boolean {
    return startMinutes < this.lunchBreakEndMinutes && (startMinutes + duration) > this.lunchBreakStartMinutes;
  }

  doIntervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
    return startA < endB && startB < endA;
  }

  async generateSlots(){
  // clear old slots and selected time when generate new slots
   this.availableSlots = [];
   this.selectedTime = '';
  // do not search slot if any of the details are missing.
   if (!this.selectedClinician || !this.selectedProcedure || !this.selectedDate) {
    return;
   }

   try {
    // ask firebase for all the appointments that match the selected clinician and date
    const q = query(
      collection(this.firestore, 'appointments'),
      where('clinician', '==', this.selectedClinician.name),
      where('date', '==', this.selectedDate)
    );

    const querySnapshot = await getDocs(q);
    const bookedIntervals : Array<{ start: number; end: number; }> = [];

    querySnapshot.forEach((doc) => {
      const data: any = doc.data();
      if (data.status === 'cancelled') {
        return;
      }
      const bookedStart = this.parseTimeToMinutes(data['time']);
      const bookedDuration = this.getProcedureDurationByName(data['procedure']) ?? 30;
      bookedIntervals.push({ start: bookedStart, end: bookedStart + bookedDuration });
    });

    console.log ('firebase says these appointments are booked:', bookedIntervals);

    // search available start times from 9am to 5pm
     let currentPos = this.businessOpenMinutes;
     const closingTime = this.businessCloseMinutes;
     const duration = this.selectedProcedure.duration;

     while (currentPos + duration <= closingTime) {
      const timeLabel = this.formatTime(currentPos);

      if (!this.doesRangeOverlapLunch(currentPos, duration) &&
          !bookedIntervals.some(interval => this.doIntervalsOverlap(currentPos, currentPos + duration, interval.start, interval.end))) {
        this.availableSlots.push(timeLabel);
      }

      currentPos = currentPos + 10;
    }
  } catch (error){
    console.error('error generating slots:', error);
    }
   }

  // this tool takes a numner and give back text
  formatTime(totalMinutes: number): string {

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const hDisplay = hours <10 ? '0' + hours : hours;
    const mDisplay = minutes <10 ? '0' + minutes : minutes;

    return hDisplay + ':' + mDisplay;
  }
  //this saves the specific time string to the variable.
  selectTime(time: string) {
    this.selectedTime = time;
    console.log('Time chosen:', this.selectedTime)
  }

  async confirmBooking(){
    // give an alert if the user forget to fill out any of the details
    if(!this.selectedClinician || !this.selectedProcedure || !this.selectedDate || !this.selectedTime) {
      alert('Please fill out all the booking details');
      return;
    }
    // ask firebase authentication for the current user, give alrert if no user is logged in
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      alert('Please log in to book an appointment');
      return;
    }

    const bookingStart = this.parseTimeToMinutes(this.selectedTime);
    const bookingDuration = this.selectedProcedure.duration;
    const userDocRef = doc(this.firestore, `Users/${currentUser.uid}`);
    const userProfile = await getDoc(userDocRef);
    const patientName = userProfile.exists() ? userProfile.data()['name'] : currentUser.email;

    if (this.doesRangeOverlapLunch(bookingStart, bookingDuration)) {
      alert('This appointment would overlap the clinic lunch closure from 12:30 to 13:30. Please select a different available time.');
      return;
    }

    const bookingData = {
      clinician : this.selectedClinician.name,
      procedure: this.selectedProcedure.name,
      date: this.selectedDate,
      time: this.selectedTime,
      patientName: patientName,
      patientEmail: currentUser.email,
      patientId: currentUser.uid,
      status: 'Awaiting Deposit',
      price: this.selectedProcedure.price,
      createdAt: new Date()
    };

    try {
      console.log ('final data being sent to firebase:', bookingData);
      const docRef = await addDoc(collection(this.firestore, 'appointments'), bookingData);
      
      localStorage.setItem('pendingBookingId', docRef.id);
      console.log('Booking saved with ID:', docRef.id);

      const stripeUrl = 'https://buy.stripe.com/test_aFa00iboQcpG5OU6BT7ss00';
      window.open(stripeUrl, '_self');

    } catch (error) {
      console.error('Error confirming booking:', error);
    }
  }
}

