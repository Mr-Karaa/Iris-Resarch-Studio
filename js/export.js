/**
 * IRIS Research Studio - Rapor Dışa Aktarma Katmanı (export.js)
 * Kapak sayfası, içindekiler tablosu, kaynakça ve ekler içeren profesyonel raporlayıcı (Yol Haritası v5).
 */

const EXPORT = {
  // Alias'lar (app.js ile tam uyumluluk için)
  pdf(records, options) { return this.exportToPDF(records, options); },
  word(records, options) { return this.exportToWord(records, options); },
  excel(records) { return this.exportToExcel(records); },

  /**
   * Seçilen kayıtları PDF olarak yazdırılmak üzere yeni bir pencerede formatlar.
   * Kapak Sayfası, İçindekiler, Kaynakça ve Ekler ekler.
   */
  exportToPDF(records, options = {}) {
    const title = options.title || 'Araştırma Raporu';
    const subtitle = options.subtitle || 'IRIS Research OS Rapor Modülü';
    const description = options.description || '';
    const date = new Date().toLocaleDateString('tr-TR');
    const authorName = localStorage.getItem('iris_profile_name') || 'Ar-Ge Mühendisi';
    const authorRole = localStorage.getItem('iris_profile_role') || 'Araştırma Lideri';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Açılır pencere engelleyicisi rapor penceresini engelledi. Lütfen izin verin.');
      return;
    }

    let recordsHtml = '';
    records.forEach((rec, index) => {
      const typeLabel = {
        patent: 'Patent',
        article: 'Makale',
        standard: 'Standart',
        project: 'Proje Dokümanı',
        note: 'Araştırma Notu',
        other: 'Diğer'
      }[rec.type] || 'Diğer';

      // Markdown parsing
      const formattedNotes = rec.analysisNotes
        ? rec.analysisNotes
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            .replace(/\`\`\`([\s\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
            .replace(/\`([^`]+)\`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>')
        : '<em>Not eklenmemiş.</em>';

      recordsHtml += `
        <div class="report-item" style="page-break-after: always;">
          <div class="item-header">
            <span class="item-index">#${index + 1}</span>
            <div class="item-title-group">
              <h2 class="item-title">${this.escapeHTML(rec.title)}</h2>
              <div class="item-meta">
                <span class="badge badge-${rec.type}">${typeLabel}</span>
                <span style="font-size:11px; color:#475569; font-weight:bold; margin-left: 8px;">${rec.code || ''}</span>
                ${rec.authors ? `<span><strong>Yazar(lar):</strong> ${this.escapeHTML(rec.authors)}</span>` : ''}
                ${rec.source ? `<span><strong>Kaynak:</strong> ${this.escapeHTML(rec.source)}</span>` : ''}
                <span><strong>Eklendiği Tarih:</strong> ${rec.dateAdded}</span>
              </div>
            </div>
          </div>
          <div class="item-content">
            <div class="content-section">
              <h3>Analiz ve Notlar</h3>
              <div class="notes-body">${formattedNotes}</div>
            </div>
            ${rec.url ? `<div class="item-url"><strong>Referans Linki:</strong> <a href="${rec.url}" target="_blank">${rec.url}</a></div>` : ''}
          </div>
        </div>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>${this.escapeHTML(title)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Inter:wght@300;400;500;700&display=swap');
          
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            line-height: 1.6;
            margin: 0;
            padding: 40px;
            background-color: #ffffff;
          }
          
          h1, h2, h3, h4 {
            font-family: 'Outfit', sans-serif;
            color: #0f172a;
          }

          .report-cover-page {
            height: 95vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            border: 2px solid #6366f1;
            padding: 40px;
            margin-bottom: 50px;
            border-radius: 12px;
            page-break-after: always;
            box-sizing: border-box;
          }

          .report-item {
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 1px solid #e2e8f0;
          }

          .item-header {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            margin-bottom: 15px;
          }

          .item-index {
            background-color: #6366f1;
            color: #ffffff;
            font-family: 'Outfit', sans-serif;
            font-weight: 800;
            font-size: 18px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            flex-shrink: 0;
          }

          .item-title {
            font-size: 20px;
            margin: 0 0 8px 0;
            font-weight: 700;
            text-align: left;
          }

          .item-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 12px;
            color: #64748b;
          }

          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .badge-patent { background-color: #e0e7ff; color: #4338ca; }
          .badge-article { background-color: #d1fae5; color: #065f46; }
          .badge-standard { background-color: #fef3c7; color: #92400e; }
          .badge-project { background-color: #ecfdf5; color: #047857; }
          .badge-note { background-color: #f3e8ff; color: #6b21a8; }
          .badge-other { background-color: #f1f5f9; color: #475569; }

          .item-content {
            padding-left: 51px;
          }

          .content-section h3 {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #475569;
            margin-bottom: 10px;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 4px;
            text-align: left;
          }

          .notes-body {
            font-size: 14px;
            color: #334155;
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #cbd5e1;
            text-align: left;
          }

          .notes-body h2, .notes-body h3, .notes-body h4 {
            margin-top: 15px;
            margin-bottom: 8px;
          }
          
          .notes-body h2 { font-size: 16px; }
          .notes-body h3 { font-size: 14px; color: #6366f1; border: none; padding: 0; }

          .notes-body ul, .notes-body ol {
            padding-left: 20px;
            margin: 10px 0;
          }

          code {
            font-family: Consolas, monospace;
            background-color: #e2e8f0;
            padding: 2px 4px;
            border-radius: 4px;
            font-size: 12px;
          }

          pre {
            background-color: #0f172a;
            color: #f8fafc;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
          }
          pre code {
            background-color: transparent;
            color: inherit;
            padding: 0;
          }

          .item-url {
            margin-top: 15px;
            font-size: 12px;
            color: #64748b;
            text-align: left;
          }

          .item-url a {
            color: #6366f1;
            text-decoration: none;
          }

          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #cbd5e1;
            padding-top: 15px;
          }

          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <!-- 1. PROFESYONEL KAPAK SAYFASI (COVER PAGE) -->
        <div class="report-cover-page">
          <div style="font-family: 'Outfit'; font-size: 30px; font-weight: 800; color: #6366f1; letter-spacing: 3px; margin-bottom: 40px;">IRIS RESEARCH OS</div>
          <h1 style="font-size: 40px; font-weight: 800; color: #0f172a; margin: 10px 0; line-height: 1.2;">${this.escapeHTML(title)}</h1>
          <h2 style="font-size: 20px; font-weight: 400; color: #475569; margin: 10px 0 30px 0;">${this.escapeHTML(subtitle)}</h2>
          <div style="width: 80px; height: 3px; background-color: #6366f1; margin: 24px auto;"></div>
          ${description ? `<p style="font-size: 14px; color: #64748b; max-width: 600px; line-height: 1.6; margin-bottom: 40px;">${this.escapeHTML(description)}</p>` : ''}
          <div style="margin-top: auto; font-size: 13px; color: #64748b; line-height: 1.8;">
            <div><strong>Hazırlayan:</strong> ${this.escapeHTML(authorName)} (${this.escapeHTML(authorRole)})</div>
            <div><strong>Tarih:</strong> ${date}</div>
            <div><strong>Belge Adedi:</strong> ${records.length} Kaynak Doküman</div>
          </div>
        </div>

        <!-- 2. İÇİNDEKİLER TABLOSU (TABLE OF CONTENTS) -->
        <div class="table-of-contents" style="page-break-after: always; padding: 20px 0;">
          <h2 style="font-family: 'Outfit'; font-size: 24px; font-weight: 700; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 24px; color: #0f172a; text-align: left;">İçindekiler</h2>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px;">
            ${records.map((rec, index) => `
              <li style="display: flex; justify-content: space-between; align-items: baseline; font-size: 14px; color: #334155;">
                <span style="font-weight: 600; white-space: nowrap;">Bölüm ${index + 1}: ${this.escapeHTML(rec.title)}</span>
                <span style="flex-grow: 1; border-bottom: 1px dotted #94a3b8; margin: 0 10px; height: 1px;"></span>
                <span style="font-weight: bold; color: #6366f1;">Sayfa ${index + 3}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- 3. BELGE İÇERİKLERİ -->
        <div class="report-items">
          ${recordsHtml}
        </div>

        <!-- 4. KAYNAKÇA VE REFERANSLAR (BIBLIOGRAPHY) -->
        <div class="report-bibliography" style="page-break-after: always; padding: 20px 0;">
          <h2 style="font-family: 'Outfit'; font-size: 24px; font-weight: 700; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 24px; color: #0f172a; text-align: left;">Kaynakça & Referanslar</h2>
          <ol style="padding-left: 20px; display: flex; flex-direction: column; gap: 16px; text-align: left;">
            ${records.map((rec) => `
              <li style="font-size: 13px; color: #334155; line-height: 1.6;">
                <strong>[${rec.code || 'REF'}]</strong> 
                ${rec.authors ? `${this.escapeHTML(rec.authors)}. ` : ''}
                <em>"${this.escapeHTML(rec.title)}"</em>. 
                ${rec.source ? `${this.escapeHTML(rec.source)}, ` : ''}
                ${rec.datePublished ? `${rec.datePublished}. ` : ''}
                ${rec.url ? `Erişim Linki: <a href="${rec.url}" target="_blank" style="color:#6366f1; text-decoration:none;">${rec.url}</a>` : ''}
              </li>
            `).join('')}
          </ol>
        </div>

        <!-- 5. EKLER (ANNEX) -->
        <div class="report-attachments" style="padding: 20px 0;">
          <h2 style="font-family: 'Outfit'; font-size: 24px; font-weight: 700; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 24px; color: #0f172a; text-align: left;">Ekler (Annex)</h2>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 16px; text-align: left;">Rapor kapsamında referans gösterilen dijital bağlantılar ve harici kaynak ekleri listelenmiştir.</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 8px 12px; color: #475569;">Ref No</th>
                <th style="padding: 8px 12px; color: #475569;">Belge Adı</th>
                <th style="padding: 8px 12px; color: #475569;">Ek Tipi</th>
                <th style="padding: 8px 12px; color: #475569;">Bağlantı</th>
              </tr>
            </thead>
            <tbody>
              ${records.map((rec) => `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 12px; font-weight: bold; color: #6366f1;">${rec.code || 'REF'}</td>
                  <td style="padding: 8px 12px; color: #1e293b;">${this.escapeHTML(rec.title)}</td>
                  <td style="padding: 8px 12px; text-transform: capitalize; color: #475569;">${rec.type} Eki</td>
                  <td style="padding: 8px 12px;">${rec.url ? `<a href="${rec.url}" target="_blank" style="color:#6366f1; text-decoration:none;">Ek Dosyayı Aç</a>` : 'Yok'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer" style="margin-top: 50px;">
          Bu rapor IRIS Research OS tarafından otomatik olarak oluşturulmuştur. &copy; ${new Date().getFullYear()} IRIS.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  },

  /**
   * Raporu MS Word formatında (.doc) indirmeyi sağlar.
   * Kapak sayfası, İçindekiler, Kaynakça ve Ekler ekler.
   */
  exportToWord(records, options = {}) {
    const title = options.title || 'Araştırma Raporu';
    const subtitle = options.subtitle || 'IRIS Research Studio Raporu';
    const description = options.description || '';
    const authorName = localStorage.getItem('iris_profile_name') || 'Ar-Ge Mühendisi';
    const authorRole = localStorage.getItem('iris_profile_role') || 'Araştırma Lideri';

    let recordsHtml = '';
    records.forEach((rec, index) => {
      const typeLabel = {
        patent: 'Patent',
        article: 'Makale',
        standard: 'Standart',
        project: 'Proje Dokümanı',
        note: 'Araştırma Notu',
        other: 'Diğer'
      }[rec.type] || 'Diğer';

      const formattedNotes = rec.analysisNotes
        ? rec.analysisNotes.replace(/\n/g, '<br>')
        : 'Not eklenmemiş.';

      recordsHtml += `
        <div style="margin-bottom: 30px; border-bottom: 1px solid #cccccc; padding-bottom: 20px; page-break-after: always;">
          <h2>#${index + 1} - ${this.escapeHTML(rec.title)}</h2>
          <p style="color: #666666; font-size: 11pt;">
            <strong>Tür:</strong> ${typeLabel} | 
            <strong>Kod:</strong> ${rec.code || ''} | 
            <strong>Yazar(lar):</strong> ${this.escapeHTML(rec.authors || 'Belirtilmemiş')} | 
            <strong>Kaynak:</strong> ${this.escapeHTML(rec.source || 'Belirtilmemiş')} | 
            <strong>Tarih:</strong> ${rec.dateAdded}
          </p>
          <div style="background-color: #f9f9f9; padding: 10px; border-left: 3px solid #6366f1; font-size: 11pt;">
            <h4>Analiz ve Notlar:</h4>
            <p>${formattedNotes}</p>
          </div>
          ${rec.url ? `<p style="font-size: 10pt;"><strong>Link:</strong> <a href="${rec.url}">${rec.url}</a></p>` : ''}
        </div>
      `;
    });

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.5; color: #333333; }
          h1 { color: #1e3a8a; }
          h2 { color: #0f172a; margin-top: 20px; }
          h4 { margin: 5px 0; color: #475569; }
        </style>
      </head>
      <body>
        <!-- 1. Word Kapak Sayfası -->
        <div style="border: 2px solid #1e3a8a; padding: 50px; text-align: center; margin-bottom: 40px; page-break-after: always; height: 90%;">
          <p style="font-size: 20pt; font-weight: bold; color: #6366f1; margin-bottom: 100px;">IRIS RESEARCH OS</p>
          <h1 style="font-size: 28pt; margin: 0;">${this.escapeHTML(title)}</h1>
          <p style="font-size: 16pt; color: #555555; margin: 10px 0 30px 0;">${this.escapeHTML(subtitle)}</p>
          ${description ? `<p style="font-size: 11pt; color: #666666; max-width: 500px; margin: 20px auto;">${this.escapeHTML(description)}</p>` : ''}
          <div style="margin-top: 200px; font-size: 11pt; color: #555555;">
            <p><strong>Hazırlayan:</strong> ${this.escapeHTML(authorName)} (${this.escapeHTML(authorRole)})</p>
            <p><strong>Tarih:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
          </div>
        </div>

        <!-- 2. Word İçindekiler -->
        <div style="page-break-after: always; padding: 20px 0;">
          <h2>İçindekiler</h2>
          <table style="width: 100%; border: none; font-size: 11pt;">
            ${records.map((rec, index) => `
              <tr>
                <td>Bölüm ${index + 1}: ${this.escapeHTML(rec.title)}</td>
                <td style="text-align: right; font-weight: bold; color: #6366f1;">Sayfa ${index + 3}</td>
              </tr>
            `).join('')}
          </table>
        </div>

        <!-- 3. Word Kayıtlar -->
        ${recordsHtml}

        <!-- 4. Word Kaynakça -->
        <div style="page-break-after: always; padding: 20px 0;">
          <h2>Kaynakça & Referanslar</h2>
          <ol>
            ${records.map((rec) => `
              <li style="margin-bottom: 10px; font-size: 10pt;">
                <strong>[${rec.code || 'REF'}]</strong>
                ${rec.authors ? `${this.escapeHTML(rec.authors)}. ` : ''}
                <em>"${this.escapeHTML(rec.title)}"</em>.
                ${rec.source ? `${this.escapeHTML(rec.source)}, ` : ''}
                ${rec.datePublished ? `${rec.datePublished}. ` : ''}
                ${rec.url ? `Erişim: ${rec.url}` : ''}
              </li>
            `).join('')}
          </ol>
        </div>

        <!-- 5. Word Ekler -->
        <div style="padding: 20px 0;">
          <h2>Ekler (Annex)</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 10pt;" border="1">
            <tr style="background-color: #f1f5f9;">
              <th style="padding: 5px;">Ref No</th>
              <th style="padding: 5px;">Belge Adı</th>
              <th style="padding: 5px;">Ek Tipi</th>
              <th style="padding: 5px;">Bağlantı</th>
            </tr>
            ${records.map((rec) => `
              <tr>
                <td style="padding: 5px; text-align: center; font-weight: bold;">${rec.code || 'REF'}</td>
                <td style="padding: 5px;">${this.escapeHTML(rec.title)}</td>
                <td style="padding: 5px;">${rec.type} Eki</td>
                <td style="padding: 5px;">${rec.url || 'Yok'}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword;charset=utf-8'
    });
    this.downloadBlob(blob, `${this.sanitizeFilename(title)}.doc`);
  },

  /**
   * Seçilen kayıtların özniteliklerini Excel (CSV) olarak indirir.
   */
  exportToExcel(records) {
    const headers = ['No', 'Belge Kodu', 'Belge Başlığı', 'Belge Türü', 'Yazar(lar)', 'Yayın Kaynağı', 'Referans Linki', 'Yayın/Oluşturma Tarihi', 'Sisteme Eklendiği Tarih', 'İlerleme Oranı', 'Durum', 'Öncelik', 'Etiketler', 'Analiz Notları'];
    
    const rows = records.map((rec, index) => {
      const typeLabel = {
        patent: 'Patent',
        article: 'Makale',
        standard: 'Standart',
        project: 'Proje Dokümanı',
        note: 'Araştırma Notu',
        other: 'Diğer'
      }[rec.type] || 'Diğer';

      const code = this.cleanForCSV(rec.code);
      const title = this.cleanForCSV(rec.title);
      const authors = this.cleanForCSV(rec.authors);
      const source = this.cleanForCSV(rec.source);
      const url = this.cleanForCSV(rec.url);
      const datePub = this.cleanForCSV(rec.datePublished);
      const dateAdd = this.cleanForCSV(rec.dateAdded);
      const progress = rec.progress || 0;
      const status = this.cleanForCSV(rec.status);
      const priority = this.cleanForCSV(rec.priority);
      const tags = this.cleanForCSV((rec.tags || []).join(', '));
      const notes = this.cleanForCSV(rec.analysisNotes);

      return [
        index + 1,
        `"${code}"`,
        `"${title}"`,
        `"${typeLabel}"`,
        `"${authors}"`,
        `"${source}"`,
        `"${url}"`,
        `"${datePub}"`,
        `"${dateAdd}"`,
        `"${progress}%"`,
        `"${status}"`,
        `"${priority}"`,
        `"${tags}"`,
        `"${notes}"`
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    
    const filename = `iris_arastirma_arsivi_${new Date().toISOString().split('T')[0]}.csv`;
    this.downloadBlob(blob, filename);
  },

  // Yardımcı Metotlar
  escapeHTML(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  cleanForCSV(text) {
    if (!text) return '';
    return text.toString().replace(/"/g, '""').replace(/\r?\n|\r/g, ' ');
  },

  sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s-_]/g, '').trim().replace(/\s+/g, '_');
  },

  downloadBlob(blob, filename) {
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};

window.IRIS_EXPORT = EXPORT;
