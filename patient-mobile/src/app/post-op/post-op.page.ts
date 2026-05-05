import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { addIcons } from 'ionicons';
import { documentTextOutline, chevronForwardOutline, homeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-post-op',
  templateUrl: './post-op.page.html',
  styleUrls: ['./post-op.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class PostOpPage implements OnInit {
  private firestore: Firestore = inject(Firestore);
  guides: any[] = [];

  constructor() {
    addIcons({ documentTextOutline, chevronForwardOutline, homeOutline });
  }

  async ngOnInit() {
    await this.loadGuides();
  }

  async loadGuides() {
    try {
      const querySnapshot = await getDocs(collection(this.firestore, 'post-op-guides'));
      this.guides = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error loading guides:", error);
    }
  }

  openGuide(url: string) {
    if (url) {
      window.open(url, '_system'); // Opens the PDF in the phone's native browser/viewer
    }
  }
}
