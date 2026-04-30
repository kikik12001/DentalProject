import { Component, OnInit } from '@angular/core';
import { IonicModule} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { addIcons} from 'ionicons';
import { logOutOutline, calendarOutline } from 'ionicons/icons';
import { Firestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit, QuerySnapshot } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged, signOut } from '@angular/fire/auth';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})

export class HomePage implements OnInit {
  patientName: string = '';
  //creat a variable called upcomingAppointment.
  upcomingAppointment: any = null;

  constructor(private auth: Auth, private firestore: Firestore, private router: Router) {
    addIcons({ 'log-out-outline': logOutOutline, 'calendar-outline': calendarOutline });
  }

  ngOnInit() {
    //onAuthStateChanged checks if a user is logged in right now.
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        //if a user is found, we run these two funcions using their unique ID (UID)
        this.loadPatientData(user.uid);
        this.loadNearestAppointment(user.uid);
      } else {
        //if someone tries to access /home without login, kick them back to login page.
        this.router.navigate(['/login']);
      }
    });
  }
// This function gets the Patient's name for the "welcome" message.
  async loadPatientData(uid: string) {
    const userSnap = await getDoc(doc(this.firestore, `Users/${uid}`));
      if (userSnap.exists()) {
        this.patientName = userSnap.data()['name'];
      }
    }
//search logic
  async loadNearestAppointment(uid: string) {
    try {
      // tell the app to look in the 'Appointments' folder in Firebase
      const apptRef = collection(this.firestore, 'Appointments');
      //create a "query"
      const q = query(
        apptRef,
        //only get appointments where the 'patientID' matches the logged-in user
        where('patientId', '==', uid),
        //sort them by date in ascending order so the soonest is first
        orderBy('date', 'asc'),
        //only get 1 at the top of the list even if there are many appointments.
        limit(1)
      );
      
      // execute the search and wait for the results
      const querySnapshot = await getDocs(q);

      //check if we found any appointments
      if (!querySnapshot.empty) {
        // if the search result is not empty, save the first item [0] to our variable
        this.upcomingAppointment = querySnapshot.docs[0].data();
      } else {
        //if we didn't find any appointments, the variable stays null, triggering the "no appointments" message in the HTML
        this.upcomingAppointment = null;
      }
    } catch (error) {
      //error message if something goes wrong with the search
      console.error("Error loading appointment:", error);
    }
  }
  
  async logout(){
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
}
