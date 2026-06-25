module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Fetch all products
    const products = await queryInterface.sequelize.query(
      'SELECT id, "vendorId", "localId", name, barcode, "updatedAt" FROM vendor_products',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const duplicateIds = [];

    // 2. Group products by vendorId
    const byVendor = {};
    for (const p of products) {
      const vId = p.vendorId;
      if (!byVendor[vId]) byVendor[vId] = [];
      byVendor[vId].push(p);
    }

    // 3. For each vendor, find duplicates
    for (const vId in byVendor) {
      const vendorProducts = byVendor[vId];
      const barcodeGroups = {};
      const nameGroups = {};

      for (const p of vendorProducts) {
        const barcode = p.barcode ? p.barcode.trim() : '';
        const name = p.name ? p.name.trim().toLowerCase() : '';

        const isStandardBarcode = barcode && !barcode.toUpperCase().startsWith('MANUAL');

        if (isStandardBarcode) {
          if (!barcodeGroups[barcode]) barcodeGroups[barcode] = [];
          barcodeGroups[barcode].push(p);
        } else if (name) {
          if (!nameGroups[name]) nameGroups[name] = [];
          nameGroups[name].push(p);
        }
      }

      // Process barcode groups
      for (const barcode in barcodeGroups) {
        const group = barcodeGroups[barcode];
        if (group.length > 1) {
          // Sort by updatedAt descending (latest updated first)
          group.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          // Keep the first (latest), collect the rest for deletion
          for (let i = 1; i < group.length; i++) {
            duplicateIds.push(group[i].id);
          }
        }
      }

      // Process name groups
      for (const name in nameGroups) {
        const group = nameGroups[name];
        if (group.length > 1) {
          // Sort by updatedAt descending (latest updated first)
          group.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          // Keep the first (latest), collect the rest for deletion
          for (let i = 1; i < group.length; i++) {
            duplicateIds.push(group[i].id);
          }
        }
      }
    }

    // 4. Delete duplicates if any exist
    if (duplicateIds.length > 0) {
      console.log(`[Migration v2] Deleting ${duplicateIds.length} duplicate products...`);
      await queryInterface.sequelize.query(
        'DELETE FROM vendor_products WHERE id IN (:ids)',
        {
          replacements: { ids: duplicateIds },
          type: queryInterface.sequelize.QueryTypes.DELETE
        }
      );
    } else {
      console.log('[Migration v2] No duplicate products found.');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // No-op - cannot restore deleted duplicates
  }
};
