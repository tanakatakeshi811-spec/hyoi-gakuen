/* ============================================================
   憑愛学園(ヒョイガクエン) ―― データ定義
   ゲームジャンル・仕組みのみ実在作品を参考にし、名前・キャラクター・
   世界観・アセットはすべてオリジナル。「悪魔に取り憑かれている」設定は
   しゅんりさん発案のオリジナル要素。
   ============================================================ */

const TILE = 4;      // 1マスのワールド単位サイズ
const COLS = 56;      // 校舎グリッド 横
const ROWS = 29;      // 校舎グリッド 縦(奥行き)

/* ---- 校舎の部屋(すべてタイル座標、閉区間) ---- */
const ROOMS = [
  {key:'homeroom', name:'1年A組(教室)',   c0:2,  r0:2,  c1:9,  r1:10},
  {key:'classB',   name:'1年B組(教室)',   c0:11, r0:2,  c1:18, r1:10},
  {key:'class2a',  name:'2年A組(教室)',   c0:28, r0:2,  c1:35, r1:10},
  {key:'library',  name:'図書室',         c0:37, r0:2,  c1:44, r1:10},
  {key:'nurse',    name:'保健室',         c0:46, r0:2,  c1:51, r1:10},
  {key:'science',  name:'理科室',         c0:2,  r0:16, c1:9,  r1:23},
  {key:'music',    name:'音楽室',         c0:11, r0:16, c1:18, r1:23},
  {key:'gym',      name:'体育館',         c0:28, r0:16, c1:44, r1:25},
  {key:'art',      name:'美術部室',       c0:49, r0:16, c1:53, r1:19},
  {key:'council',  name:'生徒会室',       c0:49, r0:21, c1:53, r1:25},
  {key:'corridorN',name:'廊下',           c0:24, r0:2,  c1:26, r1:27},
  {key:'corridorE',name:'廊下',           c0:2,  r0:12, c1:51, r1:14},
  {key:'clubHall', name:'部室棟廊下',     c0:46, r0:15, c1:47, r1:25},
  {key:'entrance', name:'昇降口',         c0:20, r0:25, c1:30, r1:28},
];

/* ---- ドア(壁を貫通させる床タイル) ---- */
const DOORS = [
  [5,11,7,11],  [14,11,16,11],
  [31,11,33,11],[40,11,42,11],[48,11,49,11],
  [5,15,7,15],  [14,15,16,15],
  [35,15,38,15],
  [46,15,47,15],
  [45,19,45,20],[48,17,48,18],[48,22,48,23],
  [35,26,38,28],
];

/* ---- 屋外ゾーン(このAABBの中は柵の外に出ない限り自由に歩ける) ---- */
const OUTDOOR_ZONE = {x0:-40, z0:112, x1:270, z1:300};
/* ---- 屋上ゾーン(校舎から遠く離れた場所に独立配置。階段で瞬間移動) ---- */
const ROOF_OFFSET = {x:1000, z:0};
const ROOF_ZONE = {x0:ROOF_OFFSET.x-4, z0:ROOF_OFFSET.z-4, x1:ROOF_OFFSET.x+64, z1:ROOF_OFFSET.z+64};
/* ---- 旧倉庫(誘拐した相手を連れて行く場所)。屋外の隅に独立配置 ---- */
const SHED = {x:236, z:260, w:16, d:14};

/* 階段(校舎内)⇔屋上 の対応地点 */
const STAIRS_UP   = {x: (24.5)*TILE, z: 3*TILE};
const STAIRS_DOWN = {x: ROOF_OFFSET.x+8, z: ROOF_OFFSET.z+40};

/* ---- 2階・3階(しゅんりさん要望「校舎をもう少し広く3階建てに」)。
   壁・床のグリッド衝突判定(blocked())の複雑化を避けるため、既存の
   屋上と全く同じ設計パターン(校舎本体から遠く離れた場所に独立した
   小さな建物を置き、階段プロップでワープする)を踏襲する。ROOF_ZONEとは
   別のOBSTACLES登録範囲になるようx方向に十分離して配置してある ---- */
