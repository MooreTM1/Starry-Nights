import React, { useRef, useEffect } from "react";
import { CONSTELLATIONS } from "../data/constellations";

const StarMap = ({ stars, date, time, location }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Canvas size
    canvas.width = 600;
    canvas.height = 600;

    // Background
    ctx.fillStyle = "#0b0e1a"; // dark sky
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Helper: project RA/Dec (deg) to x, y on this circle
    const projectRaDec = (raDeg, decDeg) => {
      const theta = (raDeg * Math.PI) / 180; // RA degrees -> radians
      const r = (radius * (90 - decDeg)) / 180; // Dec -90..+90 -> 0..R

      const x = centerX + r * Math.sin(theta);
      const y = centerY - r * Math.cos(theta);
      return { x, y };
    };

    // Outer circle border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();

        // Grid lines (RA/Dec)
    ctx.save();
    ctx.filter = "blur(0.5px)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.20)";
    ctx.lineWidth = 0.6;

    // Declination circles
    const decSteps = [-45, 0, 45];
    decSteps.forEach((decDeg) => {
      const r = (radius * (90 - decDeg)) / 180;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Right Ascension lines every 30°
    for (let raDeg = 0; raDeg < 360; raDeg += 45) {
      const theta = (raDeg * Math.PI) / 180;
      const x = centerX + radius * Math.sin(theta);
      const y = centerY - radius * Math.cos(theta);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.restore();

    if (!stars || stars.length === 0) {
      ctx.fillStyle = "white";
      ctx.font = "16px sans-serif";
      ctx.fillText("Loading stars...", 220, 300);
      return;
    }

    // Draw stars
    stars.forEach((s) => {
      const ra = parseFloat(s.RA);   // degrees
      const dec = parseFloat(s.Dec); // degrees
      const mag = parseFloat(s.Mag);

      if (isNaN(ra) || isNaN(dec) || isNaN(mag)) return;

      const { x, y } = projectRaDec(ra, dec);

      // Base sized based on magnitude
      const baseSize = Math.max(0.8, 6 - mag * 1.2); // larger dynamic range
      const glowSize = baseSize * 2.2;              // halo radius

      // Glow (outer)
      let centerAlpha = 1.3 - mag * 0.15; // brigther for small/negative mag
      centerAlpha = Math.max(0, Math.min(1, centerAlpha));

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
      
      gradient.addColorStop(0, "rgba(255, 255, 255, " + centerAlpha + ")");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Core (inner)
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.beginPath();
      ctx.fill();
    });

    ctx.globalAlpha = 1;

    // ---- Draw constellation lines on top ----
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";

    CONSTELLATIONS.forEach((constellation) => {
      constellation.lines.forEach(([ra1, dec1, ra2, dec2]) => {
        const p1 = projectRaDec(ra1, dec1);
        const p2 = projectRaDec(ra2, dec2);

        // Quick check: only draw if both points are inside the circle
        const d1 =
          Math.hypot(p1.x - centerX, p1.y - centerY) <= radius + 1;
        const d2 =
          Math.hypot(p2.x - centerX, p2.y - centerY) <= radius + 1;
        if (!d1 || !d2) return;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
    });
  }, [stars, date, time, location]);

  return (
    <div className="flex flex-col items-center text-white">
      <canvas ref={canvasRef} className="rounded-full shadow-lg" />
      <div className="mt-4 text-center">
        <p className="text-sm tracking-[0.25em] uppercase">The Night Sky</p>
        <p className="text-sm">
          {location.city}, {location.state}
        </p>
        <p className="text-sm">
          {date.toLocaleDateString()}{" "}
          {time
            ? date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </p>
        <p className="text-xs">
          {location.lat.toFixed(4)}° N {location.lon.toFixed(4)}° W
        </p>
      </div>
    </div>
  );
};

export default StarMap;
