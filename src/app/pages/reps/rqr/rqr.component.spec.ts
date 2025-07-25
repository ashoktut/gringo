import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RqrComponent } from './rqr.component';

describe('RqrComponent', () => {
  let component: RqrComponent;
  let fixture: ComponentFixture<RqrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RqrComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RqrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