const FLOOR2_OFFSET = {x:1100, z:0};
const FLOOR2_ZONE = {x0:FLOOR2_OFFSET.x-4, z0:FLOOR2_OFFSET.z-4, x1:FLOOR2_OFFSET.x+52, z1:FLOOR2_OFFSET.z+28};
const FLOOR3_OFFSET = {x:1200, z:0};
const FLOOR3_ZONE = {x0:FLOOR3_OFFSET.x-4, z0:FLOOR3_OFFSET.z-4, x1:FLOOR3_OFFSET.x+52, z1:FLOOR3_OFFSET.z+28};
/* 1階⇔2階⇔3階 の階段対応地点(1階側の乗り場は既存の屋上階段=STAIRS_UPとは
   別の、廊下の少し静かな場所に新設する) */
const STAIRS_2F_UP   = {x: 25.5*TILE, z: 8*TILE};
const STAIRS_2F_DOWN = {x: FLOOR2_OFFSET.x+6,  z: FLOOR2_OFFSET.z+18};
const STAIRS_3F_UP   = {x: FLOOR2_OFFSET.x+6,  z: FLOOR2_OFFSET.z+6};
const STAIRS_3F_DOWN = {x: FLOOR3_OFFSET.x+6,  z: FLOOR3_OFFSET.z+18};

/* ---- NPC簡易経路探索用: 各部屋の出入口(ドア)座標 ---- */
const DOOR_PT = {
  homeroom:{x:26,z:46}, classB:{x:62,z:46}, class2a:{x:130,z:46}, library:{x:166,z:46},
  nurse:{x:194,z:46}, science:{x:26,z:62}, music:{x:62,z:62}, gym:{x:146,z:62},
  clubHall:{x:186,z:62}, art:{x:194,z:70}, council:{x:194,z:90},
};
function roomKeyAt(x,z){
  const c=Math.floor(x/TILE), r=Math.floor(z/TILE);
  for(const rm of ROOMS){ if(c>=rm.c0&&c<=rm.c1&&r>=rm.r0&&r<=rm.r1) return rm.key; }
  return null;
}

/* ---- 現在の階数だけを座標から引く(HUDに常時表示するため2026-09-18新設。
   しゅんりさん要望「2階3階行く方法がちょっと分からなくて」への対応の一部) ---- */
function floorAt(x,z){
  if(x>=FLOOR3_ZONE.x0&&x<=FLOOR3_ZONE.x1&&z>=FLOOR3_ZONE.z0&&z<=FLOOR3_ZONE.z1) return '3F';
  if(x>=FLOOR2_ZONE.x0&&x<=FLOOR2_ZONE.x1&&z>=FLOOR2_ZONE.z0&&z<=FLOOR2_ZONE.z1) return '2F';
  if(x>=ROOF_ZONE.x0&&x<=ROOF_ZONE.x1&&z>=ROOF_ZONE.z0&&z<=ROOF_ZONE.z1) return '屋上';
  if(x>=OUTDOOR_ZONE.x0&&x<=OUTDOOR_ZONE.x1&&z>=OUTDOOR_ZONE.z0&&z<=OUTDOOR_ZONE.z1) return '屋外';
  return '1F';
}
/* ---- 部屋名を座標から引く ---- */
function roomNameAt(x,z){
  const c=Math.floor(x/TILE), r=Math.floor(z/TILE);
  for(const rm of ROOMS){
    if(c>=rm.c0&&c<=rm.c1&&r>=rm.r0&&r<=rm.r1) return rm.name;
  }
  if(x>=OUTDOOR_ZONE.x0&&x<=OUTDOOR_ZONE.x1&&z>=OUTDOOR_ZONE.z0&&z<=OUTDOOR_ZONE.z1){
    if(z>200) return 'グラウンド';
    if(x>220&&z>230) return '旧倉庫';
    return '中庭';
  }
  if(x>=ROOF_ZONE.x0&&x<=ROOF_ZONE.x1&&z>=ROOF_ZONE.z0&&z<=ROOF_ZONE.z1) return '屋上';
  if(x>=FLOOR2_ZONE.x0&&x<=FLOOR2_ZONE.x1&&z>=FLOOR2_ZONE.z0&&z<=FLOOR2_ZONE.z1){
    return (x<FLOOR2_OFFSET.x+24) ? '2階 廊下' : '2年C組(2階)';
  }
  if(x>=FLOOR3_ZONE.x0&&x<=FLOOR3_ZONE.x1&&z>=FLOOR3_ZONE.z0&&z<=FLOOR3_ZONE.z1){
    return (x<FLOOR3_OFFSET.x+24) ? '3階 廊下' : '資料室(3階)';
  }
  return '校内';
}

