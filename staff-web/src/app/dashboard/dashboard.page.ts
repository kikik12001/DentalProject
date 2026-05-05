import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import {addIcons} from 'ionicons';
import { searchOutline, closeCircle, personAdd, shieldCheckmarkOutline, logOutOutline, personCircleOutline, chevronForwardOutline, chevronBackOutline, calendarOutline } from 'ionicons/icons';
import { Firestore, collection, onSnapshot, orderBy, query, Unsubscribe, doc, setDoc, getDoc, addDoc, updateDoc } from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from '@angular/fire/auth';

// I use an interface here so TypeScript knows exactly what my database data looks like.
export interface Appointment {
  id: string;
  clinician: string;
  procedure: string;
  date: string;
  time: string;
  patientName: string;
  patientId: string;
  status: string;
  price: number;
  isPaid: boolean;
  depositPaid?: boolean;
  receiptText?: string;
  createdAt: any;
}

// It tells the calendar grid what each box should be.
export interface GridCell {
  type: 'booking' | 'empty' | 'hidden' | 'lunch';
  booking?: Appointment; //only filled if the type is booking
  span?: number; 
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class DashboardPage implements OnInit, OnDestroy {
  // inject these tools to use them anywhere in this file.
  // Connect to the Firebase database
  private firestore: Firestore = inject(Firestore);
  // connect to Firebase Authentication to handle login and user data.
  private auth: Auth = inject(Auth); 
  // helps navigate pages
  private router: Router = inject(Router);
  //forces the screen to update if it get stuck
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  
  // use this to stop listening to the live database when I leave the page.
  private liveSubscription!: Unsubscribe; 
  
  isStaffModalOpen = false; // controls the create staff popup
  currentUserRole: string = ''; //store the role of the logged in user.
  
  // blank template for creating new staff account.
  newStaff = {
    name: '',
    email: '',
    password: '',
    role: 'dentist' // Default in the dropdown
  };

  // calender variables
  appointmentList: Appointment[] = []; // hold the raw list of appointments downloaded from firebase.
  isLoading: boolean = true; //shows loading page while connecting to firebase.
  
  // Setting up grid columns
  staffList: string[] = ['Dr.Tadhg Carey', 'Dr.Sarah O Connor', 'Dr.Lee Murphy', 'Emily Brown'];
  timeSlots: string[] = [];
  
  // First key is time, second is clinician.
  calendarGrid: { [time: string]: {[clinician: string]: GridCell} } = {};

  // lunch break, use readonly for fixed values that won't change.
  readonly lunchBreakStartMinutes = 12 * 60 + 30;
  readonly lunchBreakEndMinutes = 13 * 60 + 30;
  
  // Gets today's date. the calendar will open on this date by default.
  currentViewDate: string = new Date().toISOString().split('T')[0];

  // A dictionary to handle both the color and the duration of each procedure and price.
 procedureDictionary: { [key: string]: { duration: number, border: string, bg: string, text: string, price: number } } = {
    'Exam': { duration: 30, border: '#2dd36f', bg: '#e5f9ed', text: '#1e8e49', price: 50 },
    'Scale and Polish': { duration: 30, border: '#3880ff', bg: '#ebf3ff', text: '#1e5dd1', price: 80 },
    'Filling': { duration: 30, border: '#ffc409', bg: '#fff9e6', text: '#b38a06', price: 130 },
    'Crown': { duration: 60, border: '#ffc409', bg: '#fff9e6', text: '#b38a06', price: 900 },
    'Composite Bonding': { duration: 120, border: '#ffc409', bg: '#fff9e6', text: '#b38a06', price: 250 },
    'Extraction': { duration: 30, border: '#eb445a', bg: '#fdeced', text: '#a32f3f', price: 180 },
    'Root Canal Treatment': { duration: 60, border: '#eb445a', bg: '#fdeced', text: '#a32f3f', price: 600 },
    'Dental Implant': { duration: 120, border: '#eb445a', bg: '#fdeced', text: '#a32f3f', price: 1200 }
  };

  // which clinician is allowed to do which procedure.
  clinicianSpecialties: { [key: string]: string[] } = {
    'Dr.Tadhg Carey': ['Exam', 'Filling', 'Extraction', 'Root Canal Treatment'],
    'Dr.Sarah O Connor': ['Exam', 'Filling', 'Extraction', 'Composite Bonding'],
    'Dr.Lee Murphy': ['Exam', 'Filling', 'Extraction', 'Dental Implant', 'Crown'],
    'Emily Brown': ['Scale and Polish']
  };

  // Helper function to filter the dropdown list
  getAvailableProcedures(clinicianName: string): string[] {
    // log for debug
    console.log('The calendar is asking for:', clinicianName); 
    
    // Try to find the specific list for this doctor
    const specificList = this.clinicianSpecialties[clinicianName];
    
    if (specificList) {
      console.log('Found their specific procedures:', specificList);
      return specificList;
    } else {
      console.warn('FAIL. Could not find an exact match for that name. Activating the Safety Net.');
      return Object.keys(this.procedureDictionary);
    }
  }
  
  isDuringLunchBreak(totalMinutes: number): boolean {
    return totalMinutes >= this.lunchBreakStartMinutes && totalMinutes < this.lunchBreakEndMinutes;
  }
  
  doesRangeOverlapLunch(startMinutes: number, duration: number): boolean {
    return startMinutes < this.lunchBreakEndMinutes && (startMinutes + duration) > this.lunchBreakStartMinutes;
  }

  parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(part => Number(part));
    return hours * 60 + minutes;
  }
    
