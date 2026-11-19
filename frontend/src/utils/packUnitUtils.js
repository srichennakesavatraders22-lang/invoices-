/**
 * Helper to determine unit names (singular & plural) based on packType or item name.
 * e.g., 'Pilo' / 'Pillow' -> 'Sheet' / 'Sheets'
 * 'Bundle' -> 'Bundle' / 'Bundles'
 * 'Jar' -> 'Jar' / 'Jars'
 * 'Box' -> 'Box' / 'Boxes'
 */
export const getPackUnitInfo = (packType, itemName = '') => {
  const combined = `${packType || ''} ${itemName || ''}`.trim().toLowerCase();
  
  if (combined.includes('pilo') || combined.includes('pillo') || combined.includes('pillow')) {
    return { singular: 'Sheet', plural: 'Sheets' };
  }
  if (combined.includes('sheet')) {
    return { singular: 'Sheet', plural: 'Sheets' };
  }
  if (combined.includes('bundle')) {
    return { singular: 'Bundle', plural: 'Bundles' };
  }
  if (combined.includes('jar')) {
    return { singular: 'Jar', plural: 'Jars' };
  }
  if (combined.includes('packet') || combined.includes('pkt')) {
    return { singular: 'Packet', plural: 'Packets' };
  }
  if (combined.includes('tray')) {
    return { singular: 'Tray', plural: 'Trays' };
  }
  if (combined.includes('tin')) {
    return { singular: 'Tin', plural: 'Tins' };
  }
  if (combined.includes('pouch')) {
    return { singular: 'Pouch', plural: 'Pouches' };
  }
  if (packType && packType.trim()) {
    const pt = packType.trim();
    const lower = pt.toLowerCase();
    if (lower === 'box' || lower === 'boxes' || lower.includes('pack')) {
      return { singular: 'Box', plural: 'Boxes' };
    }
    const singular = pt.charAt(0).toUpperCase() + pt.slice(1);
    const plural = singular.endsWith('s') ? singular : `${singular}s`;
    return { singular, plural };
  }
  return { singular: 'Box', plural: 'Boxes' };
};

/**
 * Returns the display name for a sellUnit.
 * If sellUnit is 'Box' (the intermediate pack unit) or matches unitInfo, returns unitInfo.singular (e.g. 'Sheet' for Pilo).
 * If sellUnit is 'Carton' or 'Cotton', returns 'Carton'.
 * If sellUnit is 'Piece', returns 'Piece' or 'Pcs'.
 */
export const getDisplayUnit = (sellUnit, packType, itemName = '', isPlural = false) => {
  const unitInfo = getPackUnitInfo(packType, itemName);
  if (!sellUnit || sellUnit === 'Box' || sellUnit === unitInfo.singular || sellUnit === unitInfo.plural) {
    return isPlural ? unitInfo.plural : unitInfo.singular;
  }
  if (sellUnit === 'Carton' || sellUnit === 'Cotton') {
    return isPlural ? 'Cartons' : 'Carton';
  }
  if (sellUnit === 'Piece') {
    return isPlural ? 'Pieces' : 'Pcs';
  }
  return sellUnit;
};
