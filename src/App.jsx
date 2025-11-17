import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import StarMap from "./components/StarMap";
import hipparcos from "../data/hipparcos-voidmain.csv?raw";

function App() {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    Papa.parse(hipparcos, {
      download: false,      // already loaded as raw text by Vite
      header: true,
      complete: (results) => {
        console.log("Hipparcos CSV parsed:", results);

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
              !isNaN(row.RA) &&
              !isNaN(row.Dec) &&
              !isNaN(row.Mag)
          )
          // optional: limit to reasonably bright stars for performance/clarity
          .filter((row) => row.Mag <= 8)   // tweak as you like
          .slice(0, 50000);               // cap count while testing

        console.log("Stars after cleaning:", cleaned.length);
        setStars(cleaned);
      },
      error: (err) => {
        console.error("CSV parse error:", err);
      },
    });
  }, []);

  return (
    <div className="app-root">
      <div>
      <StarMap
        stars={stars}
        date={new Date("1993-02-24T21:00:00")}
        time={true}
        location={{
          city: "Houston",
          state: "TX",
          lat: 29.7660,
          lon: -95.3701,
        }}
      />
      </div>
    </div>
  );
}

export default App;
