# Sunucu Deploy Rehberi — caglarbufe.toov.com.tr

## Gereksinimler
Sunucuda zaten mevcut: nginx, certbot, postgresql

---

## 1. Node.js 22 + pnpm + PM2 Kurulumu

```bash
# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
npm install -g pnpm

# PM2 (global, tek seferlik)
npm install -g pm2
```

---

## 2. Proje Dizinini Oluştur ve Clone Et

```bash
sudo mkdir -p /var/www/qryeni
sudo chown $USER:$USER /var/www/qryeni

cd /var/www/qryeni
git clone https://github.com/j1vetr/qryeni .
```

---

## 3. PostgreSQL Ayarları

```bash
sudo -u postgres psql
```

PostgreSQL içinde şu komutları çalıştır:

```sql
CREATE USER qrmenu WITH PASSWORD 'QrMenu_2024!';
CREATE DATABASE qrmenu_db OWNER qrmenu;
GRANT ALL PRIVILEGES ON DATABASE qrmenu_db TO qrmenu;
\q
```

---

## 4. ecosystem.config.cjs Düzenle

```bash
nano /var/www/qryeni/ecosystem.config.cjs
```

`DATABASE_URL` ve `SESSION_SECRET` satırlarını düzenle.  
SESSION_SECRET için şu komutu çalıştır ve çıktıyı yapıştır:

```bash
openssl rand -hex 32
```

Düzenlenmiş hali şöyle olmalı:

```js
DATABASE_URL: "postgresql://qrmenu:QrMenu_2024!@localhost:5432/qrmenu_db",
SESSION_SECRET: "<openssl çıktısı buraya>",
```

---

## 5. Bağımlılıkları Yükle ve Build Et

```bash
cd /var/www/qryeni

# Bağımlılıklar
pnpm install --frozen-lockfile

# Frontend build (BASE_PATH=/ zorunlu)
BASE_PATH=/ PORT=1951 pnpm --filter @workspace/qr-menu build

# Backend build
pnpm --filter @workspace/api-server build
```

---

## 6. Veritabanı Tablolarını Oluştur

```bash
cd /var/www/qryeni
DATABASE_URL="postgresql://qrmenu:QrMenu_2024!@localhost:5432/qrmenu_db" \
  pnpm --filter @workspace/db push
```

---

## 7. Admin Kullanıcısı Ekle (toov / Toov1453@@)

```bash
sudo -u postgres psql -d qrmenu_db -c "
INSERT INTO users (username, password_hash)
VALUES ('toov', '\$2b\$12\$0AYtZWbbFrgAZfSeKRCt1.9vn66QeipAuB6IY1RzvX7eP7gtSRfsu');
"
```

---

## 8. Menü Ayarlarını Başlat (İlk Seed)

```bash
sudo -u postgres psql -d qrmenu_db -c "
INSERT INTO settings (slug, restaurant_name, primary_color, currency, default_language)
VALUES ('main', 'Çağlar Büfe', '#C9A84C', 'TRY', 'tr')
ON CONFLICT (slug) DO NOTHING;
"

sudo -u postgres psql -d qrmenu_db -c "
INSERT INTO languages (code, name, is_active, sort_order) VALUES
  ('tr', 'Türkçe', true, 0),
  ('en', 'English', true, 1),
  ('ru', 'Русский', true, 2),
  ('ar', 'العربية', true, 3)
ON CONFLICT (code) DO NOTHING;
"
```

---

## 9. PM2 ile Başlat

```bash
cd /var/www/qryeni
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # Çıkan komutu kopyalayıp çalıştır (sudo ile)
```

PM2 durumunu kontrol et:
```bash
pm2 status
pm2 logs qrmenu --lines 30
```

---

## 10. Nginx Ayarı

```bash
sudo cp /var/www/qryeni/nginx/caglarbufe.toov.com.tr.conf \
        /etc/nginx/sites-available/caglarbufe.toov.com.tr.conf

sudo ln -s /etc/nginx/sites-available/caglarbufe.toov.com.tr.conf \
           /etc/nginx/sites-enabled/

sudo nginx -t
sudo systemctl reload nginx
```

---

## 11. SSL (Certbot)

```bash
sudo certbot --nginx -d caglarbufe.toov.com.tr -d www.caglarbufe.toov.com.tr
```

Certbot nginx config'i otomatik güncelleyecek ve SSL ekleyecek.

---

## Güncelleme (Sonraki Sürümler)

```bash
cd /var/www/qryeni
git pull origin main

BASE_PATH=/ PORT=1951 pnpm --filter @workspace/qr-menu build
pnpm --filter @workspace/api-server build

# Eğer DB schema değiştiyse:
DATABASE_URL="postgresql://qrmenu:QrMenu_2024!@localhost:5432/qrmenu_db" \
  pnpm --filter @workspace/db push

pm2 restart qrmenu
```

---

## Özet

| Alan | Değer |
|------|-------|
| Site | https://caglarbufe.toov.com.tr |
| Port | 1951 (dahili) |
| Admin URL | /admin |
| Admin Kullanıcı | toov |
| Admin Şifre | Toov1453@@ |
| DB Kullanıcı | qrmenu |
| DB Şifre | QrMenu_2024! |
| DB Adı | qrmenu_db |
| Proje Dizini | /var/www/qryeni |