/* ---- 1日の時間割(単位:分、8:00開始) ---- */
const PERIODS = [
  {name:'朝のSHR', start:480, end:495, type:'home'},
  {name:'1限 国語', start:495, end:535, type:'class', subject:'国語', room:'homeroom'},
  {name:'2限 数学', start:535, end:575, type:'class', subject:'数学', room:'homeroom'},
  {name:'中休み',   start:575, end:590, type:'break'},
  {name:'3限 理科', start:590, end:630, type:'class', subject:'理科', room:'science'},
  {name:'4限 社会', start:630, end:670, type:'class', subject:'社会', room:'homeroom'},
  {name:'昼休み',   start:670, end:715, type:'lunch'},
  {name:'5限 英語', start:715, end:755, type:'class', subject:'英語', room:'homeroom'},
  {name:'6限 体育', start:755, end:795, type:'class', subject:'体育', room:'gym'},
  {name:'放課後',   start:795, end:870, type:'after'},
];
const DAY_START = PERIODS[0].start, DAY_END = PERIODS[PERIODS.length-1].end;
const SUBJECTS = ['国語','数学','理科','社会','英語','体育'];
const DAY_LIMIT = 20; // この日数を超えると卒業式(未回収の関係は卒業エンドへ)

/* ---- 武器/道具(排除・威嚇・護身用。演出はすべて様式化=気絶シルエット+SE) ----
   power: 気絶成功のしやすさ  time: 気絶にかかる秒数  noise: 周囲に気付かれやすさ
   range: 有効距離  threatBonus: 「脅す」行動での勇気減少ボーナス */
