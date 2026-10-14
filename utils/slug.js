// -------------------
// SLUG HELPER
// -------------------
function slugify(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function baseVehicleSlug(vehicle) {
  const parts = [
    vehicle.marca,
    vehicle.modello,
    vehicle.versione,
    vehicle.annoImmatricolazione,
  ];
  return slugify(parts.filter(Boolean).join(" ")) || "veicolo";
}

// Genera uno slug unico per il veicolo (usato in pre-validate su creazione)
async function uniqueVehicleSlug(Model, vehicle) {
  const base = baseVehicleSlug(vehicle);
  let slug = base;
  let n = 1;

  // eslint-disable-next-line no-await-in-loop
  while (await Model.exists({ slug, _id: { $ne: vehicle._id } })) {
    n += 1;
    slug = `${base}-${n}`;
    if (n > 50) {
      slug = `${base}-${Date.now().toString(36)}`;
      break;
    }
  }

  return slug;
}

module.exports = { slugify, baseVehicleSlug, uniqueVehicleSlug };
