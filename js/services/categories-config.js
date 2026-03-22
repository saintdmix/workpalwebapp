export const ALL_CATEGORIES = [
  "Accountant",
  "Air Conditioning Technician",
  "App Developer",
  "App Tester",
  "Architect",
  "Auto Mechanic",
  "Baby Sitter",
  "Baker",
  "Barber",
  "Beautician",
  "Biker",
  "Blacksmith",
  "Bouncer",
  "Builder",
  "Carpenter",
  "Caterer",
  "Chef",
  "Cleaner",
  "Computer Technician",
  "Content Writer",
  "Cook",
  "Copywriter",
  "Data Analyst",
  "Delivery Driver",
  "Designer",
  "Dispatch Rider",
  "DJ",
  "Dog Walker",
  "Driver",
  "Electrician",
  "Errand Runner",
  "Event Planner",
  "Fitness Trainer",
  "Florist",
  "Gardener",
  "Generator Technician",
  "Grant Writer",
  "Graphics Designer",
  "Hairdresser",
  "Handyman",
  "House Cleaner",
  "Interior Decorator",
  "Interpreter",
  "Labourer",
  "Landscaper",
  "Laptop Repairer",
  "Laundry Service",
  "Locksmith",
  "Makeup Artist",
  "Manicurist",
  "Masseuse",
  "Mobile App Developer",
  "Motor Mechanic",
  "Mover",
  "Musician",
  "Nanny",
  "Painter",
  "Personal Trainer",
  "Pet Groomer",
  "Pet Sitter",
  "Phone Repairer",
  "Photographer",
  "Plumber",
  "Project Writer",
  "Roofer",
  "Security Guard",
  "Social Media Manager",
  "Software Developer",
  "Solar Technician",
  "Tailor",
  "Translator",
  "Tutor",
  "Videographer",
  "Waiter",
  "Water Supplier",
  "Web Developer",
  "Welder",
  "Writer",
];

export function buildCategoryAliases(category) {
  const c = String(category || "").trim();
  const lc = c.toLowerCase();
  const set = new Set([c]);

  const add = (v) => set.add(v);

  if (lc.includes("electric")) {
    add("Electrician");
    add("Electrical");
  }
  if (lc.includes("plumb")) add("Plumber");
  if (lc.includes("decor") || lc.includes("design")) {
    add("Interior Decorator");
    add("Designer");
    add("Graphics Designer");
  }
  if (lc.includes("clean")) {
    add("Cleaner");
    add("House Cleaner");
    add("Laundry Service");
  }
  if (lc.includes("paint")) add("Painter");
  if (lc.includes("carpenter") || lc.includes("builder")) {
    add("Carpenter");
    add("Builder");
  }
  if (
    lc.includes("stylist") ||
    lc.includes("hair") ||
    lc.includes("barber") ||
    lc.includes("beaut") ||
    lc.includes("makeup") ||
    lc.includes("manicur")
  ) {
    add("Stylist");
    add("Hairdresser");
    add("Barber");
    add("Beautician");
    add("Makeup Artist");
    add("Manicurist");
  }
  if (lc.includes("auto") || lc.includes("motor") || lc.includes("mechanic")) {
    add("Auto Mechanic");
    add("Motor Mechanic");
  }
  if (lc.includes("app") || lc.includes("software")) {
    add("App Developer");
    add("Mobile App Developer");
    add("Software Developer");
    add("Web Developer");
  }
  if (lc.includes("phone") || lc.includes("laptop") || lc.includes("computer")) {
    add("Phone Repairer");
    add("Laptop Repairer");
    add("Computer Technician");
  }
  if (lc.includes("pet")) {
    add("Pet Groomer");
    add("Pet Sitter");
    add("Dog Walker");
  }

  return Array.from(set).slice(0, 10);
}

export function filterCategories(searchText = "") {
  const q = String(searchText || "").trim().toLowerCase();
  if (!q) return [...ALL_CATEGORIES];
  return ALL_CATEGORIES.filter((c) => c.toLowerCase().includes(q));
}
