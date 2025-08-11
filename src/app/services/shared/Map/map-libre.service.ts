import { Injectable } from '@angular/core';
import { Map as MapLibreMap, Marker, Popup, LngLatBounds } from 'maplibre-gl';

// Interface for route calculation results
interface RouteResponse {
  distance: number; // Distance in meters
  duration: number; // Duration in seconds
  coordinates: [number, number][]; // Array of [lng, lat] coordinate pairs
}

@Injectable({
  providedIn: 'root'
})
export class MapLibreService {

  // Store multiple map instances by their container ID
  private maps: Map<string, MapLibreMap> = new Map();

  // Store user location marker for tracking
  private userLocationMarker: Marker | null = null;

  // Store watch ID for geolocation tracking
  private watchId: number | null = null;

  constructor() { }

  /**
   * Creates a new MapLibre map instance
   * @param container - HTML element or element ID to render map
   * @param center - Initial map center as [lng, lat] (Johannesburg default)
   * @param zoom - Initial zoom level (10 = city level)
   * @param style - OpenFreeMap style URL
   * @param address - Address string to geocode
   * @returns MapLibre Map instance
   *
   */
  createMap(
    container: string | HTMLElement,
    center: [number, number] = [28.0473, -26.2041], // [lng, lat] - Johannesburg coordinates
    zoom: number = 10,
    style: string = 'https://tiles.openfreemap.org/styles/liberty' // Default OpenFreeMap style
  ): MapLibreMap {

    // Create new MapLibre map with specified configuration
    const map = new MapLibreMap({
      container, // Where to render the map
      style, // Map style from OpenFreeMap (completely free)
      center, // Initial map center
      zoom, // Initial zoom level
      attributionControl: {} // Show attribution (required for free usage)
    });

    // Add custom attribution after map loads
    map.on('load', () => {
      map.addControl({
        onAdd: () => {
          const div = document.createElement('div');
          div.className = 'maplibregl-ctrl maplibregl-ctrl-attrib';
          div.innerHTML = '© <a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
          return div;
        },
        onRemove: () => {}
      });
    });

    // Store map instance for later reference
    if (typeof container === 'string') {
      this.maps.set(container, map);
    }

    return map;
  }

  /**
   * Enables real-time GPS location tracking
   * @param map - MapLibre map instance
   * @param callback - Function called when location updates
   * @param options - Geolocation options for accuracy and timing
   */
  startLocationTracking(
    map: MapLibreMap,
    callback: (lng: number, lat: number, accuracy: number) => void,
    options: PositionOptions = {
      enableHighAccuracy: true, // Use GPS for better accuracy
      timeout: 5000, // 5 second timeout
      maximumAge: 0 // Don't use cached location
    }
  ): void {
    // Check if browser supports geolocation
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      return;
    }

    // Start watching user position with continuous updates
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lng = position.coords.longitude;
        const lat = position.coords.latitude;
        const accuracy = position.coords.accuracy; // Accuracy in meters

        // Update existing marker or create new one
        if (this.userLocationMarker) {
          this.userLocationMarker.setLngLat([lng, lat]);
        } else {
          // Create blue marker for user location
          this.userLocationMarker = new Marker({
            color: '#007cbf', // Blue color for user location
            scale: 1.2 // Slightly larger than default
          })
            .setLngLat([lng, lat])
            .setPopup(new Popup().setHTML('<strong>Your Location</strong>'))
            .addTo(map);
        }

        // Center map on user location (optional)
        map.setCenter([lng, lat]);

