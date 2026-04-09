import fs from 'fs';
import path from 'path';

const songbookDir = './public/songs';
const outputDir = './src';
const outputFile = path.join(outputDir, 'songs.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const files = fs.readdirSync(songbookDir);
const songs = files
  .filter(file => file.endsWith('.jpg') || file.endsWith('.png'))
  .map(file => {
    const nameWithoutExt = file.replace(/\.(jpg|png)$/, '');
    const parts = nameWithoutExt.split('-');
    const title = parts[0]?.trim() || '제목 없음';
    const artist = parts[1]?.trim() || '가수 미상';
    
    // 초성 추출 함수 (한글 검색용)
    const getChosung = (str) => {
      const chosungList = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
      const hangulStart = 0xAC00;
      let res = "";
      for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i) - hangulStart;
        if (charCode >= 0 && charCode <= 11171) {
          res += chosungList[Math.floor(charCode / 588)];
        } else {
          res += str[i];
        }
      }
      return res;
    };

    return {
      id: file,
      title,
      artist,
      file,
      chosungTitle: getChosung(title),
      chosungArtist: getChosung(artist)
    };
  });

fs.writeFileSync(outputFile, JSON.stringify(songs, null, 2));
console.log(`Successfully indexed ${songs.length} songs to ${outputFile}`);
