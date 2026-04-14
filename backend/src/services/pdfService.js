// src/services/pdfService.js
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { logger } = require('../config/logger');

const TEMP_DIR = path.join(__dirname, '../../temp_pdfs');

// Créer le dossier temp s'il n'existe pas
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

class PDFService {
  /**
   * Générer un reçu de transaction
   */
  generateTransactionReceipt(transaction, user) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `transaction_${transaction.transaction_id}_${Date.now()}.pdf`;
        const filepath = path.join(TEMP_DIR, filename);

        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
        });

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('SwiftPay', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text('Receipt', { align: 'center' });
        doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
        doc.moveDown();

        // User Info
        doc.fontSize(11).font('Helvetica-Bold').text('Account Information:');
        doc
          .font('Helvetica')
          .fontSize(10)
          .text(`Name: ${user.full_name || 'N/A'}`)
          .text(`Email: ${user.email}`)
          .text(`Phone: ${user.phone_number || 'N/A'}`);

        doc.moveDown();

        // Transaction Details
        doc.fontSize(11).font('Helvetica-Bold').text('Transaction Details:');
        doc
          .font('Helvetica')
          .fontSize(10)
          .text(`ID: ${transaction.transaction_id}`)
          .text(`Date: ${new Date(transaction.created_at).toLocaleString()}`)
          .text(`Type: ${transaction.type.toUpperCase()}`)
          .text(`Amount: $${parseFloat(transaction.amount).toFixed(2)}`)
          .text(`Status: ${transaction.status.toUpperCase()}`);

        if (transaction.description) {
          doc.text(`Description: ${transaction.description}`);
        }

        doc.moveDown();

        // Footer
        doc.fontSize(9).font('Helvetica').text('This is an official receipt from SwiftPay.', {
          align: 'center',
        });
        doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          logger.info(`Transaction receipt generated: ${filename}`);
          resolve({ filename, filepath });
        });
      } catch (error) {
        logger.error(`Error generating transaction receipt: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Générer un relevé mensuel
   */
  generateMonthlyStatement(transactions, user, month, year) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `statement_${year}_${month}_${Date.now()}.pdf`;
        const filepath = path.join(TEMP_DIR, filename);

        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
        });

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('SwiftPay', { align: 'center' });
        doc.fontSize(14).font('Helvetica-Bold').text(`Monthly Statement - ${month}/${year}`, { align: 'center' });
        doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
        doc.moveDown();

        // User Info
        doc.fontSize(11).font('Helvetica-Bold').text('Account Information:');
        doc
          .font('Helvetica')
          .fontSize(10)
          .text(`Name: ${user.full_name || 'N/A'}`)
          .text(`Email: ${user.email}`)
          .text(`Statement Period: ${month}/${year}`);

        doc.moveDown();

        // Transactions Table
        doc.fontSize(11).font('Helvetica-Bold').text('Transactions:');
        doc.moveDown();

        // Table Header
        const tableTop = doc.y;
        const col1 = 50,
          col2 = 150,
          col3 = 300,
          col4 = 400,
          col5 = 500;

        doc.font('Helvetica-Bold').fontSize(9);
        doc.text('Date', col1, tableTop);
        doc.text('Type', col2, tableTop);
        doc.text('Description', col3, tableTop);
        doc.text('Amount', col4, tableTop);
        doc.text('Status', col5, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Table Rows
        doc.font('Helvetica').fontSize(8);
        let totalAmount = 0;
        let currentY = tableTop + 25;

        transactions.forEach((txn) => {
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }

          const date = new Date(txn.created_at).toLocaleDateString();
          doc.text(date, col1, currentY);
          doc.text(txn.type.toUpperCase(), col2, currentY);
          doc.text(txn.description || '-', col3, currentY);
          doc.text(`$${parseFloat(txn.amount).toFixed(2)}`, col4, currentY);
          doc.text(txn.status, col5, currentY);

          totalAmount += parseFloat(txn.amount);
          currentY += 15;
        });

        // Summary
        doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text(`Total: $${totalAmount.toFixed(2)}`, col4, currentY + 10);

        doc.moveDown(3);

        // Footer
        doc.fontSize(9).font('Helvetica').text('This is an official statement from SwiftPay.', {
          align: 'center',
        });
        doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          logger.info(`Monthly statement generated: ${filename}`);
          resolve({ filename, filepath });
        });
      } catch (error) {
        logger.error(`Error generating monthly statement: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Supprimer un PDF temporaire
   */
  deleteTempFile(filename) {
    try {
      const filepath = path.join(TEMP_DIR, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        logger.info(`Temp PDF deleted: ${filename}`);
      }
    } catch (error) {
      logger.error(`Error deleting temp PDF: ${error.message}`);
    }
  }

  /**
   * Nettoyer les PDFs anciens (> 24h)
   */
  cleanupOldFiles() {
    try {
      const files = fs.readdirSync(TEMP_DIR);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24h

      files.forEach((file) => {
        const filepath = path.join(TEMP_DIR, file);
        const stats = fs.statSync(filepath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filepath);
          logger.info(`Old PDF cleaned up: ${file}`);
        }
      });
    } catch (error) {
      logger.error(`Error cleaning up PDFs: ${error.message}`);
    }
  }
}

module.exports = new PDFService();