const WEAPONS = [
  {key:'book',  name:'教科書',       icon:'📖', power:0.55, time:2.6, noise:0.35, range:1.6, threatBonus:4,
    desc:'いつでも持っている。威力は控えめだけど、これしか無い時も安心。'},
  {key:'broom', name:'ほうき',       icon:'🧹', power:0.7, time:2.0, noise:0.5, range:2.0, threatBonus:6,
    desc:'用具入れで見つけた。間合いが長く、そこそこ扱いやすい。', pickup:{room:'gym'}},
  {key:'mop',   name:'モップ',       icon:'🧽', power:0.68, time:2.1, noise:0.55, range:2.0, threatBonus:5,
    desc:'水拭き用。振り回すと少し滑りやすい。', pickup:{room:'gym'}},
  {key:'cone',  name:'三角コーン',   icon:'🚧', power:0.8, time:1.8, noise:0.85, range:1.8, threatBonus:8,
    desc:'体育倉庫の備品。かぶせるとよく効くが、音が響く。', pickup:{room:'gym'}},
  {key:'rope',  name:'縄跳び',       icon:'🪢', power:0.9, time:1.3, noise:0.15, range:1.1, threatBonus:5,
    desc:'とても静か。ただし相手のすぐ後ろまで近づく必要がある。拘束にも使える。', pickup:{room:'gym'}},
  {key:'drum',  name:'太鼓のバチ',   icon:'🥢', power:0.75, time:1.6, noise:0.3, range:1.7, threatBonus:6,
    desc:'音楽室の備品。連打が軽快で扱いやすい。', pickup:{room:'music'}},
  {key:'knife', name:'カッターナイフ', icon:'🔪', power:0.95, time:1.1, noise:0.1, range:1.0, threatBonus:10,
    desc:'理科室の実験用具入れにあった。切れ味がよく静かで一瞬で片がつくが、'
      +'相手のすぐそばまで近づかないと届かない諸刃の剣。', pickup:{room:'science'}},
  {key:'driver',name:'ドライバー',   icon:'🔧', power:0.85, time:1.5, noise:0.45, range:1.3, threatBonus:9,
    desc:'旧倉庫の工具箱にあった。頑丈で扱いやすいが、金属がぶつかる音が響きやすい。'},
  {key:'shadow',name:'影の手',       icon:'🖤', power:1.0, time:0.9, noise:0.0, range:3.2, threatBonus:14,
    desc:'テネブラの力。人間には聞こえないが、姿を見られると必ず「怪異」として大騒ぎになる。',
    needPossession:60, supernatural:true},
];

/* ---- 消火器(排除系の「気絶させる」とは別枠の道具。正面からでも使え、
   気絶はさせず「視界を奪って足止めする」という別の効果を持つ。校内の
   備品として複数箇所に配置し、拾って所持数を増やせる) ---- */
const EXTINGUISHER = {
  name:'消火器', icon:'🧯', range:3.0, blindTime:5.5,
  desc:'白い薬剤を吹きかけて、相手の視界を一時的に奪い足止めする。'
    +'気絶はさせないので正面からでも使えるが、噴射音で周囲に気づかれるかもしれない。'
};

/* ---- ビニール袋(黒)。気絶している相手に使うと、その場で黒い袋に
   くるんでそのまま放置できる。「運んで旧倉庫に拘束する」ルートとは
   別の、その場で完結する隠蔽手段。一度袋にくるんだ相手は旧倉庫の
   発覚リスク(checkShedExposure)の対象外になる ---- */
const TRASHBAG = {
  name:'ビニール袋(黒)', icon:'🗑️', range:2.2,
  desc:'気絶した相手を、その場で黒い袋にくるんで隠す。運ばなくてもそのまま放置できる。'
};

/* ---- 惚れ薬。理科室で何個でも作れる、好感度を大きく上げる薬 ---- */
const LOVE_POTION = {
  name:'惚れ薬', icon:'💘', value:50,
  desc:'理科室の薬品棚で作った怪しい薬。飲ませると好感度が大きく上がるが、'
    +'見られると怪しまれてしまうかもしれない。'
};

/* ---- 2026-09-18: ハグ/キス(しゅんりさん要望「キスとかハグもできるように」)。
   「一緒に過ごす」「告白する」と同じ並びの親愛アクション。過度に生々しい
   描写は避け、テキスト演出+好感度アップ程度のライトな表現に留める。
   1日1回までのクールダウン(player.flags.huggedToday/kissedTodayでnextDay()
   ごとにリセット)+好感度のしきい値で「常識的な発生条件」を表現する ---- */
const HUG_AFF_MIN=35, HUG_GAIN=10;
const KISS_AFF_MIN=75, KISS_GAIN=18;

/* ---- 贈り物(好感度アップ用アイテム。マップ上で採取/購入) ---- */
const GIFTS = [
  {key:'flower', name:'中庭の花',   icon:'🌸', value:6,  pickup:{zone:'courtyard'}},
  {key:'bookmark',name:'図書室のしおり', icon:'🔖', value:8, pickup:{room:'library'}},
  {key:'snack',  name:'購買のお菓子', icon:'🍬', value:10, pickup:{room:'entrance'}},
  {key:'charm',  name:'手作りのお守り', icon:'🧵', value:16, pickup:{room:'homeroom'}, rare:true},
];

