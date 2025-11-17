import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import StarMap from "./components/StarMap";
import hipparcos from "../data/hipparcos-voidmain.csv?raw";

function App() {
  const [stars, setStars] = useState([]);

  // Current sky settings
  const [sky, setSky] = useState({
    date: new Date("1993-02-24T21:00:00"),
    hasTime: true,
    city: "Houston",
    state: "TX",
    lat: 29.7660,
    lon: -95.3701,
  });

  // Modal + form state
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState({
    date: "1993-02-24",
    time: "21:00",
    city: "Houston",
    lat: "29.7660",
    lon: "-95.3701",
  });

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

  // When opening the editor, sync from fields with current sky
  const openEditor = () => {
    const d = sky.date;
    const yyyy = d.getFullYear();
    const mm = String (d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");

    setForm({
      date: `${yyyy}-${mm}-${dd}`,
      time: sky.hasTime ? `${hh}:${min}` : "",
      city: sky.city,
      state: sky.state,
      lat: sky.lat.toString(),
      lon: sky.lon.toString(),
    });

    setShowEditor(true);
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
      // Combine into ISO-like string
      dateObj = new Date(`${date}T${time}:00`);
    } else {
      dateObj = new Date(date);
    }

    setSky({
      date: dateObj,
      hasTime: Boolean(time && time.trim() !== ""),
      city: city || "Unknown",
      state: state || "",
      lat: parseFloat(lat) || 0,
      lon: parseFloat(lon) || 0,
    });

    setShowEditor(false);
  };

  const closeEditor = () => {
    setShowEditor(false);
  };

  return (
    <div className="app-root">
      <div>
      <StarMap
        stars={stars}
        date={sky.date}
        time={sky.hasTime}
        location={{
          city: sky.city,
          state: sky.state,
          lat: sky.lat,
          lon: sky.lon,
        }}
      />
      </div>

       {/* Floating button bottom-left */}
      <button className="floating-button" onClick={openEditor}>
        ✦
      </button>

      {/* Modal */}
      {showEditor && (
        <div className="modal-backdrop" onClick={closeEditor}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()} // prevent backdrop close
          >
            <h2>Edit Night Sky</h2>
            <p className="modal-subtitle">
              Set the date, location, and time for this sky.
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
                  <label htmlFor="state">State</label>
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