import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import StarMap from "./components/StarMap";
import hipparcos from "../data/hipparcos-voidmain.csv?raw";

const STORAGE_KEY = "starsout_skies";

function App() {
  const [stars, setStars] = useState([]);

  // Multiple sky preset
  const [skies, setSkies] = useState([]);

  // Index of current selected sky
  const [currentIndex, setCurrentIndex] = useState(0);
  // Modal + form state
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState({
    date: "1993-02-24",
    time: "21:00",
    city: "Houston",
    state: "TX",
    lat: "29.7660",
    lon: "-95.3701",
  });

  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    Papa.parse(hipparcos, {
      download: false,      // already loaded as raw text by Vite
      header: true,
      complete: (results) => {
        
        const cleaned = results.data
          .filter((row) => row.RAdeg && row.DEdeg && row.Vmag)
          // map to the fields StarMap expects: RA, Dec, Mag
          .map((row) => ({
            RA: parseFloat(row.RAdeg),   // degrees
            Dec: parseFloat(row.DEdeg),  // degrees
            Mag: parseFloat(row.Vmag),   // magnitude
          }))
          // drop anything that failed to parse
          .filter(
            (row) =>
              !isNaN(row.RA) && !isNaN(row.Dec) && !isNaN(row.Mag)
          )
          // optional: limit to reasonably bright stars for performance/clarity
          .filter((row) => row.Mag <= 8)   // tweak as you like
          .slice(0, 50000);               // cap count while testing

        setStars(cleaned);
      },
      error: (err) => {
        console.error("CSV parse error:", err);
      },
    });
  }, []);

  // Load skies from local storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw).map((s) => ({
          ...s,
          date: new Date(s.date),
        }));
        if (parsed.length > 0) {
          setSkies(parsed);
          setCurrentIndex(0);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to load skies from storage:", e);
    }

    // Fallback default sky
    const defaultSky = {
      id: crypto.randomUUID(),
      label: "Default",
      date: new Date("1993-02-24T00:30:00"),
      hasTime: true,
      city: "Houston",
      state: "TX",
      lat: 29.7660,
      lon: -95.3701,
    };
    setSkies([defaultSky]);
    setCurrentIndex(0);
  }, []);

  // Persist skies to localStorage
  useEffect(() => {
    if (!skies || skies.length === 0) return;
    const serializable = skies.map ((s) => ({
      ...s,
      date: s.date.toISOString(),
    }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {
      console.warn("Failed to save skies:", e);
    }
  }, [skies]);

  // Auto rotation
  useEffect(() => {
    if (!autoRotate || skies.length <= 1) return;

    const id = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % skies.length);
    }, 20000); // 20 seconds per sky

    return () => clearInterval(id);
  }, [autoRotate, skies.length]);

  const currentSky = 
    skies.length > 0 
    ? skies[Math.min(currentIndex, skies.length - 1)] 
    : null;

  // Modal open/close & form
  const openEditor = () => {
    if (currentSky) {
      const d = currentSky.date;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");

      setForm({
        date: `${yyyy}-${mm}-${dd}`,
        time: currentSky.hasTime ? `${hh}:${min}` : "",
        city: currentSky.city,
        state: currentSky.state,
        lat: currentSky.lat.toString(),
        lon: currentSky.lon.toString(),
      });
    }
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    const { date, time, city, state, lat, lon } = form;
    if (!date) {
      alert("Please enter a date.");
      return;
    }

    let dateObj;
    if (time && time.trim() !== "") {
      dateObj = new Date(`${date}T${time}:00`);
    } else {
      dateObj = new Date(date);
    }

    const latNum = parseFloat(lat) || 0;
    const lonNum = parseFloat(lon) || 0;

    const labelParts = [];
    if (city) labelParts.push(city);
    if (state) labelParts.push(state);
    const labelLocation = labelParts.join(", ");
    const labelDate = dateObj.toLocaleDateString();

    const newSky = {
      id: crypto.randomUUID(),
      label: `${labelLocation || "Sky"} — ${labelDate}`,
      date: dateObj,
      hasTime: Boolean(time && time.trim() !== ""),
      city: city || "Unknown",
      state: state || "",
      lat: latNum,
      lon: lonNum,
    };

    setSkies((prev) => {
      const next = [...prev, newSky];
      setCurrentIndex(next.length - 1);
      return next;
    });

    setShowEditor(false);
  };

  // Manual naigation
  const nextSky = () => {
    if (skies.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % skies.length);
  };

  const prevSky = () => {
    if (skies.length <= 1) return;
    setCurrentIndex((prev) =>
      prev === 0 ? skies.length - 1 : prev - 1
    );
  };

  if (!currentSky) {
    return <div className="app-root" />;
  }

  return (
    <div className="app-root">
      <div>
        <StarMap
          stars={stars}
          date={currentSky.date}
          time={currentSky.hasTime}
          location={{
            city: currentSky.city,
            state: currentSky.state,
            lat: currentSky.lat,
            lon: currentSky.lon,
          }}
        />

        {/* Sky navigation + auto toggle */}
        {skies.length > 1 && (
          <div className="sky-nav">
            <button onClick={prevSky} className="sky-nav-btn">
              ◀
            </button>
            <span className="sky-nav-label">
              Sky {currentIndex + 1} / {skies.length}
            </span>
            <button onClick={nextSky} className="sky-nav-btn">
              ▶
            </button>
            <button
              className={
                "sky-auto-btn " + (autoRotate ? "on" : "off")
              }
              onClick={() => setAutoRotate((v) => !v)}
            >
              Auto
            </button>
          </div>
        )}
      </div>

      {/* Floating add/edit button */}
      <button className="floating-button" onClick={openEditor}>
        ✦
      </button>

      {/* Modal */}
      {showEditor && (
        <div className="modal-backdrop" onClick={closeEditor}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Edit Night Sky</h2>
            <p className="modal-subtitle">
              Set the date, location, and time for this sky. Saving
              will create a new preset.
            </p>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-row">
                <div className="modal-field">
                  <label htmlFor="date">Date</label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="modal-field">
                  <label htmlFor="time">Time (optional)</label>
                  <input
                    id="time"
                    name="time"
                    type="time"
                    value={form.time}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="modal-row">
                <div className="modal-field">
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={form.city}
                    onChange={handleFormChange}
                    placeholder="Houston"
                  />
                </div>
                <div className="modal-field">
                  <label htmlFor="state">State / Region</label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    value={form.state}
                    onChange={handleFormChange}
                    placeholder="TX"
                  />
                </div>
              </div>

              <div className="modal-row">
                <div className="modal-field">
                  <label htmlFor="lat">Latitude</label>
                  <input
                    id="lat"
                    name="lat"
                    type="number"
                    step="0.0001"
                    value={form.lat}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="modal-field">
                  <label htmlFor="lon">Longitude</label>
                  <input
                    id="lon"
                    name="lon"
                    type="number"
                    step="0.0001"
                    value={form.lon}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeEditor}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Sky
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;