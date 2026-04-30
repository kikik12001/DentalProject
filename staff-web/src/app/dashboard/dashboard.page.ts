import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {IonicModule } from '@ionic/angular';
import { Firestore, collection, getDocs, orderBy, query } from '@angular/fire/firestore';

export interface Appointment {
  id: string;
  clinician: string;
  procedure: string;
  date: string;
  time: string;
  createdAt: any;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class DashboardPage implements OnInit {

  private firestore: Firestore = inject(Firestore);
  // hold the appointment exactly matching strick interface
  appointmentList: Appointment[] =[];
  // Tracks loading state
  isLoading: boolean = true;
  //columns
  staffList: string[] = ['Dr. Tadhg Carey', 'Dr. Sarah O Connor', 'Dr.Lee Murphy', 'Emily Brown'];
  //rows
  timeSlots: string[] = [];
  //actual grid
  calendarGrid: { [time: string]: {[clinician: string]: Appointment | null} } = {};
  //default to today's date
  currentViewDate : string = new Date().toISOString().split('T')[0];

  constructor(){}

  ngOnInit() {

    this.generateTimeSlots();
    this.fetchAppointments();
  }
  
  generateTimeSlots(){
    this.timeSlots = [];
    for (let hour = 9; hour < 17; hour++){
      const hDisplay = hour < 10 ? '0' + hour : hour.toString();
      this.timeSlots.push(`${hDisplay}:00`);
      this.timeSlots.push(`${hDisplay}:30`);
    }
  }

  async fetchAppointments() {
    this.isLoading = true;
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      const q = query(appointmentsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      this.appointmentList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        this.appointmentList.push({
          id: doc.id,
          clinician: data['clinician'],
          procedure: data['procedure'],
          date: data['date'],
          time: data['time'],
          createdAt: data['createdAt']
        });
      });
      //once data is downloaded, build the calendar grid
      this.buildCalendarGrid();
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        this.isLoading = false;
      }
    }

    buildCalendarGrid() {
      //isolate only the appointments that match the selected date
      const todaysBookings = this.appointmentList.filter(app => app.date === this.currentViewDate);
      // Loop through every time slot and every staff member to map the grid
      this.timeSlots.forEach(time => {
        this.calendarGrid[time] = {}; //creat the row

        this.staffList.forEach(staff => {
          //find if an appointment exists for this time and staff member
          const booking = todaysBookings.find(app => app.time === time && app.clinician === staff);
          //save the result to the gird
          this.calendarGrid[time][staff] = booking ? booking : null;
        });
      });
    }

}
