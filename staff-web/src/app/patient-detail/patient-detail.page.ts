import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Firestore, doc, getDoc, updateDoc, collection, addDoc, onSnapshot, query, where} from '@angular/fire/firestore';
import { addIcons } from 'ionicons';
import { personOutline, createOutline, saveOutline, cardOutline, cashOutline, checkmarkCircle, documentTextOutline, downloadOutline } from 'ionicons/icons';
import { jsPDF } from 'jspdf';


@Component({
  selector: 'app-patient-detail',
  templateUrl: './patient-detail.page.html',
  styleUrls: ['./patient-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class PatientDetailPage implements OnInit {
  // inject firestore for database and activeted route to get the id from the url
  private firestore: Firestore = inject(Firestore);
  private route:ActivatedRoute = inject(ActivatedRoute);
  // state variables
  patientId: string | null = null;
  patientData: any = null;
  isLoading = true;
  isEditing = false;

  transactions: any[] = []; // store transaction log
  isPaymentModalOpen = false;
  // templete for manual payment
  newPayment = { amount:null, description: 'general consultation', date: '' };

  constructor() {
    // register icon
    addIcons({
      'person-outline': personOutline,
      'create-outline': createOutline,
      'save-outline': saveOutline,
      'card-outline': cardOutline,
      'cash-outline': cashOutline,
      'checkmark-circle': checkmarkCircle,
      'document-text-outline': documentTextOutline,
      'download-outline': downloadOutline
    });
   }

  ngOnInit() {
    // get the patient id from the url
    this.patientId = this.route.snapshot.paramMap.get('id');

    if (this.patientId){
      this.loadPatientProfile();
      this.loadTransactions();
    }
  }
  // fetches the patient info from the firestore
  async loadPatientProfile(){
    try {
      const docRef = doc(this.firestore, 'Users', this.patientId!);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()){
        this.patientData = docSnap.data();
      }
      this.isLoading = false;
    } catch (error) {
      console.error('Error fetching patient',error);
      this.isLoading = false;
    }
  }
  // toggles whether the edit fields are disable or editable.
  toggleEdit() {
    this.isEditing = !this.isEditing;
  }
  // update the patient info in the firestore with the new details.
  async savePatientDetails(){
    try {
      const docRef = doc(this.firestore, 'Users', this.patientId!);
      await updateDoc(docRef, {...this.patientData});

      this.isEditing = false;
      alert('Patient details updated successfully!');
    } catch (error: any) {
      alert('Failed to update: ' + error.message);
    }
  }
  // used filter query to find only this patient, also use onsnapshot to check instantly.
  loadTransactions(){
    const transRef = collection(this.firestore, 'transactions');
    const q = query(transRef, where('patientId', '==', this.patientId));

    onSnapshot(q, (snapshot) => {
      this.transactions = [];
      snapshot.forEach(doc => {
        this.transactions.push({ id: doc.id, ...doc.data()});
      });
      this.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }
  // manual entry
  async addPayment(){
    if (!this.newPayment.amount || !this.newPayment.date){
      alert('Please enter and amount and a date');
      return;
    }
    try {
      const receiptText = `Receipt for ${this.newPayment.description} paid on ${new Date(this.newPayment.date).toLocaleDateString()}. Amount: €${this.newPayment.amount}.`;
      const transRef = collection(this.firestore, 'transactions');
      await addDoc(transRef, {
        patientId: this.patientId,
        amount: this.newPayment.amount,
        description: this.newPayment.description,
        date: this.newPayment.date,
        type: 'payment',
        receiptText,
        createdAt: new Date().toISOString()
      });
      this.isPaymentModalOpen = false;
      this.newPayment = {amount: null, description: 'General Consultation', date: ''};
     } catch (error: any){
      alert('Error saving payment: ' + error.message);
     }
  }

  generateReceipt(transaction: any) {
    if (!transaction) {
      alert('No transaction details available.');
      return;
    }

    const doc = new jsPDF();
    const blue = "#005582";

    // Header
    doc.setFontSize(22);
    doc.setTextColor(blue);
    doc.text('DENTAL PRACTICE', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('123 Dental Street, Dublin, Ireland', 105, 27, { align: 'center' });
    doc.text('Phone: (01) 234 5678 | Email: clinic@dental.com', 105, 32, { align: 'center' });

    doc.setDrawColor(200);
    doc.line(20, 40, 190, 40);

    // Body
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('OFFICIAL RECEIPT', 20, 55);

    // receiptId genetate. first 8 characters of the transaction id.
    const receiptId = transaction.id ? transaction.id.substring(0, 8) : 'MANUAL';

    doc.setFontSize(11);
    doc.text(`Receipt ID: ${receiptId}`, 20, 65);
    doc.text(`Date Paid: ${new Date(transaction.date).toLocaleDateString()}`, 20, 72);
    
    // Added the Patient Name for the clinic's records
    const patientName = this.patientData?.name || 'Valued Patient';
    doc.text(`Patient Name: ${patientName}`, 20, 79);
    doc.text(`Payment Method: ${transaction.paymentMethod || 'Card / Cash'}`, 20, 86);

    // Table Header 
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 95, 170, 10, 'F');
    doc.text('Description', 25, 101);
    doc.text('Amount', 160, 101);

    // Table Row
    const description = transaction.description || transaction.type || 'General Payment';
    doc.text(description, 25, 115);
    doc.text(`€${transaction.amount}.00`, 160, 115);

    doc.line(20, 120, 190, 120);

    // Total
    doc.setFontSize(14);
    doc.text('TOTAL PAID:', 120, 135);
    doc.text(`€${transaction.amount}.00`, 160, 135);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Thank you for choosing our practice.', 105, 165, { align: 'center' });
    // save the pdf.
    doc.save(`Receipt_${receiptId}.pdf`);
  }

}
