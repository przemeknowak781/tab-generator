# 🎸 GuitarTabGen

**Inteligentny generator tabulatur gitarowych z plików MIDI**

Zaawansowana aplikacja webowa konwertująca pliki MIDI na profesjonalne tabulatury gitarowe z wykorzystaniem algorytmów biomechanicznych inspirowanych projektem [tuttut](https://github.com/mdmccarley89/tuttut).

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![VexFlow](https://img.shields.io/badge/VexFlow-Music_Notation-orange?style=for-the-badge)](https://www.vexflow.com/)

---

## ✨ Funkcje

### 🎵 Generowanie Tabulatur
- **Automatyczna konwersja MIDI → Tab** z inteligentnym rozkładem nut na gryf
- **Biomechaniczny optimizer** minimalizujący ruch ręki i rozciągnięcia palców
- **Algorytm Viterbi** znajdujący optymalną ścieżkę palcowania dla całej kompozycji
- **Obsługa akordów** z prawidłowym rozpoznawaniem czterodźwięków i polifonii

### 🎼 Notacja Muzyczna
- **Zapis nutowy i tabulatura** wyświetlane jednocześnie
- **Automatyczne grupowanie w takty** z poprawnym metrum
- **Obsługa znaków chromatycznych** (♯/♭) z automatycznym wyborem systemu
- **Balki dla ósemek/szesnastek** grupowane według rytmu
- **Responsive layout** dostosowujący się do rozmiaru ekranu

### 🎹 Odtwarzanie
- **Playback audio** z podświetlaniem aktualnie granej nuty
- **Synchronizacja wizualna** nuty/tab + audio w czasie rzeczywistym
- **Zoptymalizowany rendering** bez lagów i zacinania się
- **Kontrolki playback** (Play/Pause/Stop) z paskiem postępu

### 🎛️ Personalizacja
- **Obsługa różnych strojów** (Standard, Drop D, Drop C, Open D, DADGAD)
- **Tryb ciemny/jasny** z płynnym przejściem
- **Wybór ścieżki MIDI** dla plików wielokanałowych
- **Plik demo** (Lully) do natychmiastowego przetestowania

---

## 🚀 Instalacja i Uruchomienie

### Wymagania
- Node.js 16+ 
- npm lub yarn

### Szybki start

```bash
# Klonowanie repozytorium
git clone https://github.com/przemeknowak781/tab-generator.git
cd tab-generator

# Instalacja zależności
npm install

# Uruchomienie serwera deweloperskiego
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:5173`

### Build produkcyjny

```bash
npm run build
npm run preview
```

---

## 🧠 Technologia

### Stack Technologiczny
- **React 18** + **TypeScript** - nowoczesny, typowany interfejs użytkownika
- **Vite** - błyskawiczny bundler i dev server
- **VexFlow** - renderowanie profesjonalnej notacji muzycznej
- **TailwindCSS** - stylowanie utility-first
- **Web Audio API** - natywny playback audio w przeglądarce

### Algorytmy Tablaturowe

Projekt wykorzystuje **biomechaniczną optymalizację** inspirowaną badaniami nad ergonomią gry na gitarze:

#### Algorytm Viterbi (Dynamic Programming)
- Znajduje **globalnie optymalną ścieżkę** palcowania dla całej kompozycji
- Uwzględnia **kontekst** - przejścia między akordami są ważniejsze niż pojedyncze pozycje

#### Funkcja Kosztu "Easiness" (z projektu *tuttut*)
```
Cost = dHeight + log(1 + height) + log(1 + stretch) + log(1 + changedStrings)
```

**Parametry:**
- `dHeight` - odległość ruchu ręki w pionie (zmiana progu)
- `height` - pozycja na gryfie (preferuje niższe progi)
- `stretch` - rozpiętość ręki (max - min próg)
- `changedStrings` - liczba strun, które zmieniły status

**Bonusy:**
- 🎯 **Struny otwarte** (+0.8) - preferuje "cowboy chords"
- 🎵 **Sustain** (+0.5) - nagradza trzymanie tej samej pozycji
- 🎼 **Ciągłość melodyczna** (+0.3) - preferuje grę kolejnych nut na tej samej strunie

---

## 📖 Jak używać?

### 1️⃣ Wczytaj plik MIDI
- Kliknij **"Wybierz plik MIDI"** lub przeciągnij plik na stronę
- Obsługiwane formaty: `.mid`, `.midi`

### 2️⃣ Wybierz ścieżkę
- Jeśli plik zawiera wiele ścieżek, wybierz tę z melodią/tabulaturą
- Aplikacja automatycznie rozpozna instrumenty i nuty

### 3️⃣ Dostosuj strój (opcjonalnie)
- Wybierz strój gitary z listy rozwijanej
- Tabulatura zostanie automatycznie przeliczona

### 4️⃣ Odtwórz i ciesz się!
- Kliknij **Play** aby usłyszeć kompozycję
- Aktualnie graną nutę widać na czerwono
- Eksportuj lub drukuj tabulaturę (wkrótce)

---

## 🎯 Roadmap

- [ ] Eksport do PDF/PNG
- [ ] Obsługa technik gitarowych (hammer-on, pull-off, bending, slide)
- [ ] Rozpoznawanie pozycji barré
- [ ] Edytor tabulatur (ręczne poprawki)
- [ ] Wsparcie dla gitary basowej (4/5/6 strun)
- [ ] Integracja z GitHub Pages (live demo)

---

## 🤝 Wkład w projekt

Pull requesty są mile widziane! Dla większych zmian, proszę najpierw otworzyć issue aby przedyskutować proponowane zmiany.

### Jak zgłosić bug?
1. Sprawdź czy bug nie został już zgłoszony w Issues
2. Stwórz nowy issue z:
   - Opisem problemu
   - Krokami do reprodukcji
   - Plikiem MIDI (jeśli dotyczy)
   - Zrzutem ekranu

---

## 📚 Inspiracje i Referencje

- **[tuttut](https://github.com/mdmccarley89/tuttut)** - Biomechaniczny optimizer palcowania (Python)
- **[VexFlow](https://www.vexflow.com/)** - Biblioteka do renderowania notacji muzycznej
- **[@tonejs/midi](https://github.com/Tonejs/Midi)** - Parser plików MIDI

---

## 📄 Licencja

MIT License - zobacz plik [LICENSE](LICENSE) po szczegóły.

---

## 👨‍💻 Autor

**Przemysław Nowak**

- GitHub: [@przemeknowak781](https://github.com/przemeknowak781)

---

<div align="center">
  <strong>Zamień MIDI w piękne tabulatury! 🎸</strong>
</div>
