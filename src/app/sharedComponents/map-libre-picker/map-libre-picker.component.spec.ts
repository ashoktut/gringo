import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapLibrePickerComponent } from './map-libre-picker.component';

describe('MapLibrePickerComponent', () => {
  let component: MapLibrePickerComponent;
  let fixture: ComponentFixture<MapLibrePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapLibrePickerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapLibrePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
