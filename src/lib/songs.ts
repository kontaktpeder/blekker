import type { Song } from "./music";

export const SONGS: Song[] = [
  {
    id: "wide-open",
    title: "Wide Open Sky",
    artist: "The Northern Lines",
    key: "G",
    bpm: 92,
    capo: 0,
    timeSig: "4/4",
    form: ["Intro", "Verse", "Chorus", "Verse", "Chorus", "Bridge", "Chorus", "Chorus", "Outro"],
    sections: [
      {
        id: "s1", type: "intro", name: "Intro", bars: 4,
        chords: ["G", "D", "Em", "C"],
        notes: "Drums enter bar 3. Guitar clean, no vocals.",
      },
      {
        id: "s2", type: "verse", name: "Verse", bars: 8,
        chords: ["G", "D", "Em", "C", "G", "D", "C", "C"],
        lyrics: "Out on the highway / where the lights run thin\nI was counting the silence / for the road to begin",
      },
      {
        id: "s3", type: "chorus", name: "Chorus", bars: 8,
        chords: ["C", "G", "D", "Em", "C", "G", "D", "D"],
        lyrics: "Under a wide open sky / I'll meet you again\nUnder a wide open sky / where the road has no end",
        notes: "Big harmonies. Snare on 2 & 4.",
      },
      {
        id: "s4", type: "bridge", name: "Bridge", bars: 8,
        chords: ["Am", "Am", "C", "C", "D", "D", "Em", "D"],
        lyrics: "And every mile I burned away / brought me closer to today",
        notes: "Drop to half-time feel. Build last 2 bars.",
        repeat: 1,
      },
      {
        id: "s5", type: "outro", name: "Outro", bars: 4,
        chords: ["G", "D", "C", "G"],
        notes: "Ritardando final bar. End on G stab.",
      },
    ],
  },
  {
    id: "neon-rooms",
    title: "Neon Rooms",
    artist: "Hour Glass",
    key: "Am",
    bpm: 104,
    capo: 2,
    timeSig: "4/4",
    form: ["Intro", "Verse", "Pre", "Chorus", "Verse", "Pre", "Chorus", "Bridge", "Chorus"],
    sections: [
      {
        id: "n1", type: "intro", name: "Intro", bars: 4,
        chords: ["Am", "F", "C", "G"],
      },
      {
        id: "n2", type: "verse", name: "Verse", bars: 8,
        chords: ["Am", "Am", "F", "F", "C", "C", "G", "G"],
        lyrics: "We were dancing in neon rooms / chasing midnight blue",
      },
      {
        id: "n3", type: "chorus", name: "Chorus", bars: 8,
        chords: ["F", "C", "G", "Am", "F", "C", "G", "G"],
        lyrics: "Hold on / hold on / the night is young",
        notes: "Full band. Lead synth pad swells.",
      },
      {
        id: "n4", type: "bridge", name: "Bridge", bars: 6,
        chords: ["Dm", "Dm", "Am", "Am", "E", "E"],
        notes: "Strip to bass + vocal. Drums back in last bar.",
      },
    ],
  },
  {
    id: "river-stone",
    title: "River Stone",
    artist: "Mara Quinn",
    key: "D",
    bpm: 78,
    capo: 0,
    timeSig: "6/8",
    form: ["Intro", "Verse", "Chorus", "Verse", "Chorus", "Outro"],
    sections: [
      { id: "r1", type: "intro", name: "Intro", bars: 2, chords: ["D", "A"] },
      {
        id: "r2", type: "verse", name: "Verse", bars: 6,
        chords: ["D", "A", "Bm", "G", "D", "A"],
        lyrics: "Down by the river stone / I left my name",
      },
      {
        id: "r3", type: "chorus", name: "Chorus", bars: 6,
        chords: ["G", "D", "A", "Bm", "G", "A"],
        lyrics: "Carry me / carry me home",
      },
      { id: "r4", type: "outro", name: "Outro", bars: 2, chords: ["D", "D"] },
    ],
  },
];
