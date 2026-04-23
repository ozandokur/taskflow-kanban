# TaskFlow — Kanban Proje Yönetim Tahtası

TaskFlow, küçük yazılım ekipleri için geliştirilmiş Trello benzeri bir görev yönetim uygulamasıdır.  
Kullanıcılar hesap oluşturabilir, board oluşturabilir, sütun ve kart ekleyebilir, kartları sürükle-bırak ile sütunlar arasında taşıyabilir.

## Canlı Demo
Vercel deploy sonrası eklenecek.

## Özellikler

- Kullanıcı kayıt / giriş
- Board oluşturma
- Sütun ekleme ve yeniden adlandırma
- Kart ekleme
- Kart başlık ve açıklama düzenleme
- Kartları sürükle-bırak ile taşıma
- Sayfa yenilendiğinde sıralamanın korunması
- Mobil uyumlu arayüz

## Kullanılan Teknolojiler

- Next.js
- TypeScript
- Supabase Auth
- Supabase Postgres
- dnd-kit
- CSS tabanlı özel arayüz stilleri
- Vercel

## Teknik Kararlar

### Neden dnd-kit?
Bu projede drag-and-drop için `dnd-kit` tercih edildi.

Nedenleri:
- aktif olarak geliştiriliyor
- modern React yapısına uygun
- mobil cihazlarda dokunmatik etkileşimi destekliyor
- Trello benzeri board yapılarında esnek kontrol sağlıyor

### Neden Supabase?
Gerçek kullanıcı yönetimi ve kalıcı veri saklama ihtiyacı için Supabase kullanıldı.

Sağladıkları:
- email/password authentication
- Postgres veritabanı
- kullanıcı bazlı veri erişimi
- Row Level Security ile güvenli veri modeli

### Sıralama nasıl korunuyor?
Her kart için veritabanında `position` alanı tutulur.  
Kart başka bir sütuna taşındığında veya yeniden sıralandığında ilgili sütundaki kartlar güncellenir.  
Bu sayede sayfa yenilense bile kartlar veritabanından aynı sırayla geri gelir.

### 48 saatlik önceliklendirme
Bu projede kapsam kontrollü tutuldu.  
Odak noktası:
- auth
- board / column / card veri modeli
- drag-and-drop
- kalıcı sıralama
- responsive kullanım

İlk sürüm dışında bırakılanlar:
- gerçek zamanlı birlikte düzenleme
- board paylaşımı
- aktivite geçmişi
- due date / assignee / comments gibi ileri seviye özellikler

## Veri Modeli

### profiles
- id
- full_name
- email
- created_at

### boards
- id
- owner_id
- title
- created_at

### columns
- id
- board_id
- title
- position
- created_at

### cards
- id
- board_id
- column_id
- title
- description
- position
- created_at
- updated_at

## Kurulum

### 1. Paketleri yükle
```bash
npm install