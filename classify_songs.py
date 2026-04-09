import json

input_file = r'c:\Users\UserPC\Desktop\안티그래비티\코드생성기\src\songs.json'
output_file = r'c:\Users\UserPC\Desktop\안티그래비티\코드생성기\src\songs.json'

with open(input_file, 'r', encoding='utf-8') as f:
    songs = json.load(f)

# Genre Mapping Logic based on Artists
TROT_ARTISTS = ['나훈아', '이미자', '남진', '현철', '설운도', '태진아', '주현미', '심수봉', '남인수', '백년설', '김부자', '조미미', '황금심', '진방남', '박재홍', '박일남', '고복수', '박경원', '배호', '윤일로', '명국환', '손인호', '최숙자', '장세정', '금사향', '황정자', '남상규', '최갑석', '진시몬', '이지연', '태진아', '설운도', '편승엽', '홍세민', '조승구', '이미자', '현철', '태진아']
BALLAD_ARTISTS = ['이선희', '변진섭', '이문세', '최진희', '패티김', '조용필', '신승훈', '김종서', '김연숙', '민해경', '변진섭', '유익종', '가람과뫼', '백미현', '박강성', '김창완', '이정석', '조관우', '서영은', '박선주', '노영심', '여진', '김범수', '김경호', '이수영', '조덕배', '김현철', '왁스', '이승기', '이수만', '박미경', '최성수', '다섯손가락', '조영남', '조동진', '서유석']
FOLK_ARTISTS = ['송창식', '윤형주', '김세환', '양희은', '해바라기', '둘다섯', '어니언스', '사월과오월', '트윈폴리오', '김세환', '박인희', '은희', '현경과영애', '세모와네모', '어니언스', '논두렁밭두렁', '해오라기', '버들피리', '정태춘', '신형원', '이연실']
POP_DANCE_ARTISTS = ['서태지와 아이들', '김완선', '민해경', '홍경민', '자두', '왁스', '도시아이들', '자우림']

def get_genre(artist):
    if any(a in artist for a in TROT_ARTISTS): return '트로트'
    if any(a in artist for a in BALLAD_ARTISTS): return '발라드'
    if any(a in artist for a in FOLK_ARTISTS): return '포크/7080'
    if any(a in artist for a in POP_DANCE_ARTISTS): return '팝/댄스'
    return '기타/가요'

for song in songs:
    song['genre'] = get_genre(song['artist'])

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(songs, f, ensure_ascii=False, indent=2)

print(f"Categorization complete for {len(songs)} songs.")
