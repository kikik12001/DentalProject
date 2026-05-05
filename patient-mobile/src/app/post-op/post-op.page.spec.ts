import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostOpPage } from './post-op.page';

describe('PostOpPage', () => {
  let component: PostOpPage;
  let fixture: ComponentFixture<PostOpPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PostOpPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
