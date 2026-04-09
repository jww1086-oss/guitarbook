import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Music, Search, ArrowLeft, ChevronRight, User, Folder, List, Tag, Play, X, Star, ScrollText, Timer, Settings2, LayoutList, Circle, Layout, FileText, VideoOff, Video, Maximize } from 'lucide-react';
import songsData from './songs.json';

const CHOSUNG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

function getChosung(str) {
  if (!str) return '';
  let first = str.charAt(0).toUpperCase();

  // Number to Korean Chosung Mapping
  const numMap = {
    '0': 'ㅇ', '1': 'ㅇ', '2': 'ㅇ', '3': 'ㅅ', '4': 'ㅅ',
    '5': 'ㅇ', '6': 'ㅇ', '7': 'ㅊ', '8': 'ㅍ', '9': 'ㄱ'
  };
  if (numMap[first]) return numMap[first];

  if (first === 'J') return 'ㅈ'; // User request: J에게 -> ㅈ

  const charCode = str.charCodeAt(0);
  if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
    return CHOSUNG[Math.floor((charCode - 0xAC00) / 588)];
  }
  return first;
}

function getSortKey(str) {
  if (!str) return '';
  const numToKor = {
    '0': '영', '1': '일', '2': '이', '3': '삼', '4': '사',
    '5': '오', '6': '육', '7': '칠', '8': '팔', '9': '구'
  };
  // Convert leading numbers for sorting
  return str.split('').map(char => numToKor[char] || char).join('');
}

const YOUTUBE_IDS = {
  "J에게-4막5장.jpg": "8P_pP7Z5K_o",
  "이미자-동백아가씨.jpg": "Wp-m_tOOfK8",
  "남진-가슴아프게.jpg": "pW9OOn8_uC4",
  "이등병의편지-김광석.jpg": "m-0UeP-9X7M",
  "광화문연가-이수영.jpg": "M_fS3yE2Lw0"
};

const SIGNATURE_IMAGE = "/signature_musician.png";

