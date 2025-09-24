# Node Tracker Client

A React frontend application for real-time GPS tracking with interactive maps using Leaflet and OpenStreetMap.

## Features

- **Interactive Maps**: Leaflet integration with OpenStreetMap tiles
- **Real-time Updates**: Socket.IO client for live location updates
- **Geolocation API**: Automatic GPS location fetching
- **Auto-tracking**: Continuous location monitoring
- **Manual Updates**: Click-to-update location functionality
- **Tracker Management**: Create, view, and delete trackers
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
client/
├── public/
│   └── index.html         # HTML template with Leaflet CSS
├── src/
│   ├── components/
│   │   └── MapView.js     # Main map component with tracking
│   ├── api.js             # API client and geolocation utilities
│   ├── App.js             # Main app component
│   ├── App.css            # Application styles
│   ├── index.js           # React entry point
│   └── index.css          # Global styles
├── package.json           # Dependencies and scripts
└── env.example           # Environment variables template
```

## Installation

1. Install dependencies:

```bash
npm install
```

2. Copy environment file:

```bash
cp env.example .env
```

3. Update `.env` with your server URL:

```
REACT_APP_API_URL=http://localhost:3000
```

4. Start the development server:

```bash
npm start
```

The app will open at `http://localhost:3000`

## Features Overview

### Map Interface

- **Interactive Map**: Pan, zoom, and click to interact
- **Current Location**: Green marker shows your GPS location
- **Tracker Markers**: Blue/red markers for active trackers
- **Real-time Updates**: Markers update automatically via Socket.IO

### Tracker Management

- **Create Trackers**: Click anywhere on the map to create a new tracker
- **Select Trackers**: Click on tracker in sidebar to select
- **Auto-tracking**: Enable continuous GPS monitoring for selected tracker
- **Manual Updates**: Click on map to update tracker location
- **Delete Trackers**: Remove unwanted trackers

### Geolocation Features

- **GPS Integration**: Uses browser's Geolocation API
- **High Accuracy**: Requests precise location data
- **Auto-tracking**: Continuous position monitoring
- **Error Handling**: Graceful fallback for location errors

## API Integration

The client communicates with the backend through:

### REST API Calls

- `trackerAPI.createTracker()` - Create new tracker
- `trackerAPI.getAllTrackers()` - Fetch all trackers
- `trackerAPI.updateTracker()` - Update tracker location
- `trackerAPI.deleteTracker()` - Remove tracker

### Socket.IO Events

- `subscribe` - Subscribe to tracker updates
- `unsubscribe` - Unsubscribe from updates
- `update` - Receive real-time location updates

### Geolocation API

- `geolocationAPI.getCurrentPosition()` - Get current location
- `geolocationAPI.watchPosition()` - Monitor position changes
- `geolocationAPI.clearWatch()` - Stop position monitoring

## Usage Instructions

1. **Allow Location Access**: Browser will prompt for location permission
2. **Create Tracker**: Click anywhere on the map
3. **Select Tracker**: Click on tracker in the sidebar
4. **Enable Auto-tracking**: Click "Start Auto Tracking" button
5. **Monitor Movement**: Watch real-time updates on the map

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Geolocation API**: Required for GPS functionality
- **WebSocket Support**: Required for real-time updates
- **HTTPS**: Required for geolocation in production

## Environment Variables

- `REACT_APP_API_URL`: Backend server URL
- `REACT_APP_DEBUG`: Enable debug logging

## Development

The client uses:

- **React 18**: Modern React with hooks
- **Leaflet**: Interactive map library
- **React-Leaflet**: React bindings for Leaflet
- **Socket.IO Client**: Real-time communication
- **Axios**: HTTP client for API calls

## Production Build

1. Build the application:

```bash
npm run build
```

2. Serve the `build` folder with a web server:

```bash
# Using serve
npx serve -s build

# Using nginx, Apache, or any static file server
```

## Mobile Support

- **Responsive Design**: Adapts to mobile screens
- **Touch Gestures**: Pan and zoom with touch
- **GPS Integration**: Works with mobile GPS
- **PWA Ready**: Can be installed as a web app

## Security Considerations

- **HTTPS Required**: Geolocation API requires secure context
- **CORS Configuration**: Backend must allow frontend origin
- **Location Privacy**: User controls location sharing
- **Permission Handling**: Graceful fallback for denied permissions
# node-tracker-frontend
