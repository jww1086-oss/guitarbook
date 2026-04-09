import wave
import struct
import math

def generate_piano_note(freq, duration, sample_rate=44100):
    num_samples = int(sample_rate * duration)
    data = []
    for i in range(num_samples):
        t = i / sample_rate
        val = (0.6 * math.sin(2 * math.pi * freq * t) +
               0.3 * math.sin(2 * math.pi * freq * 2 * t) +
               0.1 * math.sin(2 * math.pi * freq * 3 * t))
        envelope = math.exp(-3 * t / duration)
        data.append(int(val * envelope * 32767 * 0.5))
    return data

def save_wav(filename, notes, sample_rate=44100):
    all_data = []
    for f, d in notes:
        all_data.extend(generate_piano_note(f, d, sample_rate))
    with wave.open(filename, 'w') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(sample_rate)
        for val in all_data: f.writeframes(struct.pack('h', val))

bpm = 85
beat = 60 / bpm
half = beat * 2
eighth = beat * 0.5
sixteenth = beat * 0.25

# Frequencies
B3 = 246.94; C4 = 261.63; D4 = 293.66; E4 = 329.63; F4 = 349.23; G4 = 392.00; A4 = 440.00; B4 = 493.88

# User Corrected Intro: "솔~ 솔파미레솔솔 미~ 미레도시레레"
melody = [
    # Bar 1: 솔~ 솔파미레솔솔
    (G4, half), (G4, sixteenth), (F4, sixteenth), (E4, sixteenth), (D4, sixteenth), (G4, eighth), (G4, eighth),
    # Bar 2: 미~ 미레도시레레
    (E4, half), (E4, sixteenth), (D4, sixteenth), (C4, sixteenth), (B3, sixteenth), (D4, eighth), (D4, eighth)
]

save_wav('j_to_you_sample.wav', melody)
print("Corrected Audio saved: j_to_you_sample.wav")
