import { odooRequest } from "../odoo/odoo.client.js";
let cache = null;
export const getLocations = async () => {
    if (cache)
        return cache;
    const locations = await odooRequest("stock.location", "search_read", [[["usage", "in", ["internal", "customer"]]]], { fields: ["id", "usage"] });
    const source = locations.find((l) => l.usage === "internal");
    const dest = locations.find((l) => l.usage === "customer");
    cache = {
        SOURCE_LOCATION_ID: source?.id,
        RESERVE_LOCATION_ID: dest?.id,
    };
    return cache;
};
