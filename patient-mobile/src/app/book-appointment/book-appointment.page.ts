import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';


@Component({
  selector: 'app-book-appointment',
  templateUrl: './book-appointment.page.html',
  styleUrls: ['./book-appointment.page.scss'],
  standalone: true,
  imports:  [IonicModule, CommonModule, FormsModule]
})
export class BookAppointmentPage implements OnInit {

  clinicians = [
    { id: 1,
      name: 'Dr. Tadhg Carey',
      role: 'Dentist',
      image: 'assets/clinicians/carey.jpg',
      procedures: [
        {name: 'Exam', duration: 20},
        {name: 'Filling', duration: 30},
        {name: 'Extraction', duration: 30},
        {name: 'Root Canal Treatment', duration: 60}
      ]
    },
    { id: 2,
      name: 'Dr. Sarah O Connor',
      role: 'Dentist',
      image: 'assets/clinicians/oconnor.jpg',
      procedures: [
        {name: 'Exam', duration: 20},
        {name: 'Filling', duration: 30},
        {name: 'Extraction', duration: 30},
        {name: 'Composite Bonding', duration: 120}
      ]
    },
    {
      id: 3,
      name: 'Dr.Lee Murphy',
      role: 'Dentist',
      image: 'assets/clinicians/murphy.jpg',
      procedures:[
        {name: 'Exam', duration: 20},
        {name: 'Filling', duration: 30},
        {name: 'Extraction', duration: 30},
        {name: 'Dental Implant', duration: 120},
        {name: 'Crown', duration: 60}
      ]
    },
    {
      id: 4,
      name: 'Emily Brown',
      role: 'Hygienist',
      image: 'assets/clinicians/brown.jpg',
      procedures:[
        {name: 'Scale and Polish', duration: 30}
      ]
    }      
  ];

  selectedClinician: any = null;
  selectedProcedure: any = null;
  selectedDate: string = '';
  availableSlots: string[] =[];
  selectedTime: string ='';

  constructor() { }

  ngOnInit() {}
// this function will run when the patient clicks one of the card.
  selectClinician(clinician: any) {
    this.selectedClinician = clinician; //this saves the clicked dentist
    this.selectedProcedure = null; // reset procedure if they change dentist
    console.log('Patient selected:', clinician.name);
  
  }

  generateSlots(){

   this.availableSlots = [];
   this.selectedTime = '';
  // sent start time and End time (9am to 5pm)
   let currentPos = 540;
   const closingTime = 1020;

   // get the duration of the procedure the user picked
   const duration = this.selectedProcedure.duration;

   //loop : keep going as long as the appointment fits before closing time
   while (currentPos + duration <= closingTime) {

    // use tool to get the time in text format
    const timeLabel = this.formatTime(currentPos);

    // add text to the list of button
    this.availableSlots.push(timeLabel);

    // move the colock forward by the duration of the procedure
    currentPos = currentPos + duration;
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

}
