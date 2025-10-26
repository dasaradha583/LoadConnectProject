// ===================================================================
// ENHANCED DRIVER LOCATION MAP WITH NORMALIZED BACKEND INTEGRATION
// Improved Location Flow and Interactive Map Display
// Date: October 23, 2025
// ===================================================================

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
import LiveTrackingService from '../../services/LiveTrackingService';

interface DriverLocationMapProps {
  visible: boolean;
  loadId: string;
  onClose: () => void;
  refreshInterval?: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  address?: string;
  updatedAt: string;
}

interface TrackingData {
  load: {
    id: string;
    status: string;
    isPickedUp: boolean;
    isDropped: boolean;
    pickup: {
      id: string;
      latitude: number;
      longitude: number;
      address: string;
      contactName?: string;
      contactPhone?: string;
    };
    drop: {
      id: string;
      latitude: number;
      longitude: number;
      address: string;
      contactName?: string;
      contactPhone?: string;
    };
  };
  driver: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    rating: number;
  } | null;
  tracking: {
    isLive: boolean;
    currentLocation: LocationData | null;
    eta: {
      distance: number;
      estimatedSpeed: number;
      etaMinutes: number;
      etaText: string;
    } | null;
    locationHistory: Array<{
      latitude: number;
      longitude: number;
      timestamp: string;
      speed?: number;
      heading?: number;
      eventType?: string;
    }>;
    routeCoordinates: Array<{
      latitude: number;
      longitude: number;
      timestamp: string;
    }>;
    mapBounds: {
      southwest: { latitude: number; longitude: number };
      northeast: { latitude: number; longitude: number };
    } | null;
  };
}