  // PATIENT VARIABLES
  allPatients: any[] = [];      // Holds the master list of all patients downloaded from Firebase
  searchResults: any[] = [];    // Holds the filtered list that currently matches the search bar
  isNewPatientModalOpen = false; // Controls the Create Patient popup
  searchQuery: string = '';
  
  // A blank form that perfectly matches the mobile app's Firebase
  newPatient = {
    name: '',
    dob: '',
    email: '',
    phone: '',
    address: '',
    allergies: '',
    pps: ''
  };

  constructor() {
    // register the ionic icon that I imported at the top to use in HTML.
    addIcons({
      'search-outline': searchOutline,
      'close-circle': closeCircle,
      'person-add': personAdd,
      'shield-checkmark-outline': shieldCheckmarkOutline,
      'log-out-outline': logOutOutline,
      'person-circle-outline': personCircleOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'chevron-back-outline': chevronBackOutline,
      'calendar-outline': calendarOutline
    });
  }

  // Runs as soon as the page opens
  ngOnInit() {
    this.checkUserRole(); // check who is logged in
    this.generateTimeSlots(); // build the time columns of the calendar
  }

  // Turns off the live connection when I leave the page so the app doesn't leak memory
  ngOnDestroy() {
    if (this.liveSubscription) {
      this.liveSubscription(); //turn off
    }
  }

