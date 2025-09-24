import React, { useState, useEffect, useRef } from "react";
import {
	MapContainer,
	TileLayer,
	Marker,
	Popup,
	useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { trackerAPI, geolocationAPI } from "../api";
import io from "socket.io-client";

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
	iconUrl: require("leaflet/dist/images/marker-icon.png"),
	shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Custom marker icons
const createCustomIcon = (color = "blue") => {
	return L.divIcon({
		className: "custom-div-icon",
		html: `<div style="background-color:${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
		iconSize: [20, 20],
		iconAnchor: [10, 10],
	});
};

// Component to handle map events
function MapEvents({ onLocationClick, onLocationUpdate }) {
	useMapEvents({
		click: (e) => {
			const { lat, lng } = e.latlng;
			onLocationClick({ lat, lng });
		},
	});
	return null;
}

const MapView = () => {
	const [trackers, setTrackers] = useState([]);
	const [selectedTracker, setSelectedTracker] = useState(null);
	const [currentLocation, setCurrentLocation] = useState(null);
	const [isTracking, setIsTracking] = useState(false);
	const [socket, setSocket] = useState(null);
	const [watchId, setWatchId] = useState(null);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const [locationStatus, setLocationStatus] = useState("Getting location...");
	const [locationAnalysis, setLocationAnalysis] = useState(null);

	const mapRef = useRef();

	// Initialize socket connection
	useEffect(() => {
		const newSocket = io(
			process.env.REACT_APP_API_URL || "http://localhost:3000"
		);
		setSocket(newSocket);

		newSocket.on("update", (data) => {
			console.log("Received update:", data);
			setTrackers((prev) =>
				prev.map((tracker) =>
					tracker.trackerId === data.trackerId
						? {
								...tracker,
								currentLocation: {
									type: "Point",
									coordinates: [data.location.lng, data.location.lat],
								},
								lastUpdatedAt: data.timestamp,
						  }
						: tracker
				)
			);
		});

		return () => {
			newSocket.close();
		};
	}, []);

	// Load trackers on component mount
	useEffect(() => {
		loadTrackers();
	}, []);

	// Check geolocation support and request permission
	useEffect(() => {
		const initializeLocation = async () => {
			try {
				setLocationStatus("Checking geolocation support...");
				await geolocationAPI.checkGeolocationSupport();
				setLocationStatus(
					"Geolocation supported. Click 'Request Location' to enable."
				);
			} catch (err) {
				console.error("Geolocation support check failed:", err);
				setError(err.message);
				setLocationStatus("Geolocation not supported or requires HTTPS");
			}
		};

		initializeLocation();
	}, []);

	const requestLocationPermission = async () => {
		try {
			setLocationStatus("Requesting location permission...");
			setError(null);

			const position = await geolocationAPI.requestLocationPermission();
			setCurrentLocation(position);

			// Analyze location accuracy
			const analysis = geolocationAPI.analyzeLocationAccuracy(position);
			setLocationAnalysis(analysis);

			setLocationStatus(
				`Location found (${analysis.accuracyLevel} accuracy: ${Math.round(
					position.accuracy
				)}m)`
			);
		} catch (err) {
			console.error("Error getting current location:", err);
			setError(err.message);
			setLocationStatus("Location access denied");
		}
	};

	const requestMultipleReadings = async () => {
		try {
			setLocationStatus("Taking multiple readings for better accuracy...");
			setError(null);

			const result = await geolocationAPI.getMultipleReadings(3, 2000);
			setCurrentLocation(result);

			// Analyze the averaged result
			const analysis = geolocationAPI.analyzeLocationAccuracy({
				coords: {
					latitude: result.lat,
					longitude: result.lng,
					accuracy: result.accuracy,
					altitude: null,
					altitudeAccuracy: null,
					heading: null,
					speed: null,
				},
				timestamp: result.timestamp,
			});
			setLocationAnalysis(analysis);

			setLocationStatus(
				`Multiple readings complete (${
					analysis.accuracyLevel
				} accuracy: ${Math.round(result.accuracy)}m)`
			);
		} catch (err) {
			console.error("Error getting multiple readings:", err);
			setError(err.message);
			setLocationStatus("Multiple readings failed");
		}
	};

	const loadTrackers = async () => {
		try {
			setLoading(true);
			const data = await trackerAPI.getAllTrackers();
			setTrackers(data);
		} catch (err) {
			setError("Failed to load trackers");
			console.error("Error loading trackers:", err);
		} finally {
			setLoading(false);
		}
	};

	const createTracker = async (location) => {
		try {
			const trackerId = `tracker_${Date.now()}`;
			const trackerData = {
				trackerId,
				name: `My Tracker ${new Date().toLocaleTimeString()}`,
				visibility: "private",
			};

			const newTracker = await trackerAPI.createTracker(trackerData);

			// Send initial location update
			await trackerAPI.updateTracker(trackerId, {
				location: { lat: location.lat, lng: location.lng },
				status: "active",
				meta: { source: "manual" },
			});

			setTrackers((prev) => [...prev, newTracker]);
			setSelectedTracker(newTracker);

			// Subscribe to updates for this tracker
			if (socket) {
				socket.emit("subscribe", { trackerId });
			}
		} catch (err) {
			setError("Failed to create tracker");
			console.error("Error creating tracker:", err);
		}
	};

	const updateTrackerLocation = async (trackerId, location) => {
		try {
			await trackerAPI.updateTracker(trackerId, {
				location: { lat: location.lat, lng: location.lng },
				status: "active",
				meta: { source: "manual", timestamp: new Date().toISOString() },
			});
		} catch (err) {
			setError("Failed to update tracker location");
			console.error("Error updating tracker:", err);
		}
	};

	const startAutoTracking = () => {
		if (watchId) return; // Already tracking

		setLocationStatus("Starting auto-tracking...");
		const newWatchId = geolocationAPI.watchPosition(
			(position) => {
				if (selectedTracker) {
					updateTrackerLocation(selectedTracker.trackerId, position);
					const accuracyText =
						position.accuracy < 10
							? "Very High"
							: position.accuracy < 50
							? "High"
							: position.accuracy < 100
							? "Medium"
							: "Low";
					setLocationStatus(
						`Auto-tracking active (${accuracyText} accuracy: ${Math.round(
							position.accuracy
						)}m)`
					);
				}
			},
			(error) => {
				console.error("Geolocation error:", error);
				setError(
					error.message ||
						"Location tracking failed. Please check your location permissions."
				);
				setLocationStatus("Auto-tracking failed");
			}
		);

		setWatchId(newWatchId);
		setIsTracking(true);
	};

	const stopAutoTracking = () => {
		if (watchId) {
			geolocationAPI.clearWatch(watchId);
			setWatchId(null);
			setIsTracking(false);
			setLocationStatus("Auto-tracking stopped");
		}
	};

	const handleLocationClick = (location) => {
		if (selectedTracker) {
			updateTrackerLocation(selectedTracker.trackerId, location);
		} else {
			createTracker(location);
		}
	};

	const handleTrackerSelect = (tracker) => {
		setSelectedTracker(tracker);
		if (socket) {
			socket.emit("subscribe", { trackerId: tracker.trackerId });
		}
	};

	const handleDeleteTracker = async (trackerId) => {
		try {
			await trackerAPI.deleteTracker(trackerId);
			setTrackers((prev) => prev.filter((t) => t.trackerId !== trackerId));
			if (selectedTracker && selectedTracker.trackerId === trackerId) {
				setSelectedTracker(null);
				stopAutoTracking();
			}
		} catch (err) {
			setError("Failed to delete tracker");
			console.error("Error deleting tracker:", err);
		}
	};

	const center = currentLocation
		? [currentLocation.lat, currentLocation.lng]
		: [0, 0];
	const zoom = currentLocation ? 15 : 2;

	return (
		<div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
			{/* Header */}
			<div
				style={{
					padding: "10px",
					backgroundColor: "#f8f9fa",
					borderBottom: "1px solid #dee2e6",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div>
					<h1 style={{ margin: 0, fontSize: "1.5rem" }}>Node Tracker</h1>
					<div style={{ fontSize: "0.8rem", color: "#666", marginTop: "2px" }}>
						📍 {locationStatus}
					</div>
				</div>
				<div>
					{!currentLocation && (
						<button
							onClick={requestLocationPermission}
							style={{
								padding: "8px 16px",
								marginRight: "10px",
								backgroundColor: "#28a745",
								color: "white",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer",
								fontWeight: "bold",
							}}
						>
							📍 Request Location Permission
						</button>
					)}
					{currentLocation && (
						<button
							onClick={requestMultipleReadings}
							style={{
								padding: "8px 16px",
								marginRight: "10px",
								backgroundColor: "#6f42c1",
								color: "white",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer",
							}}
						>
							🎯 Multiple Readings (Better Accuracy)
						</button>
					)}
					{selectedTracker && (
						<button
							onClick={isTracking ? stopAutoTracking : startAutoTracking}
							style={{
								padding: "8px 16px",
								marginRight: "10px",
								backgroundColor: isTracking ? "#dc3545" : "#28a745",
								color: "white",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer",
							}}
						>
							{isTracking ? "Stop Tracking" : "Start Auto Tracking"}
						</button>
					)}
					{currentLocation && (
						<button
							onClick={() => {
								setLocationStatus("Refreshing location...");
								geolocationAPI
									.getCurrentPosition()
									.then((position) => {
										setCurrentLocation(position);
										const accuracyText =
											position.accuracy < 10
												? "Very High"
												: position.accuracy < 50
												? "High"
												: position.accuracy < 100
												? "Medium"
												: "Low";
										setLocationStatus(
											`Location refreshed (${accuracyText} accuracy: ${Math.round(
												position.accuracy
											)}m)`
										);
									})
									.catch((err) => {
										setError(err.message);
										setLocationStatus("Location refresh failed");
									});
							}}
							style={{
								padding: "8px 16px",
								marginRight: "10px",
								backgroundColor: "#17a2b8",
								color: "white",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer",
							}}
						>
							📍 Refresh Location
						</button>
					)}
					<button
						onClick={loadTrackers}
						style={{
							padding: "8px 16px",
							backgroundColor: "#007bff",
							color: "white",
							border: "none",
							borderRadius: "4px",
							cursor: "pointer",
						}}
					>
						Refresh Trackers
					</button>
				</div>
			</div>

			{/* Error Display */}
			{error && (
				<div
					style={{
						padding: "10px",
						backgroundColor: "#f8d7da",
						color: "#721c24",
						borderBottom: "1px solid #f5c6cb",
					}}
				>
					{error}
					<button
						onClick={() => setError(null)}
						style={{
							float: "right",
							background: "none",
							border: "none",
							cursor: "pointer",
						}}
					>
						×
					</button>
				</div>
			)}

			{/* Location Analysis Display */}
			{locationAnalysis && (
				<div
					style={{
						padding: "15px",
						backgroundColor: "#e7f3ff",
						borderBottom: "1px solid #b3d9ff",
						fontSize: "0.9rem",
					}}
				>
					<div
						style={{
							fontWeight: "bold",
							marginBottom: "10px",
							color: "#0c5460",
						}}
					>
						🎯 Location Accuracy Analysis
					</div>

					<div style={{ marginBottom: "8px" }}>
						<strong>Accuracy Level:</strong> {locationAnalysis.accuracyLevel} (
						{Math.round(locationAnalysis.accuracy)}m)
					</div>

					{locationAnalysis.warnings.length > 0 && (
						<div style={{ marginBottom: "8px" }}>
							<strong style={{ color: "#856404" }}>⚠️ Warnings:</strong>
							<ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
								{locationAnalysis.warnings.map((warning, index) => (
									<li key={index} style={{ color: "#856404" }}>
										{warning}
									</li>
								))}
							</ul>
						</div>
					)}

					{locationAnalysis.info.length > 0 && (
						<div style={{ marginBottom: "8px" }}>
							<strong style={{ color: "#0c5460" }}>ℹ️ Info:</strong>
							<ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
								{locationAnalysis.info.map((info, index) => (
									<li key={index} style={{ color: "#0c5460" }}>
										{info}
									</li>
								))}
							</ul>
						</div>
					)}

					{locationAnalysis.recommendations.length > 0 && (
						<div>
							<strong style={{ color: "#155724" }}>💡 Recommendations:</strong>
							<ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
								{locationAnalysis.recommendations.map((rec, index) => (
									<li key={index} style={{ color: "#155724" }}>
										{rec}
									</li>
								))}
							</ul>
						</div>
					)}

					<button
						onClick={() => setLocationAnalysis(null)}
						style={{
							float: "right",
							background: "none",
							border: "none",
							cursor: "pointer",
							fontSize: "1.2rem",
							color: "#0c5460",
						}}
					>
						×
					</button>
				</div>
			)}

			<div style={{ display: "flex", flex: 1 }}>
				{/* Sidebar */}
				<div
					style={{
						width: "300px",
						backgroundColor: "#f8f9fa",
						borderRight: "1px solid #dee2e6",
						padding: "10px",
						overflowY: "auto",
					}}
				>
					<h3>Trackers ({trackers.length})</h3>
					{loading && <p>Loading...</p>}
					{trackers.map((tracker) => (
						<div
							key={tracker.trackerId}
							style={{
								padding: "10px",
								margin: "5px 0",
								backgroundColor:
									selectedTracker?.trackerId === tracker.trackerId
										? "#e3f2fd"
										: "white",
								border: "1px solid #dee2e6",
								borderRadius: "4px",
								cursor: "pointer",
							}}
							onClick={() => handleTrackerSelect(tracker)}
						>
							<div style={{ fontWeight: "bold" }}>
								{tracker.name || tracker.trackerId}
							</div>
							<div style={{ fontSize: "0.9rem", color: "#666" }}>
								Status: {tracker.currentStatus}
							</div>
							<div style={{ fontSize: "0.8rem", color: "#999" }}>
								Last update:{" "}
								{tracker.lastUpdatedAt
									? new Date(tracker.lastUpdatedAt).toLocaleString()
									: "Never"}
							</div>
							<button
								onClick={(e) => {
									e.stopPropagation();
									handleDeleteTracker(tracker.trackerId);
								}}
								style={{
									marginTop: "5px",
									padding: "4px 8px",
									backgroundColor: "#dc3545",
									color: "white",
									border: "none",
									borderRadius: "3px",
									cursor: "pointer",
									fontSize: "0.8rem",
								}}
							>
								Delete
							</button>
						</div>
					))}
				</div>

				{/* Map */}
				<div style={{ flex: 1 }}>
					<MapContainer
						center={center}
						zoom={zoom}
						style={{ height: "100%", width: "100%" }}
						ref={mapRef}
					>
						<TileLayer
							attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
							url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
						/>

						<MapEvents
							onLocationClick={handleLocationClick}
							onLocationUpdate={updateTrackerLocation}
						/>

						{/* Current location marker */}
						{currentLocation && (
							<Marker
								position={[currentLocation.lat, currentLocation.lng]}
								icon={createCustomIcon("green")}
							>
								<Popup>
									<div>
										<strong>Your Location</strong>
										<br />
										Lat: {currentLocation.lat.toFixed(6)}
										<br />
										Lng: {currentLocation.lng.toFixed(6)}
										<br />
										Accuracy: {Math.round(currentLocation.accuracy)}m
										{currentLocation.altitude && (
											<>
												<br />
												Altitude: {Math.round(currentLocation.altitude)}m
											</>
										)}
										{currentLocation.speed && (
											<>
												<br />
												Speed: {Math.round(currentLocation.speed * 3.6)} km/h
											</>
										)}
										<br />
										Updated:{" "}
										{new Date(currentLocation.timestamp).toLocaleTimeString()}
									</div>
								</Popup>
							</Marker>
						)}

						{/* Tracker markers */}
						{trackers.map((tracker) => {
							if (
								!tracker.currentLocation ||
								!tracker.currentLocation.coordinates
							)
								return null;
							const [lng, lat] = tracker.currentLocation.coordinates;
							return (
								<Marker
									key={tracker.trackerId}
									position={[lat, lng]}
									icon={createCustomIcon(
										selectedTracker?.trackerId === tracker.trackerId
											? "red"
											: "blue"
									)}
								>
									<Popup>
										<div>
											<strong>{tracker.name || tracker.trackerId}</strong>
											<br />
											Status: {tracker.currentStatus}
											<br />
											Lat: {lat.toFixed(6)}
											<br />
											Lng: {lng.toFixed(6)}
											<br />
											Last update:{" "}
											{tracker.lastUpdatedAt
												? new Date(tracker.lastUpdatedAt).toLocaleString()
												: "Never"}
										</div>
									</Popup>
								</Marker>
							);
						})}
					</MapContainer>
				</div>
			</div>

			{/* Instructions */}
			<div
				style={{
					padding: "10px",
					backgroundColor: "#e9ecef",
					fontSize: "0.9rem",
					borderTop: "1px solid #dee2e6",
				}}
			>
				<strong>Instructions:</strong> Click on the map to create a tracker or
				update location. Select a tracker from the sidebar to enable
				auto-tracking using your device's GPS.
			</div>
		</div>
	);
};

export default MapView;