/* ---- 登場人物 ---- */
const CHAR = {
  hinata:{ key:'hinata', name:'藤代 陽向', role:'love',
    favoriteGift:'snack',
    look:{male:true, hairStyle:'short', hair:0x2b2118, skin:0xf0d3b4, uniform:0x24344a, accent:0xb5352f, eye:0x2f2a24},
    home:'homeroom', lunch:'court_bench', after:'gym'},
  hinano:{ key:'hinano', name:'白鳥 ひなの', role:'rival',
    look:{male:false, hairStyle:'twin', hair:0xf4e6c4, skin:0xf3d8ba, uniform:0x24344a, accent:0xe07fa0, eye:0x6a4fae},
    home:'homeroom', lunch:'court_bench2', after:'gym'},
  kuroda:{ key:'kuroda', name:'黒田先生', role:'teacher',
    look:{male:true, hairStyle:'short', hair:0x232323, skin:0xe7c7a2, uniform:0x2c2c34, accent:0x555555, eye:0x1c1c1c, tall:true},
    home:'staffPatrol', vision:1.3, patrol:'corridors'},
  kiryuu:{ key:'kiryuu', name:'桐生先生', role:'teacher',
    look:{male:false, hairStyle:'bob', hair:0x33302c, skin:0xf1d8bd, uniform:0xe9e4d4, accent:0x6fae8f, eye:0x2a2420},
    home:'nurse', vision:0.8, patrol:'none'},
  mio:{ key:'mio', name:'二階堂 澪', role:'student',
    look:{male:false, hairStyle:'long', hair:0x2e2622, skin:0xf0d3b4, uniform:0x24344a, accent:0x8fae6f, eye:0x2f2a24},
    home:'library', lunch:'library', after:'library'},
  nayuta:{ key:'nayuta', name:'東雲 那由多', role:'student',
    look:{male:false, hairStyle:'bob', hair:0x21232a, skin:0xefd2b2, uniform:0x24344a, accent:0xc9a24a, eye:0x3a3a44},
    home:'council', lunch:'council', after:'council', vision:1.1},
  mei:{ key:'mei', name:'相楽 芽依', role:'student',
    look:{male:false, hairStyle:'wild', hair:0x6b4a24, skin:0xefceac, uniform:0x24344a, accent:0xd97a2a, eye:0x4a3524},
    home:'art', lunch:'art', after:'art'},
  janitor:{ key:'janitor', name:'用務員さん', role:'teacher',
    look:{male:true, hairStyle:'none', hair:0x555555, skin:0xd8b48c, uniform:0x40453a, accent:0x333333, eye:0x1c1c1c, tall:true},
    home:'field', vision:0.9, patrol:'outdoor'},
  kenta:{ key:'kenta', name:'森田 健太', role:'student',
    look:{male:true, hairStyle:'wild', hair:0x2b2118, skin:0xefceac, uniform:0x24344a, accent:0x4a90d9, eye:0x2f2a24},
    home:'classB', lunch:'field', after:'field'},
  sakura:{ key:'sakura', name:'川島 さくら', role:'student',
    look:{male:false, hairStyle:'twin', hair:0x3a2c22, skin:0xf3d8ba, uniform:0x24344a, accent:0xe07fa0, eye:0x4a3524},
    home:'class2a', lunch:'court_bench2', after:'library'},
};