  // check firebase if its valid login data, if found it takes the user id and looks up role
  checkUserRole(){
    onAuthStateChanged(this.auth, async (user) => {
      if (user){
        console.log ('user is logged in UID:', user.uid); //debug
        //go get the data for the logged in user to see what their role is.
        const staffDocRef = doc(this.firestore, 'staff', user.uid);
        const staffDocSnap = await getDoc(staffDocRef);

        if (staffDocSnap.exists()) {
          this.currentUserRole = staffDocSnap.data()['role']; // if exists
          console.log('found database profile, role is: ', this.currentUserRole);
          // load the data and start listening for live changes.
          this.listenForLiveAppointments();
          this.loadPatientsForSearch();
          
          this.cdr.detectChanges(); // in case we need to update the screen after this async function.
        } else {
          console.error('no profile found')
        }

      } else {
        // if not logged in, kick back to login page.
        console.log ('no user is currently logged in');
        this.router.navigate(['/login']);
      }
    });
  }
 // function to create new staff account.
  async createNewStaff(){
    try{
      // create the login for the staff member in Firebase Authentication.
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        this.newStaff.email,
        this.newStaff.password
      );
      // save details in firestore 'staff' collection.
      const newStaffDocRef = doc(this.firestore, 'staff', userCredential.user.uid);
      await setDoc (newStaffDocRef, {
        name: this.newStaff.name,
        email: this.newStaff.email,
        role: this.newStaff.role,
        uid: userCredential.user.uid,
        createdAt: new Date()
      });

      alert('Staff account created successfully!');
      // reset form and close modal
      this.newStaff = { name: '', email: '', password: '', role: 'dentist'};
      this.isStaffModalOpen = false; // Close modal after creating
    } catch (error:any) {
      console.error('Creation failed:', error.message);
      alert('Error creating staff:' + error.message);
    }
  }

  async logout(){
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }  
  
  // A loop to build the 10 minute rows for the left side of table
  generateTimeSlots() {
    this.timeSlots = [];
    for (let hour = 9; hour < 17; hour++) {
      for (const minute of [0, 10, 20, 30, 40, 50]) {
        const hDisplay = hour < 10 ? '0' + hour : hour.toString();
        const mDisplay = minute < 10 ? '0' + minute : minute.toString();
        this.timeSlots.push(`${hDisplay}:${mDisplay}`);
      }
    }
  }
  // function to change the date on the calendar
  changeViewDate(days: number) {
    const current = new Date(this.currentViewDate);
    current.setDate(current.getDate() + days);
    this.currentViewDate = current.toISOString().split('T')[0];
    this.buildCalendarGrid(); // rebild the grid for the new date.
  }
 // user pick a date from the date picker
  onDateChange(event: any) {
    if (event?.detail?.value) {
      this.currentViewDate = event.detail.value;
      this.buildCalendarGrid();
    }
  }

  // Connects to Firebase and listens for new bookings in real time
  listenForLiveAppointments() {
    this.isLoading = true;
    const appointmentsRef = collection(this.firestore, 'appointments');
    const q = query(appointmentsRef, orderBy('createdAt', 'desc'));

    // onSnapshot keeps the connection open. If a patient books on mobile, this updates instantly.
    this.liveSubscription = onSnapshot(q, (snapshot) => {
      this.appointmentList = []; 
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        this.appointmentList.push({
          id: doc.id,
          clinician: data['clinician'],
          procedure: data['procedure'].trim(),
          date: data['date'],
          time: data['time'],
          patientName: data['patientName'] ||'Unknown',
          patientId: data['patientId'] || 'Unknown',
          status: data['status'] || 'pending',
          price: data['price'] || 0,
          isPaid: data['isPaid'] || false,
          depositPaid: data['depositPaid'] || false,
          receiptText: data['receiptText'] || '',
          createdAt: data['createdAt']
        });
      });
      
      // Once data is downloaded, re organize the grid
      this.buildCalendarGrid();
      this.isLoading = false; 
      
    }, (error) => {
      console.error('Error getting live appointments:', error);
      this.isLoading = false;
    });
  }

  // This function organizes the raw list of bookings into my calendar grid
  buildCalendarGrid() {
    //only look at booking for the slected date.
    const todaysBookings = this.appointmentList.filter(app => app.date === this.currentViewDate);
    
    // Fill the whole grid with 'empty' boxes first, and mark lunch rows clearly.
    this.timeSlots.forEach(time => {
      const timeMinutes = this.parseTimeToMinutes(time);
      this.calendarGrid[time] = {};

      this.staffList.forEach(staff => {
        // if the time slot is during lunch break, mark is as lunch, otherwise mark it empty.
        this.calendarGrid[time][staff] = this.isDuringLunchBreak(timeMinutes)
          ? { type: 'lunch' }
          : { type: 'empty' };
      });
    });

    // Loop through the actual bookings and put them in the right boxes
    todaysBookings.forEach(booking => {
      // if the booking is cancelled, skip it. leave as empty.
      if (booking.status === 'cancelled') {
        return;
      }

      const time = booking.time;
      const staff = booking.clinician;
      // look up how long is this procedure duration, and how many boxes it needs to fill in the calendar.
      const procedureRule = this.procedureDictionary[booking.procedure];
      // if dont have a duration for this procedure, default to 30 min.
      const duration = procedureRule ? procedureRule.duration : 30; 
      // at least fill 1 box
      const slotsNeeded = Math.max(1, duration / 10);

      if (this.calendarGrid[time] && this.calendarGrid[time][staff]) {
        this.calendarGrid[time][staff] = { type: 'booking', booking: booking, span: slotsNeeded };

        // Hide the boxes underneath it so they become un-bookable by other patients
        const timeIndex = this.timeSlots.indexOf(time);
        for (let i = 1; i < slotsNeeded; i++) {
          const nextTime = this.timeSlots[timeIndex + i];
          if (nextTime) {
            this.calendarGrid[nextTime][staff] = { type: 'hidden' };
          }
        }
      }
    });
  }

  // Links the HTML to my dictionary to get the correct background and text colors
  getProcedureStyle(procedure: string | undefined): any {
    if (!procedure) return {};
    const style = this.procedureDictionary[procedure] || { border: '#92949c', bg: '#f4f5f8', text: '#5c5d62' };
    return {
      'border-left': `4px solid ${style.border}`,
      'background-color': style.bg,
      'color': style.text
    };
  }

  // PATIENT CRM LOGIC (Search & Create)
  // downloads every patient from firebase and listens for change to works instantly.
  loadPatientsForSearch() {
    const usersRef = collection(this.firestore, 'Users');
    onSnapshot(usersRef, (snapshot) => {
      this.allPatients = [];
      snapshot.forEach(doc => {
        // We save the document ID so we know exactly which profile to open when clicked
        this.allPatients.push({ id: doc.id, ...doc.data() });
      });
    });
  }

  // Executes search only when button is clicked or enter is pressed
  executeSearch() {
    const queryStr = this.searchQuery.toLowerCase().trim();
    
    if (!queryStr) {
      this.searchResults = [];
      return;
    }

    // Filter by name or date of birth
    this.searchResults = this.allPatients.filter(patient => {
      const matchName = patient.name ? patient.name.toLowerCase().includes(queryStr) : false;
      const matchDob = patient.dob ? patient.dob.includes(queryStr) : false;
      return matchName || matchDob; 
    });

    if (this.searchResults.length === 0) {
      alert("No patients found matching that search.");
    }
  }

  // Clears the search bar manually
  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
  }
  // function to create new patient profile in firebase, name and dob are required.
  async createNewPatient() {
    if (!this.newPatient.name || !this.newPatient.dob ) {
      alert('Name and Date of Birth are required!');
      return;
    }

    try {
      // create the patient in user collection in firebase
      const usersRef = collection(this.firestore, 'Users');
      const patientRef = await addDoc(usersRef, {
        name: this.newPatient.name,
        dob: this.newPatient.dob,
        email: this.newPatient.email,
        phone: this.newPatient.phone,
        address: this.newPatient.address,
        pps: this.newPatient.pps,
        allergies: this.newPatient.allergies,
        role: 'patient', // Hardcoded so we reconise this is a patient.
        uid: '',
        patientId: '',
        createdAt: new Date().toISOString()
      });
      // update the doc to include own auto generated ids.
      await updateDoc(patientRef, {
        uid: patientRef.id,
        patientId: patientRef.id
      });

      alert('Patient Profile Created Successfully!');
      this.isNewPatientModalOpen = false; // Close the window
      
      // Reset the form back to blank for the next person
      this.newPatient = { name: '', dob: '', phone: '', email: '', address: '', allergies: '', pps: '' };
      
    } catch (error: any) {
      console.error('Database Error:', error);
      alert('Error creating patient: ' + error.message);
    }
  }
 // when click a patient from search bar navigate to the patient detail page.
  goToPatient(patientId: string) {
    this.searchResults = []; // Close the dropdown visually
    this.router.navigate(['/patient-detail', patientId]); 
  }

  // APPOINTMENT BOOKING LOGIC

  isBookingModalOpen = false;
  isEditModalOpen = false;
  selectedAppointment: Appointment | null = null; // hold the data of the selected appointment.
  // pop up the edit window when we click the existing booking on the calendar.
  openEditModal(booking: Appointment){
    console.log('Calendar box clicked, booking data:', booking); //debug
    // copy the booking data so we dont accidentally edit the live grid. 
    this.selectedAppointment = { ...booking};
    this.isEditModalOpen = true;

    this.cdr.detectChanges();
  }
  // update the appointment status 
  async saveAppointmentEdits(){
    // if the appointment is already paid we dont allow changing the status.
    if (this.selectedAppointment?.isPaid) {
      alert('This appointment is already paid. Status cannot be changed.');
      return; 
    }

    try {
      // find the exact appointment in the database using its ID
      const docRef = doc(this.firestore, 'appointments', this.selectedAppointment!.id);
      // update only the status field
      await updateDoc(docRef, {
        status: this.selectedAppointment!.status
      });

      this.isEditModalOpen = false; // close the window
    } catch (error: any) {
      alert('Failed to save: ' + error.message);
    }
  }
  
  async goToPayment() {
    if (!this.selectedAppointment) return;
    // generate a receipt text
    const receiptText = `Receipt for ${this.selectedAppointment.procedure} with ${this.selectedAppointment.clinician} on ${new Date().toLocaleString()}. Amount: €${this.selectedAppointment.price}. Thank you for choosing our practice.`;

    // Create the Transaction Record
    const transactionData = {
      patientId: this.selectedAppointment.patientId,
      appointmentId: this.selectedAppointment.id,
      amount: this.selectedAppointment.price || 0,
      date: new Date().toISOString(),
      procedure: this.selectedAppointment.procedure,
      description: this.selectedAppointment.procedure,
      clinician: this.selectedAppointment.clinician,
      status: 'paid',
      type: 'income',
      receiptText: receiptText
    };

    try {
      //save transaction in firebase in transactions collection
      const transRef = collection(this.firestore, 'transactions');
      const transactionDocRef = await addDoc(transRef, transactionData);
      // update the appointment to mark as isPaid.
      const apptRef = doc(this.firestore, 'appointments', this.selectedAppointment.id);
      await updateDoc(apptRef, { isPaid: true, receiptText });
      // update view so in changes immediately
      this.selectedAppointment.isPaid = true;
      this.selectedAppointment.receiptText = receiptText;

      this.isEditModalOpen = false;
      alert('Payment successful and receipt saved in Firestore!');

    } catch (error: any) {
      console.error("Payment Log Error:", error);
      alert('Failed to log payment: ' + (error?.message || error));
    }
  }

  // data for the new appointment we are creating
  newBooking = {
    patientName:'',
    patientId:'',
    procedure:'',
    clinician:'',
    time:'',
    date:''
  };

  // triggers when staff click an empty box on calendar 
  openBookingModal(time: string, clinician: string){
    //automatically fill the form with the time and dentist by just clicked
    this.newBooking.time = time;
    this.newBooking.clinician = clinician;
    this.newBooking.date = this.currentViewDate;
    this.newBooking.patientName = '';
    this.newBooking.procedure = '';
    
    // open the modal
    this.isBookingModalOpen = true;
  }
  // save the booking to firebase.
  async confirmAppointment() {
    // Don't save if data is missing.
    if (!this.newBooking.patientId) {
      alert('Please search and attach a valid patient first!');
      return;
    }
    if (!this.newBooking.procedure) {
      alert('Please select a treatment!');
      return;
    }

    try {
      // Look up the exact price for the selected procedure
      const procName = this.newBooking.procedure.trim();
      const procedureRule = this.procedureDictionary[procName];
      const duration = procedureRule?.duration || 30;
      const bookingStart = this.parseTimeToMinutes(this.newBooking.time);

      if (this.doesRangeOverlapLunch(bookingStart, duration)) {
        alert('This appointment would overlap the permanent lunch closure from 12:30 to 13:30. Please choose a different time or procedure.');
        return;
      }

      const calculatedPrice = procedureRule?.price || 0;

      // Push the complete package to Firebase
      await addDoc(collection(this.firestore, 'appointments'), {
        clinician: this.newBooking.clinician,
        procedure: procName,
        date: this.newBooking.date,
        time: this.newBooking.time,
        patientName: this.newBooking.patientName,
        patientId: this.newBooking.patientId, 
        status: 'pending', // All new web bookings from web start as Pending
        price: calculatedPrice,
        isPaid: false,
        createdAt: new Date()
      });

      // Close the window and clear the form.
      this.isBookingModalOpen = false;
      this.newBooking = { time: '', clinician: '', date: '', patientName: '', patientId: '', procedure: '' };
      
      console.log('Successfully synced to database!');

    } catch (error: any) {
      alert('Failed to save to database: ' + error.message);
    }
  }
}