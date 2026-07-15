import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const highlightIcon = new L.Icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "cc-latest-pin",
});

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export const MapView = ({ center, zoom = 12, markers = [], recenterTo }) => {
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} data-testid="leaflet-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {recenterTo && <Recenter center={recenterTo} />}
      {markers.map((m, i) => (
        <Marker
          key={m.id || i}
          position={[m.latitude, m.longitude]}
          icon={i === 0 ? highlightIcon : L.Icon.Default.prototype}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-bold">{m.contractor_name}</div>
              <div>{m.email}</div>
              <div className="font-mono text-xs mt-1">
                {m.latitude.toFixed(5)}, {m.longitude.toFixed(5)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(m.created_at).toLocaleString()}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
