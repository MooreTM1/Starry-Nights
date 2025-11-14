import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import StarMap from "./components/StarMap";
// use your full Hipparcos catalog here:
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
          // keep only rows that have RAdeg, DEdeg, and Vmag
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
    <div className="min-h-screen flex justify-center items-center bg-[#020617]">
      {/* Poster container */}
      <div className="flex flex-col items-center px-4 py-10">
      <StarMap
        stars={stars}
        date={new Date("2025-08-04T21:00:00")}
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
