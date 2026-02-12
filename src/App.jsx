import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import StarMap from "./components/StarMap";
import hipparcos from "../data/hipparcos-voidmain.csv?raw";

const STORAGE_KEY = "starsout_skies";
const DAILY_SKY_ID = "daily-sky";
const DEFAULT_SKY_KEY = "starsout_default_sky_id";

// Build "Daily Sky" preset (9:00 PM)
function buildDailySky() {
  const now = new Date();
  const dateAt9pm = new Date (
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    21, // 9 PM
    0,
    0,
    0
  );

  return {
    id: DAILY_SKY_ID,
    name: "Daily Sky",
    label: "Daily Sky",
    date: dateAt9pm,
    hasTime: true,
    city: "Houston",
    state: "TX",
    lat: 29.7660,
    lon: -95.3701,
  };
}

// Milliseconds until next local midnight
function msUntilNextMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
  return next.getTime() - now.getTime();
}

function App() {
  const [stars, setStars] = useState([]);

  // Multiple sky preset
  const [skies, setSkies] = useState([]);

  // Index of current selected sky
  const [currentIndex, setCurrentIndex] = useState(0);
  // Modal + form state
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState({
    name: "",
    date: "1993-02-24",
    time: "21:00",
    city: "Houston",
    state: "TX",
    lat: "29.7660",
    lon: "-95.3701",
  });

  const [autoRotate, setAutoRotate] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [showControls, setShowControls] = useState(true);

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

  // Load skies from local storage and Daily Sky
  useEffect(() => {
    const daily = buildDailySky();

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw).map((s) => ({
          ...s,
          date: new Date(s.date),
        }));

        // Ensure Daily Sky exists and up to date
        const hasDaily = parsed.some((s) => s.id === DAILY_SKY_ID);

        const nextSkies = hasDaily
          ? parsed.map((s) => (s.id === DAILY_SKY_ID ? { ...s, ...daily } : s))
          : [daily, ...parsed];

        setSkies(nextSkies);

        const savedDefaultId = localStorage.getItem(DEFAULT_SKY_KEY) || DAILY_SKY_ID;

        const idx = nextSkies.findIndex((s) => s.id === savedDefaultId);
        setCurrentIndex(idx >= 0 ? idx : 0);

        return;
      }
    } catch (e) {
      console.warn("Failed to load skies:", e);
    }

    // Fallback: only Daily Sky
    setSkies([daily]);
    setCurrentIndex(0);
  }, []);

  // Update Daily Sky at next midnight, then every midnight
  useEffect(() => {
    let timerId;

    const updateDaily = () => {
      const daily = buildDailySky();
      setSkies((prev) =>
        prev.map((s) => (s.id === DAILY_SKY_ID ? { ...s, ...daily } : s))
      );
    };

    const scheduleNext = () => {
      const delay = msUntilNextMidnight();
      timerId = setTimeout(() => {
        updateDaily();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => clearTimeout(timerId);
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

  // Hides nav controls
  useEffect(() => {
    let timer;

    const resetTimer = () => {
      setShowControls(true);

      clearTimeout(timer);
      timer = setTimeout(() => {
        setShowControls(false);
      }, 8000);
    };

    // Listen for interaction
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("touchstart", resetTimer);
    window.addEventListener("click", resetTimer);

    // Start timer
    resetTimer()

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      window.removeEventListener("click", resetTimer);
    };
  }, []);

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
        name: currentSky.name || "",
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

    const { name, date, time, city, state, lat, lon } = form;
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

    // If user typed a name, use that, otherwise default is used
    const displayName = 
      name && name.trim()
      ? name.trim()
      : `${labelLocation || "Sky"} - ${labelDate}`;

    const newSky = {
      id: crypto.randomUUID(),
      name: displayName,
      label: displayName,
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

  const deleteCurrentSky = () => {
    if (!currentSky) return;

    // Prevents Daily Sky from being deleted
    if (currentSky.id === DAILY_SKY_ID) {
      alert("Daily Sky cannot be deleted.");
      return;
    }

    // Prevents deleting last remaining sky
    if (skies.length === 1) {
      alert("You must keep at least one sky.");
      return;
    }

    const ok = confirm(`Delete "${currentSky.label}"? This cannot be undone. `);
    if (!ok) return;

     setSkies((prev) => {
    const idx = currentIndex;
    const next = prev.filter((s) => s.id !== currentSky.id);

    // Adjust current index so it stays in range
    const nextIndex = Math.max(0, Math.min(idx, next.length - 1));
    setCurrentIndex(nextIndex);

    return next;
   });
};

  const openRename = () => {
  if (!currentSky) return;
  setRenameValue(currentSky.label || "");
  setShowRename(true);
};

const closeRename = () => setShowRename(false);

const saveRename = (e) => {
  e.preventDefault();
  const nextLabel = renameValue.trim();
  if (!nextLabel) return;

  setSkies((prev) =>
    prev.map((s, i) => (i === currentIndex ? { ...s, name: nextLabel, label: nextLabel } : s))
  );

  setShowRename(false);
};

const makeCurrentDefault = () => {
  if (!currentSky) return;
  localStorage.setItem(DEFAULT_SKY_KEY, currentSky.id);
  alert(`"${currentSky.label}" will be the default sky.`);
}


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
          title={currentSky.label}
          location={{
            city: currentSky.city,
            state: currentSky.state,
            lat: currentSky.lat,
            lon: currentSky.lon,
          }}
        />

        {/* Sky navigation + auto toggle */}
        {currentSky && (
          <div className="sky-nav">
            <button onClick={prevSky} className="sky-nav-btn">
              ◀
            </button>
            <span className="sky-nav-label">
              {(currentSky.name || currentSky.label || `Sky ${currentIndex + 1}`)}
              {" · "}
              {currentIndex + 1} / {skies.length}
            </span>
            <button onClick={nextSky} className="sky-nav-btn">
              ▶
            </button>
            <button
              className={
                "sky-auto-btn " + (autoRotate ? "on" : "off")
              }
              onClick={() => setAutoRotate((v) => !v)}
              disabled={skies.length <= 1}
            >
              Auto
            </button>

            <button className="sky-nav-btn" onClick={openRename}>
              Rename
            </button>

            <button className="sky-nav-btn" onClick={makeCurrentDefault}>
              Make Default
            </button>

            <button onClick={deleteCurrentSky} className="sky-delete-btn">
              Delete
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
              <div className="modal-field">
                <label htmlFor="name">Sky Name (optional)</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="e.g. A Great Day"
                />
              </div>
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
      
    {showRename && (
        <div className="modal-backdrop" onClick={closeRename}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <h2>Rename Sky</h2>
      <p className="modal-subtitle">Give this saved sky a new name.</p>

      <form onSubmit={saveRename}>
        <div className="modal-field">
          <label htmlFor="rename">Name</label>
          <input
            id="rename"
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="e.g., Anniversary Night"
            autoFocus
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={closeRename}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save Name
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