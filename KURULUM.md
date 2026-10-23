# Boncuk Çarkı — Telefona kurulum

Oyunun kendisi tek dosya: `www/index.html`. Diğer her şey onu telefona taşımak için.

```
www/                 oyun (PWA: manifest, service worker, ikonlar)
android/             Android Studio projesi (Capacitor)
ios/                 Xcode projesi (Capacitor, Mac gerekir)
assets/              ikon ve açılış ekranı kaynakları
tools/make-icons.ps1 ikonları yeniden çizer
tools/serve.js       yerel test sunucusu
```

## 1. Bilgisayarda oyna

```bash
npm run serve
```

Tarayıcıda `http://localhost:8080` aç. (`www/index.html`'e çift tıklamak da olur ama o zaman çevrimdışı özellik çalışmaz.)

## 2. Telefonda hızlı deneme (aynı Wi-Fi)

`npm run serve` çıktısındaki **"Telefondan: http://192.168.x.x:8080"** adresini telefonun tarayıcısında aç. Windows güvenlik duvarı izin sorarsa "Özel ağ"a izin ver.

Not: Bu adres `http` olduğu için çevrimdışı çalışma ve "uygulama olarak yükle" tam çalışmaz; sadece oynayıp denemek içindir.

## 3. PWA olarak yükle (uygulama mağazası olmadan)

PWA'nın tam çalışması için oyunun **https** bir adreste olması gerekir.

### GitHub Pages ile (önerilen — her push'ta otomatik güncellenir)

Depo hazır: `.github/workflows/pages.yml`, `main` dalına her gönderimde `www/` klasörünü yayınlar.

1. github.com'da yeni bir depo oluştur (ör. `boncuk-carki`). README ekleme, boş kalsın.
   Ücretsiz hesapta Pages için depo **Public** olmalı (Private için GitHub Pro gerekir).
2. Proje klasöründe (kendi kullanıcı adınla):
   ```bash
   git remote add origin https://github.com/KULLANICI_ADIN/boncuk-carki.git
   ```
   ```bash
   git push -u origin main
   ```
3. GitHub'da deponun **Settings → Pages → Build and deployment → Source** ayarını **GitHub Actions** yap.
4. **Actions** sekmesinde "GitHub Pages" iş akışı çalışır (ilk gönderim 3. adımdan önce yapıldıysa başarısız olmuş olabilir; o zaman açıp **Re-run all jobs** de).
5. Oyun şu adreste yayında olur: `https://KULLANICI_ADIN.github.io/boncuk-carki/`

Sonraki her `git push`'ta site kendiliğinden güncellenir (yine de `www/sw.js` içindeki `VERSION`'ı artırmayı unutma).

### Netlify Drop ile (hesap bağlamadan, elle)

https://app.netlify.com/drop adresine `www` klasörünü sürükle-bırak; verilen `https://....netlify.app` adresini kullan.

### Telefona yükleme

1. Yayın adresini telefonda aç.
   - **Android (Chrome):** menü → *Uygulamayı yükle* / *Ana ekrana ekle*
   - **iPhone (Safari):** Paylaş → *Ana Ekrana Ekle*
3. Artık ana ekranda ikonuyla açılır, tam ekran ve internetsiz çalışır.

Oyunu güncellediğinde `www/sw.js` içindeki `VERSION`'ı artır (`boncuk-v2` gibi) ve tekrar yükle; telefonlar yeni sürümü bir sonraki açılışta alır.

## 4. Android uygulaması (APK / Play Store)

1. [Android Studio](https://developer.android.com/studio)'yu kur (Java onunla birlikte gelir).
2. Proje klasöründe:
   ```bash
   npm run android
   ```
   Bu komut oyunu Android projesine kopyalar ve Android Studio'yu açar.
3. Telefonda *Geliştirici seçenekleri → USB hata ayıklama*'yı aç, USB ile bağla, Android Studio'da ▶ **Run**.
4. Play Store için: *Build → Generate Signed App Bundle*. Google Play geliştirici hesabı tek seferlik 25 $.

Uygulamada titreşim, Capacitor Haptics eklentisiyle yapılır (tarayıcıdan daha net hisseder).

## 5. iOS uygulaması (App Store)

iOS derlemesi için **Mac + Xcode** şart (Windows'ta yapılamaz).

1. Proje klasörünü Mac'e kopyala, orada `npm install` çalıştır.
2. `npx cap sync ios` ve ardından `npx cap open ios`.
3. Xcode'da *Signing & Capabilities* bölümünde Apple hesabını seç, ▶ ile iPhone'a yükle.
4. App Store için Apple Developer hesabı gerekir (yıllık 99 $).

Mac yoksa: Codemagic veya Ionic Appflow gibi bulut derleme servisleri Capacitor projesini Mac olmadan derleyebilir.

PWA yolu iPhone'da da çalışır; tek fark Safari'de titreşim olmamasıdır. Uygulama sürümünde titreşim iPhone'da da çalışır.

## Oyunu değiştirdikten sonra

| Ne yaptın | Ne çalıştır |
|---|---|
| `www/index.html`'i düzenledin | `npx cap sync` (uygulamalara kopyalar) |
| İkonu değiştirmek istiyorsun | `tools/make-icons.ps1`'i düzenle, `npm run icons` |
| PWA'yı güncelledin | `www/sw.js` → `VERSION`'ı artır, yeniden yükle |

## Mağazaya göndermeden önce

- `capacitor.config.json` içindeki `appId` şu an **`com.boncukcarki.app`**. Mağazaya bir kez gönderildikten sonra değiştirilemez; kendi alan adına göre (ör. `tr.com.sirketin.boncukcarki`) değiştirmek istersen göndermeden önce üç yerde değiştir: `capacitor.config.json` → `appId`, `android/app/build.gradle` → `applicationId`, Xcode'da *General → Bundle Identifier*.
- Uygulama adı, açıklama ve ekran görüntüleri mağaza panelinden girilir.
