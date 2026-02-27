# 📖 MagViewer — PDF Dergi Okuyucu

React + Vite ile hazırlanmış, 3D sayfa çevirme efektli PDF dergi okuyucu.

## 🚀 Kurulum

```bash
npm install
npm run dev
```

Tarayıcıda açılır: http://localhost:5173

## ✨ Özellikler

- 🎴 3D sayfa çevirme animasyonu (CSS perspective + rotateY)
- 🔊 Web Audio API ile gerçekçi kağıt sesi
- 📐 Tam ekran modu (F tuşu)
- 🖼️ Sayfa önizleme paneli (T tuşu)
- ⌨️ Klavye navigasyonu (← → ok tuşları)
- 📊 Alt progress bar (tıklayarak sayfaya atla)
- 🎨 Canlı renkli animasyonlu arka plan

## ⌨️ Kısayollar

| Tuş | Eylem |
|-----|-------|
| → / ↓ | Sonraki sayfa |
| ← / ↑ | Önceki sayfa |
| F | Tam ekran |
| T | Sayfa önizleme |
| Esc | Paneli kapat |

## 📁 Kendi PDF'ini Kullanmak

`SUNUM.pdf` yerine başka bir PDF yüklemek için:
1. PDF'i `public/` klasörüne koy
2. `App.jsx` içindeki `/SUNUM.pdf` → `/senin-dosyan.pdf` olarak değiştir
3. Veya uygulama içinde "📂 Değiştir" butonunu kullan

## 🛠️ Build

```bash
npm run build
```
`dist/` klasörü oluşur — herhangi bir statik sunucuya yüklenebilir.
# stemrehberi.com
# stemrehberi.com
