
import { Component, Input, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, forwardRef } from '@angular/core';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { MapLibreService } from '../../services/shared/Map/map-libre.service'; // Update path to match your service

// Interface defining the structure of location data that the component will output
interface LocationValue {
  lng: number; // Longitude coordinate
  lat: number; // Latitude coordinate
  address?: string; // Optional human-readable address
}

@Component({
  selector: 'app-map-libre-picker',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
],
  providers: [
        // This provider enables the component to work with Angular reactive forms
    // It tells Angular that this component can be used as a form control
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MapLibrePickerComponent),
      multi: true
    }
  ],
  templateUrl: './map-libre-picker.component.html',
  styleUrl: './map-libre-picker.component.css',
})
export class MapLibrePickerComponent implements OnInit, AfterViewInit, OnDestroy, ControlValueAccessor {
  // ViewChild decorator to get reference to the map container div
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  // Input properties that can be configured from the parent component
  @Input() defaultCenter: [number, number] = [28.0473, -26.2041]; // [lng, lat] - Johannesburg default
  @Input() zoom: number = 10; // Initial zoom level (1-20 scale)
  @Input() height: string = '400px'; // Map height as CSS value
  @Input() enableGeocoding: boolean = true; // Show/hide search functionality
  @Input() enableLocationPicker: boolean = true; // Enable/disable click-to-select
  @Input() style: string = 'liberty'; // Default map style name

  // Component state properties
  searchAddress: string = ''; // Current value in the search input
  selectedStyle: string = 'liberty'; // Currently selected map style
  value: LocationValue | null = null; // Currently selected location data

  // Private properties for internal component management
  private map!: MapLibreMap; // The MapLibre map instance
  private marker: Marker | null = null; // Red marker showing selected location
  private mapId: string = ''; // Unique identifier for this map instance

  // ControlValueAccessor callbacks (required for Angular forms integration)
  // These functions are called by Angular's reactive forms system
  private onChange = (value: LocationValue | null) => {}; // Called when value changes
  private onTouched = () => {}; // Called when component is touched/interacted with

  constructor(private mapLibreService: MapLibreService) {
    // Generate a unique ID for this map instance to avoid conflicts
    this.mapId = 'maplibre-' + Math.random().toString(36).substr(2, 9);
    this.selectedStyle = this.style; // Initialize selected style
  }

  ngOnInit() {
    // Component initialization - no DOM manipulation here
    // Map creation happens in ngAfterViewInit when the view is ready
  }