/* ---- 生徒89人化: しゅんりさん要望「生徒数を全部で89人にしろ、モデルは
   色を変えれば一緒で良い」。固有セリフを持つ7人(陽向・ひなの・澪・那由多・
   芽依・健太・さくら、上のCHARに定義済み)はそのまま据え置き、残り82人は
   名字+名前の自動組み合わせ+髪/肌/差し色のパレット違いで大量生成する
   (7+82=89人)。会話は共通のTALK_LINES.genericへ委ねる(actionTalk側の
   role==='student'フォールバックがそのまま効く、個別分岐は不要)。
   見た目の色は既存キャラと同じ男女2種の既製3Dモデル(man.glb/woman.glb)を
   使い回し、person.jsのTINT_MAPによる色塗り替えだけで個体差を出す ---- */
const GEN_SURNAMES=['佐藤','鈴木','高橋','田中','伊藤','渡辺','山本','中村','小林','加藤',
  '吉田','山田','佐々木','山口','松本','井上','木村','林','清水','斎藤',
  '阿部','森','池田','橋本','山崎','石川','中島','前田','藤田','岡田'];
const GEN_GIVEN_M=['翔太','大輝','拓海','健','悠斗','颯太','陸','蓮','大和','勇人',
  '和也','直樹','亮太','雄大','新太','拓真','海斗','智也','浩二','光'];
const GEN_GIVEN_F=['美咲','愛','陽菜','結衣','さやか','真央','千尋','由美','花','舞',
  '桃子','咲希','恵','直美','遥','葵','美穂','茜','楓','萌'];
const GEN_HAIR=[0x2b2118,0x3a2c22,0x21232a,0x6b4a24,0x4a3524,0x1c1c1c,0x5a3c28,0x2e2622,0x8a6a3a,0x332018];
const GEN_SKIN=[0xf0d3b4,0xefceac,0xf3d8ba,0xefd2b2,0xe7c7a2,0xf0dbc0,0xead0ae];
const GEN_ACCENT=[0xb5352f,0x4a90d9,0x8fae6f,0xd97a2a,0xc9a24a,0xe07fa0,0x7a5ac9,0x3fae9f,0xd94f8a,0x5a8ac9];
const GEN_EYE=[0x2f2a24,0x3a2a52,0x2a2420,0x4a3524,0x1c1c1c,0x3a3a44];
/* 3クラス(homeroom/classB/class2a)に均等に散らし、教室ぎゅうぎゅう詰めを
   避ける(scheduleTarget()はdef.classRoomをそのまま行き先に使う既存仕様、
   今まで未使用だったフィールドをそのまま活かせる)。昼休み・放課後の
   行き先もプールから分散して割り当て、校内全体に散らばるようにする */
function buildGenericStudents(count){
  const out=[];
  const rooms=['homeroom','classB','class2a'];
  const lunchPool=['court_bench','court_bench2','field','library','homeroom'];
  const afterPool=['gym','field','library','music','art','council','classB','class2a'];
  for(let i=0;i<count;i++){
    const male=(i*7)%5<2; // 適当な偏りで男女を振り分ける(厳密な比率は不問)
    const sur=GEN_SURNAMES[i%GEN_SURNAMES.length];
    const giv=male?GEN_GIVEN_M[i%GEN_GIVEN_M.length]:GEN_GIVEN_F[i%GEN_GIVEN_F.length];
    const room=rooms[i%3];
    out.push({
      key:'gen'+i, name:sur+' '+giv, role:'student', generic:true,
      look:{male:male, hairStyle:male?'short':'long',
        hair:GEN_HAIR[i%GEN_HAIR.length], skin:GEN_SKIN[(i*3+1)%GEN_SKIN.length],
        uniform:0x24344a, accent:GEN_ACCENT[(i*5+2)%GEN_ACCENT.length],
        eye:GEN_EYE[(i*2+1)%GEN_EYE.length],
        noShadow:true}, // 大人数化での描画負荷対策(影を落とすのは主要キャラのみに絞る)
      home:room, classRoom:room,
      lunch:lunchPool[(i*2+1)%lunchPool.length],
      after:afterPool[(i*3+2)%afterPool.length],
    });
  }
  return out;
}
const GENERIC_STUDENTS = buildGenericStudents(82);

