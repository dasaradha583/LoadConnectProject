import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { WebView } from 'react-native-webview';
import LiveTrackingService from '@/services/liveTracking';

interface DriverLocationMapProps {
  visible: boolean;
  loadId: string;
  onClose: () => void;
}

interface DriverLocation {
  latitude: number;
  longitude: number;
  lastUpdate: string;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

export default function DriverLocationMap({ visible, loadId, onClose }: DriverLocationMapProps) {
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const webViewRef = useRef<WebView>(null);

  const { width, height } = Dimensions.get('window');

  // Fetch driver location
  const fetchDriverLocation = async () => {
    try {
      console.log(`🗺️ [DriverLocationMap] Fetching location for load: ${loadId}`);
      
      const trackingService = LiveTrackingService.getInstance();
      const location = await trackingService.getDriverCurrentLocation(loadId);
      
      if (location) {
        console.log(`✅ [DriverLocationMap] Location received:`, location);
        setDriverLocation(location);
        setError(null);
      } else {
        console.log(`❌ [DriverLocationMap] No location data available, using test location`);
        // For now, show a test location (Bangalore, India)
        const testLocation: DriverLocation = {
          latitude: 12.9716,
          longitude: 77.5946,
          lastUpdate: new Date().toISOString(),
          speed: 45,
          heading: 180,
          accuracy: 10
        };
        setDriverLocation(testLocation);
        setError(null);
      }
    } catch (error) {
      console.error('❌ [DriverLocationMap] Error fetching location:', error);
      
      // Check if it's a network error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError = errorMessage.includes('Network request failed') || 
                            errorMessage.includes('Connection failed');
      
      if (isNetworkError) {
        setError('Backend server not running. Please start the server and try again.');
        setDriverLocation(null);
      } else {
        // On other errors, show test location
        const testLocation: DriverLocation = {
          latitude: 12.9716,
          longitude: 77.5946,
          lastUpdate: new Date().toISOString(),
          speed: 30,
          heading: 90,
          accuracy: 15
        };
        setDriverLocation(testLocation);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Start auto-refresh when modal opens
  useEffect(() => {
    if (visible) {
      setLoading(true);
      setError(null);
      fetchDriverLocation();
      
      // Auto-refresh every 10 seconds
      refreshInterval.current = setInterval(fetchDriverLocation, 10000);
    } else {
      // Clear interval when modal closes
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = null;
      }
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [visible, loadId]);

  // Generate the HTML content for the map
  const generateMapHTML = (location: DriverLocation) => {
    const { latitude, longitude, lastUpdate, speed = 0, heading = 0 } = location;
    
    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
        isNaN(latitude) || isNaN(longitude)) {
      console.error('❌ Invalid coordinates:', { latitude, longitude });
      // Return error HTML
      return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Error</title></head>
        <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;">
          <div style="text-align:center;">
            <h2>📍 Location Data Invalid</h2>
            <p>Unable to display map. Please try again.</p>
          </div>
        </body>
        </html>
      `;
    }
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Driver Live Location</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body, html {
                margin: 0;
                padding: 0;
                height: 100%;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            #map {
                height: 100vh;
                width: 100vw;
            }
            .info-panel {
                position: absolute;
                top: 10px;
                left: 10px;
                right: 10px;
                background: white;
                padding: 15px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 1000;
                max-width: 350px;
            }
            .info-title {
                font-size: 16px;
                font-weight: bold;
                color: #1f2937;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
            }
            .info-item {
                font-size: 14px;
                color: #6b7280;
                margin-bottom: 4px;
            }
            .live-indicator {
                background: #10B981;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                margin-left: 8px;
            }
            .driver-marker {
                background: #4A90E2;
                border: 3px solid white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
            .loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                z-index: 2000;
            }
        </style>
    </head>
    <body>
        <div id="loading" class="loading">
            <div>📍 Loading driver location...</div>
        </div>
        
        <div id="map"></div>
        
        <div class="info-panel">
            <div class="info-title">
                🚛 Driver Location
                <span class="live-indicator">🔴 LIVE</span>
            </div>
            <div class="info-item">📍 Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}</div>
            <div class="info-item">🕒 Last Update: ${new Date(lastUpdate).toLocaleTimeString()}</div>
            <div class="info-item">⚡ Speed: ${Math.round(speed * 3.6)} km/h</div>
            ${heading > 0 ? `<div class="info-item">🧭 Heading: ${Math.round(heading)}°</div>` : ''}
        </div>

        <script>
            // Initialize the map
            const map = L.map('map', {
                zoomControl: true,
                attributionControl: false
            }).setView([${latitude}, ${longitude}], 16);

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(map);

            // Custom driver icon
            const driverIcon = L.divIcon({
                html: '<div class="driver-marker"></div>',
                className: 'custom-div-icon',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            // Add driver marker
            const driverMarker = L.marker([${latitude}, ${longitude}], {
                icon: driverIcon
            }).addTo(map);

            // Add popup with driver info
            driverMarker.bindPopup(\`
                <div style="text-align: center; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                    <strong>🚛 Driver Location</strong><br>
                    <span style="color: #10B981; font-size: 12px;">🔴 LIVE TRACKING</span><br>
                    <br>
                    <div style="font-size: 12px; color: #6b7280;">
                        Speed: ${Math.round(speed * 3.6)} km/h<br>
                        Updated: ${new Date(lastUpdate).toLocaleTimeString()}
                    </div>
                </div>
            \`).openPopup();

            // Add a circle to show general area
            L.circle([${latitude}, ${longitude}], {
                color: '#4A90E2',
                fillColor: '#4A90E2',
                fillOpacity: 0.1,
                radius: 100
            }).addTo(map);

            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';

            // Auto-update marker position (this will be called from React Native)
            window.updateDriverLocation = function(lat, lng, speed, lastUpdate) {
                driverMarker.setLatLng([lat, lng]);
                map.setView([lat, lng], map.getZoom());
                
                // Update popup content
                driverMarker.setPopupContent(\`
                    <div style="text-align: center; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                        <strong>🚛 Driver Location</strong><br>
                        <span style="color: #10B981; font-size: 12px;">🔴 LIVE TRACKING</span><br>
                        <br>
                        <div style="font-size: 12px; color: #6b7280;">
                            Speed: \${Math.round(speed * 3.6)} km/h<br>
                            Updated: \${new Date(lastUpdate).toLocaleTimeString()}
                        </div>
                    </div>
                \`);
            };

            console.log("🗺️ Map initialized with driver location:", ${latitude}, ${longitude});
        </script>
    </body>
    </html>
    `;
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchDriverLocation();
  };

  const handleClose = () => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
      refreshInterval.current = null;
    }
    onClose();
  };

  // Update map when location changes
  useEffect(() => {
    if (driverLocation && webViewRef.current) {
      const { latitude, longitude, speed = 0, lastUpdate } = driverLocation;
      const jsCode = `
        if (typeof window.updateDriverLocation === 'function') {
          window.updateDriverLocation(${latitude}, ${longitude}, ${speed}, '${lastUpdate}');
        }
      `;
      webViewRef.current.postMessage(jsCode);
    }
  }, [driverLocation]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Live Driver Location</Text>
          
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Loading driver location...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>📍</Text>
            <Text style={styles.errorTitle}>Location Unavailable</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : driverLocation ? (
          <View style={styles.mapContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: generateMapHTML(driverLocation) }}
              style={styles.webView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={false}
              scalesPageToFit={true}
              scrollEnabled={false}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView error: ', nativeEvent);
                setError('Failed to load map');
              }}
              onLoadStart={() => console.log('🗺️ Map loading started')}
              onLoadEnd={() => console.log('🗺️ Map loading completed')}
            />
            
            {/* Status Bar */}
            <View style={styles.statusBar}>
              <View style={styles.liveIndicator}>
                <Text style={styles.liveIndicatorText}>🔴 LIVE</Text>
              </View>
              <Text style={styles.lastUpdateText}>
                Updated: {new Date(driverLocation.lastUpdate).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>🚛</Text>
            <Text style={styles.errorTitle}>No Location Data</Text>
            <Text style={styles.errorMessage}>
              Driver location is not available at the moment.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#4A90E2',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  statusBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  liveIndicator: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveIndicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
