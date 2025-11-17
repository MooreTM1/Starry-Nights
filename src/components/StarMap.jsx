import React, { useRef, useEffect } from "react";
import { CONSTELLATIONS } from "../data/constellations";

const deg2rad = (d) => (d * Math.PI) / 180;
const rad2deg = (r) => (r * 180) / Math.PI;

// Julian Date from JS Date (UTC based)
function getJulianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Compute Local Sidereal Time in degrees (0-360)
// longitude: degrees, East positive, West negative (your lon is already negative)
function getLocalSiderealTime(date, longitudeDeg) {
  const jd = getJulianDate(date);
  const T = (jd - 2451545.0) / 36525.0;

  let GMST =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;

  GMST = ((GMST % 360) + 360) % 360; // normalize 0..360
  let LST = GMST + longitudeDeg; // local
  LST = ((LST % 360) + 360) % 360;
  return LST;
}

// Convert Equatorial (RA,Dec in deg) to Horizontal (Alt/Az in radians)
function eqToHz(raDeg, decDeg, latDeg, lstDeg) {
  const raRad = deg2rad(raDeg);
  const decRad = deg2rad(decDeg);
  const latRad = deg2rad(latDeg);
  const lstRad = deg2rad(lstDeg);

  // Hour angle H = LST - RA
  const H = lstRad - raRad;

  const sinAlt =
    Math.sin(decRad) * Math.sin(latRad) +
    Math.cos(decRad) * Math.cos(latRad) * Math.cos(H);
  const altRad = Math.asin(sinAlt);

  const cosAz =
    (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) /
    (Math.cos(altRad) * Math.cos(latRad));

  // clamp due to float rounding
  const cosAzClamped = Math.max(-1, Math.min(1, cosAz));
  let azRad = Math.acos(cosAzClamped); // 0..pi

  // Resolve quadrant using sign of sin(H)
  if (Math.sin(H) > 0) {
    azRad = 2 * Math.PI - azRad;
  }

  return { alt: altRad, az: azRad };
}

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

    const { lat, lon } = location;
    const lstDeg = getLocalSiderealTime(date, lon);

    // Helper: project Alt/Az (radians) to x,y
    const projectAltAz = (altRad, azRad) => {
      const altDeg = rad2deg(altRad); // 0 at horizon, 90 at zenith
      const r = (radius * (90 - altDeg)) / 90; // zenith center, horizon edge

      const x = centerX + r * Math.sin(azRad);
      const y = centerY - r * Math.cos(azRad);
      return { x, y };
    };

    // Outer circle border (horizon)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();

    // ===== GRID LINES in Alt/Az =====
    ctx.save();
    ctx.filter = "blur(0.5px)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 0.6;

    // Altitude circles (30°, 60° above horizon)
    const altSteps = [30, 60];
    altSteps.forEach((altDeg) => {
      const r = (radius * (90 - altDeg)) / 90;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Azimuth lines every 45° (N, NE, E, ...)
    for (let azDeg = 0; azDeg < 360; azDeg += 45) {
      const azRad = deg2rad(azDeg);
      const x = centerX + radius * Math.sin(azRad);
      const y = centerY - radius * Math.cos(azRad);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.restore();
    // ===== END GRID =====

    if (!stars || stars.length === 0) {
      ctx.fillStyle = "white";
      ctx.font = "16px sans-serif";
      ctx.fillText("Loading stars...", 220, 300);
      return;
    }

    // ---- Draw stars with Alt/Az projection & glow ----
    stars.forEach((s) => {
      const ra = parseFloat(s.RA); // degrees (already RAdeg)
      const dec = parseFloat(s.Dec); // degrees (DEdeg)
      const mag = parseFloat(s.Mag);

      if (isNaN(ra) || isNaN(dec) || isNaN(mag)) return;

      // Convert to horizontal coordinates for this time/location
      const { alt, az } = eqToHz(ra, dec, lat, lstDeg);

      // Only draw stars above horizon
      if (alt <= 0) return;

      const { x, y } = projectAltAz(alt, az);

      // Brightness / size based on magnitude
      const baseSize = Math.max(0.6, 5.5 - mag * 1.1);
      const glowSize = baseSize * 2.1;

      let centerAlpha = 1.25 - mag * 0.14;
      centerAlpha = Math.max(0, Math.min(1, centerAlpha));

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
      gradient.addColorStop(
        0,
        "rgba(255, 255, 255, " + centerAlpha + ")"
      );
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      // Glow
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.beginPath();
      ctx.arc(x, y, baseSize * 0.55, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;

    // ---- Draw constellation lines (projected via Alt/Az) ----
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";

    CONSTELLATIONS.forEach((constellation) => {
      constellation.lines.forEach(([ra1, dec1, ra2, dec2]) => {
        const h1 = eqToHz(ra1, dec1, lat, lstDeg);
        const h2 = eqToHz(ra2, dec2, lat, lstDeg);

        // Only draw segments where both endpoints are above horizon
        if (h1.alt <= 0 || h2.alt <= 0) return;

        const p1 = projectAltAz(h1.alt, h1.az);
        const p2 = projectAltAz(h2.alt, h2.az);

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

  // Caption
  const latLabel =
    location.lat >= 0
      ? `${location.lat.toFixed(4)}° N`
      : `${Math.abs(location.lat).toFixed(4)}° S`;
  const lonLabel =
    location.lon >= 0
      ? `${location.lon.toFixed(4)}° E`
      : `${Math.abs(location.lon).toFixed(4)}° W`;

  return (
    <div className="flex flex-col items-center text-white">
      <canvas ref={canvasRef} className="rounded-full shadow-lg" />
      <div className="mt-8 text-center leading-relaxed">
        <p className="text-xs tracking-[0.3em] uppercase text-slate-300">
          The Night Sky
        </p>
        <p className="text-sm mt-2 text-slate-100">
          {location.city}, {location.state}
        </p>
        <p className="text-xs mt-1 text-slate-300">
          {date.toLocaleDateString()}{" "}
          {time
            ? date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </p>
        <p className="text-[11px] mt-1 text-slate-400">
          {latLabel} {lonLabel}
        </p>
      </div>
    </div>
  );
};

export default StarMap;