/* ---- 2026-09-18追記: NPCの「一時的な単独行動」用の目的地候補。
   専用のトイレ/購買部という部屋はマップに無いため、既存の廊下
   (corridorN/corridorE)上の数か所を休憩スポットとして点だけで定義する
   (壁・衝突判定には一切手を入れない、court_bench等と同じ「点」形式) ---- */
const ERRAND_SPOTS = [
  {label:'トイレ(1階北)',  x:25.5*TILE, z:9*TILE},
  {label:'トイレ(1階南)',  x:25.5*TILE, z:18*TILE},
  {label:'購買部の近く',    x:25.5*TILE, z:24*TILE},
  {label:'廊下の自販機',    x:44*TILE,   z:13*TILE},
  {label:'渡り廊下',        x:8*TILE,    z:13*TILE},
];

/* ---- 場所キー→ワールド座標(部屋の中心 or 屋外の目印) ---- */
function roomCenter(key){
  const rm=ROOMS.find(r=>r.key===key);
  if(rm) return {x:(rm.c0+rm.c1+1)/2*TILE, z:(rm.r0+rm.r1+1)/2*TILE};
  const extra={
    'staffPatrol':{x:25*TILE,z:14*TILE},
    'court_bench':{x:90,z:150},
    'court_bench2':{x:120,z:150},
    'field':{x:110,z:230},
    'shrine':{x:60,z:170},
  };
  return extra[key]||{x:25*TILE,z:14*TILE};
}

/* ---- テネブラ(悪魔)の囁き。憑依度に応じて変化 ---- */
const TENEBRA_LINES = {
  low:[ 'テネブラ「……まだ眠っていていい。今日はただの一日だ」',
        'テネブラ「お前の心臓、まだ人間のリズムだな」' ],
  mid:[ 'テネブラ「ククッ……その子が邪魔なんだろう? 手伝ってやろうか」',
        'テネブラ「怖がらせるくらい、造作もない」',
        'テネブラ「疑われるのが怖い? ならもっと静かにやることだ」' ],
  high:[ 'テネブラ「もう戻れないところまで来ている。気づいているか?」',
         'テネブラ「お前の輪郭が、そろそろ僕のものになる」',
         'テネブラ「愛も、憎しみも……全部僕がもらう」' ],
};

/* ---- ダイアログ(会話) ---- */
const TALK_LINES = {
  hinata_low:['陽向「あ、おはよう。今日もいい天気だね」','陽向「今日の授業、なに持ってきたっけ?」'],
  hinata_mid:['陽向「最近よく話すようになったね。なんか嬉しいかも」','陽向「今度、一緒に帰らない?」'],
  hinata_high:['陽向「君といると、なんか落ち着くんだ」','陽向「……その、ずっとこのままでいいのかな」'],
  hinano_line:['ひなの「陽向くーん!　こっち向いて!」','ひなの「（あなた、最近陽向くんの近くにいすぎじゃない?）」'],
  generic:['……。','特に用はないみたい。','「あ、えっと……よろしく」','「今日の授業、難しいよね」',
    '「そういえば購買のパン、もう売り切れてたよ」','「別に、なんでもない」'],
  teacher_warn:['「おい、そこの! ちゃんと教室に戻れ」','「不審な動きをするな。見ているぞ」'],
  kuroda_line:['黒田「おい、そこの! ちゃんと教室に戻れ」','黒田「不審な動きをするな。見ているぞ」',
    '黒田「ふらふらしてないで、さっさと次の場所へ行け」'],
  kiryuu_line:['桐生「顔色、あまり良くないみたいだけど……無理はしないでね」',
    '桐生「保健室はいつでも開けてあるから、疲れたら寄っていきなさい」',
    '桐生「……なんだか、最近様子が変わった子ね」'],
  janitor_line:['用務員「おお、精が出るな。危ないとこでは遊ぶんじゃないぞ」',
    '用務員「……ん? まあいい、気をつけてな」',
    '用務員「この学校も長いこと見てきたが……いろんな生徒がいるもんだ」'],
  mio_line:['澪「……図書室、静かでいいよね。ここにいると落ち着くの」',
    '澪「最近借りた本、面白かったよ。よかったら今度話そうか」'],
  nayuta_line:['那由多「生徒会の仕事、意外と地味なことも多いんだよ」',
    '那由多「困ったことがあれば、生徒会室まで言いにきていいから」'],
  mei_line:['芽依「見て見て、この絵。今度のコンクールに出すんだ」',
    '芽依「美術部室、いつでも遊びに来ていいよ」'],
  kenta_line:['健太「おー、久しぶり! 部活の調子どう?」',
    '健太「今度みんなでグラウンド使おうって話してるんだ」'],
  sakura_line:['さくら「ねえねえ、聞いてよ。最近こんなことがあってさ」',
    'さくら「図書室でよく見かけるよね、あなたのこと」'],
};

