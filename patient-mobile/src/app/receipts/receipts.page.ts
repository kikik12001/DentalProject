import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular'; 
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { jsPDF } from 'jspdf';
import { addIcons } from 'ionicons';
import { receiptOutline, downloadOutline, cardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-receipts',
  templateUrl: './receipts.page.html',
  styleUrls: ['./receipts.page.scss'],
  standalone: true, 
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ReceiptsPage implements OnInit {
  transactions: any[] = [];
  isLoading = true;
  
  constructor(private firestore: Firestore, private auth: Auth) {
    addIcons({ receiptOutline, downloadOutline, cardOutline });
  }

  ngOnInit() {
    authState(this.auth).subscribe((user) => {
      if (user) { this.loadTransactions(user.uid); }
    });
  }

  async loadTransactions(uid: string) {
    try {
      const q = query(collection(this.firestore, 'transactions'), where('patientId', '==', uid));
      const querySnapshot = await getDocs(q);
      this.transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.transactions.sort((a, b) => b.date.localeCompare(a.date));
      this.isLoading = false;
    } catch (error) {
      console.error("Error:", error);
      this.isLoading = false;
    }
  }

  downloadPDF(item: any) {
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

    doc.setFontSize(11);
    doc.text(`Receipt ID: ${item.id.substring(0, 8)}`, 20, 65);
    doc.text(`Date Paid: ${new Date(item.date).toLocaleDateString()}`, 20, 72);
    doc.text(`Payment Method: ${item.paymentMethod || 'Stripe'}`, 20, 79);

    // Table Header
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 90, 170, 10, 'F');
    doc.text('Description', 25, 96);
    doc.text('Amount', 160, 96);

    // Table Row
    doc.text(item.type || 'Appointment Deposit', 25, 110);
    doc.text(`€${item.amount}.00`, 160, 110);

    doc.line(20, 115, 190, 115);

    // Total
    doc.setFontSize(14);
    doc.text('TOTAL PAID:', 120, 130);
    doc.text(`€${item.amount}.00`, 160, 130);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Thank you for choosing our practice.', 105, 160, { align: 'center' });

    doc.save(`Receipt_${item.id.substring(0, 5)}.pdf`);
  }
}
