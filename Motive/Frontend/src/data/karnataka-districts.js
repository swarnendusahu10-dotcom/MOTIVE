// Karnataka Districts GeoJSON — approximate boundaries for all 31 districts
// Production: replace with precise data from https://github.com/datameet/maps
export const karnatakaGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { district: "Bengaluru Urban", division: "Bengaluru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [77.45, 12.84], [77.55, 12.84], [77.78, 12.84], [77.85, 12.97],
          [77.82, 13.18], [77.68, 13.22], [77.48, 13.15], [77.38, 13.02],
          [77.40, 12.90], [77.45, 12.84]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Bengaluru Rural", division: "Bengaluru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [77.02, 13.05], [77.38, 13.02], [77.48, 13.15], [77.42, 13.38],
          [77.22, 13.52], [76.98, 13.45], [76.85, 13.28], [76.92, 13.10],
          [77.02, 13.05]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Mysuru", division: "Mysuru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [75.98, 11.98], [76.45, 11.95], [76.82, 12.08], [76.98, 12.32],
          [76.85, 12.62], [76.58, 12.75], [76.22, 12.68], [75.95, 12.45],
          [75.88, 12.18], [75.98, 11.98]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Tumakuru", division: "Bengaluru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.38, 13.18], [76.85, 13.12], [77.02, 13.05], [76.98, 13.45],
          [76.78, 13.78], [76.48, 13.88], [76.18, 13.72], [76.05, 13.45],
          [76.18, 13.22], [76.38, 13.18]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Kolar", division: "Bengaluru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [77.68, 13.22], [78.05, 13.18], [78.28, 13.32], [78.32, 13.58],
          [78.12, 13.75], [77.85, 13.72], [77.62, 13.55], [77.55, 13.35],
          [77.68, 13.22]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Chikkaballapura", division: "Bengaluru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [77.55, 13.35], [77.85, 13.35], [78.08, 13.48], [78.12, 13.75],
          [77.85, 13.88], [77.58, 13.82], [77.38, 13.62], [77.42, 13.42],
          [77.55, 13.35]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Ramanagara", division: "Bengaluru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.85, 12.62], [77.22, 12.58], [77.45, 12.72], [77.45, 12.84],
          [77.38, 13.02], [76.92, 13.10], [76.72, 12.95], [76.68, 12.75],
          [76.85, 12.62]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Mandya", division: "Mysuru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.38, 12.28], [76.82, 12.08], [76.98, 12.32], [76.85, 12.62],
          [76.68, 12.75], [76.42, 12.68], [76.18, 12.52], [76.15, 12.32],
          [76.28, 12.18], [76.38, 12.28]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Hassan", division: "Mysuru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [75.55, 12.55], [75.95, 12.45], [76.22, 12.68], [76.42, 12.68],
          [76.45, 12.98], [76.25, 13.22], [75.95, 13.32], [75.68, 13.18],
          [75.52, 12.92], [75.48, 12.68], [75.55, 12.55]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Chikkamagaluru", division: "Mysuru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [75.45, 13.02], [75.68, 12.88], [75.88, 12.75], [76.15, 12.72],
          [76.25, 13.02], [76.08, 13.38], [75.85, 13.52], [75.58, 13.45],
          [75.38, 13.25], [75.38, 13.10], [75.45, 13.02]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Kodagu", division: "Mysuru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [75.52, 11.98], [75.88, 11.92], [76.18, 12.02], [76.38, 12.28],
          [76.22, 12.55], [75.95, 12.65], [75.65, 12.58], [75.45, 12.32],
          [75.42, 12.12], [75.52, 11.98]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Dakshina Kannada", division: "Mysuru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [74.75, 12.28], [75.15, 12.18], [75.45, 12.32], [75.65, 12.58],
          [75.52, 12.85], [75.22, 12.98], [74.92, 12.88], [74.68, 12.65],
          [74.62, 12.42], [74.75, 12.28]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Udupi", division: "Mysuru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [74.55, 13.25], [74.85, 13.12], [75.15, 13.12], [75.38, 13.25],
          [75.42, 13.52], [75.22, 13.72], [74.95, 13.78], [74.68, 13.62],
          [74.52, 13.42], [74.55, 13.25]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Shivamogga", division: "Mysuru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [75.38, 13.25], [75.68, 13.18], [75.95, 13.32], [76.08, 13.58],
          [75.92, 13.92], [75.65, 14.08], [75.35, 14.02], [75.12, 13.78],
          [75.15, 13.52], [75.28, 13.35], [75.38, 13.25]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Uttara Kannada", division: "Dharwad" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [74.55, 13.78], [74.85, 13.68], [75.22, 13.72], [75.45, 13.92],
          [75.52, 14.28], [75.38, 14.65], [75.08, 14.85], [74.72, 14.78],
          [74.48, 14.52], [74.42, 14.18], [74.52, 13.95], [74.55, 13.78]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Dharwad", division: "Dharwad" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [74.88, 15.22], [75.22, 15.12], [75.52, 15.22], [75.72, 15.52],
          [75.62, 15.82], [75.32, 15.95], [75.02, 15.88], [74.78, 15.62],
          [74.72, 15.38], [74.82, 15.28], [74.88, 15.22]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Gadag", division: "Dharwad" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [75.52, 15.08], [75.88, 15.02], [76.22, 15.15], [76.32, 15.48],
          [76.15, 15.72], [75.82, 15.78], [75.52, 15.65], [75.38, 15.38],
          [75.42, 15.18], [75.52, 15.08]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Haveri", division: "Dharwad" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [75.18, 14.52], [75.58, 14.45], [75.88, 14.58], [75.95, 14.88],
          [75.78, 15.15], [75.48, 15.22], [75.18, 15.08], [75.02, 14.82],
          [75.08, 14.62], [75.18, 14.52]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Belagavi", division: "Belagavi" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [74.42, 15.52], [74.82, 15.42], [75.18, 15.52], [75.48, 15.75],
          [75.52, 16.18], [75.32, 16.52], [74.95, 16.68], [74.58, 16.55],
          [74.28, 16.25], [74.22, 15.88], [74.32, 15.65], [74.42, 15.52]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Vijayapura", division: "Belagavi" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [75.58, 16.42], [76.02, 16.28], [76.48, 16.32], [76.82, 16.55],
          [76.88, 16.92], [76.65, 17.22], [76.28, 17.32], [75.92, 17.18],
          [75.68, 16.88], [75.55, 16.62], [75.58, 16.42]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Bagalkot", division: "Belagavi" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [75.52, 15.92], [75.92, 15.78], [76.28, 15.88], [76.52, 16.18],
          [76.48, 16.52], [76.15, 16.68], [75.78, 16.62], [75.55, 16.38],
          [75.48, 16.12], [75.52, 15.92]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Koppal", division: "Kalyana Karnataka" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.02, 15.22], [76.38, 15.12], [76.72, 15.22], [76.88, 15.52],
          [76.78, 15.82], [76.48, 15.95], [76.18, 15.85], [75.98, 15.58],
          [75.98, 15.35], [76.02, 15.22]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Ballari", division: "Kalyana Karnataka" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.38, 14.72], [76.78, 14.62], [77.12, 14.72], [77.28, 15.02],
          [77.18, 15.35], [76.85, 15.48], [76.52, 15.38], [76.32, 15.08],
          [76.28, 14.85], [76.38, 14.72]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Chitradurga", division: "Kalyana Karnataka" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.05, 14.12], [76.38, 14.02], [76.68, 14.12], [76.82, 14.42],
          [76.72, 14.72], [76.42, 14.82], [76.12, 14.72], [75.95, 14.45],
          [75.98, 14.22], [76.05, 14.12]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Davangere", division: "Kalyana Karnataka" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [75.62, 14.12], [76.02, 14.02], [76.32, 14.15], [76.45, 14.45],
          [76.32, 14.72], [76.02, 14.82], [75.72, 14.72], [75.52, 14.45],
          [75.55, 14.25], [75.62, 14.12]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Raichur", division: "Kalyana Karnataka" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.52, 15.92], [76.88, 15.82], [77.22, 15.92], [77.48, 16.22],
          [77.45, 16.58], [77.18, 16.78], [76.82, 16.72], [76.55, 16.48],
          [76.45, 16.18], [76.52, 15.92]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Yadgir", division: "Kalyana Karnataka" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.65, 16.72], [77.02, 16.62], [77.38, 16.72], [77.55, 17.02],
          [77.48, 17.32], [77.18, 17.48], [76.85, 17.38], [76.62, 17.12],
          [76.58, 16.88], [76.65, 16.72]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Kalaburagi", division: "Kalyana Karnataka" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.52, 17.18], [76.88, 17.08], [77.28, 17.18], [77.62, 17.38],
          [77.75, 17.72], [77.55, 18.02], [77.18, 18.12], [76.78, 17.98],
          [76.52, 17.68], [76.42, 17.38], [76.52, 17.18]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Bidar", division: "Kalyana Karnataka" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.72, 17.82], [77.12, 17.72], [77.52, 17.82], [77.82, 18.02],
          [77.92, 18.32], [77.72, 18.58], [77.35, 18.62], [76.98, 18.48],
          [76.72, 18.22], [76.65, 17.98], [76.72, 17.82]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { district: "Chamarajanagar", division: "Mysuru" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.68, 11.72], [77.02, 11.65], [77.32, 11.78], [77.45, 12.05],
          [77.28, 12.32], [76.98, 12.42], [76.68, 12.32], [76.52, 12.05],
          [76.55, 11.85], [76.68, 11.72]
        ]]
      }
    }
  ]
};

