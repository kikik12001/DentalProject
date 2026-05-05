import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientDetailPage } from './patient-detail.page';

describe('PatientDetailPage', () => {
  let component: PatientDetailPage;
  let fixture: ComponentFixture<PatientDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PatientDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
