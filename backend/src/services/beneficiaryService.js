// src/services/beneficiaryService.js
const db = require('../config/db');

// Ajouter un bénéficiaire
exports.addBeneficiary = async (userId, beneficiaryUserId, nickname = '') => {
  if (userId === beneficiaryUserId) {
    throw new Error('Cannot add yourself as beneficiary');
  }

  // Vérifier que le bénéficiaire existe
  const beneficiary = await db.query(
    'SELECT user_id FROM users WHERE user_id = $1',
    [beneficiaryUserId]
  );

  if (!beneficiary.rows.length) {
    throw new Error('Bénéficiaire non trouvé');
  }

  try {
    const result = await db.query(
      `INSERT INTO beneficiaries (user_id, beneficiary_user_id, nickname)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, beneficiary_user_id) 
       DO UPDATE SET nickname = EXCLUDED.nickname
       RETURNING beneficiary_id, created_at`,
      [userId, beneficiaryUserId, nickname || null]
    );

    return {
      success: true,
      message: 'Bénéficiaire ajouté',
      beneficiary: result.rows[0],
    };
  } catch (err) {
    throw err;
  }
};

// Obtenir tous les bénéficiaires
exports.getBeneficiaries = async (userId) => {
  const result = await db.query(
    `SELECT b.beneficiary_id, b.beneficiary_user_id, b.nickname, 
            u.username, u.email, u.full_name, b.created_at
     FROM beneficiaries b
     JOIN users u ON b.beneficiary_user_id = u.user_id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  );

  return result.rows;
};

// Supprimer un bénéficiaire
exports.removeBeneficiary = async (userId, beneficiaryId) => {
  const result = await db.query(
    'DELETE FROM beneficiaries WHERE user_id = $1 AND beneficiary_id = $2 RETURNING beneficiary_id',
    [userId, beneficiaryId]
  );

  if (!result.rows.length) {
    throw new Error('Bénéficiaire non trouvé');
  }

  return { success: true, message: 'Bénéficiaire supprimé' };
};

// Mettre à jour le surnom d'un bénéficiaire
exports.updateBeneficiaryNickname = async (userId, beneficiaryId, nickname) => {
  const result = await db.query(
    `UPDATE beneficiaries SET nickname = $1 
     WHERE user_id = $2 AND beneficiary_id = $3
     RETURNING beneficiary_id, nickname`,
    [nickname, userId, beneficiaryId]
  );

  if (!result.rows.length) {
    throw new Error('Bénéficiaire non trouvé');
  }

  return { success: true, message: 'Bénéficiaire mis à jour' };
};
