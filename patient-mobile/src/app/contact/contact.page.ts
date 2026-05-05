import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { locationOutline, callOutline, mailOutline, sendOutline } from 'ionicons/icons';
import emailjs from '@emailjs/browser';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ContactPage implements OnInit {
  private toastController: ToastController = inject(ToastController);

  contactData = {
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  };

  isSending = false;

  constructor() {
    addIcons({ locationOutline, callOutline, mailOutline, sendOutline });
  }

  ngOnInit() {}

  async sendMessage() {
    // Make sure they filled out the required boxes
    if (!this.contactData.name || !this.contactData.email || !this.contactData.message) {
      this.presentToast('Please fill out your name, email, and message.', 'warning');
      return;
    }

    this.isSending = true;

    try {
      // exact package matching with my template template in emailjs
      await emailjs.send(
        'service_lyt7gqn', // service id
        'template_882383h', // template id
        {
          name: this.contactData.name,            // Matches {{name}}
          phone_number: this.contactData.phone,   // Matches {{phone_number}}
          email: this.contactData.email,          // Matches {{email}}
          message: this.contactData.message,      // Matches {{message}}
          subject: this.contactData.subject       // Includes subject just in case you need it for the subject line
        },
        'BKadRMqrM05-shO4-' // public key
      );

      this.presentToast('Message sent successfully! We will contact you soon.', 'success');
      
      // Clear the form after sending
      this.contactData = { name: '', email: '', phone: '', subject: '', message: '' };

    } catch (error) {
      console.error('Error sending email:', error);
      this.presentToast('Failed to send message. Please try again.', 'danger');
    } finally {
      this.isSending = false;
    }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }
}