  ngAfterViewInit() {
    // Initialize map after the view has been rendered
    // Use setTimeout to ensure DOM is fully ready
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  ngOnDestroy() {
    // Cleanup when component is destroyed to prevent memory leaks
    if (this.map) {
      this.map.remove(); // Remove the map instance
    }
  }

  /**
   * Initializes the MapLibre map instance and sets up event handlers
   */
  private initializeMap() {
    // Only proceed if we have a valid map container
    if (this.mapContainer) {
      // Set unique ID on the map container element
      this.mapContainer.nativeElement.id = this.mapId;

      // Get the style URL from available styles
      const styles = this.mapLibreService.getAvailableStyles();
      const styleUrl = styles[this.selectedStyle] || styles['liberty'];

      // Create the map using our service
      this.map = this.mapLibreService.createMap(
        this.mapContainer.nativeElement, // HTML element to render map in
        this.defaultCenter, // Initial center coordinates
        this.zoom, // Initial zoom level
        styleUrl // Map style URL
      );

      // Set up location picking functionality if enabled
      if (this.enableLocationPicker) {
        this.setupLocationPicker();
      }

      // Handle missing images dynamically for multiple icons
      // Dynamically load any Maki icon from assets/map-icons/{id}.svg, with alias support
      const iconAlias: { [key: string]: string } = {
        // General
        'atm': 'bank',
        'bank': 'bank',
        'office': 'commercial',
        'commercial': 'commercial',
        'complex': 'residential-community',
        'complexes': 'residential-community',
        'apartment': 'residential-community',
        'apartments': 'residential-community',
        'residential': 'residential-community',
        'residential_community': 'residential-community',
        'building': 'building',
        'buildings': 'building',
        'home': 'home',
        'house': 'home',
        'houses': 'home',
        'lift_gate': 'lift-gate',
        'lift-gate': 'lift-gate',
        'gate': 'gate',
        'swimming_pool': 'swimming',
        'swimming': 'swimming',
        'cycling': 'bicycle',
        'bicycle': 'bicycle',
        'school': 'school',
        'hospital': 'hospital',
        'restaurant': 'restaurant',
        'park': 'park',
        'parking': 'parking',
        'warehouse': 'warehouse',
        'stadium': 'stadium',
        'village': 'village',
        'town': 'town',
        'city': 'city',
        // Roofing
        'roof': 'home',
        'roofing': 'home',
        'gutter': 'building',
        'gutters': 'building',
        'tile': 'building',
        'tiles': 'building',
        'shingle': 'building',
        'shingles': 'building',
        'sheeting': 'building',
        'metal_roof': 'building',
        'flat_roof': 'building',
        'pitched_roof': 'building',
        // Trucking
        'truck': 'car',
        'trucking': 'car',
        'lorry': 'car',
        'semi': 'car',
        'trailer': 'car',
        'freight': 'car',
        'delivery': 'car',
        'logistics': 'car',
        'transport': 'car',
        'transportation': 'car',
        'fleet': 'car',
        // Construction
        'construction': 'construction',
        'site': 'construction',
        'yard': 'construction',
        'crane': 'construction',
        'equipment': 'construction',
        'machinery': 'construction',
        'excavator': 'construction',
        'bulldozer': 'construction',
        'dump_truck': 'car',
        'cement': 'construction',
        'concrete': 'construction',
        'scaffolding': 'construction',
        'materials': 'warehouse',
        'storage': 'warehouse',
        'supply': 'warehouse',
        'supplies': 'warehouse',
        // Add more aliases as needed
      };
      this.map.on('styleimagemissing', (e: any) => {
        const iconId = iconAlias[e.id] || e.id;
        const imagePath = `/assets/map-icons/${iconId}.svg`;
        this.map.loadImage(imagePath)
          .then((image: any) => {
            if (image) {
              this.map.addImage(e.id, image);
            }
          })
          .catch(() => {
            // Optionally log missing icon or fallback
          });
      });

      // If component already has a value (from form), display it on the map
      if (this.value) {
        this.setMarker(this.value.lng, this.value.lat, this.value.address);
        this.map.setCenter([this.value.lng, this.value.lat]);
        this.map.setZoom(15); // Zoom in to show the selected location
      }
    }
  }

  /**
   * Sets up click event handler for location selection
   */
  private setupLocationPicker() {
    // Add click event listener to the map
    this.map.on('click', async (e) => {
      const { lng, lat } = e.lngLat; // Get coordinates of clicked point

      // Try to get a human-readable address for the clicked location
      try {
        if ('reverseGeocode' in this.mapLibreService && typeof (this.mapLibreService as any).reverseGeocode === 'function') {
          const address = await (this.mapLibreService as any).reverseGeocode(lng, lat);
          this.updateLocation(lng, lat, address || undefined);
        } else {
          this.updateLocation(lng, lat);
        }
      } catch (error) {
        // If reverse geocoding fails, just use coordinates
        this.updateLocation(lng, lat);
      }
    });
  }

  /**
   * Searches for an address using the geocoding service
   */
  async searchLocation() {
    // Don't search if input is empty
    if (!this.searchAddress.trim()) return;

    // Use the geocoding service to find the address
    const result = await this.mapLibreService.geocodeAddress(this.searchAddress);

    if (result && result.length > 0) {
      // Get the first result from the array
      const firstResult = result[0];
      // If found, center map on the result and select it
      this.map.setCenter([firstResult.lng, firstResult.lat]);
      this.map.setZoom(15); // Zoom in to street level
      this.updateLocation(firstResult.lng, firstResult.lat, firstResult.display_name);
    } else {
      // Show error message if address not found
      alert('Location not found. Please try a different search term.');
    }
  }

  /**
   * Changes the map style when user selects a different style
   */
  changeMapStyle() {
    const styles = this.mapLibreService.getAvailableStyles();
    const styleUrl = styles[this.selectedStyle];

    if (styleUrl && this.map) {
      this.map.setStyle(styleUrl); // Apply new style to the map
    }
  }

  /**
   * Updates the selected location and notifies the form system
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   * @param address - Optional human-readable address
   */
  private updateLocation(lng: number, lat: number, address?: string) {
    // Update component's internal state
    this.value = { lng, lat, address };

    // Update the marker on the map
    this.setMarker(lng, lat, address);

    // Notify Angular's reactive forms system that the value has changed
    this.onChange(this.value);
    this.onTouched();
  }

  /**
   * Places or updates the red marker on the map
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   * @param address - Optional address for popup
   */
  private setMarker(lng: number, lat: number, address?: string) {
    // Remove existing marker if it exists
    if (this.marker) {
      this.marker.remove();
    }

    // Create new red marker at the specified location
    this.marker = new Marker({
      color: '#FF0000', // Red color to indicate selected location
      draggable: true // Allow user to drag marker to adjust location
    }).setLngLat([lng, lat]).addTo(this.map);

    // Set up drag handler for the marker
    this.marker.on('dragend', async () => {
      const lngLat = this.marker!.getLngLat();
      try {
        // Get address for new marker position (if reverseGeocode method exists)
        if (typeof (this.mapLibreService as any).reverseGeocode === 'function') {
          const address = await (this.mapLibreService as any).reverseGeocode(lngLat.lng, lngLat.lat);
          this.updateLocation(lngLat.lng, lngLat.lat, address || undefined);
        } else {
          this.updateLocation(lngLat.lng, lngLat.lat);
        }
      } catch (error) {
        // If reverse geocoding fails, just update coordinates
        this.updateLocation(lngLat.lng, lngLat.lat);
      }
    });
  }

  /**
   * Clears the selected location and removes the marker
   */
  clearLocation() {
    // Reset component state
    this.value = null;

    // Remove marker from map
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }

    // Notify form system that value has been cleared
    this.onChange(null);
    this.onTouched();
  }

  // ========== ControlValueAccessor Implementation ==========
  // These methods are required for the component to work with Angular reactive forms

  /**
   * Called by Angular when the form value is set programmatically
   * @param value - The location value to set
   */
  writeValue(value: LocationValue | null): void {
    this.value = value;

    // If we have a value and the map is ready, display it
    if (value && this.map) {
      this.map.setCenter([value.lng, value.lat]);
      this.map.setZoom(15);
      this.setMarker(value.lng, value.lat, value.address);
    }
  }

  /**
   * Registers the callback function for when the form value changes
   * @param fn - Callback function to call when value changes
   */
  registerOnChange(fn: (value: LocationValue | null) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers the callback function for when the form control is touched
   * @param fn - Callback function to call when control is touched
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
