import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login', // When the app loads, it shows the login page first
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.page').then( m => m.RegisterPage)
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'book-appointment',
    loadComponent: () => import('./book-appointment/book-appointment.page').then( m => m.BookAppointmentPage)
  },
  {
    path: 'success',
    loadComponent: () => import('./success/success.page').then( m => m.SuccessPage)
  },
  {
    path: 'my-appointments',
    loadComponent: () => import('./my-appointments/my-appointments.page').then( m => m.MyAppointmentsPage)
  },
  {
    path: 'receipts',
    loadComponent: () => import('./receipts/receipts.page').then( m => m.ReceiptsPage)
  },
  {
    path: 'contact',
    loadComponent: () => import('./contact/contact.page').then( m => m.ContactPage)
  },
  {
    path: 'post-op',
    loadComponent: () => import('./post-op/post-op.page').then( m => m.PostOpPage)
  },
];