export const crimeData = {
  "Bengaluru (Urban)":  { incidents: 347, theft: 120, assault: 89,  cyber: 95, narcotics: 43, lat: 12.9716, lng: 77.5946, trend: [280,295,310,325,330,347] },
  "Mysuru":           { incidents: 182, theft: 70,  assault: 55,  cyber: 32, narcotics: 25, lat: 12.2958, lng: 76.6394, trend: [158,162,170,175,178,182] },
  "Kalaburgi":       { incidents: 164, theft: 65,  assault: 60,  cyber: 20, narcotics: 19, lat: 17.3297, lng: 76.8200, trend: [140,145,150,155,160,164] },
  "Ballari":          { incidents: 153, theft: 55,  assault: 62,  cyber: 18, narcotics: 18, lat: 15.1394, lng: 76.9214, trend: [130,135,140,145,150,153] },
  "Belagavi":         { incidents: 138, theft: 60,  assault: 40,  cyber: 22, narcotics: 16, lat: 15.8497, lng: 74.4977, trend: [118,122,128,130,135,138] },
  "Raichur":          { incidents: 130, theft: 48,  assault: 55,  cyber: 12, narcotics: 15, lat: 16.2120, lng: 77.3439, trend: [112,115,120,122,127,130] },
  "Tumakuru":         { incidents: 118, theft: 50,  assault: 35,  cyber: 20, narcotics: 13, lat: 13.3409, lng: 77.1010, trend: [100,104,108,112,115,118] },
  "Dharwad":          { incidents: 110, theft: 45,  assault: 30,  cyber: 22, narcotics: 13, lat: 15.4589, lng: 75.0078, trend: [95, 98, 102,105,108,110] },
  "Vijayapura":       { incidents: 105, theft: 40,  assault: 38,  cyber: 15, narcotics: 12, lat: 16.8302, lng: 75.7100, trend: [88, 92, 96, 100,102,105] },
  "Shivamogga":       { incidents: 98,  theft: 38,  assault: 28,  cyber: 19, narcotics: 13, lat: 13.9299, lng: 75.5681, trend: [82, 85, 88, 92, 95, 98]  },
  "Dakshina Kannada": { incidents: 92,  theft: 35,  assault: 25,  cyber: 22, narcotics: 10, lat: 12.8438, lng: 74.8463, trend: [78, 80, 84, 86, 90, 92]  },
  "Chitradurga":      { incidents: 88,  theft: 33,  assault: 28,  cyber: 15, narcotics: 12, lat: 14.2251, lng: 76.3980, trend: [72, 75, 78, 82, 85, 88]  },
  "Bidar":            { incidents: 85,  theft: 32,  assault: 32,  cyber: 12, narcotics: 9,  lat: 17.9104, lng: 77.5199, trend: [70, 72, 76, 79, 82, 85]  },
  "Davanagere":        { incidents: 82,  theft: 32,  assault: 25,  cyber: 15, narcotics: 10, lat: 14.4644, lng: 75.9218, trend: [68, 70, 74, 77, 80, 82]  },
  "Bagalkote":         { incidents: 78,  theft: 30,  assault: 28,  cyber: 10, narcotics: 10, lat: 16.1691, lng: 75.6960, trend: [64, 66, 70, 72, 75, 78]  },
  "Yadgir":           { incidents: 75,  theft: 28,  assault: 30,  cyber: 8,  narcotics: 9,  lat: 16.7630, lng: 77.1388, trend: [62, 64, 68, 70, 72, 75]  },
  "Haveri":           { incidents: 72,  theft: 28,  assault: 22,  cyber: 12, narcotics: 10, lat: 14.7941, lng: 75.3998, trend: [60, 62, 65, 68, 70, 72]  },
  "Koppal":           { incidents: 70,  theft: 26,  assault: 28,  cyber: 8,  narcotics: 8,  lat: 15.3503, lng: 76.1547, trend: [58, 60, 63, 66, 68, 70]  },
  "Kolara":            { incidents: 68,  theft: 27,  assault: 20,  cyber: 13, narcotics: 8,  lat: 13.1362, lng: 78.1302, trend: [55, 58, 60, 63, 66, 68]  },
  "Mandya":           { incidents: 65,  theft: 26,  assault: 18,  cyber: 12, narcotics: 9,  lat: 12.5218, lng: 76.8951, trend: [52, 55, 58, 60, 62, 65]  },
  "Hassan":           { incidents: 62,  theft: 24,  assault: 18,  cyber: 12, narcotics: 8,  lat: 13.0072, lng: 76.0962, trend: [50, 52, 55, 57, 60, 62]  },
  "Chikkamagaluru":   { incidents: 58,  theft: 22,  assault: 16,  cyber: 12, narcotics: 8,  lat: 13.3161, lng: 75.7720, trend: [47, 49, 52, 54, 56, 58]  },
  "Ramanagara":       { incidents: 55,  theft: 22,  assault: 15,  cyber: 10, narcotics: 8,  lat: 12.7157, lng: 77.2818, trend: [44, 46, 48, 51, 53, 55]  },
  "Uttara Kannada":   { incidents: 48,  theft: 18,  assault: 14,  cyber: 10, narcotics: 6,  lat: 14.7937, lng: 74.6941, trend: [38, 40, 42, 44, 46, 48]  },
  "Chikkaballapura":  { incidents: 45,  theft: 17,  assault: 13,  cyber: 9,  narcotics: 6,  lat: 13.4355, lng: 77.7280, trend: [36, 38, 40, 42, 44, 45]  },
  "Bengaluru (Rural)":  { incidents: 42,  theft: 16,  assault: 12,  cyber: 8,  narcotics: 6,  lat: 13.1986, lng: 77.3200, trend: [34, 36, 38, 39, 41, 42]  },
  "Gadag":            { incidents: 40,  theft: 15,  assault: 13,  cyber: 7,  narcotics: 5,  lat: 15.4317, lng: 75.6322, trend: [32, 34, 36, 38, 39, 40]  },
  "Udupi":            { incidents: 38,  theft: 14,  assault: 11,  cyber: 9,  narcotics: 4,  lat: 13.3409, lng: 74.7421, trend: [30, 32, 34, 35, 37, 38]  },
  "Kodagu":           { incidents: 35,  theft: 13,  assault: 10,  cyber: 7,  narcotics: 5,  lat: 12.4218, lng: 75.7382, trend: [28, 30, 31, 32, 34, 35]  },
  "Chamarajanagar":   { incidents: 30,  theft: 11,  assault: 9,   cyber: 6,  narcotics: 4,  lat: 11.9261, lng: 76.9391, trend: [24, 26, 27, 28, 29, 30]  },
  "Vijayanagara":   { incidents: 30,  theft: 11,  assault: 9,   cyber: 6,  narcotics: 4,  lat: 11.9261, lng: 76.9391, trend: [24, 26, 27, 28, 29, 30]  },
  "Bengaluru South":   { incidents: 30,  theft: 11,  assault: 9,   cyber: 6,  narcotics: 4,  lat: 11.9261, lng: 76.9391, trend: [24, 26, 27, 28, 29, 30]  }
};

export function getSeverity(incidents) {
  if (incidents >= 200) return "critical";
  if (incidents >= 120) return "high";
  if (incidents >= 70)  return "medium";
  return "low";
}

export const severityColor = {
  critical: "#ff2d55",
  high:     "#ff9f0a",
  medium:   "#ffd60a",
  low:      "#30d158"
};

export const severityFill = {
  critical: "rgba(255,45,85,0.22)",
  high:     "rgba(255,159,10,0.15)",
  medium:   "rgba(255,214,10,0.10)",
  low:      "rgba(48,209,88,0.08)"
};

export const severityLabel = {
  critical: "CRITICAL",
  high:     "HIGH",
  medium:   "MEDIUM",
  low:      "LOW"
};
//copied