export default function App() {
  const [navMode, setNavMode] = useState('all'); 
  const [subView, setSubView] = useState({ type: null, value: null });
  const [selectedSong, setSelectedSong] = useState(null);
  const [search, setSearch] = useState('');
  const [transpose, setTranspose] = useState(0); // -6 to +6
  const [sourceTranspose, setSourceTranspose] = useState(0);
  const [overlayPos, setOverlayPos] = useState({ x: 0, y: 0 });
  const [overlayScale, setOverlayScale] = useState(0.85);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingOverlay, setIsResizingOverlay] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, scale: 1 });
  const [scoreScale, setScoreScale] = useState(1);
  const [scoreOffset, setScoreOffset] = useState({ x: 0, y: 0 });
  const [isPanningScore, setIsPanningScore] = useState(false);
  const scoreDragStart = useRef({ x: 0, y: 0 });
  const pinchStartDist = useRef(null);
  const pinchStartScale = useRef(1);
  
  const [videoTitle, setVideoTitle] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [debugLog, setDebugLog] = useState('');
  
  const playerRef = useRef(null);
  const scoreContainerRef = useRef(null);

  // Helper: Smart Transpose Chord Root with Sharp/Flat awareness
  const transposeChord = (chord, semi) => {
    // Choose Sharp or Flat array based on semi direction
    const useFlats = semi < 0;
    const notes = useFlats 
      ? ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']
      : ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
      
    const match = chord.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return chord;
    const root = match[1];
    const suffix = match[2];
    
    // Normalize root for identification
    const sourceNotes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const flatMap = { 'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'Bb':'A#' };
    const normRoot = flatMap[root] || root;
    const idx = sourceNotes.indexOf(normRoot);
    
    if (idx === -1) return chord;
    const newIdx = ((idx + semi) % 12 + 12) % 12; // Robust positive modulo
    return notes[newIdx] + suffix;
  };

  // AUTO RESET: When song changes, reset all states
  useEffect(() => {
    setTranspose(0);
    setSourceTranspose(0);
    setOverlayPos({ x: 0, y: 0 });
    setScoreScale(1);
    setScoreOffset({ x: 0, y: 0 });
    
    // Auto-scale overlay for mobile
    if (window.innerWidth < 768) {
      setOverlayScale(0.6);
    } else {
      setOverlayScale(0.85);
    }
  }, [selectedSong]);

  useEffect(() => {
    const handleGlobalWheel = (e) => {
      if (e.ctrlKey && selectedSong) {
        e.preventDefault();
        const delta = -e.deltaY;
        setScoreScale(prev => Math.max(0.5, Math.min(5, prev + delta / 500)));
      }
    };
    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleGlobalWheel);
  }, [selectedSong]);

  const handleStart = (e, type) => {
    const isTouch = e.type === 'touchstart';
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;

    if (type === 'overlay') {
      if (e.target.closest('.no-drag')) return;
      setIsDragging(true);
      dragStart.current = { x: clientX - overlayPos.x, y: clientY - overlayPos.y };
    } else if (type === 'score') {
      if (isTouch && e.touches.length === 2) {
        // Pinch start
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        pinchStartDist.current = dist;
        pinchStartScale.current = scoreScale;
      } else {
        if (scoreScale <= 1) return;
        setIsPanningScore(true);
        scoreDragStart.current = { x: clientX - scoreOffset.x, y: clientY - scoreOffset.y };
      }
    }
  };

  useEffect(() => {
    const handleMove = (e) => {
      const isTouch = e.type === 'touchmove';
      const clientX = isTouch ? e.touches[0].clientX : e.clientX;
      const clientY = isTouch ? e.touches[0].clientY : e.clientY;

      if (isDragging) {
        setOverlayPos({ x: clientX - dragStart.current.x, y: clientY - dragStart.current.y });
      }
      if (isResizingOverlay) {
        const delta = clientX - resizeStart.current.x;
        setOverlayScale(Math.max(0.4, Math.min(2, resizeStart.current.scale + delta / 200)));
      }
      if (isPanningScore) {
        if (isTouch && e.touches.length === 2) {
          // Pinch move
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          if (pinchStartDist.current) {
            const ratio = dist / pinchStartDist.current;
            setScoreScale(Math.max(0.5, Math.min(5, pinchStartScale.current * ratio)));
          }
        } else {
          setScoreOffset({ x: clientX - scoreDragStart.current.x, y: clientY - scoreDragStart.current.y });
        }
      }
    };
    const handleEnd = () => {
      setIsDragging(false);
      setIsResizingOverlay(false);
      setIsPanningScore(false);
      pinchStartDist.current = null;
    };

    if (isDragging || isResizingOverlay || isPanningScore) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isResizingOverlay, isPanningScore, overlayPos, scoreOffset, scoreScale]);

  const handleResizeOverlayStart = (e) => {
    e.stopPropagation();
    setIsResizingOverlay(true);
    const isTouch = e.type === 'touchstart';
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    resizeStart.current = { x: clientX, y: clientY, scale: overlayScale };
  };

  const openYouTube = useCallback(() => {
    if (!selectedSong) return;
    const youtubeId = YOUTUBE_IDS[selectedSong.id];
    const url = youtubeId 
      ? `https://www.youtube.com/watch?v=${youtubeId}` 
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedSong.artist + ' ' + selectedSong.title)}`;
    
    window.open(url, '_blank');
  }, [selectedSong]);

  const categorizedData = useMemo(() => {
    const artistGroups = {};
    const genreGroups = {};
    const indexGroups = {};
    
    songsData.forEach(song => {
      if (!artistGroups[song.artist]) artistGroups[song.artist] = [];
      artistGroups[song.artist].push(song);
      
      const genre = song.genre || '기타/가요';
      if (!genreGroups[genre]) genreGroups[genre] = [];
      genreGroups[genre].push(song);

      const cho = getChosung(song.title);
      if (!indexGroups[cho]) indexGroups[cho] = [];
      indexGroups[cho].push(song);
    });

    const artists = Object.keys(artistGroups).map(name => ({
      name, count: artistGroups[name].length, songs: artistGroups[name].sort((a,b)=>getSortKey(a.title).localeCompare(getSortKey(b.title), 'ko'))
    })).sort((a,b) => getSortKey(a.name).localeCompare(getSortKey(b.name), 'ko'));
    
    const genres = Object.keys(genreGroups).map(name => ({
      name, count: genreGroups[name].length, songs: genreGroups[name].sort((a,b)=>getSortKey(a.title).localeCompare(getSortKey(b.title), 'ko'))
    })).sort((a,b) => getSortKey(a.name).localeCompare(getSortKey(b.name), 'ko'));

    const indices = Object.keys(indexGroups).sort().map(name => ({
      name, count: indexGroups[name].length, songs: indexGroups[name].sort((a,b)=>getSortKey(a.title).localeCompare(getSortKey(b.title), 'ko'))
    }));

    return { artists, genres, indices };
  }, []);

  const displayItems = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (subView.type) {
      let source = [];
      if (subView.type === 'artist') source = categorizedData.artists.find(a => a.name === subView.value).songs;
      else if (subView.type === 'genre') source = categorizedData.genres.find(g => g.name === subView.value).songs;
      else if (subView.type === 'index') source = categorizedData.indices.find(i => i.name === subView.value).songs;
      return s ? source.filter(i => i.title.toLowerCase().includes(s) || i.artist.toLowerCase().includes(s)) : source;
    }
    if (s) {
      return songsData.filter(song => song.title.toLowerCase().includes(s) || song.artist.toLowerCase().includes(s)).slice(0, 100);
    }
    if (navMode === 'all') return categorizedData.indices;
    if (navMode === 'artists') return categorizedData.artists;
    if (navMode === 'genres') return categorizedData.genres;
    return [];
  }, [navMode, subView, search, categorizedData]);

  const renderScore = () => {
    if (!selectedSong) return null;
    return (
      <div 
        onMouseDown={(e) => handleStart(e, 'score')}
        onTouchStart={(e) => handleStart(e, 'score')}
        className={`h-full w-full flex items-center justify-center bg-black overflow-hidden ${scoreScale > 1 ? 'cursor-grab active:cursor-grabbing' : 'touch-pan-y'}`}
      >
          <img 
            src={`/songs/${selectedSong.file}`} 
            alt={selectedSong.title} 
            style={{ 
              transform: `translate(${scoreOffset.x}px, ${scoreOffset.y}px) scale(${scoreScale})`,
              transition: (isPanningScore || pinchStartDist.current) ? 'none' : 'transform 0.2s ease-out'
            }}
            className="max-h-full max-w-full object-contain pointer-events-none touch-none"
          />
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#070709] text-white flex flex-col font-sans selection:bg-[#d4af37]/40 overflow-hidden relative">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,900;1,900&family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet" />
      
      {!selectedSong ? (
        <div className="flex h-full overflow-hidden">
          <div className="hidden lg:block lg:w-[45%] h-full relative overflow-hidden group">
            <img src={SIGNATURE_IMAGE} className="w-full h-full object-cover relative z-0" alt="Musician Signature" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070709]/10 via-[#070709]/20 to-[#070709] z-10" />
            <div className="absolute top-10 left-10 z-20">
              <div className="bg-[#d4af37] text-black text-[9px] font-black px-3 py-1 rounded-full tracking-[0.2em] shadow-[0_0_20px_rgba(212,175,55,0.3)] animate-pulse">2026 EDITION</div>
            </div>
            <div className="absolute bottom-16 left-12 z-20">
              <h1 className="text-5xl md:text-6xl font-black text-white italic tracking-tighter leading-none mix-blend-difference drop-shadow-2xl">VANTAGE <br /> <span className="text-[#d4af37]">PURE</span></h1>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-8 h-[1px] bg-[#d4af37]" />
                <p className="text-[10px] font-bold text-[#d4af37] tracking-[0.4em] uppercase">{songsData.length} PROFESSIONAL SCORES</p>
              </div>
            </div>
          </div>

          <div className="flex-1 h-full flex flex-col bg-[#070709] border-l border-white/10 relative shadow-[-40px_0_80px_rgba(0,0,0,1)]">
            <header className="px-8 py-10 md:px-12 flex flex-col gap-10 relative z-10">
              <div className="flex items-center justify-between">
                <div className="lg:hidden flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#d4af37] rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.4)]"></div>
                  <h1 className="text-2xl font-black font-serif italic tracking-tighter">VANTAGE</h1>
                </div>
                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                  {[
                    { id: 'all', label: '제목별', icon: List },
                    { id: 'artists', label: '가수별', icon: User },
                    { id: 'genres', label: '장르별', icon: Tag }
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => { setNavMode(tab.id); setSubView({type:null, value:null}); setSearch(''); }}
                      className={`px-4 md:px-10 py-2.5 md:py-3 rounded-xl font-black text-[11px] md:text-sm transition-all uppercase tracking-[0.1em] md:tracking-[0.2em] whitespace-nowrap ${navMode === tab.id ? 'bg-[#d4af37] text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col gap-1 relative">
                  <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-[2px] h-8 bg-[#d4af37] blur-[1px]" />
                  <h1 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter leading-tight">
                    PLAYLIST <br /> <span className="text-[#d4af37]">VAULT</span>
                  </h1>
                </div>
                 <div className="relative group max-w-2xl">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-[#d4af37] transition-all" />
                    <input 
                      type="text" placeholder="제목/가수 빠른 검색..."
                      className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-4 md:py-6 pl-14 md:pl-16 pr-6 md:pr-8 text-lg md:text-2xl w-full outline-none focus:ring-4 focus:ring-[#d4af37]/20 focus:border-[#d4af37] transition-all font-bold placeholder:text-slate-600 text-white shadow-2xl"
                      value={search} 
                      onChange={(e)=>setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && search.trim() && displayItems.length > 0) {
                          const firstResult = displayItems[0];
                          if (firstResult && firstResult.file) {
                            setSelectedSong(firstResult);
                            setSearch('');
                          }
                        }
                      }}
                    />
                 </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar px-8 md:px-12 pb-20 relative z-10">
              {subView.type && (
                 <button onClick={() => setSubView({type:null, value:null})} className="mb-10 flex items-center gap-3 text-[#d4af37] font-black text-sm tracking-[0.3em] hover:text-white transition-all uppercase group">
                   <ArrowLeft size={20} className="group-hover:-translate-x-1" /> BACK TO CATEGORIES
                 </button>
              )}

              {!subView.type && !search.trim() ? (
                <div className="flex flex-col gap-5">
                  {displayItems.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => { 
                        setSubView({ type: navMode === 'all' ? 'index' : navMode === 'artists' ? 'artist' : 'genre', value: item.name });
                        setSearch('');
                      }}
                      className="group bg-white/5 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-white/10 hover:bg-white/10 hover:border-[#d4af37] transition-all cursor-pointer relative overflow-hidden shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6"
                    >
                      <div className="flex items-center gap-4 md:gap-8">
                        <div className="w-1 h-12 md:w-1.5 md:h-16 bg-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.4)] rounded-full" />
                        <div className="flex items-center gap-4 md:gap-6">
                           {navMode === 'all' ? (
                             <span className="text-3xl md:text-5xl font-black font-serif italic text-[#d4af37] drop-shadow-sm w-10 md:w-16 text-center">{item.name}</span>
                           ) : (
                             <div className="bg-[#d4af37]/20 p-3 md:p-4 rounded-xl md:rounded-2xl border border-[#d4af37]/30 group-hover:bg-[#d4af37] group-hover:text-black transition-all">
                               <Folder size={24} className="md:w-8 md:h-8" />
                             </div>
                           )}
                           <div className="flex flex-col">
                             <span className="text-lg md:text-xl font-black text-white group-hover:text-[#d4af37] transition-colors">{item.name}</span>
                             <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest">{item.count} TITLES IN VAULT</span>
                           </div>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-wrap gap-1.5 justify-end">
                        {item.songs.slice(0, 4).map((song, sIdx) => (
                          <div key={sIdx} className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[9px] font-medium text-white/40 whitespace-nowrap">
                            {song.title}
                          </div>
                        ))}
                        {item.count > 4 && <div className="text-[9px] font-bold text-[#d4af37]/40 pl-1 flex items-center">+{item.count - 4}</div>}
                      </div>

                      <div className="flex items-center gap-6 self-end md:self-auto">
                        <div className="bg-white/5 p-4 rounded-2xl group-hover:bg-[#d4af37] group-hover:text-black transition-all shadow-lg">
                          <ChevronRight size={24} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {displayItems.length > 0 ? displayItems.map((song, idx) => (
                    <div 
                      key={idx}
                      onClick={() => { setSelectedSong(song); setSearch(''); }}
                      className="group flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#d4af37]/40 cursor-pointer transition-all"
                    >
                       <div className="flex items-center gap-10">
                          <span className="text-3xl font-black text-[#d4af37] font-serif italic w-14 drop-shadow-md">{idx + 1}.</span>
                          <div>
                            <h4 className="text-3xl font-black text-white leading-tight mb-2 group-hover:text-[#d4af37] transition-colors">{song.title}</h4>
                            <p className="text-sm font-black text-slate-300 tracking-[0.2em] uppercase">{song.artist} — {song.genre}</p>
                          </div>
                       </div>
                       <ChevronRight size={32} className="text-[#d4af37] translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all drop-shadow-lg" />
                    </div>
                  )) : (
                    <div className="text-center py-20 opacity-20">
                       <Search size={80} className="mx-auto mb-6" />
                       <p className="text-2xl font-black tracking-widest uppercase">No matches found in vault</p>
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-screen bg-[#070709] overflow-hidden relative font-sans">
          {/* Transparent Floating Exit Button */}
          <button 
            onClick={() => setSelectedSong(null)} 
            className="absolute top-6 left-6 z-[150] w-10 h-10 flex items-center justify-center bg-black/30 backdrop-blur-md rounded-full border border-white/5 text-white/20 hover:text-[#d4af37] hover:bg-black/80 transition-all no-drag shadow-xl"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
            {renderScore()}
            
            {/* UNIFIED COMMAND DECK: CHORDS + YOUTUBE */}
            <div 
              onMouseDown={(e) => handleStart(e, 'overlay')}
              onTouchStart={(e) => handleStart(e, 'overlay')}
              style={{ 
                transform: `translate(${overlayPos.x}px, ${overlayPos.y}px) scale(${overlayScale})`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
              className={`absolute bottom-6 right-6 md:bottom-10 md:right-10 bg-black/85 backdrop-blur-3xl px-6 md:px-8 py-3 md:py-4 rounded-[2rem] md:rounded-[2.5rem] border border-[#d4af37]/30 z-[120] shadow-[0_40px_100px_rgba(0,0,0,1)] select-none cursor-move flex items-stretch gap-3 md:gap-5 ${isDragging ? 'opacity-80' : 'opacity-100'} touch-none`}
            >
              <div className="flex flex-col gap-2 md:gap-3">
                <div className="flex items-center justify-between px-2">
                  <div className="text-[6px] md:text-[7px] font-black text-white/30 tracking-[0.5em] uppercase">COMMAND DECK</div>
                </div>
                
                <div className="flex flex-col gap-1.5 md:gap-2">
                  {/* SOURCE ROW */}
                  <div 
                    onClick={() => setSourceTranspose(s => (s + 1 > 12 ? -11 : s + 1))}
                    className="no-drag flex gap-3 md:gap-6 items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl p-2.5 md:p-4 transition-all cursor-pointer group/row border border-white/5"
                  >
                    {[
                      { chord: 'C', group: 'maj' },
                      { chord: 'F', group: 'maj' },
                      { chord: 'G', group: 'maj' },
                      { chord: 'Am', group: 'min' },
                      { chord: 'Dm', group: 'min' },
                      { chord: 'Em', group: 'min' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 md:gap-6">
                        <div className="min-w-[40px] md:min-w-[55px] text-center">
                          <div className="text-xl md:text-3xl font-black text-white/90 drop-shadow-lg tracking-tighter">
                            {transposeChord(item.chord, sourceTranspose)}
                          </div>
                        </div>
                        {idx === 2 && <div className="w-[1px] h-4 md:h-6 bg-white/10" />}
                      </div>
                    ))}
                  </div>

                  {/* TARGET ROW */}
                  <div 
                    onClick={() => setTranspose(t => (t + 1 > 12 ? -11 : t + 1))}
                    className="no-drag flex gap-3 md:gap-6 items-center justify-center bg-[#d4af37]/5 hover:bg-[#d4af37]/10 rounded-xl md:rounded-2xl p-2.5 md:p-4 transition-all cursor-pointer group/row border border-[#d4af37]/10"
                  >
                    {[
                      { chord: 'C', group: 'maj' },
                      { chord: 'F', group: 'maj' },
                      { chord: 'G', group: 'maj' },
                      { chord: 'Am', group: 'min' },
                      { chord: 'Dm', group: 'min' },
                      { chord: 'Em', group: 'min' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 md:gap-6">
                        <div className="min-w-[40px] md:min-w-[55px] text-center">
                          <div className={`text-xl md:text-3xl font-black ${item.group === 'maj' ? 'text-[#d4af37]' : 'text-[#f1c40f]'} drop-shadow-xl tracking-tighter`}>
                            {transposeChord(item.chord, sourceTranspose + transpose)}
                          </div>
                        </div>
                        {idx === 2 && <div className="w-[1px] h-4 md:h-6 bg-white/10" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* INTEGRATED VERTICAL YT TRIGGER */}
              <div className="flex items-center px-0.5 md:px-1">
                 <button 
                  onClick={openYouTube}
                  className="no-drag flex flex-col items-center justify-center gap-1 w-10 md:w-14 h-full min-h-[100px] md:min-h-[140px] rounded-2xl md:rounded-3xl bg-gradient-to-b from-[#ff0000] to-[#b30000] text-white shadow-2xl hover:brightness-110 active:scale-95 transition-all group/yt"
                 >
                   <Video size={18} className="md:w-6 md:h-6 group-hover/yt:animate-pulse" />
                   <span className="text-[8px] md:text-[10px] font-black uppercase tracking-tighter">YT</span>
                 </button>
              </div>

              {/* Resize Handle */}
              <div 
                onMouseDown={handleResizeOverlayStart}
                onTouchStart={handleResizeOverlayStart}
                className="absolute -bottom-1 -right-1 w-10 h-10 cursor-nwse-resize flex items-end justify-end p-2 no-drag group/res"
              >
                <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-white/20 rounded-br-[4px] group-hover/res:border-[#d4af37] transition-colors" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Mesh Background Layer */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,#d4af3705_0%,#070709_100%)] pointer-events-none -z-10" />

      {/* ULTIMATE DEBUG LAYER - RESTORED FOR V14 */}
      {debugLog && (
        <div className="fixed bottom-4 right-4 bg-black/90 text-[10px] text-[#d4af37] px-4 py-2 rounded-lg border border-[#d4af37]/30 z-[100] font-mono tracking-tighter shadow-2xl animate-pulse">
          ENGINE STATUS: {debugLog}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d4af3730; border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d4af3760; }
        body { background-color: #070709; margin: 0; color: white; -webkit-font-smoothing: antialiased; }
        .font-serif { font-family: 'Playfair Display', serif; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
