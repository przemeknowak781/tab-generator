# GuitarTabGen

**Smart Guitar Tablature Generator from MIDI Files**

Advanced web application converting MIDI files into professional guitar tablaturates using biomechanical algorithms inspired by the [tuttut](https://github.com/mdmccarley89/tuttut) project.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![VexFlow](https://img.shields.io/badge/VexFlow-Music_Notation-orange?style=for-the-badge)](https://www.vexflow.com/)

---

## Features

### Tablature Generation
- **Automatic MIDI to Tab conversion** with smart note distribution on the fretboard
- **Biomechanical optimizer** minimizing hand movement and finger stretching
- **Viterbi Algorithm** finding the optimal fingering path for the entire composition
- **Chord support** with correct recognition of tetra-chords and polyphony

### Musical Notation
- **Standard notation and tablature** displayed simultaneously
- **Automatic grouping into measures** with correct time signature
- **Chromatic sign support** (sharps/flats) with automatic system selection
- **Beams for 8th/16th notes** grouped according to rhythm
- **Responsive layout** adapting to screen size

### Playback
- **Audio playback** with highlighting of the currently played note
- **Visual synchronization** of note/tab + audio in real-time
- **Optimized rendering** without lags or stuttering
- **Playback controls** (Play/Pause/Stop) with progress bar

### Customization
- **Support for different tunings** (Standard, Drop D, Drop C, Open D, DADGAD)
- **Dark/Light mode** with smooth transition
- **MIDI track selection** for multi-channel files
- **Demo file** (Lully) for immediate testing

---

## Installation and Setup

### Requirements
- Node.js 16+ 
- npm or yarn

### Quick Start

```bash
# Clone the repository
git clone https://github.com/przemeknowak781/tab-generator.git
cd tab-generator

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

---

## Technology

### Tech Stack
- **React 18** + **TypeScript** - modern, typed user interface
- **Vite** - lightning-fast bundler and dev server
- **VexFlow** - rendering professional musical notation
- **TailwindCSS** - utility-first styling
- **Web Audio API** - native browser audio playback

### Tablature Algorithms

The project uses **biomechanical optimization** inspired by research on guitar ergonomics:

#### Viterbi Algorithm (Dynamic Programming)
- Finds the **globally optimal fingering path** for the entire composition
- Considers **context** - transitions between chords are more important than single positions

#### "Easiness" Cost Function (from project *tuttut*)
```
Cost = dHeight + log(1 + height) + log(1 + stretch) + log(1 + changedStrings)
```

**Parameters:**
- `dHeight` - vertical hand movement distance (fret change)
- `height` - position on the fretboard (prefers lower frets)
- `stretch` - hand span (max - min fret)
- `changedStrings` - number of strings that changed status

**Bonuses:**
- **Open strings** (+0.8) - prefers "cowboy chords"
- **Sustain** (+0.5) - rewards holding the same position
- **Melodic continuity** (+0.3) - prefers playing consecutive notes on the same string

---

## How to use?

### 1. Load MIDI file
- Click **"Select MIDI file"** or drag and drop a file onto the page
- Supported formats: `.mid`, `.midi`

### 2. Select track
- If the file contains multiple tracks, select the one with the melody/tablature
- The application will automatically recognize instruments and notes

### 3. Adjust tuning (optional)
- Select guitar tuning from the dropdown list
- Tablature will be automatically recalculated

### 4. Play and enjoy!
- Click **Play** to hear the composition
- The currently played note is highlighted in red
- Export or print tablature (soon)

---

## Roadmap

- [ ] Export to PDF/PNG
- [ ] Support for guitar techniques (hammer-on, pull-off, bending, slide)
- [ ] Barre position recognition
- [ ] Tablature editor (manual corrections)
- [ ] Bass guitar support (4/5/6 strings)
- [ ] GitHub Pages integration (live demo)

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

### How to report a bug?
1. Check if the bug hasn't been reported in Issues already
2. Create a new issue with:
   - Problem description
   - Steps to reproduce
   - MIDI file (if applicable)
   - Screenshot

---

## Inspirations and References

- **[tuttut](https://github.com/mdmccarley89/tuttut)** - Biomechanical fingering optimizer (Python)
- **[VexFlow](https://www.vexflow.com/)** - Library for rendering musical notation
- **[@tonejs/midi](https://github.com/Tonejs/Midi)** - MIDI file parser

---

## License

MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**Przemysław Nowak**

- GitHub: [@przemeknowak781](https://github.com/przemeknowak781)

---

<div align="center">
  <strong>Turn MIDI into beautiful tablatures!</strong>
</div>