        // Call the callback function with location data
        callback(lng, lat, accuracy);
      },
      (error) => {
        console.error('Error getting location:', error);
        // Handle different error types
        switch(error.code) {
          case error.PERMISSION_DENIED:
            alert('Location access denied by user.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            alert('Location request timed out.');
            break;
        }
      },
      options
    );
  }

  /**
   * Stops real-time location tracking
   */
  stopLocationTracking(): void {
    // Stop watching position
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    // Remove user location marker
    if (this.userLocationMarker) {
      this.userLocationMarker.remove();
      this.userLocationMarker = null;
    }
  }

  /**
   * Calculates route between two points using OpenRouteService (free)
   * @param start - Starting point as [lng, lat]
   * @param end - Destination point as [lng, lat]
   * @param profile - Travel mode (driving-car, foot-walking, cycling-regular)
   * @returns Route information including distance, duration, and coordinates
   */
  async calculateRoute(
    start: [number, number],
    end: [number, number],
    profile: 'driving-car' | 'foot-walking' | 'cycling-regular' = 'driving-car'
  ): Promise<RouteResponse | null> {

    try {
      // Call OpenRouteService API (free tier: 2000 requests/day)
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/${profile}?` +
        `start=${start[0]},${start[1]}&` +
        `end=${end[0]},${end[1]}`,
        {
          headers: {
            'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Routing failed: ${response.status}`);
      }

      const data = await response.json();
      const route = data.features[0];

      return {
        distance: route.properties.summary.distance, // Distance in meters
        duration: route.properties.summary.duration, // Duration in seconds
        coordinates: route.geometry.coordinates // Array of [lng, lat] points
      };

    } catch (error) {
      console.error('Routing error:', error);

      // Fallback: calculate straight-line distance if routing fails
      const distance = this.calculateStraightLineDistance(start, end);
      const estimatedDuration = (distance / 50) * 3600; // Estimate: 50 km/h average speed

      return {
        distance: distance * 1000, // Convert km to meters
        duration: estimatedDuration,
        coordinates: [start, end] // Just start and end points
      };
    }
  }

  /**
   * Displays calculated route on the map
   * @param map - MapLibre map instance
   * @param routeCoordinates - Array of [lng, lat] coordinates for the route
   * @param routeId - Unique identifier for this route layer
   */
  displayRoute(map: MapLibreMap, routeCoordinates: [number, number][], routeId: string = 'route'): void {

    // Check if route source already exists
    if (!map.getSource(routeId)) {
      // Add route as GeoJSON source
      map.addSource(routeId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
          }
        }
      });

      // Add route layer with styling
      map.addLayer({
        id: routeId,
        type: 'line',
        source: routeId,
        layout: {
          'line-join': 'round', // Smooth line joins
          'line-cap': 'round' // Rounded line ends
        },
        paint: {
          'line-color': '#007cbf', // Blue route line
          'line-width': 4, // 4px wide line
          'line-opacity': 0.8 // Slightly transparent
        }
      });
    } else {
      // Update existing route with new coordinates
      const source = map.getSource(routeId) as any;
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeCoordinates
        }
      });
    }

    // Fit map view to show entire route
    const bounds = new LngLatBounds();
    routeCoordinates.forEach(coord => bounds.extend(coord));
    map.fitBounds(bounds, { padding: 50 }); // 50px padding around route
  }

  /**
   * Calculates straight-line distance between two points (Haversine formula)
   * @param point1 - First point as [lng, lat]
   * @param point2 - Second point as [lng, lat]
   * @returns Distance in kilometers
   */
  calculateStraightLineDistance(point1: [number, number], point2: [number, number]): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2[1] - point1[1]); // Latitude difference
    const dLon = this.toRadians(point2[0] - point1[0]); // Longitude difference

    // Haversine formula calculation
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(point1[1])) * Math.cos(this.toRadians(point2[1])) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  /**
   * Geocodes an address to coordinates using Nominatim (free)
   * @param address - Address string to geocode
   * @returns Coordinates and formatted address, or null if not found
   */
  async geocodeAddress(address: string): Promise<{lng: number, lat: number, displayName: string} | null> {
    try {
      // Use Nominatim (OpenStreetMap) geocoding service (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=za`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lng: parseFloat(data[0].lon),
          lat: parseFloat(data[0].lat),
          displayName: data[0].display_name
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  }

  /**
   * Reverse geocodes coordinates to an address
   * @param lng - Longitude
   * @param lat - Latitude
   * @returns Formatted address string, or null if not found
   */
  async reverseGeocode(lng: number, lat: number): Promise<string | null> {
    try {
      // Use Nominatim reverse geocoding (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&countrycodes=za`
      );
      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Converts degrees to radians (for distance calculations)
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Cleanup: removes map instance and stops tracking
   * @param mapId - Map container ID to cleanup
   */
  destroyMap(mapId: string): void {
    this.stopLocationTracking();
    const map = this.maps.get(mapId);
    if (map) {
      map.remove();
      this.maps.delete(mapId);
    }
  }

  /**
   * Returns available OpenFreeMap styles
   * @returns Object with style names and their URLs
   */
  getAvailableStyles(): { [key: string]: string } {
    return {
      liberty: 'https://tiles.openfreemap.org/styles/liberty',      // Default, clean style
      bright: 'https://tiles.openfreemap.org/styles/bright',        // High contrast style
      positron: 'https://tiles.openfreemap.org/styles/positron',    // Light, minimal style
      dark: 'https://tiles.openfreemap.org/styles/dark-matter',     // Dark theme style
      klokantech: 'https://tiles.openfreemap.org/styles/klokantech-basic' // Basic style
    };
  }
}
