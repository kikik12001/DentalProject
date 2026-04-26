import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { Firestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit, QuerySnapshot } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})

export class HomePage implements OnInit {
  patientName: string = '';
  //creat a variable called upcomingAppointment.
  upcomingAppointment: any = null;

  constructor(private auth: Auth, private firestore: Firestore) {}

  ngOnInit() {
    //onAuthStateChanged checks if a user is logged in right now.
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        //if a user is found, we run these two funcions using their unique ID (UID)
        this.loadPatientData(user.uid);
        this.loadNearestAppointment(user.uid);
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
}