export default function DriverLocationMap({ 
  visible, 
  loadId, 
  onClose, 
  refreshInterval = 10000 
}: DriverLocationMapProps) {
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const webViewRef = useRef<WebView>(null);

  const { width, height } = Dimensions.get('window');

  // Fetch comprehensive tracking data from normalized backend
  const fetchTrackingData = async () => {
    try {
      console.log(`🗺️ [DriverLocationMap] Fetching tracking data for load: ${loadId}`);
      
      const data = await LiveTrackingService.getLiveTrackingData(loadId);
      
      if (data) {
        console.log(`✅ [DriverLocationMap] Tracking data received:`, {
          isLive: data.tracking.isLive,
          currentLocation: data.tracking.currentLocation,
          historyPoints: data.tracking.locationHistory.length,
          eta: data.tracking.eta
        });
        
        setTrackingData(data);
        setError(null);
        
        // Update map with new data
        if (webViewRef.current && data.tracking.currentLocation) {
          updateMapLocation(data);
        }
      } else {
        console.log(`⚠️ [DriverLocationMap] No tracking data available`);
        setError('No tracking data available for this load');
      }
    } catch (error) {
      console.error('❌ [DriverLocationMap] Error fetching tracking data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  // Update map with new location and route data
  const updateMapLocation = (data: TrackingData) => {
    if (!webViewRef.current || !data.tracking.currentLocation) return;

    const updateScript = `
      if (typeof updateDriverLocation === 'function') {
        updateDriverLocation(${JSON.stringify({
          current: data.tracking.currentLocation,
          pickup: data.load.pickup,
          drop: data.load.drop,
          route: data.tracking.routeCoordinates,
          eta: data.tracking.eta,
          driver: data.driver,
          load: {
            status: data.load.status,
            isPickedUp: data.load.isPickedUp,
            isDropped: data.load.isDropped
          }
        })});
      }
    `;

    webViewRef.current.postMessage(updateScript);
  };

  // Generate enhanced HTML map with Leaflet
  const generateMapHTML = () => {
    const defaultLat = trackingData?.tracking.currentLocation?.latitude || 12.9716;
    const defaultLng = trackingData?.tracking.currentLocation?.longitude || 77.5946;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Live Tracking</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
            #map { height: 100vh; width: 100%; }
            
            .info-panel {
                position: absolute;
                top: 10px;
                left: 10px;
                right: 10px;
                z-index: 1000;
                background: rgba(255, 255, 255, 0.95);
                padding: 15px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                backdrop-filter: blur(10px);
                max-height: 200px;
                overflow-y: auto;
            }
            
            .status-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
            }
            
            .status-posted { background: #e3f2fd; color: #1976d2; }
            .status-accepted { background: #f3e5f5; color: #7b1fa2; }
            .status-picked_up { background: #fff3e0; color: #f57c00; }
            .status-in_transit { background: #e8f5e8; color: #388e3c; }
            .status-delivered { background: #e0f2f1; color: #00796b; }
            
            .eta-info {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 8px;
                padding: 8px;
                background: #f5f5f5;
                border-radius: 8px;
            }
            
            .driver-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 10px;
                padding: 8px;
                background: #fafafa;
                border-radius: 8px;
            }
            
            .popup-content {
                max-width: 200px;
            }
            
            .popup-title {
                font-weight: 600;
                color: #333;
                margin-bottom: 4px;
            }
            
            .popup-address {
                color: #666;
                font-size: 12px;
                line-height: 1.3;
            }
            
            .popup-contact {
                margin-top: 6px;
                padding-top: 6px;
                border-top: 1px solid #eee;
                font-size: 12px;
                color: #555;
            }
            
            .live-indicator {
                display: inline-block;
                width: 8px;
                height: 8px;
                background: #4caf50;
                border-radius: 50%;
                animation: pulse 2s infinite;
                margin-right: 6px;
            }
            
            @keyframes pulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.1); }
                100% { opacity: 1; transform: scale(1); }
            }
        </style>
    </head>
    <body>
        <div class="info-panel" id="infoPanel">
            <div id="statusInfo">Loading tracking data...</div>
        </div>
        <div id="map"></div>
        
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
            let map, driverMarker, pickupMarker, dropMarker, routePolyline;
            let currentData = null;
            
            // Initialize map
            function initMap() {
                map = L.map('map', {
                    center: [${defaultLat}, ${defaultLng}],
                    zoom: 13,
                    zoomControl: true,
                    attributionControl: false
                });
                
                // Add tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 18,
                    attribution: ''
                }).addTo(map);
                
                console.log('Map initialized');
            }
            
            // Create custom markers
            function createMarkerIcon(type, color = '#2196f3') {
                const icons = {
                    driver: '🚛',
                    pickup: '📦',
                    drop: '📍'
                };
                
                return L.divIcon({
                    html: \`<div style="
                        background: \${color};
                        color: white;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 18px;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    ">\${icons[type] || '📍'}</div>\`,
                    className: 'custom-marker',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });
            }
            
            // Update driver location and tracking info
            function updateDriverLocation(data) {
                currentData = data;
                console.log('Updating map with data:', data);
                
                try {
                    // Clear existing markers and routes
                    if (driverMarker) map.removeLayer(driverMarker);
                    if (pickupMarker) map.removeLayer(pickupMarker);
                    if (dropMarker) map.removeLayer(dropMarker);
                    if (routePolyline) map.removeLayer(routePolyline);
                    
                    // Add driver current location
                    if (data.current) {
                        const driverIcon = createMarkerIcon('driver', '#4caf50');
                        driverMarker = L.marker([data.current.latitude, data.current.longitude], {
                            icon: driverIcon
                        }).addTo(map);
                        
                        // Driver popup
                        let driverPopup = '<div class="popup-content">';
                        driverPopup += '<div class="popup-title">🚛 Driver Location</div>';
                        if (data.driver) {
                            driverPopup += \`<div><strong>\${data.driver.name}</strong></div>\`;
                            driverPopup += \`<div>\${data.driver.vehicleType} - \${data.driver.vehicleNumber}</div>\`;
                            driverPopup += \`<div>Rating: \${data.driver.rating}/5 ⭐</div>\`;
                        }
                        if (data.current.speed) {
                            driverPopup += \`<div>Speed: \${Math.round(data.current.speed)} km/h</div>\`;
                        }
                        if (data.current.address) {
                            driverPopup += \`<div class="popup-address">\${data.current.address}</div>\`;
                        }
                        driverPopup += \`<div style="font-size: 11px; color: #999; margin-top: 4px;">
                            Updated: \${new Date(data.current.updatedAt).toLocaleTimeString()}
                        </div>\`;
                        driverPopup += '</div>';
                        
                        driverMarker.bindPopup(driverPopup);
                    }
                    
                    // Add pickup location
                    if (data.pickup) {
                        const pickupIcon = createMarkerIcon('pickup', '#ff9800');
                        pickupMarker = L.marker([data.pickup.latitude, data.pickup.longitude], {
                            icon: pickupIcon
                        }).addTo(map);
                        
                        let pickupPopup = '<div class="popup-content">';
                        pickupPopup += '<div class="popup-title">📦 Pickup Location</div>';
                        pickupPopup += \`<div class="popup-address">\${data.pickup.address}</div>\`;
                        if (data.pickup.contactName) {
                            pickupPopup += \`<div class="popup-contact">
                                Contact: \${data.pickup.contactName}<br>
                                Phone: \${data.pickup.contactPhone || 'Not provided'}
                            </div>\`;
                        }
                        pickupPopup += '</div>';
                        
                        pickupMarker.bindPopup(pickupPopup);
                    }
                    
                    // Add drop location
                    if (data.drop) {
                        const dropIcon = createMarkerIcon('drop', '#f44336');
                        dropMarker = L.marker([data.drop.latitude, data.drop.longitude], {
                            icon: dropIcon
                        }).addTo(map);
                        
                        let dropPopup = '<div class="popup-content">';
                        dropPopup += '<div class="popup-title">📍 Drop Location</div>';
                        dropPopup += \`<div class="popup-address">\${data.drop.address}</div>\`;
                        if (data.drop.contactName) {
                            dropPopup += \`<div class="popup-contact">
                                Contact: \${data.drop.contactName}<br>
                                Phone: \${data.drop.contactPhone || 'Not provided'}
                            </div>\`;
                        }
                        dropPopup += '</div>';
                        
                        dropMarker.bindPopup(dropPopup);
                    }
                    
                    // Add route polyline
                    if (data.route && data.route.length > 1) {
                        const routeCoords = data.route.map(point => [point.latitude, point.longitude]);
                        routePolyline = L.polyline(routeCoords, {
                            color: '#2196f3',
                            weight: 4,
                            opacity: 0.8,
                            dashArray: '5, 10'
                        }).addTo(map);
                    }
                    
                    // Update info panel
                    updateInfoPanel(data);
                    
                    // Fit map bounds to show all locations
                    const bounds = [];
                    if (data.current) bounds.push([data.current.latitude, data.current.longitude]);
                    if (data.pickup) bounds.push([data.pickup.latitude, data.pickup.longitude]);
                    if (data.drop) bounds.push([data.drop.latitude, data.drop.longitude]);
                    
                    if (bounds.length > 0) {
                        map.fitBounds(bounds, { padding: [20, 20] });
                    }
                    
                } catch (error) {
                    console.error('Error updating map:', error);
                }
            }
            
            // Update info panel with tracking details
            function updateInfoPanel(data) {
                const infoPanel = document.getElementById('infoPanel');
                if (!infoPanel) return;
                
                let html = '';
                
                // Status info
                if (data.load) {
                    const statusClass = \`status-\${data.load.status}\`;
                    html += \`<div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="status-badge \${statusClass}">\${data.load.status.replace('_', ' ')}</span>
                        <span style="font-size: 12px; color: #666;">
                            <span class="live-indicator"></span>Live Tracking
                        </span>
                    </div>\`;
                }
                
                // Driver info
                if (data.driver) {
                    html += \`<div class="driver-info">
                        <div>
                            <div style="font-weight: 600;">\${data.driver.name}</div>
                            <div style="font-size: 12px; color: #666;">
                                \${data.driver.vehicleType} • \${data.driver.vehicleNumber}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 12px;">⭐ \${data.driver.rating}/5</div>
                        </div>
                    </div>\`;
                }
                
                // ETA info
                if (data.eta) {
                    html += \`<div class="eta-info">
                        <span style="font-size: 18px;">🕒</span>
                        <div>
                            <div style="font-weight: 600;">\${data.eta.etaText}</div>
                            <div style="font-size: 12px; color: #666;">
                                \${data.eta.distance} km at \${data.eta.estimatedSpeed} km/h
                            </div>
                        </div>
                    </div>\`;
                }
                
                // Current speed and location
                if (data.current) {
                    html += \`<div style="font-size: 12px; color: #666; margin-top: 8px;">
                        Last updated: \${new Date(data.current.updatedAt).toLocaleString()}
                    </div>\`;
                }
                
                infoPanel.innerHTML = html;
            }
            
            // Message handler for React Native
            window.addEventListener('message', function(event) {
                try {
                    const script = event.data;
                    eval(script);
                } catch (error) {
                    console.error('Error executing script:', error);
                }
            });
            
            document.addEventListener('message', function(event) {
                try {
                    const script = event.data;
                    eval(script);
                } catch (error) {
                    console.error('Error executing script:', error);
                }
            });
            
            // Initialize map when page loads
            document.addEventListener('DOMContentLoaded', initMap);
        </script>
    </body>
    </html>`;
  };

  // Set up auto-refresh for live tracking
  useEffect(() => {
    if (!visible || !loadId) return;

    console.log(`🚀 [DriverLocationMap] Starting live tracking for load: ${loadId}`);
    
    // Initial fetch
    fetchTrackingData();
    
    // Set up auto-refresh
    intervalRef.current = setInterval(() => {
      console.log(`🔄 [DriverLocationMap] Auto-refreshing tracking data`);
      fetchTrackingData();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      console.log(`🛑 [DriverLocationMap] Stopped live tracking`);
    };
  }, [visible, loadId, refreshInterval]);

  // Handle WebView messages
  const handleWebViewMessage = (event: any) => {
    try {
      const message = event.nativeEvent.data;
      console.log('WebView message:', message);
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196f3" />
              <Text style={styles.loadingText}>Loading tracking data...</Text>
            </View>
          )}
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={() => {
                  setError(null);
                  setLoading(true);
                  fetchTrackingData();
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <WebView
            ref={webViewRef}
            source={{ html: generateMapHTML() }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            onMessage={handleWebViewMessage}
            onLoad={() => {
              console.log('WebView loaded');
              setLoading(false);
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error:', nativeEvent);
              setError('Failed to load map');
              setLoading(false);
            }}
          />
        </View>

        {/* Status Bar */}
        {trackingData && (
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>
              {trackingData.tracking.isLive ? (
                <>
                  <Text style={styles.liveIndicator}>● </Text>
                  Live tracking active
                </>
              ) : (
                <>
                  <Text style={styles.offlineIndicator}>● </Text>
                  Last known location
                </>
              )}
            </Text>
            {trackingData.tracking.eta && (
              <Text style={styles.etaText}>
                ETA: {trackingData.tracking.eta.etaText}
              </Text>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
    zIndex: 1000,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  liveIndicator: {
    color: '#4caf50',
  },
  offlineIndicator: {
    color: '#ff9800',
  },
  etaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196f3',
  },
});