const MAP_CENTER = [45.11, 7.78];
const MAP_ZOOM = 11;

let map;
let markersLayer;
let places = [];
let markerById = new Map();

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function googleDirectionsLink(lat, lng) {
  const q = encodeURIComponent(`${lat},${lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

function popupHtml(p) {
  const name = escapeHtml(p.name);
  const city = escapeHtml(p.city);
  const address = escapeHtml(p.address);
  const notes = escapeHtml(p.notes);

  const website = p.website ? `<a class="btn" href="${p.website}" target="_blank" rel="noopener">Sito</a>` : "";
  const booking = p.booking ? `<a class="btn" href="${p.booking}" target="_blank" rel="noopener">Prenota</a>` : "";
  const directions = `<a class="btn" href="${googleDirectionsLink(p.lat, p.lng)}" target="_blank" rel="noopener">Indicazioni</a>`;

  return `
    <div class="popup">
      <h3>${name}</h3>
      <div class="muted">${city}</div>
      ${address ? `<div class="p">${address}</div>` : ""}
      ${notes ? `<div class="p muted">${notes}</div>` : ""}
      <div class="links">
        ${directions}
        ${website}
        ${booking}
      </div>
    </div>
  `;
}

function initMap() {
  map = L.map("map", { scrollWheelZoom: true }).setView(MAP_CENTER, MAP_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function clearMarkers() {
  markersLayer.clearLayers();
  markerById.clear();
}

function addMarkers(data) {
  clearMarkers();

  data.forEach(p => {
    const markerIcon = L.icon({
      iconUrl: p.iconUrl || './hotel-marker.svg',
      iconSize: [38, 52],
      iconAnchor: [19, 52],
      popupAnchor: [0, -52]
    });

    const marker = L.marker([p.lat, p.lng], { 
      icon: markerIcon,
      title: p.name
    }).addTo(markersLayer);

    const label = L.tooltip({
      permanent: true,
      direction: 'bottom',
      offset: [0, 10],
      className: 'marker-label'
    })
    .setContent(p.name)
    .setLatLng([p.lat, p.lng])
    .addTo(markersLayer);

    marker.bindPopup(popupHtml(p), { maxWidth: 320 });

    marker.on("click", () => {
      highlightCard(p.id);
    });

    markerById.set(p.id, marker);
  });

  const bounds = L.latLngBounds(data.map(p => [p.lat, p.lng]));
  if (data.length > 0) map.fitBounds(bounds.pad(0.15));
}

function renderList(data) {
  const list = document.getElementById("list");
  list.innerHTML = "";

  data.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = p.id;

    card.innerHTML = `
      <div class="card__title">${escapeHtml(p.name)}</div>
      <div class="card__meta">${escapeHtml(p.city)}</div>
      ${p.address ? `<div class="card__addr">${escapeHtml(p.address)}</div>` : ""}
    `;

    card.addEventListener("click", () => {
      const marker = markerById.get(p.id);
      if (marker) {
        map.setView(marker.getLatLng(), Math.max(map.getZoom(), 14), { animate: true });
        marker.openPopup();
      }
      highlightCard(p.id);
    });

    list.appendChild(card);
  });
}

function highlightCard(id) {
  document.querySelectorAll(".card").forEach(el => {
    el.style.outline = (el.dataset.id === id) ? "2px solid rgba(255,255,255,0.25)" : "none";
  });
}

function applySearch() {
  const q = document.getElementById("search").value.trim().toLowerCase();
  const filtered = places.filter(p => {
    const hay = `${p.name} ${p.city} ${p.address ?? ""}`.toLowerCase();
    return hay.includes(q);
  });

  renderList(filtered);
  addMarkers(filtered);
}

async function loadData() {
  const res = await fetch("./places.json");
  if (!res.ok) throw new Error("Impossibile caricare places.json");
  places = await res.json();

  renderList(places);
  addMarkers(places);
}

document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  await loadData();

  const search = document.getElementById("search");
  search.addEventListener("input", () => applySearch());
});