/* ---- 噂・脅しのフレーバーテキスト ---- */
const RUMOR_LINES = ['「ねえ聞いた? あの子、実はすごく性格悪いらしいよ」を掲示板の陰でそっと広めた……',
  '昇降口の靴箱に、根も葉もない噂の手紙をそっと差し込んだ……'];
const THREATEN_LINES = ['「……全部知ってるからね」と、低い声で耳打ちした……'];

/* ---- エンディング文 ---- */
const ENDINGS = {
  love_pure:{title:'両想いエンド ―― 変わらない朝',
    text:'告白は成功した。テネブラの声はまだ胸の奥で燻っているけれど、\n君はまだ、自分の意思で笑うことができる。\n「これからもよろしく」――そう言って、陽向は笑った。'},
  love_dark:{title:'両想いエンド ―― 昏い春',
    text:'告白は成功した。けれど、君の瞳の奥にはもう別の色が混じっている。\n陽向は気づいていない。まだ、何も。\nテネブラは静かに笑った――「これでいい」。'},
  expelled:{title:'BADエンド ―― 露見',
    text:'不審な行動の数々は、ついに職員会議に報告された。\n呼び出された保護者面談の末、君は静かに転校することになった。\n誰にも本当のことは、話せないまま。'},
  possessed:{title:'BADエンド ―― 明け渡し',
    text:'テネブラの気配は、もう囁きではなかった。\nある朝、鏡に映った瞳の色が、二度と君のものに戻ることはなかった。'},
  captive_exposed:{title:'BADエンド ―― 発覚',
    text:'旧倉庫に人が近づく足音――その先に何があるか、想像するのは簡単だった。\n静かな学校に、けたたましいサイレンの音が響いた。'},
  graduate_close:{title:'卒業エンド ―― まだ言えない気持ち',
    text:'桜の舞う中、卒業式が終わった。\n告白はできなかったけれど、陽向と過ごした日々は、\n君の胸の中にちゃんと残っている。\n「また会おうね」――そう言われて、君は小さく頷いた。'},
  graduate_alone:{title:'卒業エンド ―― 静かな日々',
    text:'とくに大きな出来事もないまま、卒業の日を迎えた。\nテネブラの囁きは、今日もどこか遠くで聞こえる。\n君はただ、いつも通りに歩いて帰った。'},
  graduate_dark:{title:'卒業エンド ―― 消えない気配',
    text:'表向きは、なにごともなく卒業式を終えた。\nけれど鏡を覗き込むたび、君はふと思う――\nこの胸の奥にいる誰かは、本当にもう大人しくなったのだろうか。\nテネブラは答えず、ただ静かに笑っている気がした。'},
};

/* ---- 成績表評価(0-100 → 5段階) ---- */
function gradeLetter(v){ return v>=90?'S':v>=75?'A':v>=55?'B':v>=35?'C':'D'; }
