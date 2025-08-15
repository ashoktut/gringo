import { TestBed } from '@angular/core/testing';

import { MapLibreService } from './map-libre.service';

describe('MapLibreService', () => {
  let service: MapLibreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapLibreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
