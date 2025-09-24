import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

const api = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

// Tracker API functions
export const trackerAPI = {
	// Create a new tracker
	createTracker: async (trackerData) => {
		const response = await api.post("/trackers", trackerData);
		return response.data;
	},

	// Get all trackers
	getAllTrackers: async () => {
		const response = await api.get("/trackers");
		return response.data;
	},

	// Get a specific tracker
	getTracker: async (trackerId) => {
		const response = await api.get(`/trackers/${trackerId}`);
		return response.data;
	},

	// Update tracker location
	updateTracker: async (trackerId, locationData) => {
		const response = await api.post(
			`/trackers/${trackerId}/updates`,
			locationData
		);
		return response.data;
	},

	// Get tracker history
	getTrackerHistory: async (trackerId, params = {}) => {
		const response = await api.get(`/trackers/${trackerId}/history`, {
			params,
		});
		return response.data;
	},

	// Delete tracker
	deleteTracker: async (trackerId) => {
		const response = await api.delete(`/trackers/${trackerId}`);
		return response.data;
	},
};

// Geolocation utility functions
export const geolocationAPI = {
	// Check if geolocation is supported and permissions are available
	checkGeolocationSupport: () => {
		return new Promise((resolve, reject) => {
			if (!navigator.geolocation) {
				reject(new Error("Geolocation is not supported by this browser"));
				return;
			}

			// Check if we're on HTTPS or localhost
			if (
				window.location.protocol !== "https:" &&
				window.location.hostname !== "localhost" &&
				window.location.hostname !== "127.0.0.1"
			) {
				reject(
					new Error(
						"Geolocation requires HTTPS or localhost. Please use HTTPS or run on localhost."
					)
				);
				return;
			}

			resolve(true);
		});
	},

	// Request location permission explicitly
	requestLocationPermission: () => {
		return new Promise((resolve, reject) => {
			if (!navigator.geolocation) {
				reject(new Error("Geolocation is not supported by this browser"));
				return;
			}

			console.log("Requesting location permission...");

			navigator.geolocation.getCurrentPosition(
				(position) => {
					const locationData = {
						lat: position.coords.latitude,
						lng: position.coords.longitude,
						accuracy: position.coords.accuracy,
						altitude: position.coords.altitude,
						altitudeAccuracy: position.coords.altitudeAccuracy,
						heading: position.coords.heading,
						speed: position.coords.speed,
						timestamp: position.timestamp,
						// Additional debugging info
						coords: position.coords,
						rawPosition: position,
					};

					console.log("Permission granted, position obtained:", {
						lat: position.coords.latitude,
						lng: position.coords.longitude,
						accuracy: position.coords.accuracy,
						altitude: position.coords.altitude,
						altitudeAccuracy: position.coords.altitudeAccuracy,
						heading: position.coords.heading,
						speed: position.coords.speed,
						timestamp: position.timestamp,
						// Debug info
						allCoords: position.coords,
					});

					resolve(locationData);
				},
				(error) => {
					console.error("Geolocation permission error:", error);
					let errorMessage = "Location access denied";
					switch (error.code) {
						case error.PERMISSION_DENIED:
							errorMessage =
								"Location access denied. Please click 'Allow' when prompted, or enable location services in your browser settings.";
							break;
						case error.POSITION_UNAVAILABLE:
							errorMessage =
								"Location information is unavailable. Please check your GPS settings and ensure location services are enabled.";
							break;
						case error.TIMEOUT:
							errorMessage = "Location request timed out. Please try again.";
							break;
						default:
							errorMessage =
								"An unknown error occurred while retrieving location.";
							break;
					}
					reject(new Error(errorMessage));
				},
				{
					enableHighAccuracy: true,
					timeout: 30000,
					maximumAge: 0,
				}
			);
		});
	},

	// Get current position (alias for backward compatibility)
	getCurrentPosition: () => {
		return geolocationAPI.requestLocationPermission();
	},

	// Legacy getCurrentPosition function (keeping for reference)
	getCurrentPositionLegacy: () => {
		return new Promise((resolve, reject) => {
			if (!navigator.geolocation) {
				reject(new Error("Geolocation is not supported by this browser"));
				return;
			}

			navigator.geolocation.getCurrentPosition(
				(position) => {
					console.log("Position obtained:", {
						lat: position.coords.latitude,
						lng: position.coords.longitude,
						accuracy: position.coords.accuracy,
						altitude: position.coords.altitude,
						altitudeAccuracy: position.coords.altitudeAccuracy,
						heading: position.coords.heading,
						speed: position.coords.speed,
					});
					resolve({
						lat: position.coords.latitude,
						lng: position.coords.longitude,
						accuracy: position.coords.accuracy,
						altitude: position.coords.altitude,
						altitudeAccuracy: position.coords.altitudeAccuracy,
						heading: position.coords.heading,
						speed: position.coords.speed,
						timestamp: position.timestamp,
					});
				},
				(error) => {
					console.error("Geolocation error:", error);
					let errorMessage = "Location access denied";
					switch (error.code) {
						case error.PERMISSION_DENIED:
							errorMessage =
								"Location access denied. Please enable location services and refresh the page.";
							break;
						case error.POSITION_UNAVAILABLE:
							errorMessage =
								"Location information is unavailable. Please check your GPS settings.";
							break;
						case error.TIMEOUT:
							errorMessage = "Location request timed out. Please try again.";
							break;
						default:
							errorMessage =
								"An unknown error occurred while retrieving location.";
							break;
					}
					reject(new Error(errorMessage));
				},
				{
					enableHighAccuracy: true,
					timeout: 30000, // Increased timeout to 30 seconds
					maximumAge: 0, // Always get fresh location data
				}
			);
		});
	},

	// Watch position changes
	watchPosition: (callback, errorCallback) => {
		if (!navigator.geolocation) {
			errorCallback(new Error("Geolocation is not supported by this browser"));
			return null;
		}

		return navigator.geolocation.watchPosition(
			(position) => {
				console.log("Position update:", {
					lat: position.coords.latitude,
					lng: position.coords.longitude,
					accuracy: position.coords.accuracy,
					timestamp: position.timestamp,
				});
				callback({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
					accuracy: position.coords.accuracy,
					altitude: position.coords.altitude,
					altitudeAccuracy: position.coords.altitudeAccuracy,
					heading: position.coords.heading,
					speed: position.coords.speed,
					timestamp: position.timestamp,
				});
			},
			(error) => {
				console.error("Watch position error:", error);
				let errorMessage = "Location tracking failed";
				switch (error.code) {
					case error.PERMISSION_DENIED:
						errorMessage =
							"Location access denied. Please enable location services.";
						break;
					case error.POSITION_UNAVAILABLE:
						errorMessage =
							"Location information is unavailable. Please check your GPS settings.";
						break;
					case error.TIMEOUT:
						errorMessage = "Location request timed out.";
						break;
					default:
						errorMessage = "An unknown error occurred while tracking location.";
						break;
				}
				errorCallback(new Error(errorMessage));
			},
			{
				enableHighAccuracy: true,
				timeout: 30000, // Increased timeout
				maximumAge: 10000, // Accept location data up to 10 seconds old
			}
		);
	},

	// Clear position watch
	clearWatch: (watchId) => {
		if (watchId) {
			navigator.geolocation.clearWatch(watchId);
		}
	},

	// Analyze location accuracy and provide recommendations
	analyzeLocationAccuracy: (position) => {
		const accuracy = position.coords.accuracy;
		const altitude = position.coords.altitude;
		const altitudeAccuracy = position.coords.altitudeAccuracy;
		const speed = position.coords.speed;
		const heading = position.coords.heading;

		const analysis = {
			accuracy: accuracy,
			accuracyLevel:
				accuracy < 5
					? "Excellent"
					: accuracy < 10
					? "Very High"
					: accuracy < 20
					? "High"
					: accuracy < 50
					? "Medium"
					: accuracy < 100
					? "Low"
					: "Very Low",
			recommendations: [],
			warnings: [],
			info: [],
		};

		// Accuracy analysis
		if (accuracy > 100) {
			analysis.warnings.push(
				"Location accuracy is very poor (>100m). This might be network-based location."
			);
			analysis.recommendations.push(
				"Try moving outdoors with clear sky view for better GPS accuracy."
			);
		} else if (accuracy > 50) {
			analysis.warnings.push(
				"Location accuracy is low (50-100m). GPS signal might be weak."
			);
			analysis.recommendations.push(
				"Move to an open area or near a window for better GPS reception."
			);
		} else if (accuracy > 20) {
			analysis.info.push(
				"Location accuracy is moderate (20-50m). GPS is working but could be better."
			);
			analysis.recommendations.push(
				"Wait a few moments for GPS to settle, or move to a more open area."
			);
		} else if (accuracy > 10) {
			analysis.info.push(
				"Location accuracy is good (10-20m). GPS is working well."
			);
		} else {
			analysis.info.push(
				"Location accuracy is excellent (<10m). GPS is working optimally."
			);
		}

		// Altitude analysis
		if (altitude !== null && altitudeAccuracy !== null) {
			if (altitudeAccuracy > 50) {
				analysis.warnings.push(
					"Altitude accuracy is poor. This is normal for GPS."
				);
			}
		}

		// Speed analysis
		if (speed !== null && speed > 0) {
			analysis.info.push(
				`Device is moving at ${(speed * 3.6).toFixed(1)} km/h`
			);
		}

		// Heading analysis
		if (heading !== null) {
			analysis.info.push(`Device heading: ${heading.toFixed(1)}°`);
		}

		// Environment recommendations
		if (accuracy > 20) {
			analysis.recommendations.push(
				"Consider enabling WiFi and mobile networks for assisted GPS."
			);
			analysis.recommendations.push(
				'Make sure location services are set to "High Accuracy" mode.'
			);
		}

		// Browser recommendations
		if (window.location.protocol !== "https:") {
			analysis.warnings.push(
				"Not using HTTPS. Some browsers limit geolocation accuracy on HTTP."
			);
			analysis.recommendations.push(
				"Use HTTPS for maximum geolocation accuracy."
			);
		}

		return analysis;
	},

	// Get multiple location readings to improve accuracy
	getMultipleReadings: (count = 3, interval = 2000) => {
		return new Promise((resolve, reject) => {
			const readings = [];
			let currentCount = 0;

			const getReading = () => {
				navigator.geolocation.getCurrentPosition(
					(position) => {
						readings.push({
							lat: position.coords.latitude,
							lng: position.coords.longitude,
							accuracy: position.coords.accuracy,
							timestamp: position.timestamp,
						});

						currentCount++;
						console.log(
							`Reading ${currentCount}/${count}: Accuracy ${Math.round(
								position.coords.accuracy
							)}m`
						);

						if (currentCount >= count) {
							// Calculate average position
							const avgLat =
								readings.reduce((sum, r) => sum + r.lat, 0) / readings.length;
							const avgLng =
								readings.reduce((sum, r) => sum + r.lng, 0) / readings.length;
							const avgAccuracy =
								readings.reduce((sum, r) => sum + r.accuracy, 0) /
								readings.length;

							resolve({
								lat: avgLat,
								lng: avgLng,
								accuracy: avgAccuracy,
								readings: readings,
								timestamp: Date.now(),
							});
						} else {
							setTimeout(getReading, interval);
						}
					},
					(error) => {
						reject(error);
					},
					{
						enableHighAccuracy: true,
						timeout: 30000,
						maximumAge: 0,
					}
				);
			};

			getReading();
		});
	},
};

export default api;
