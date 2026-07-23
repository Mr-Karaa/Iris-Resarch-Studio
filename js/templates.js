/**
 * IRIS Research Studio - Araştırma ve Analiz Şablonları (templates.js)
 * Mühendisler ve Ar-Ge ekipleri için özelleştirilmiş hazır markdown şablonları.
 */

const TEMPLATES = {
  patent: {
    id: 'patent',
    name: 'Patent İnceleme Şablonu',
    description: 'Patent belgelerini yapısal olarak incelemek ve kendi projelerinizle olan ilişkisini analiz etmek için.',
    icon: 'briefcase',
    defaultTitle: 'Patent İncelemesi: [Buluş Adı]',
    content: `### Patent İncelemesi ve Analizi

#### 1. Genel Bilgiler
- **Buluş Başlığı:** 
- **Patent No / Başvuru No:** 
- **Buluş Sahibi / Firma:** 
- **Mucitler:** 
- **Yayın Tarihi:** 

#### 2. Teknik Problem ve Çözüm
- **Patent Tarafından Ele Alınan Teknik Problem:** 
  *(Örn: Mevcut sistemlerdeki yüksek güç tüketimi veya sensör gecikmesi vb.)*
- **Önerilen Çözüm ve Temel İnovasyon:** 
  *(Örn: Yeni bir kontrol döngüsü mimarisi veya hibrit malzeme kullanımı vb.)*

#### 3. İstemler ve Koruma Kapsamı
- **Bağımsız İstem Analizi (İstem 1):** 
  *(Bu patenti diğerlerinden ayıran en geniş koruma kapsamı nedir?)*
- **Bağımlı İstemler ve Önemli Ayrıntılar:** 

#### 4. Kendi Projemizle İlişkisi ve FTO (Faaliyet Serbestliği) Analizi
- **Projemizde Bu Mimarinin Kullanılabilirliği:** 
- **Faydalı Modeller veya Alternatif Çözümler:** 
- **Fikri Mülkiyet (FTO) Riski Var mı?** 
  *(Evet / Hayır / Detaylı incelenmeli)*`
  },

  article: {
    id: 'article',
    name: 'Akademik Makale Özeti Şablonu',
    description: 'Bilimsel makalelerdeki metodolojileri, bulguları ve sayısal metrikleri hızlıca not etmek için.',
    icon: 'book-open',
    defaultTitle: 'Makale Özeti: [Makale Başlığı]',
    content: `### Akademik Makale Özeti ve Notlar

#### 1. Çalışmanın Amacı ve Hipotezi
- **Araştırma Sorusu:** 
- **Temel Hipotez:** 

#### 2. Metodoloji ve Deneysel Kurulum
- **Kullanılan Yöntemler / Algoritmalar:** 
- **Veri Seti / Deney Grubu Detayları:** 
- **Kullanılan Donanım ve Yazılım Altyapısı:** 

#### 3. Temel Bulgular ve Sayısal Metrikler
- **Elde Edilen Sonuçlar:** 
  *(Örn: Doğruluk oranı, verimlilik artışı, maliyet düşüşü vb. değerler)*
- **Karşılaştırmalı Grafikler veya Tablo Özetleri:** 
- **Çalışmanın Sınırları (Limitations):** 

#### 4. Uygulama Notları ve Gelecek Çalışmalar
- **Kendi Ar-Ge Sürecimize Nasıl Entegre Edebiliriz?** 
- **Makaleden Alınacak Parametreler / Reçeteler:** `
  },

  technical_analysis: {
    id: 'technical_analysis',
    name: 'Teknik Analiz ve Karşılaştırma',
    description: 'Bir teknoloji, kütüphane veya donanım mimarisini derinlemesine incelemek ve alternatiflerle kıyaslamak için.',
    icon: 'cpu',
    defaultTitle: 'Teknik Analiz: [Teknoloji / Sistem Adı]',
    content: `### Teknik Analiz ve Fizibilite Raporu

#### 1. Sisteme Genel Bakış
- **Teknoloji / Donanım / Yazılım Adı:** 
- **Çalışma Prensibi:** 
- **Kullanım Alanları:** 

#### 2. Artılar ve Eksiler (Pros & Cons)
- **Avantajlar:**
  - 
  - 
- **Dezavantajlar:**
  - 
  - 

#### 3. Alternatifler ve Karşılaştırma Matrisi
| Özellik | Hedef Teknoloji | Alternatif A | Alternatif B |
| :--- | :---: | :---: | :---: |
| **Maliyet** | | | |
| **Performans** | | | |
| **Lisans / Uyumluluk** | | | |
| **Topluluk Desteği** | | | |

#### 4. Fizibilite & Karar Raporu
- **Geliştirme Maliyeti ve Süresi:** 
- **Karar ve Sonraki Adım:** 
  *(Örn: Prototip oluşturulacak / Beklemeye alınacak / Reddedildi)*`
  },

  project_note: {
    id: 'project_note',
    name: 'Proje Çalışma Notu',
    description: 'Mevcut Ar-Ge iş paketleri, günlük/haftalık ilerleme durumları ve teknik engelleri takip etmek için.',
    icon: 'file-text',
    defaultTitle: 'Proje Notu: [İş Paketi / Konu]',
    content: `### Proje Çalışma Notu ve İlerleme Raporu

#### 1. Proje ve İş Paketi Detayları
- **Proje Adı / Kodu:** 
- **İlgili İş Paketi (WP):** 
- **Sorumlu Araştırmacılar:** 

#### 2. Elde Edilen Çıktılar ve İlerlemeler
- **Bu Dönemde Tamamlanan Teknik Görevler:**
  - [x] 
  - [x] 
- **Test ve Doğrulama Sonuçları:** 

#### 3. Karşılaşılan Teknik Engeller ve Blokajlar
- **Karşılaşılan Sorun:** 
- **Uygulanan / Önerilen Çözüm Yolu:** 
- **İhtiyaç Duyulan Destek / Ekipman:** 

#### 4. Gelecek Adımlar
- [ ] 
- [ ] `
  },

  meeting_minutes: {
    id: 'meeting_minutes',
    name: 'Teknik Toplantı Tutanağı',
    description: 'Ar-Ge ekibi, danışmanlar veya paydaşlarla yapılan teknik toplantılarda kararları ve aksiyonları kaydetmek için.',
    icon: 'users',
    defaultTitle: 'Toplantı: [Konu / Proje]',
    content: `### Teknik Toplantı Tutanağı

#### 1. Toplantı Bilgileri
- **Toplantı Konusu:** 
- **Tarih & Saat:** 
- **Katılımcılar:** 
- **Moderasyon / Tutanak Yazan:** 

#### 2. Görüşülen Teknik Konular
- **Ana Gündem Maddesi 1:** 
- **Ana Gündem Maddesi 2:** 

#### 3. Alınan Kararlar
- **Karar 1:** 
- **Karar 2:** 

#### 4. Aksiyon Planı (Action Items)
| Görev Tanımı | Sorumlu | Teslim Tarihi | Durum |
| :--- | :--- | :---: | :---: |
| | | | Başlamadı |
| | | | Başlamadı |`
  },

  risk_analysis: {
    id: 'risk_analysis',
    name: 'Risk Analizi ve Risk Azaltma (Mitigation)',
    description: 'Ar-Ge süreçlerindeki teknik, finansal veya tedarik zinciri risklerini ve önleyici eylemleri belirlemek için.',
    icon: 'alert-triangle',
    defaultTitle: 'Risk Analizi: [Proje / Konu]',
    content: `### Risk Analizi ve Azaltma Planı

#### 1. Risk Tanımlaması
- **Potansiyel Tehdit / Risk Durumu:** 
- **Tetikleyici Faktörler:** 
- **Etkilenecek Sistemler / İş Paketleri:** 

#### 2. Risk Değerlendirmesi
- **Olasılık Derecesi (1-5):** *(1: Çok Düşük, 5: Çok Yüksek)*
- **Etki Derecesi (1-5):** *(1: Önemsiz, 5: Kritik)*
- **Risk Skoru:** *(Olasılık x Etki)*

#### 3. Önleyici Eylemler (Mitigation)
- **Riski Ortadan Kaldırmak / Azaltmak İçin Yapılacaklar:**
  - 
  - 
- **Sorumlu ve Bütçe İhtiyacı:** 

#### 4. Acil Durum (B Planı) Planı
- **Risk Gerçekleşirse Atılacak İlk Adımlar:** 
- **Alternatif Tedarikçiler / Çözümler:** `
  },

  blank: {
    id: 'blank',
    name: 'Boş Araştırma Notu',
    description: 'Yapılandırılmamış, serbest formatta kendi notlarınızı ve analizlerinizi yazmak için.',
    icon: 'file',
    defaultTitle: 'Araştırma Notu: [Başlık]',
    content: `### Araştırma Notları

Buraya araştırmanıza ait detayları, gözlemleri ve analizleri serbest biçimde yazabilirsiniz. Markdown biçimlendirmesi desteklenmektedir.

- Önemli noktaları listelemek için tire (-) işareti kullanabilirsiniz.
- Kalın yazmak için **metin** kullanabilirsiniz.
- Kod blokları için üç adet ters tırnak (\`\`\`) kullanabilirsiniz.`
  }
};

window.IRIS_TEMPLATES = TEMPLATES;
window.TEMPLATES = TEMPLATES;

// Ensure title alias is available for name property across all templates
if (typeof TEMPLATES !== 'undefined') {
  Object.keys(TEMPLATES).forEach(key => {
    if (TEMPLATES[key] && !TEMPLATES[key].title) {
      TEMPLATES[key].title = TEMPLATES[key].name;
    }
  });
}
