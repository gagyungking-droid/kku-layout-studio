import { useState, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────
// 벤토 그리드 시스템 (2025~2026 단일 포스터 주류)
// 일본 도시락통에서 영감. Apple·Notion·Linear가 대중화.
// 원리: 균등 거터(gap) 위의 비대칭 셀 크기 → 크기 자체가 위계를 표현
//
// A3 포스터 기준 설계:
//   - 기반 컬럼: 4열 (각 22.5%) + 거터 3개 (각 3.33%)
//   - 기반 행: 6행 (각 ~14.5%) + 거터 5개 (각 2%)
//   - 마진: 상하좌우 균등 3%
//   - 셀은 컬럼·행을 span하여 1×1, 2×1, 2×2, 3×1, 4×2 등으로 병합
// ─────────────────────────────────────────────────────────────────

// 벤토 그리드 수치 계산기
// 4열: 마진 3% + (셀22.5% + 거터3.33%) × 3 + 셀22.5% + 마진 3% = 100%
const BM = 3;          // 마진 %
const BG = 2.5;        // 거터 %
const BCOLS = 4;       // 열 수
const BROWS = 6;       // 행 수
const BCW = (100 - BM*2 - BG*(BCOLS-1)) / BCOLS;  // 셀 너비 ≈ 22.375%
const BRH = (100 - BM*2 - BG*(BROWS-1)) / BROWS;  // 셀 높이 ≈ 14.08%

// n열 m행 크기의 셀 시작 위치와 크기 계산
const bx = (col) => BM + col * (BCW + BG);           // left %
const by = (row) => BM + row * (BRH + BG);           // top %
const bw = (span) => BCW * span + BG * (span - 1);   // width %
const bh = (span) => BRH * span + BG * (span - 1);   // height %

// 58유닛 (게르스트너, 기존 5종 유지)
const U  = (n) => `${(n * 100) / 58}%`;
const UP = (n) => (n * 100) / 58;

// ─── 색상 시스템 ──────────────────────────────────────────────────
const C = {
  bg:"#07080a", surface:"#0e0f12", border:"#1c1d22", muted:"#2a2b32",
  text:"#e2ddd6", dim:"#6b6a72", faint:"#2e2d35",
  blue:"#4a7cad", gold:"#c47a3a", purple:"#7a5c9e",
  red:"#9e5c5c", green:"#5c9e7a", amber:"#9e7a5c",
};
const TAG  = { 비례:C.blue, 균형:C.purple, 시선흐름:C.red, 여백:C.green, 병치:C.amber };
const GRID = { bento:C.gold, gerstner:C.blue };

const FONTS = {
  sans:  { label:"Sans-serif", sub:"Helvetica Neue", family:"'Helvetica Neue','Arial',sans-serif" },
  serif: { label:"Serif",      sub:"Georgia",        family:"'Georgia','Times New Roman',serif" },
};
const WEIGHTS = [
  {v:"100",l:"Thin"},{v:"300",l:"Light"},{v:"400",l:"Regular"},
  {v:"500",l:"Medium"},{v:"700",l:"Bold"},{v:"900",l:"Black"},
];

// ─── 원칙 데이터 ──────────────────────────────────────────────────
const PRINCIPLES = [
  // ══ 벤토 그리드 그룹 ═══════════════════════════════════════════
  {
    id:1, num:"01", name:"황금비 벤토", full:"황금비 (Golden Ratio · Bento Grid)",
    en:"Proportion · φ 1.618 + Bento", tag:"비례", grid:"bento", axis:{x:20,y:45},
    concept:`벤토 그리드에서 황금비를 구현합니다. 4열 중 좌측 셀(3열×6행, 약 70.5%)이 키비주얼 타일, 우측 셀(1열×6행, 22.4%)이 텍스트 타일입니다. 타일 간 거터(2.5%)가 두 영역의 자연스러운 경계가 되어 황금 카논의 마진 체계 없이도 단일 포스터에서 비례를 구현합니다.`,
    artistContext: (a,b) => `${a||"아티스트"} 이미지를 담은 큰 타일(3열)과 ${b||"브랜드"} 정보를 담은 좁은 타일(1열)이 거터로 명확히 분리됩니다. 두 정체성이 물리적으로 독립된 '칸' 안에 존재하여 위계 없이 공존합니다.`,
    mismatch:"두 브랜드를 동등하게 표현해야 할 때 3:1 분할은 한쪽이 압도적으로 보입니다. 텍스트가 많아 1열 타일에 담기 어려운 경우 가독성이 저하됩니다.",
    visualQ:{type:"click-zone",prompt:"벤토 그리드에서 이미지 타일이 차지해야 할 영역을 클릭하세요.",zones:[{id:"left",label:"좌 3열 타일 (75%)",correct:true,rect:{left:0,top:0,width:75,height:100}},{id:"right",label:"우 1열 타일 (25%)",correct:false,rect:{left:75,top:0,width:25,height:100}}],hint:"황금비 61.8%:38.2%를 벤토 그리드 4열에서 근사하면 3열:1열(75%:25%)입니다."},
    keywords:["벤토 그리드 4열×6행","3열:1열 타일 분할","거터 2.5% 경계","단일 포스터 최적화"],
    desc:"벤토 그리드 4열 중 3열 키비주얼 타일 + 1열 텍스트 타일. 거터가 자연스러운 경계.",
    captions:(d)=>[
      {zone:"① 벤토 그리드 기반 (4열×6행, 거터 2.5%)",role:"균등 거터 · 마진 3%",color:"rgba(196,122,58,0.22)",
       explain:`포스터를 4열×6행으로 나누고 모든 간격(거터)을 2.5%로 균등하게 유지합니다. 황금 카논의 비대칭 마진(내1:상1.5:외2:하3)과 달리 단일 포스터에 맞는 균등 마진(3%)을 사용합니다. 이것이 벤토 그리드가 단일 포스터에 더 적합한 이유입니다.`},
      {zone:"② 키비주얼 타일 (좌 3열×6행)",role:"대형 타일 — 이미지 전용",color:"rgba(74,180,120,0.35)",
       explain:`이미지가 좌측 3열 전체를 차지하는 하나의 큰 타일이 됩니다. 벤토 그리드에서 큰 타일 = 높은 중요도를 의미하며, 이미지의 시각적 우선순위가 구조 자체로 전달됩니다.`},
      {zone:"③ 텍스트 타일 (우 1열×4행)",role:"소형 타일 — 텍스트 전용",color:"rgba(74,124,200,0.35)",
       explain:`"${d.main}"이 우측 1열 타일 안에 수직으로 쌓입니다. 타일 경계가 텍스트를 이미지로부터 분리하며, 타일 내부의 패딩이 텍스트와 가장자리 사이의 여백을 보장합니다.`},
    ],
    overlays:[
      {label:"① 벤토 그리드 (4열×6행)",color:"rgba(196,122,58,0.2)",rect:{left:BM,top:BM,width:100-BM*2,height:100-BM*2}},
      {label:"② 키비주얼 타일 (좌 3열)",color:"rgba(74,180,120,0.38)",rect:{left:bx(0),top:by(0),width:bw(3),height:bh(6)}},
      {label:"③ 텍스트 타일 (우 1열)",color:"rgba(74,124,200,0.38)",rect:{left:bx(3),top:by(1),width:bw(1),height:bh(4)}},
    ],
  },
  {
    id:3, num:"03", name:"시각적 중심 벤토", full:"시각적 중심 (Visual Center · Bento Grid)",
    en:"Proportion · +7%↑ +5%→ + Bento", tag:"비례", grid:"bento", axis:{x:30,y:30},
    concept:`인간의 시선은 수학적 중심(50%,50%)보다 약 7% 위, 5% 오른쪽에 먼저 닿습니다. 벤토 그리드에서 시각적 중심은 2행~3행, 2열~3열 타일의 교차점 근방입니다. 벤토 타일이 시각적 중심을 셀 단위로 수치화합니다.`,
    artistContext:(a,b)=>`${a||"아티스트"}의 이름을 정중앙 타일에 두면 경직됩니다. 벤토 시각 중심 타일(행 2~3, 열 1~3)은 수학적 중심보다 약 1행(17%) 위에 위치하여 자연스러운 균형감을 만듭니다. ${b||"브랜드"}는 우상단 소형 타일에 배치합니다.`,
    mismatch:"의도적 공식성이 필요한 경우(학술·정부 포스터)에는 정중앙 배치가 더 권위 있어 보입니다. 소재 이미지 자체가 강한 중앙 대칭이면 시각적 중심 이동이 어색해질 수 있습니다.",
    visualQ:{type:"click-point",prompt:"벤토 그리드에서 메인 타이틀이 놓여야 할 시각적 중심 타일을 클릭하세요.",hint:"수학적 중심(50%,50%)보다 약간 위(43%)·오른쪽(55%)을 선택하세요.",correctZone:{left:35,top:26,width:30,height:22}},
    keywords:["벤토 시각 중심 타일","행 2~3 · 열 1~3","수학적 중심보다 1행 위","균등 거터로 수치화"],
    desc:"벤토 그리드에서 시각적 중심 타일(행 2~3, 열 1~3)에 타이틀 배치.",
    captions:(d)=>[
      {zone:"① 벤토 그리드 균등 마진",role:"황금 카논 vs 벤토 그리드",color:"rgba(196,122,58,0.2)",
       explain:`황금 카논은 책 인쇄를 위해 마진 비율을 비대칭(내1:상1.5:외2:하3)으로 설계했습니다. 벤토 그리드는 단일 페이지를 위해 상하좌우 균등 마진(3%)을 사용합니다. A3 포스터 한 장이라면 벤토 그리드가 더 자연스럽습니다.`},
      {zone:"② 이미지 타일 (우상단 1×2열)",role:"시각 중심 오른쪽 균형추",color:"rgba(74,180,120,0.35)",
       explain:`이미지 타일이 우상단(열 3~4, 행 0~2)에 배치됩니다. 시선 비율(우 55%, 상 40%)에 맞춰 텍스트 타일(좌측)의 균형추 역할을 합니다. 이미지와 텍스트가 서로 다른 타일에 담겨 겹침이 없습니다.`},
      {zone:"③ 시각적 중심 텍스트 타일 (행 1~3, 열 0~2)",role:"수학적 중심보다 1행 위",color:"rgba(200,100,100,0.35)",
       explain:`"${d.main}"이 행 1~3, 열 0~2 타일에 배치됩니다. 수학적 중심(행 3, 열 2)보다 약 1행(17%) 위에 위치하여 '딱 중앙'의 경직됨 없이 편안한 균형감이 생깁니다.`},
    ],
    overlays:[
      {label:"① 벤토 그리드 균등 마진",color:"rgba(196,122,58,0.2)",rect:{left:BM,top:BM,width:100-BM*2,height:100-BM*2}},
      {label:"② 이미지 타일 (우상단)",color:"rgba(74,180,120,0.38)",rect:{left:bx(2),top:by(0),width:bw(2),height:bh(2)}},
      {label:"③ 시각 중심 텍스트 타일",color:"rgba(200,100,100,0.38)",rect:{left:bx(0),top:by(1),width:bw(3),height:bh(2.5)}},
    ],
  },
  {
    id:4, num:"04", name:"대칭 균형 벤토", full:"대칭 균형 (Symmetry · Bento Grid)",
    en:"Balance · Symmetry + Bento", tag:"균형", grid:"bento", axis:{x:10,y:20},
    concept:`벤토 그리드 4열을 중앙(2열과 3열 사이)을 기준으로 좌우 대칭 배치합니다. 상단 와이드 타일(4열×2행)에 이미지, 하단 2개 타일(2열×3행)에 텍스트 요소를 대칭으로 배치합니다. 타일 경계가 대칭의 구조적 근거가 됩니다.`,
    artistContext:(a,b)=>`대칭 구성은 고전·공식·권위의 인상을 줍니다. ${a||"아티스트"}의 작품이 기하학적 질서를 강조한다면 벤토 대칭이 그 특성을 강화합니다. 단, ${b||"브랜드"}가 역동적 이미지라면 대칭이 브랜드 아이덴티티와 충돌할 수 있습니다.`,
    mismatch:"역동적이고 혁신적인 브랜드, 실험적 아티스트의 포스터에서 완전 대칭은 지나치게 보수적으로 보입니다. 소재 이미지 자체가 비대칭이면 대칭 타일과 충돌합니다.",
    visualQ:{type:"multi-choice",prompt:"대칭 균형 벤토 레이아웃이 가장 잘 어울리는 포스터 유형을 고르세요.",choices:[{id:"a",text:"빠른 리듬과 에너지를 강조하는 EDM 페스티벌",correct:false},{id:"b",text:"전통과 권위를 표현하는 오케스트라 공연",correct:true},{id:"c",text:"파격적인 컨셉의 아방가르드 전시",correct:false},{id:"d",text:"스트리트 패션 브랜드의 신제품 런칭",correct:false}],hint:"대칭은 '완전함', '공식성', '안정감'의 시각적 언어입니다."},
    keywords:["벤토 4열 대칭","상단 풀와이드 타일 + 하단 2타일","중앙 거터 대칭축","타일 구조가 대칭 보장"],
    desc:"벤토 그리드 상단 풀와이드 타일(이미지) + 하단 대칭 2타일(텍스트). 거터가 대칭축.",
    captions:(d)=>[
      {zone:"① 상단 풀와이드 타일 (4열×2행)",role:"대칭 구성의 상단 앵커",color:"rgba(74,180,120,0.35)",
       explain:`이미지가 4열 전체를 차지하는 와이드 타일(행 0~1)에 배치됩니다. 포스터 너비 전체를 채우는 타일이 자동으로 대칭의 시각적 기준이 됩니다. 타일 경계(행 1과 2 사이 거터)가 이미지와 텍스트의 수직 분리를 보장합니다.`},
      {zone:"② 하단 좌 타일 (2열×3행)",role:"대칭 텍스트 좌측",color:"rgba(74,124,200,0.38)",
       explain:`"${d.main}"과 서브텍스트가 하단 좌측 타일(열 0~1, 행 2~4)에 중앙 정렬됩니다. 2열 타일 너비가 텍스트 줄 길이를 자연스럽게 제한합니다.`},
      {zone:"③ 하단 우 타일 (2열×3행)",role:"대칭 정보 우측",color:"rgba(196,122,58,0.3)",
       explain:`아티스트×브랜드 정보가 하단 우측 타일(열 2~3, 행 2~4)에 배치됩니다. 좌측 타일과 동일한 크기(2열×3행)로 완전한 좌우 대칭을 이룹니다. 중앙 거터(2.5%)가 대칭의 시각적 경계가 됩니다.`},
    ],
    overlays:[
      {label:"① 상단 풀와이드 타일 (4열×2행)",color:"rgba(74,180,120,0.38)",rect:{left:bx(0),top:by(0),width:bw(4),height:bh(2)}},
      {label:"② 하단 좌 타일 (2열×3행)",color:"rgba(74,124,200,0.38)",rect:{left:bx(0),top:by(2.2),width:bw(2),height:bh(3)}},
      {label:"③ 하단 우 타일 (2열×3행)",color:"rgba(196,122,58,0.3)",rect:{left:bx(2),top:by(2.2),width:bw(2),height:bh(3)}},
    ],
  },
  {
    id:8, num:"08", name:"화이트 스페이스 벤토", full:"화이트 스페이스 (White Space · Bento Grid)",
    en:"White Space · 여백의 힘 + Bento", tag:"여백", grid:"bento", axis:{x:15,y:15},
    concept:`벤토 그리드에서 '비어있는 타일'이 곧 설계된 여백입니다. 전체 24타일(4열×6행) 중 콘텐츠 타일 4개(17%)만 사용하고, 나머지 20타일(83%)을 빈 타일로 남깁니다. 벤토 여백은 황금 카논의 마진 여백과 달리 경계가 타일 단위로 명확합니다.`,
    artistContext:(a,b)=>`여백은 자신감의 시각적 표현입니다. ${a||"아티스트"}의 작품이 개념적이고 정제되어 있다면, 벤토의 넓은 빈 타일이 작품의 권위를 높입니다. ${b||"브랜드"}가 럭셔리 이미지라면 전체 타일의 83%를 비워두는 것이 가장 강한 메시지가 됩니다.`,
    mismatch:"정보가 많아야 하는 이벤트 일정표, 페스티벌 라인업, 할인 행사 포스터에서는 빈 타일이 많은 구성이 정보 부족으로 읽힐 수 있습니다.",
    visualQ:{type:"order",prompt:"벤토 그리드에서 여백 크기를 작은 것부터 큰 순서로 배열하세요.",items:[{id:"gutter",label:"거터 (타일 사이 간격 2.5%)"},{id:"margin",label:"마진 (포스터 가장자리 3%)"},{id:"empty",label:"비어있는 콘텐츠 타일들"}],correctOrder:["gutter","margin","empty"],hint:"거터(2.5%) < 마진(3%) < 의도적으로 비워둔 타일(전체 83%) 순서입니다."},
    keywords:["24타일 중 4타일만 사용","빈 타일 = 설계된 여백","밀도 포인트 집중","모듈화된 화이트 스페이스"],
    desc:"벤토 그리드 24타일 중 4타일에만 콘텐츠. 빈 타일이 설계된 여백.",
    captions:(d)=>[
      {zone:"① 빈 타일 20개 (전체의 83%)",role:"설계된 여백 — 타일 단위로 정의",color:"rgba(92,158,122,0.18)",
       explain:`전체 4×6=24타일 중 20개(83%)가 비어있습니다. 황금 카논이 마진 비율로 여백을 정의하는 것과 달리, 벤토 그리드는 '몇 개의 타일을 비울 것인가'로 여백을 수치화합니다. 빈 타일의 경계가 명확해 여백의 의도가 분명합니다.`},
      {zone:"② 이미지 타일 (우상단 소형 1×2행)",role:"여백 속 절제된 악센트",color:"rgba(74,180,120,0.38)",
       explain:`이미지가 우상단 소형 타일(열 3, 행 0~1)에만 배치됩니다. 1열×2행 = 2타일만 사용하여 전체 24타일 대비 8.3%에 불과합니다. 넓은 빈 타일 속 작은 이미지 타일이 오히려 강한 존재감을 가집니다.`},
      {zone:"③ 텍스트 타일 (하단 2×2행)",role:"여백 대비 밀도 포인트",color:"rgba(74,124,200,0.32)",
       explain:`"${d.main}"이 하단 타일(열 0~1, 행 4~5)에만 집중됩니다. 2열×2행 = 4타일을 사용하며, 좌하단의 이 '밀도 포인트'가 넓은 빈 타일과 대비되어 VW 'Think Small'처럼 존재감을 극대화합니다.`},
    ],
    overlays:[
      {label:"① 빈 타일 20개 (83% 여백)",color:"rgba(92,158,122,0.15)",rect:{left:BM,top:BM,width:100-BM*2,height:100-BM*2}},
      {label:"② 이미지 타일 (우상단 소형)",color:"rgba(74,180,120,0.38)",rect:{left:bx(3),top:by(0),width:bw(1),height:bh(2)}},
      {label:"③ 텍스트 타일 (하단 집중)",color:"rgba(74,124,200,0.32)",rect:{left:bx(0),top:by(4),width:bw(2),height:bh(2)}},
    ],
  },

  // ══ 게르스트너 58유닛 그룹 (기존 5종 유지) ═════════════════════
  {
    id:2, num:"02", name:"3분법", full:"3분법 (Rule of Thirds)", en:"Proportion · Visual Center",
    tag:"비례", grid:"gerstner", axis:{x:50,y:55},
    concept:"화면을 3×3으로 나누어 4개의 교차점에 핵심 요소를 배치합니다. 58유닛에서 열당 19.3u로 수치가 명확합니다.",
    artistContext:(a,b)=>`${a||"아티스트"}의 작품이 특정 방향성을 가진 구도라면 3분법 교차점에 그 에너지의 중심을 맞추는 것이 자연스럽습니다. ${b||"브랜드"}의 로고는 나머지 교차점에 배치합니다.`,
    mismatch:"완전한 중앙 집중이 필요한 구성에서 3분법이 오히려 불편한 비틀림을 만들 수 있습니다.",
    visualQ:{type:"click-point",prompt:"3×3 격자에서 메인 타이틀을 놓을 가장 효과적인 교차점을 클릭하세요.",hint:"서양 독자의 시선은 좌상에서 시작합니다. 4개의 교차점 중 시선이 가장 먼저 닿는 곳은?",correctZone:{left:28,top:28,width:12,height:12}},
    keywords:["3×3 격자","교차점 4개","58u 열당 19.3u","시선이 머무는 지점"],
    desc:"58유닛 3×3(각 19.3u). 키비주얼(좌상 셀)과 텍스트(교차점) 별도 셀 배치.",
    captions:(d)=>[
      {zone:"① 3분할 격자 (각 19.3u)",role:"58유닛 수치화된 3분법",color:"rgba(74,124,158,0.2)",explain:`58유닛을 3등분하면 19.3u(33.3%). 4개 교차점: (19u,19u),(39u,19u),(19u,39u),(39u,39u).`},
      {zone:"② 키비주얼 모듈 (좌상 셀)",role:"이미지 전용 셀 점유",color:"rgba(74,180,120,0.35)",explain:`이미지가 좌상단 셀(3u~18u)을 완전히 점유합니다. 메인타이틀 교차점(19u,19u)과 셀이 달라 겹침이 차단됩니다.`},
      {zone:"③ 메인타이틀 (좌상 교차점)",role:"시선이 머무는 첫 앵커",color:"rgba(200,100,100,0.35)",explain:`"${d.main}"이 좌상 교차점(19u) 우측에 배치됩니다.`},
      {zone:"④ 서브텍스트 (우하 교차점)",role:"시선 여정의 종착점",color:"rgba(180,140,60,0.35)",explain:`서브텍스트가 우하 교차점 근방에 우측 정렬됩니다.`},
    ],
    overlays:[
      {label:"① 3분할 격자",color:"rgba(74,124,158,0.18)",rect:{left:0,top:0,width:UP(19),height:UP(19)}},
      {label:"② 키비주얼 모듈 (좌상 셀)",color:"rgba(74,180,120,0.38)",rect:{left:UP(3),top:UP(3),width:UP(15),height:UP(25)}},
      {label:"③ 메인타이틀 (좌상 교차점)",color:"rgba(200,100,100,0.38)",rect:{left:UP(20),top:UP(17),width:UP(33),height:UP(10)}},
      {label:"④ 서브텍스트 (우하 교차점)",color:"rgba(180,140,60,0.38)",rect:{left:UP(36),top:UP(38),width:UP(19),height:UP(12)}},
    ],
  },
  {
    id:5, num:"05", name:"비대칭 균형", full:"비대칭 균형 (Asymmetry)", en:"Balance · Dynamic",
    tag:"균형", grid:"gerstner", axis:{x:70,y:60},
    concept:"58유닛을 34u+24u로 분할하면 피보나치 수열(34/55≈0.618)에 근사한 황금비가 됩니다.",
    artistContext:(a,b)=>`${a||"아티스트"}의 역동적 에너지와 ${b||"브랜드"}의 긴장감 있는 공존에 효과적입니다.`,
    mismatch:"두 주체를 동등하게 표현할 때 34:24 분할은 한쪽이 종속적으로 보일 수 있습니다.",
    visualQ:{type:"multi-choice",prompt:"58유닛을 34u+24u로 분할할 때 이 비율이 근사하는 것은?",choices:[{id:"a",text:"파이(π) ≈ 3.14",correct:false},{id:"b",text:"황금비(φ) ≈ 0.618",correct:true},{id:"c",text:"루트2(√2) ≈ 1.414",correct:false},{id:"d",text:"오일러 수(e) ≈ 2.718",correct:false}],hint:"피보나치 수열 34와 55의 관계: 34/55 = ?"},
    keywords:["34u+24u 비대칭","피보나치 34/55≈0.618","시각적 무게","동적 균형"],
    desc:"58유닛 34u+24u 비대칭 분할. 이미지(좌 34u)와 텍스트(우 24u) 2u 거터 분리.",
    captions:(d)=>[
      {zone:"① 키비주얼 존 (좌 34u=58.6%)",role:"피보나치 근사 대 영역",color:"rgba(74,180,120,0.35)",explain:`이미지가 3u~33u 구간에 배치됩니다. 34/58≈0.586으로 황금비에 근사합니다.`},
      {zone:"② 텍스트 존 (우 24u, 2u 거터)",role:"독립된 타이포 영역",color:"rgba(74,124,200,0.35)",explain:`"${d.main}"이 36u~56u 구간에만 배치됩니다.`},
      {zone:"③ 58u 분할선 (34u 지점)",role:"비대칭 경계",color:"rgba(255,200,80,0.25)",explain:`34u 분할선이 두 영역의 경계입니다.`},
    ],
    overlays:[
      {label:"① 키비주얼 존 (좌 34u)",color:"rgba(74,180,120,0.38)",rect:{left:UP(3),top:UP(4),width:UP(30),height:UP(50)}},
      {label:"② 텍스트 존 (우 24u)",color:"rgba(74,124,200,0.38)",rect:{left:UP(36),top:UP(4),width:UP(19),height:UP(50)}},
      {label:"③ 58u 분할선",color:"rgba(255,200,80,0.22)",rect:{left:UP(34)-0.5,top:0,width:1,height:100}},
    ],
  },
  {
    id:6, num:"06", name:"Z패턴", full:"Z패턴 시선 흐름", en:"Narrative · Z-Pattern",
    tag:"시선흐름", grid:"gerstner", axis:{x:80,y:75},
    concept:"독자의 시선은 좌상→우상→좌하→우하 순서로 Z자를 그립니다. 58유닛으로 3구간을 수치화합니다.",
    artistContext:(a,b)=>`①${b||"브랜드"}×${a||"아티스트"} 소개 → ②이미지 세계관 → ③핵심 메시지 순서로 내러티브를 구성합니다.`,
    mismatch:"텍스트가 거의 없는 포스터에서 Z패턴은 시선 유도 요소가 없어 원칙이 작동하지 않습니다.",
    visualQ:{type:"order",prompt:"Z패턴에서 시선이 이동하는 순서대로 배열하세요.",items:[{id:"br",label:"④ 우하 — 서브텍스트"},{id:"tl",label:"① 좌상 — 브랜드 정보"},{id:"bl",label:"③ 좌하 — 메인타이틀"},{id:"tr",label:"② 우상 — 연도/날짜"}],correctOrder:["tl","tr","bl","br"],hint:"Z자: 왼쪽 위 → 오른쪽 위 → 왼쪽 아래 → 오른쪽 아래."},
    keywords:["좌상→우상→좌하→우하","위획(0~14u)","대각 이미지(14~36u)","아래획(36~58u)"],
    desc:"58유닛 Z구조. 구간별 요소 수직 분리.",
    captions:(d)=>[
      {zone:"① Z 위획 (0~14u)",role:"브랜드 정보 첫 스캔",color:"rgba(158,92,92,0.28)",explain:`첫 스캔 구간(0~14u)에 "${d.extra}"(좌)와 연도(우) 배치.`},
      {zone:"② 이미지 모듈 (대각선 14~36u)",role:"Z 대각선 시선 전환",color:"rgba(74,180,120,0.35)",explain:`이미지가 14u~36u 우측에 배치되어 대각선 시선을 유도합니다.`},
      {zone:"③ Z 아래획 — 메인타이틀 (36u~)",role:"시선 정착 — 핵심 메시지",color:"rgba(74,124,200,0.35)",explain:`"${d.main}"이 36u 아래 좌측에 배치됩니다.`},
      {zone:"④ 서브텍스트 (우하 마감)",role:"Z 내러티브의 종착점",color:"rgba(180,140,60,0.35)",explain:`서브텍스트가 우하단에서 시선 여정을 완결합니다.`},
    ],
    overlays:[
      {label:"① Z 위획 (0~14u)",color:"rgba(158,92,92,0.28)",rect:{left:0,top:0,width:100,height:UP(14)}},
      {label:"② 이미지 모듈 (대각 14~36u)",color:"rgba(74,180,120,0.38)",rect:{left:UP(22),top:UP(15),width:UP(33),height:UP(20)}},
      {label:"③ Z 아래획 메인타이틀",color:"rgba(74,124,200,0.38)",rect:{left:UP(3),top:UP(37),width:UP(38),height:UP(14)}},
      {label:"④ 서브텍스트 (우하)",color:"rgba(180,140,60,0.38)",rect:{left:UP(30),top:UP(46),width:UP(25),height:UP(10)}},
    ],
  },
  {
    id:7, num:"07", name:"F패턴", full:"F패턴 시선 흐름", en:"Narrative · F-Pattern",
    tag:"시선흐름", grid:"gerstner", axis:{x:65,y:70},
    concept:"독자의 시선은 위에서 아래로 갈수록 스캔 거리가 짧아집니다. 정보 중요도를 너비(52u→35u→20u)로 시각화합니다.",
    artistContext:(a,b)=>`이미지(상단) → "${b||"브랜드"} 메시지"(1차) → 설명(2차) → ${a||"아티스트"} 정보(3차) 순서로 위계를 구성합니다.`,
    mismatch:"텍스트가 거의 없거나 좌우 대칭이 필요한 포스터에서 F패턴의 왼쪽 수축 구조가 어색할 수 있습니다.",
    visualQ:{type:"order",prompt:"F패턴 스캔 폭을 넓은 것부터 좁은 순서로 배열하세요.",items:[{id:"c",label:"F 세로기둥: 정보 (20u)"},{id:"a",label:"F 위획: 타이틀 (52u)"},{id:"b",label:"F 중간획: 서브텍스트 (35u)"}],correctOrder:["a","b","c"],hint:"52u → 35u → 20u 순서로 점점 짧아집니다."},
    keywords:["F패턴 위→아래","1차 스캔 52u","2차 스캔 35u","3차 스캔 20u"],
    desc:"이미지(3~19u) 선점. 타이틀(21u~)·서브(30u~)·정보(40u~) 순차 배치.",
    captions:(d)=>[
      {zone:"① 키비주얼 모듈 (3~19u)",role:"F 위획의 시각적 앵커",color:"rgba(74,180,120,0.35)",explain:`이미지가 상단(3u~19u) 52u 너비를 차지합니다.`},
      {zone:"② 타이틀 (21~29u, 52u)",role:"F 1차 스캔 최우선 정보",color:"rgba(158,92,92,0.3)",explain:`"${d.main}"이 21u에서 시작, 52u 전체를 사용합니다.`},
      {zone:"③ 서브텍스트 (30~38u, 35u)",role:"F 2차 스캔 보조 정보",color:"rgba(180,140,60,0.3)",explain:`서브텍스트가 35u(60%)까지만 뻗습니다.`},
      {zone:"④ 정보 (40~48u, 20u)",role:"F 세로 기둥 최소 정보",color:"rgba(74,124,200,0.3)",explain:`"${d.extra}"가 20u(34%)까지만 뻗습니다. 3단 계층(52u→35u→20u)이 중요도를 공간으로 표현합니다.`},
    ],
    overlays:[
      {label:"① 키비주얼 모듈 (3~19u)",color:"rgba(74,180,120,0.38)",rect:{left:UP(3),top:UP(3),width:UP(52),height:UP(16)}},
      {label:"② 타이틀 F위획 (21~29u)",color:"rgba(158,92,92,0.32)",rect:{left:UP(3),top:UP(21),width:UP(52),height:UP(8)}},
      {label:"③ 서브 F중간획 (30~38u)",color:"rgba(180,140,60,0.32)",rect:{left:UP(3),top:UP(30),width:UP(35),height:UP(8)}},
      {label:"④ 정보 F기둥 (40~48u)",color:"rgba(74,124,200,0.32)",rect:{left:UP(3),top:UP(40),width:UP(20),height:UP(8)}},
    ],
  },
  {
    id:9, num:"09", name:"병치", full:"병치 (Juxtaposition)", en:"Juxtaposition · 대비·반복·강조",
    tag:"병치", grid:"gerstner", axis:{x:85,y:50},
    concept:"58유닛 29u+29u 정확한 이분할로 두 세계의 충돌을 구현합니다.",
    artistContext:(a,b)=>`좌측 ${a||"아티스트"} 이미지와 우측 ${b||"브랜드"} 텍스트가 정확히 동일한 면적(29u)에서 충돌합니다. 이 동등한 긴장감이 두 정체성의 대등한 만남을 시각화합니다.`,
    mismatch:"두 요소 중 하나가 압도적으로 강하거나 통일된 분위기가 필요한 경우, 병치의 충돌이 불협화음처럼 느껴질 수 있습니다.",
    visualQ:{type:"click-zone",prompt:"병치 레이아웃에서 텍스트 존이 차지해야 할 영역을 클릭하세요.",zones:[{id:"left",label:"좌 50%",correct:false,rect:{left:0,top:0,width:50,height:100}},{id:"right",label:"우 50%",correct:true,rect:{left:50,top:0,width:50,height:100}}],hint:"병치는 29u+29u 정확한 이분할입니다. 이미지가 좌측이면 텍스트는?"},
    keywords:["29u+29u 이분할","이미지 vs 텍스트","대비·반복·강조","충돌면"],
    desc:"58유닛 29u+29u 정확한 이분할. 이미지(좌)와 텍스트(우) 2u 거터 분리.",
    captions:(d)=>[
      {zone:"① 키비주얼 모듈 (좌 29u)",role:"병치 A면 — 이미지 오브제",color:"rgba(74,180,120,0.35)",explain:`이미지가 좌측 29u(3u~29u)를 전체 높이로 점유합니다.`},
      {zone:"② 텍스트 존 (우 29u, 2u 거터)",role:"병치 B면 — 타이포 오브제",color:"rgba(74,124,200,0.35)",explain:`"${d.main}"이 31u~55u 구간에만 배치됩니다.`},
      {zone:"③ 29u 분할선 — 병치의 충돌면",role:"두 세계의 경계",color:"rgba(158,122,92,0.4)",explain:`정중앙(29u=50%)의 수직선이 "${d.artist||"아티스트"}"와 "${d.brand||"브랜드"}" 두 세계의 경계입니다.`},
    ],
    overlays:[
      {label:"① 키비주얼 모듈 (좌 29u)",color:"rgba(74,180,120,0.38)",rect:{left:UP(3),top:UP(3),width:UP(26),height:UP(52)}},
      {label:"② 텍스트 존 (우 29u)",color:"rgba(74,124,200,0.38)",rect:{left:UP(31),top:UP(3),width:UP(24),height:UP(52)}},
      {label:"③ 29u 분할선",color:"rgba(158,122,92,0.45)",rect:{left:49.5,top:0,width:1,height:100}},
    ],
  },
];

// ─── 포스터 렌더러 ─────────────────────────────────────────────────
// 벤토 그리드 이미지 블록 (배경 없이 절대위치)
function BImg({ col, row, colSpan=1, rowSpan=1, kv }) {
  const style = {
    position:"absolute",
    left:`${bx(col)}%`, top:`${by(row)}%`,
    width:`${bw(colSpan)}%`, height:`${bh(rowSpan)}%`,
    overflow:"hidden",
  };
  return kv
    ? <div style={style}><img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/></div>
    : <div style={{ ...style, background:"rgba(255,255,255,0.08)" }}>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:"6px", color:"rgba(255,255,255,0.25)", letterSpacing:"1px" }}>IMAGE</span>
        </div>
      </div>;
}

// 벤토 그리드 가이드 라인 (showGuides 전용)
function BentoGuide() {
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:5 }}>
      {Array.from({length:BCOLS},(_,c)=>Array.from({length:BROWS},(_,r)=>(
        <div key={`${c}-${r}`} style={{
          position:"absolute",
          left:`${bx(c)}%`, top:`${by(r)}%`,
          width:`${bw(1)}%`, height:`${bh(1)}%`,
          border:"1px dashed rgba(196,122,58,0.22)",
        }}/>
      )))}
    </div>
  );
}

function Poster({ p, kv, bgColor, bgImage, mainText, subText, extra, fontFamily,
  mainSize=18, mainWeight="700", mainColor="#ffffff",
  subSize=8, subWeight="400", subColor="#cccccc",
  showGuides=false, variant=0 }) {

  const mT = mainText||"MAIN TITLE";
  const sT = subText||"Subtitle";
  const eT = extra||"ARTIST × BRAND";
  const [a1, a2] = eT.split(" × ");

  // 공통 텍스트 스타일 — 배경 없이 직접 렌더
  const T = {
    main:  { fontSize:`${mainSize}px`,  fontWeight:mainWeight, color:mainColor,  lineHeight:1.05, letterSpacing:"-0.3px", fontFamily },
    sub:   { fontSize:`${subSize}px`,   fontWeight:subWeight,  color:subColor,   lineHeight:1.75, fontFamily },
    label: { fontSize:"6px", letterSpacing:"2.5px", textTransform:"uppercase", color:"rgba(255,255,255,0.5)", fontFamily },
    rule:  { width:"20px", height:"1px", background:"rgba(255,255,255,0.25)", display:"block" },
    credit:{ fontSize:"5px", color:"rgba(255,255,255,0.18)", letterSpacing:"1.5px", fontFamily },
  };
  // 화이트 스페이스(08)는 라이트 배경
  const isLight = p.id===8 && !bgImage;
  if (isLight) {
    T.main.color = mainColor==="#ffffff" ? "#111" : mainColor;
    T.sub.color  = subColor==="#cccccc"  ? "#555" : subColor;
    T.label.color = "rgba(0,0,0,0.35)";
    T.rule.background = "rgba(0,0,0,0.2)";
    T.credit.color = "rgba(0,0,0,0.2)";
  }

  let bgSt = { background: bgColor||"#0d1117" };
  if (bgImage) bgSt = { backgroundImage:`url(${bgImage})`, backgroundSize:"cover", backgroundPosition:"center" };
  if (isLight) bgSt = { background: bgColor||"#f4f1ec" };

  const base = { width:"100%", height:"100%", position:"relative", overflow:"hidden", ...bgSt };

  // ── 변형(variant) 정의 ─────────────────────────────────────────
  // variant 0 = 기본, 1 = 이미지 위계↑, 2 = 텍스트 위계↑
  // 벤토 원칙(1,3,4,8)과 58유닛 원칙(2,5,6,7,9) 각각 다른 변형 설계

  const renders = {

    // ─ 01 황금비 ─────────────────────────────────────────────────
    // v0: 이미지 좌(75%) 텍스트 우(25%)  v1: 이미지 우(75%) 텍스트 좌  v2: 이미지 상(대형) 텍스트 하(소형)
    1: (() => {
      const v = variant % 3;
      if (v === 0) return (
        <div style={base}>
          {showGuides && <BentoGuide/>}
          <BImg col={0} row={0} colSpan={3} rowSpan={6} kv={kv}/>
          <div style={{ position:"absolute", left:`${bx(3)}%`, top:`${by(1)}%`, width:`${bw(1)}%`, bottom:`${100-by(5)}%`, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
            <span style={T.label}>{a1||"ARTIST"}</span>
            <div>
              <div style={T.main}>{mT}</div>
              <span style={{ ...T.rule, margin:"6px 0" }}/>
              <div style={T.sub}>{sT.slice(0,36)}</div>
            </div>
            <span style={T.label}>×{a2||"BRAND"}</span>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:`${bx(0)}%`, ...T.credit }}>벤토 그리드 · φ 1.618 · 이미지 주도형</div>
        </div>
      );
      if (v === 1) return (
        <div style={base}>
          {showGuides && <BentoGuide/>}
          <BImg col={1} row={0} colSpan={3} rowSpan={6} kv={kv}/>
          <div style={{ position:"absolute", left:`${bx(0)}%`, top:`${by(1)}%`, width:`${bw(1)}%`, bottom:`${100-by(5)}%`, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
            <span style={T.label}>{a1||"ARTIST"}</span>
            <div>
              <div style={T.main}>{mT}</div>
              <span style={{ ...T.rule, margin:"6px 0" }}/>
              <div style={T.sub}>{sT.slice(0,36)}</div>
            </div>
            <span style={T.label}>×{a2||"BRAND"}</span>
          </div>
          <div style={{ position:"absolute", bottom:"2%", right:`${100-bx(4)}%`, ...T.credit }}>벤토 그리드 · φ 1.618 · 텍스트 좌측형</div>
        </div>
      );
      // v2: 상단 대형 이미지, 하단 텍스트 전면
      return (
        <div style={base}>
          {showGuides && <BentoGuide/>}
          <BImg col={0} row={0} colSpan={4} rowSpan={4} kv={kv}/>
          <div style={{ position:"absolute", left:`${bx(0)}%`, top:`${by(4.15)}%`, right:`${100-bx(4)}%`, bottom:"3%" }}>
            <span style={{ ...T.label, marginBottom:"5px", display:"block" }}>{eT}</span>
            <div style={T.main}>{mT}</div>
            <span style={{ ...T.rule, margin:"6px 0" }}/>
            <div style={T.sub}>{sT}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", right:`${100-bx(4)}%`, ...T.credit }}>벤토 그리드 · φ 1.618 · 텍스트 주도형</div>
        </div>
      );
    })(),

    // ─ 02 3분법 ──────────────────────────────────────────────────
    // v0: 이미지 좌상  v1: 이미지 우상  v2: 이미지 중앙+텍스트 교차점
    2: (() => {
      const v = variant % 3;
      const dots = [[UP(19),UP(19)],[UP(39),UP(19)],[UP(19),UP(39)],[UP(39),UP(39)]];
      const Dots = () => showGuides ? dots.map(([l,t],i)=>(
        <div key={i} style={{ position:"absolute", left:`${l}%`, top:`${t}%`, width:"5px", height:"5px", borderRadius:"50%", background:"rgba(74,124,158,0.5)", transform:"translate(-50%,-50%)", zIndex:6 }}/>
      )) : null;
      const GLines = () => showGuides ? (
        <>
          {[U(19),U(39)].map((p,i)=><div key={`c${i}`} style={{ position:"absolute", top:0, bottom:0, left:p, width:"1px", background:"rgba(74,124,158,0.2)", zIndex:5 }}/>)}
          {[U(19),U(39)].map((p,i)=><div key={`r${i}`} style={{ position:"absolute", left:0, right:0, top:p, height:"1px", background:"rgba(74,124,158,0.2)", zIndex:5 }}/>)}
        </>
      ) : null;
      if (v === 0) return (
        <div style={base}>
          <GLines/><Dots/>
          <div style={{ position:"absolute", top:U(3), left:U(3), width:U(16), height:U(28), overflow:"hidden" }}>
            {kv ? <img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", top:U(20), left:U(21), right:U(3) }}>
            <span style={{ ...T.label, marginBottom:"6px", display:"block" }}>{eT}</span>
            <div style={T.main}>{mT}</div>
          </div>
          <div style={{ position:"absolute", top:U(41), right:U(3), width:U(20), textAlign:"right" }}>
            <div style={T.sub}>{sT}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:U(3), ...T.credit }}>58유닛 · 3분법 · 이미지 좌상</div>
        </div>
      );
      if (v === 1) return (
        <div style={base}>
          <GLines/><Dots/>
          <div style={{ position:"absolute", top:U(3), right:U(3), width:U(16), height:U(28), overflow:"hidden" }}>
            {kv ? <img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", top:U(20), left:U(3), width:U(33) }}>
            <span style={{ ...T.label, marginBottom:"6px", display:"block" }}>{eT}</span>
            <div style={T.main}>{mT}</div>
          </div>
          <div style={{ position:"absolute", top:U(41), left:U(3), width:U(20) }}>
            <div style={T.sub}>{sT}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:U(3), ...T.credit }}>58유닛 · 3분법 · 이미지 우상</div>
        </div>
      );
      return (
        <div style={base}>
          <GLines/><Dots/>
          <div style={{ position:"absolute", top:U(10), left:U(10), width:U(38), height:U(32), overflow:"hidden" }}>
            {kv ? <img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", top:U(44), left:U(3) }}>
            <span style={{ ...T.label, marginBottom:"6px", display:"block" }}>{eT}</span>
            <div style={T.main}>{mT}</div>
          </div>
          <div style={{ position:"absolute", top:U(44), right:U(3), width:U(18), textAlign:"right" }}>
            <div style={T.sub}>{sT}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:U(3), ...T.credit }}>58유닛 · 3분법 · 중앙 이미지</div>
        </div>
      );
    })(),

    // ─ 03 시각적 중심 ────────────────────────────────────────────
    // v0: 이미지 우상+텍스트 시각중심  v1: 이미지 좌하+텍스트 상단  v2: 텍스트 전면 주도
    3: (() => {
      const v = variant % 3;
      if (v === 0) return (
        <div style={base}>
          {showGuides && <>
            <BentoGuide/>
            <div style={{ position:"absolute", left:"50%", top:"50%", width:"6px", height:"6px", borderRadius:"50%", background:"rgba(200,80,80,0.5)", transform:"translate(-50%,-50%)", zIndex:8 }}/>
          </>}
          <BImg col={2} row={0} colSpan={2} rowSpan={2} kv={kv}/>
          <div style={{ position:"absolute", left:`${bx(0)}%`, top:`${by(1.8)}%`, width:`${bw(3)}%` }}>
            <span style={{ ...T.label, marginBottom:"10px", display:"block" }}>{eT}</span>
            <span style={T.rule}/>
            <div style={{ ...T.main, margin:"8px 0" }}>{mT}</div>
            <span style={T.rule}/>
            <div style={{ ...T.sub, marginTop:"8px" }}>{sT.slice(0,55)}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:`${bx(0)}%`, ...T.credit }}>벤토 그리드 · 시각적 중심</div>
        </div>
      );
      if (v === 1) return (
        <div style={base}>
          {showGuides && <BentoGuide/>}
          <BImg col={0} row={3} colSpan={2} rowSpan={3} kv={kv}/>
          <div style={{ position:"absolute", left:`${bx(0)}%`, top:`${by(0.5)}%`, width:`${bw(4)}%` }}>
            <span style={{ ...T.label, marginBottom:"10px", display:"block" }}>{eT}</span>
            <div style={T.main}>{mT}</div>
            <span style={{ ...T.rule, margin:"8px 0" }}/>
          </div>
          <div style={{ position:"absolute", left:`${bx(2)}%`, top:`${by(3)}%`, width:`${bw(2)}%` }}>
            <div style={T.sub}>{sT.slice(0,60)}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", right:`${100-bx(4)}%`, ...T.credit }}>벤토 그리드 · 시각적 중심 · 이미지 하단</div>
        </div>
      );
      return (
        <div style={base}>
          {showGuides && <BentoGuide/>}
          <BImg col={3} row={2} colSpan={1} rowSpan={2} kv={kv}/>
          <div style={{ position:"absolute", left:`${bx(0)}%`, top:`${by(1.5)}%`, width:`${bw(3.5)}%` }}>
            <span style={{ ...T.label, marginBottom:"12px", display:"block" }}>{eT}</span>
            <div style={{ ...T.main, fontSize:`${Math.min(mainSize*1.2,28)}px` }}>{mT}</div>
            <span style={{ ...T.rule, margin:"10px 0" }}/>
            <div style={T.sub}>{sT}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:`${bx(0)}%`, ...T.credit }}>벤토 그리드 · 시각적 중심 · 텍스트 주도</div>
        </div>
      );
    })(),

    // ─ 04 대칭 균형 ──────────────────────────────────────────────
    // v0: 상단 이미지 풀와이드+하단 텍스트  v1: 하단 이미지+상단 텍스트  v2: 중앙 이미지+텍스트 양측
    4: (() => {
      const v = variant % 3;
      if (v === 0) return (
        <div style={base}>
          {showGuides && <BentoGuide/>}
          <BImg col={0} row={0} colSpan={4} rowSpan={3} kv={kv}/>
          <div style={{ position:"absolute", left:`${bx(0.5)}%`, top:`${by(3.2)}%`, right:`${100-bx(3.5)}%`, bottom:"4%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"7px", textAlign:"center" }}>
            <span style={T.label}>{eT}</span>
            <span style={T.rule}/>
            <div style={T.main}>{mT}</div>
            <span style={T.rule}/>
            <div style={T.sub}>{sT.slice(0,45)}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:"50%", transform:"translateX(-50%)", ...T.credit, whiteSpace:"nowrap" }}>벤토 그리드 · 대칭 균형 · 상단 이미지</div>
        </div>
      );
      if (v === 1) return (
        <div style={base}>
          {showGuides && <BentoGuide/>}
          <BImg col={0} row={3} colSpan={4} rowSpan={3} kv={kv}/>
          <div style={{ position:"absolute", left:`${bx(0.5)}%`, top:`${by(0.3)}%`, right:`${100-bx(3.5)}%`, height:`${by(3)}%`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"7px", textAlign:"center" }}>
            <span style={T.label}>{eT}</span>
            <span style={T.rule}/>
            <div style={T.main}>{mT}</div>
            <span style={T.rule}/>
            <div style={T.sub}>{sT.slice(0,45)}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:"50%", transform:"translateX(-50%)", ...T.credit, whiteSpace:"nowrap" }}>벤토 그리드 · 대칭 균형 · 하단 이미지</div>
        </div>
      );
      return (
        <div style={base}>
          {showGuides && <BentoGuide/>}
          <BImg col={1} row={1} colSpan={2} rowSpan={4} kv={kv}/>
          <div style={{ position:"absolute", left:`${bx(0)}%`, top:`${by(1)}%`, width:`${bw(1)}%`, height:`${bh(4)}%`, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", textAlign:"center", gap:"6px" }}>
            <span style={{ ...T.label, writingMode:"vertical-rl" }}>{a1||"ARTIST"}</span>
          </div>
          <div style={{ position:"absolute", left:`${bx(3)}%`, top:`${by(1)}%`, width:`${bw(1)}%`, height:`${bh(4)}%`, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", textAlign:"center", gap:"6px" }}>
            <span style={{ ...T.label, writingMode:"vertical-rl" }}>{a2||"BRAND"}</span>
          </div>
          <div style={{ position:"absolute", left:`${bx(0)}%`, bottom:"3%", right:`${100-bx(4)}%`, textAlign:"center" }}>
            <div style={{ ...T.main, fontSize:`${Math.min(mainSize,14)}px` }}>{mT}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:"50%", transform:"translateX(-50%)", ...T.credit, whiteSpace:"nowrap" }}>벤토 그리드 · 대칭 균형 · 중앙 이미지</div>
        </div>
      );
    })(),

    // ─ 05 비대칭 균형 ────────────────────────────────────────────
    // v0: 이미지 좌(大)+텍스트 우(小)  v1: 이미지 우(大)+텍스트 좌  v2: 이미지 좌(小)+텍스트 우(大)
    5: (() => {
      const v = variant % 3;
      if (v === 0) return (
        <div style={base}>
          {showGuides && <div style={{ position:"absolute", top:0, bottom:0, left:U(34), width:"1px", background:"rgba(255,200,80,0.35)", zIndex:5 }}/>}
          <div style={{ position:"absolute", top:U(4), left:U(3), width:U(29), height:U(50), overflow:"hidden" }}>
            {kv?<img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", top:U(4), left:U(35), right:U(3), bottom:U(4), display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
            <span style={T.label}>{eT}</span>
            <div><div style={T.main}>{mT}</div><span style={{ ...T.rule, margin:"6px 0" }}/><div style={T.sub}>{sT}</div></div>
            <span style={{ ...T.credit, color:"rgba(74,124,158,0.4)" }}>34u + 24u</span>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:U(3), ...T.credit }}>58유닛 · 비대칭 · 이미지 좌대형</div>
        </div>
      );
      if (v === 1) return (
        <div style={base}>
          {showGuides && <div style={{ position:"absolute", top:0, bottom:0, left:U(24), width:"1px", background:"rgba(255,200,80,0.35)", zIndex:5 }}/>}
          <div style={{ position:"absolute", top:U(4), right:U(3), width:U(29), height:U(50), overflow:"hidden" }}>
            {kv?<img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", top:U(4), left:U(3), width:U(21), bottom:U(4), display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
            <span style={T.label}>{eT}</span>
            <div><div style={T.main}>{mT}</div><span style={{ ...T.rule, margin:"6px 0" }}/><div style={T.sub}>{sT}</div></div>
            <span style={{ ...T.credit, color:"rgba(74,124,158,0.4)" }}>24u + 34u</span>
          </div>
          <div style={{ position:"absolute", bottom:"2%", right:U(3), ...T.credit }}>58유닛 · 비대칭 · 이미지 우대형</div>
        </div>
      );
      return (
        <div style={base}>
          {showGuides && <div style={{ position:"absolute", top:0, bottom:0, left:U(24), width:"1px", background:"rgba(255,200,80,0.35)", zIndex:5 }}/>}
          <div style={{ position:"absolute", top:U(15), left:U(3), width:U(19), height:U(28), overflow:"hidden" }}>
            {kv?<img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", top:U(3), left:U(25), right:U(3), bottom:U(4), display:"flex", flexDirection:"column", justifyContent:"center" }}>
            <span style={{ ...T.label, marginBottom:"10px" }}>{eT}</span>
            <div style={{ ...T.main, fontSize:`${Math.min(mainSize*1.3,32)}px` }}>{mT}</div>
            <span style={{ ...T.rule, margin:"10px 0" }}/>
            <div style={T.sub}>{sT}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:U(3), ...T.credit }}>58유닛 · 비대칭 · 텍스트 대형</div>
        </div>
      );
    })(),

    // ─ 06 Z패턴 ──────────────────────────────────────────────────
    // v0: 이미지 중앙 대각  v1: 이미지 우상  v2: 이미지 좌하
    6: (() => {
      const v = variant % 3;
      const GLines = () => showGuides ? (
        <>
          <div style={{ position:"absolute", top:U(14), left:0, right:0, height:"1px", background:"rgba(158,92,92,0.3)", zIndex:5 }}/>
          <div style={{ position:"absolute", top:U(36), left:0, right:0, height:"1px", background:"rgba(158,92,92,0.3)", zIndex:5 }}/>
        </>
      ) : null;
      if (v === 0) return (
        <div style={base}>
          <GLines/>
          <div style={{ position:"absolute", top:U(2), left:U(3), right:U(3), display:"flex", justifyContent:"space-between" }}>
            <span style={T.label}>{a1||"ARTIST"}</span>
            <span style={T.label}>2025</span>
          </div>
          <div style={{ position:"absolute", top:U(16), left:U(20), width:U(34), height:U(22), overflow:"hidden" }}>
            {kv?<img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", top:U(40), left:U(3) }}><div style={T.main}>{mT}</div></div>
          <div style={{ position:"absolute", bottom:U(3), right:U(3), width:U(26), textAlign:"right" }}><div style={T.sub}>{sT}</div></div>
          <div style={{ position:"absolute", bottom:"2%", left:U(3), ...T.credit }}>58유닛 · Z패턴 · 대각 이미지</div>
        </div>
      );
      if (v === 1) return (
        <div style={base}>
          <GLines/>
          <div style={{ position:"absolute", top:U(2), left:U(3) }}><span style={T.label}>{eT}</span></div>
          <div style={{ position:"absolute", top:U(7), right:U(3), width:U(28), height:U(30), overflow:"hidden" }}>
            {kv?<img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", top:U(38), left:U(3) }}>
            <div style={T.main}>{mT}</div>
            <span style={{ ...T.rule, margin:"6px 0" }}/>
          </div>
          <div style={{ position:"absolute", bottom:U(3), right:U(3), width:U(24), textAlign:"right" }}><div style={T.sub}>{sT}</div></div>
          <div style={{ position:"absolute", bottom:"2%", left:U(3), ...T.credit }}>58유닛 · Z패턴 · 이미지 우상</div>
        </div>
      );
      return (
        <div style={base}>
          <GLines/>
          <div style={{ position:"absolute", top:U(2), left:U(3), right:U(3), display:"flex", justifyContent:"space-between" }}>
            <span style={T.label}>{a1||"ARTIST"}</span>
            <span style={T.label}>{a2||"BRAND"}</span>
          </div>
          <div style={{ position:"absolute", top:U(40), left:U(3) }}>
            <div style={T.main}>{mT}</div>
          </div>
          <div style={{ position:"absolute", top:U(37), left:U(3), width:U(24), height:U(18), overflow:"hidden" }}>
            {kv?<img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", bottom:U(3), right:U(3), width:U(26), textAlign:"right" }}><div style={T.sub}>{sT}</div></div>
          <div style={{ position:"absolute", bottom:"2%", left:U(3), ...T.credit }}>58유닛 · Z패턴 · 이미지 좌하</div>
        </div>
      );
    })(),

    // ─ 07 F패턴 ──────────────────────────────────────────────────
    // v0: 이미지 상단 풀+F계단  v1: 이미지 없는 순수 F타이포  v2: 이미지 우측 세로+F타이포
    7: (() => {
      const v = variant % 3;
      if (v === 0) return (
        <div style={base}>
          <div style={{ position:"absolute", top:U(3), left:U(3), width:U(52), height:U(17), overflow:"hidden" }}>
            {kv?<img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", top:U(22), left:U(3), right:U(3), paddingBottom:"4px", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
            <div style={T.main}>{mT}</div>
          </div>
          <div style={{ position:"absolute", top:U(31), left:U(3), width:U(36), paddingBottom:"4px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
            <div style={T.sub}>{sT}</div>
          </div>
          <div style={{ position:"absolute", top:U(41), left:U(3), width:U(22) }}>
            <span style={T.label}>{eT}</span>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:U(3), ...T.credit }}>58유닛 · F패턴 · 52u→36u→22u</div>
        </div>
      );
      if (v === 1) return (
        <div style={base}>
          <div style={{ position:"absolute", top:U(8), left:U(3), right:U(3), paddingBottom:"6px", borderBottom:"1px solid rgba(255,255,255,0.12)" }}>
            <span style={{ ...T.label, marginBottom:"10px", display:"block" }}>{eT}</span>
            <div style={{ ...T.main, fontSize:`${Math.min(mainSize*1.4,36)}px` }}>{mT}</div>
          </div>
          <div style={{ position:"absolute", top:U(30), left:U(3), width:U(38), paddingBottom:"5px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
            <div style={T.sub}>{sT}</div>
          </div>
          <div style={{ position:"absolute", top:U(42), left:U(3), width:U(20) }}>
            <span style={T.label}>{a1||"ARTIST"}</span>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:U(3), ...T.credit }}>58유닛 · F패턴 · 타이포 주도</div>
        </div>
      );
      return (
        <div style={base}>
          <div style={{ position:"absolute", top:U(3), right:U(3), width:U(18), bottom:U(3), overflow:"hidden" }}>
            {kv?<img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", top:U(10), left:U(3), width:U(35), paddingBottom:"5px", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
            <span style={{ ...T.label, marginBottom:"8px", display:"block" }}>{eT}</span>
            <div style={T.main}>{mT}</div>
          </div>
          <div style={{ position:"absolute", top:U(30), left:U(3), width:U(28), paddingBottom:"4px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
            <div style={T.sub}>{sT}</div>
          </div>
          <div style={{ position:"absolute", top:U(42), left:U(3), width:U(18) }}>
            <span style={T.label}>{a1||"ARTIST"}</span>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:U(3), ...T.credit }}>58유닛 · F패턴 · 이미지 우세로</div>
        </div>
      );
    })(),

    // ─ 08 화이트 스페이스 ────────────────────────────────────────
    // v0: 텍스트 좌하+이미지 우상 소형  v1: 텍스트 좌상+이미지 없음  v2: 텍스트 중앙+이미지 극소형
    8: (() => {
      const v = variant % 3;
      const bg8 = bgImage ? bgSt : { background: bgColor||"#f4f1ec" };
      if (v === 0) return (
        <div style={{ width:"100%", height:"100%", position:"relative", overflow:"hidden", ...bg8 }}>
          {showGuides && <BentoGuide/>}
          <div style={{ position:"absolute", top:`${by(0)}%`, right:`${100-bx(4)}%`, width:`${bw(1)}%`, height:`${bh(2)}%`, overflow:"hidden" }}>
            {kv?<img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", background:"rgba(0,0,0,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", left:`${bx(0)}%`, bottom:`${100-by(6)}%`, width:`${bw(2.5)}%`, top:`${by(3.5)}%` }}>
            <span style={{ ...T.label, marginBottom:"14px", display:"block" }}>{eT}</span>
            <div style={T.main}>{mT}</div>
            <span style={{ ...T.rule, margin:"12px 0", background:isLight?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.25)" }}/>
            <div style={T.sub}>{sT}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:`${bx(0)}%`, ...T.credit }}>벤토 그리드 · 화이트 스페이스 · 여백 82%</div>
        </div>
      );
      if (v === 1) return (
        <div style={{ width:"100%", height:"100%", position:"relative", overflow:"hidden", ...bg8 }}>
          {showGuides && <BentoGuide/>}
          <div style={{ position:"absolute", left:`${bx(0)}%`, top:`${by(0.5)}%`, width:`${bw(3)}%` }}>
            <span style={{ ...T.label, marginBottom:"16px", display:"block", letterSpacing:"4px" }}>{eT}</span>
            <div style={{ ...T.main, fontSize:`${Math.min(mainSize*1.2,30)}px` }}>{mT}</div>
            <span style={{ ...T.rule, margin:"14px 0", background:isLight?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.25)" }}/>
            <div style={T.sub}>{sT.slice(0,60)}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:`${bx(0)}%`, ...T.credit }}>벤토 그리드 · 화이트 스페이스 · 텍스트 전면</div>
        </div>
      );
      return (
        <div style={{ width:"100%", height:"100%", position:"relative", overflow:"hidden", ...bg8 }}>
          {showGuides && <BentoGuide/>}
          <div style={{ position:"absolute", left:`${bx(3)}%`, top:`${by(0)}%`, width:`${bw(1)}%`, height:`${bh(1)}%`, overflow:"hidden" }}>
            {kv?<img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", background:"rgba(0,0,0,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", left:`${bx(0)}%`, top:"35%", width:`${bw(3.5)}%`, textAlign:"left" }}>
            <span style={{ ...T.label, marginBottom:"16px", display:"block" }}>{eT}</span>
            <div style={{ ...T.main, fontSize:`${Math.min(mainSize*1.5,36)}px` }}>{mT}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:`${bx(0)}%`, ...T.credit }}>벤토 그리드 · 화이트 스페이스 · 극단 여백</div>
        </div>
      );
    })(),

    // ─ 09 병치 ───────────────────────────────────────────────────
    // v0: 이미지 좌+텍스트 우  v1: 이미지 우+텍스트 좌  v2: 상하 병치
    9: (() => {
      const v = variant % 3;
      const Divider = ({ vertical=true }) => showGuides
        ? <div style={vertical
            ? { position:"absolute", top:0, bottom:0, left:"50%", width:"1px", background:"rgba(158,122,92,0.45)", zIndex:5 }
            : { position:"absolute", left:0, right:0, top:"50%", height:"1px", background:"rgba(158,122,92,0.45)", zIndex:5 }}/>
        : null;
      if (v === 0) return (
        <div style={base}>
          <Divider/>
          <div style={{ position:"absolute", top:U(3), left:U(3), width:U(26), bottom:U(3), overflow:"hidden" }}>
            {kv?<img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", top:U(3), left:U(31), right:U(3), bottom:U(3), display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
            <span style={T.label}>{eT}</span>
            <div style={T.main}>{mT}</div>
            <div><div style={T.sub}>{sT}</div><span style={{ ...T.credit, color:"rgba(158,122,92,0.5)", marginTop:"6px", display:"block" }}>29u | 29u</span></div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:U(3), ...T.credit }}>58유닛 · 병치 · 이미지 좌</div>
        </div>
      );
      if (v === 1) return (
        <div style={base}>
          <Divider/>
          <div style={{ position:"absolute", top:U(3), right:U(3), width:U(26), bottom:U(3), overflow:"hidden" }}>
            {kv?<img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", top:U(3), left:U(3), width:U(24), bottom:U(3), display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
            <span style={T.label}>{eT}</span>
            <div style={T.main}>{mT}</div>
            <div style={T.sub}>{sT}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", right:U(3), ...T.credit }}>58유닛 · 병치 · 이미지 우</div>
        </div>
      );
      return (
        <div style={base}>
          <Divider vertical={false}/>
          <div style={{ position:"absolute", top:U(3), left:U(3), right:U(3), height:U(26), overflow:"hidden" }}>
            {kv?<img src={kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.08)" }}/>}
          </div>
          <div style={{ position:"absolute", top:U(31), left:U(3), right:U(3), bottom:U(3), display:"flex", flexDirection:"column", justifyContent:"center", gap:"8px" }}>
            <span style={T.label}>{eT}</span>
            <div style={T.main}>{mT}</div>
            <div style={T.sub}>{sT}</div>
          </div>
          <div style={{ position:"absolute", bottom:"2%", left:U(3), ...T.credit }}>58유닛 · 병치 · 상하 병치</div>
        </div>
      );
    })(),
  };

  return renders[p.id] || null;
}

// ─── 기준 레이아웃 (비교용) ──────────────────────────────────────
function BaselinePoster({ mainText, subText, extra, kv, bgColor, bgImage, fontFamily }) {
  const mT = mainText||"MAIN TITLE", sT = subText||"Subtitle", eT = extra||"ARTIST × BRAND";
  let bg = { background: bgColor||"#0d1117" };
  if (bgImage) bg = { backgroundImage:`url(${bgImage})`, backgroundSize:"cover", backgroundPosition:"center" };
  return (
    <div style={{ width:"100%", height:"100%", position:"relative", overflow:"hidden", ...bg, fontFamily:fontFamily||"sans-serif" }}>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"12%", textAlign:"center", gap:"8px" }}>
        <div style={{ fontSize:"7px", color:"rgba(255,255,255,0.4)", letterSpacing:"2px", textTransform:"uppercase" }}>{eT}</div>
        {kv && <img src={kv} alt="" style={{ width:"60%", height:"30%", objectFit:"cover", borderRadius:"2px" }}/>}
        <div style={{ fontSize:"16px", fontWeight:"700", color:"#fff", lineHeight:1.1 }}>{mT}</div>
        <div style={{ fontSize:"7px", color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>{sT}</div>
      </div>
      <div style={{ position:"absolute", bottom:"3%", left:"50%", transform:"translateX(-50%)", fontSize:"5px", color:"rgba(255,255,255,0.2)", letterSpacing:"1.5px", whiteSpace:"nowrap" }}>기준: 원칙 미적용 (중앙 정렬)</div>
    </div>
  );
}

// ─── 시각적 예측 과제 ────────────────────────────────────────────
function VisualTask({ p, onAnswer, answered, pData }) {
  const q = p.visualQ; if (!q) return null;
  const tc = TAG[p.tag];
  const [sel, setSel] = useState(null);
  const [order, setOrder] = useState(q.type==="order" ? [...q.items] : []);

  const check = (id) => {
    const correct = q.type==="click-zone"
      ? q.zones.find(z=>z.id===id)?.correct
      : q.type==="multi-choice"
      ? q.choices.find(c=>c.id===id)?.correct
      : false;
    setSel(id);
    setTimeout(() => onAnswer(correct, id), 400);
  };

  const checkOrder = () => {
    const correct = order.map(i=>i.id).join(",") === q.correctOrder.join(",");
    onAnswer(correct, "order");
  };

  const moveItem = (from, to) => {
    const arr = [...order];
    const [item] = arr.splice(from,1);
    arr.splice(to, 0, item);
    setOrder(arr);
  };

  if (q.type==="click-zone") return (
    <div>
      <div style={{ fontSize:"11px", color:"#bbb", lineHeight:1.7, marginBottom:"12px" }}>{q.prompt}</div>
      <div style={{ position:"relative", paddingBottom:"60%", borderRadius:"6px", overflow:"hidden", border:`1px solid ${C.border}`, marginBottom:"8px" }}>
        <div style={{ position:"absolute", inset:0, background:"#0d1117" }}>
          {pData.kv && <img src={pData.kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.25 }}/>}
        </div>
        {q.zones.map(z => {
          const active = answered?(z.correct?"rgba(74,180,120,0.4)":(sel===z.id?"rgba(200,80,80,0.4)":"rgba(255,255,255,0.04)")):sel===z.id?"rgba(74,124,200,0.3)":"rgba(255,255,255,0.05)";
          return (
            <div key={z.id} onClick={() => !answered && check(z.id)}
              style={{ position:"absolute", left:`${z.rect.left}%`, top:`${z.rect.top}%`, width:`${z.rect.width}%`, height:`${z.rect.height}%`, background:active, border:`1px solid ${answered&&z.correct?"rgba(74,180,120,0.8)":"rgba(255,255,255,0.12)"}`, cursor:answered?"default":"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.7)", fontWeight:"600" }}>
                {answered&&(z.correct?"✓ 정답":sel===z.id?"✗ 오답":"")} {z.label}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize:"9px", color:"#555", fontStyle:"italic" }}>💡 {q.hint}</div>
    </div>
  );

  if (q.type==="multi-choice") return (
    <div>
      <div style={{ fontSize:"11px", color:"#bbb", lineHeight:1.7, marginBottom:"12px" }}>{q.prompt}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"8px" }}>
        {q.choices.map(c => {
          const isSel = sel===c.id;
          const bg = answered?(c.correct?"rgba(74,180,120,0.18)":(isSel?"rgba(200,80,80,0.12)":"transparent")):isSel?"rgba(74,124,200,0.12)":"transparent";
          return (
            <div key={c.id} onClick={() => !answered && check(c.id)}
              style={{ padding:"9px 13px", borderRadius:"5px", background:bg, border:`1px solid ${answered&&c.correct?"rgba(74,180,120,0.5)":C.border}`, cursor:answered?"default":"pointer", display:"flex", alignItems:"center", gap:"10px", transition:"all 0.18s" }}>
              <div style={{ width:"14px", height:"14px", borderRadius:"50%", background:answered&&c.correct?"rgba(74,180,120,0.4)":isSel?"rgba(74,124,200,0.4)":"rgba(255,255,255,0.06)", border:`1px solid ${C.border}`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"8px", color:"#fff" }}>
                {answered&&c.correct?"✓":answered&&isSel?"✗":""}
              </div>
              <div style={{ fontSize:"10px", color:answered&&c.correct?"#7ada9a":"#888" }}>{c.text}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize:"9px", color:"#555", fontStyle:"italic" }}>💡 {q.hint}</div>
    </div>
  );

  if (q.type==="order") return (
    <div>
      <div style={{ fontSize:"11px", color:"#bbb", lineHeight:1.7, marginBottom:"12px" }}>{q.prompt}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:"5px", marginBottom:"10px" }}>
        {order.map((item,idx) => (
          <div key={item.id} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ fontSize:"9px", color:tc, fontWeight:"700", width:"16px", flexShrink:0 }}>{idx+1}</div>
            <div style={{ flex:1, padding:"7px 10px", background:C.faint, border:`1px solid ${C.border}`, borderRadius:"4px", fontSize:"10px", color:"#999", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span>{item.label}</span>
              {!answered && <div style={{ display:"flex", gap:"3px" }}>
                <button onClick={() => idx>0&&moveItem(idx,idx-1)} disabled={idx===0} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:"2px", color:idx===0?"#2a2a2a":"#555", fontSize:"8px", cursor:idx===0?"default":"pointer", padding:"1px 5px" }}>↑</button>
                <button onClick={() => idx<order.length-1&&moveItem(idx,idx+1)} disabled={idx===order.length-1} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:"2px", color:idx===order.length-1?"#2a2a2a":"#555", fontSize:"8px", cursor:idx===order.length-1?"default":"pointer", padding:"1px 5px" }}>↓</button>
              </div>}
              {answered && <span style={{ fontSize:"8px", color:item.id===q.correctOrder[idx]?"#7ada9a":"#da7a7a" }}>{item.id===q.correctOrder[idx]?"✓":"✗"}</span>}
            </div>
          </div>
        ))}
      </div>
      {!answered && <button onClick={checkOrder} style={{ padding:"7px 16px", background:tc, border:"none", borderRadius:"4px", color:"#fff", fontSize:"9px", fontWeight:"700", cursor:"pointer" }}>순서 확인</button>}
      <div style={{ fontSize:"9px", color:"#555", fontStyle:"italic", marginTop:"8px" }}>💡 {q.hint}</div>
    </div>
  );

  if (q.type==="click-point") return (
    <div>
      <div style={{ fontSize:"11px", color:"#bbb", lineHeight:1.7, marginBottom:"12px" }}>{q.prompt}</div>
      <ClickPoint q={q} answered={answered} onAnswer={onAnswer} pData={pData} tc={tc}/>
      <div style={{ fontSize:"9px", color:"#555", fontStyle:"italic", marginTop:"8px" }}>💡 {q.hint}</div>
    </div>
  );
  return null;
}

function ClickPoint({ q, answered, onAnswer, pData, tc }) {
  const [clicked, setClicked] = useState(null);
  const handleClick = (e) => {
    if (answered) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const cz = q.correctZone;
    const correct = x>=cz.left && x<=cz.left+cz.width && y>=cz.top && y<=cz.top+cz.height;
    setClicked({x, y, correct});
    setTimeout(() => onAnswer(correct, "point"), 400);
  };
  return (
    <div onClick={handleClick} style={{ position:"relative", paddingBottom:"60%", borderRadius:"6px", overflow:"hidden", border:`1px solid ${C.border}`, cursor:answered?"default":"crosshair", marginBottom:"8px" }}>
      <div style={{ position:"absolute", inset:0, background:"#0d1117" }}>
        {pData.kv && <img src={pData.kv} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.22 }}/>}
        <div style={{ position:"absolute", top:"50%", left:"50%", width:"5px", height:"5px", borderRadius:"50%", background:"rgba(255,255,255,0.18)", transform:"translate(-50%,-50%)" }}/>
        <div style={{ position:"absolute", top:"50%", left:0, right:0, height:"1px", background:"rgba(255,255,255,0.08)" }}/>
        <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:"1px", background:"rgba(255,255,255,0.08)" }}/>
      </div>
      {answered && q.correctZone && <div style={{ position:"absolute", left:`${q.correctZone.left}%`, top:`${q.correctZone.top}%`, width:`${q.correctZone.width}%`, height:`${q.correctZone.height}%`, background:"rgba(74,180,120,0.28)", border:"1px solid rgba(74,180,120,0.7)", borderRadius:"2px", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:"7px", color:"#7ada9a", fontWeight:"700" }}>정답 영역</span></div>}
      {clicked && <div style={{ position:"absolute", left:`${clicked.x}%`, top:`${clicked.y}%`, width:"9px", height:"9px", borderRadius:"50%", background:clicked.correct?"rgba(74,180,120,0.9)":"rgba(200,80,80,0.9)", border:"2px solid #fff", transform:"translate(-50%,-50%)" }}/>}
    </div>
  );
}

// ─── 캡션 모달 ────────────────────────────────────────────────────
function CaptionModal({ p, data, prediction, taskResult, onClose }) {
  const tc = TAG[p.tag], gc = GRID[p.grid];
  const [active, setActive] = useState(null);
  const caps = p.captions(data), ovs = p.overlays||[];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:"14px" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.surface, border:`1px solid ${tc}44`, borderRadius:"12px", width:"100%", maxWidth:"820px", maxHeight:"92vh", overflowY:"auto" }}>
        {/* 헤더 */}
        <div style={{ padding:"16px 20px 12px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <div style={{ display:"flex", gap:"5px", marginBottom:"5px" }}>
              <span style={{ fontSize:"7px", fontWeight:"700", letterSpacing:"2px", padding:"2px 7px", borderRadius:"4px", background:`${tc}22`, border:`1px solid ${tc}44`, color:tc }}>{p.num} · {p.tag}</span>
              <span style={{ fontSize:"7px", fontWeight:"700", padding:"2px 7px", borderRadius:"4px", background:`${gc}22`, border:`1px solid ${gc}44`, color:gc }}>{p.grid==="bento"?"벤토 그리드 4×6":"게르스트너 58유닛"}</span>
            </div>
            <div style={{ fontSize:"18px", fontWeight:"800", color:C.text, marginBottom:"2px" }}>{p.full}</div>
            <div style={{ fontSize:"9px", color:C.dim }}>{p.en}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.dim, fontSize:"18px", cursor:"pointer" }}>✕</button>
        </div>

        {/* 예측 vs 결과 */}
        {(prediction||taskResult) && (
          <div style={{ padding:"12px 20px", borderBottom:`1px solid ${C.border}`, background:C.bg }}>
            <div style={{ fontSize:"8px", color:C.dim, letterSpacing:"2px", textTransform:"uppercase", marginBottom:"8px" }}>예측 vs 실제 결과</div>
            <div style={{ display:"flex", gap:"10px" }}>
              {taskResult && <div style={{ flex:1, padding:"10px 12px", background:C.surface, borderRadius:"6px", borderLeft:`2px solid ${taskResult.correct?"#5c9e7a":"#9e5c5c"}` }}>
                <div style={{ fontSize:"7px", color:taskResult.correct?"#5c9e7a":"#9e5c5c", letterSpacing:"1px", marginBottom:"5px" }}>{taskResult.correct?"✓ 시각적 과제 정답":"✗ 시각적 과제 오답"}</div>
                <div style={{ fontSize:"10px", color:"#bbb", lineHeight:1.7 }}>{p.visualQ?.hint}</div>
              </div>}
              {prediction && <div style={{ flex:1, padding:"10px 12px", background:C.surface, borderRadius:"6px", borderLeft:`2px solid ${tc}` }}>
                <div style={{ fontSize:"7px", color:tc, letterSpacing:"1px", marginBottom:"5px" }}>내 서술 예측</div>
                <div style={{ fontSize:"10px", color:"#bbb", lineHeight:1.7 }}>{prediction}</div>
              </div>}
            </div>
          </div>
        )}

        <div style={{ padding:"16px 20px", display:"flex", gap:"16px" }}>
          {/* 오버레이 포스터 */}
          <div style={{ width:"180px", flexShrink:0 }}>
            <div style={{ position:"relative", paddingBottom:"141.4%", borderRadius:"6px", overflow:"hidden", border:`1px solid ${tc}33` }}>
              <div style={{ position:"absolute", inset:0 }}>
                <Poster p={p} kv={data.kv} bgColor={data.bgColor} bgImage={data.bgImage} mainText={data.main} subText={data.sub} extra={data.extra} fontFamily={data.fontFamily} mainSize={data.mainSize} mainWeight={data.mainWeight} mainColor={data.mainColor} subSize={data.subSize} subWeight={data.subWeight} subColor={data.subColor} showGuides/>
              </div>
              {ovs.map((ov,i) => {
                const isA = active===null || active===i;
                return (
                  <div key={i} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
                    style={{ position:"absolute", left:`${ov.rect.left}%`, top:`${ov.rect.top}%`, width:`${ov.rect.width}%`, height:`${ov.rect.height}%`, background:isA?ov.color:"transparent", border:isA?`1px solid ${ov.color.replace(/[\d.]+\)$/,"0.9)")}`:"none", transition:"all 0.18s", cursor:"pointer", zIndex:10 }}>
                    {active===i && <div style={{ position:"absolute", top:"2px", left:"2px", fontSize:"5px", fontWeight:"700", color:"#fff", background:"rgba(0,0,0,0.75)", padding:"1px 4px", borderRadius:"3px", whiteSpace:"nowrap", maxWidth:"90%", overflow:"hidden" }}>{ov.label}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize:"6px", color:C.muted, marginTop:"5px", textAlign:"center" }}>구역 위에 마우스 올리기</div>
            {/* 아티스트 컨텍스트 */}
            <div style={{ marginTop:"10px", padding:"8px 10px", background:C.bg, borderRadius:"5px", border:`1px solid ${tc}22` }}>
              <div style={{ fontSize:"7px", color:tc, letterSpacing:"1px", marginBottom:"5px" }}>🎨 내 소재에서</div>
              <div style={{ fontSize:"8px", color:"#666", lineHeight:1.65 }}>{p.artistContext(data.artist, data.brand)}</div>
            </div>
          </div>

          {/* 캡션 + 부적합 사례 */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"9px" }}>
            <div style={{ fontSize:"10px", color:"#777", lineHeight:1.8, padding:"9px 12px", background:C.bg, borderRadius:"6px", borderLeft:`2px solid ${gc}` }}>{p.desc}</div>
            <div style={{ fontSize:"8px", color:C.dim, letterSpacing:"2px", textTransform:"uppercase" }}>단계별 원칙 적용</div>
            {caps.map((cap,i) => (
              <div key={i} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
                style={{ background:active===i?"#1a1a1e":C.bg, borderRadius:"7px", padding:"10px 13px", border:active===i?`1px solid ${tc}55`:`1px solid ${C.border}`, display:"flex", gap:"10px", transition:"all 0.15s", cursor:"default" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", flexShrink:0 }}>
                  <div style={{ width:"19px", height:"19px", borderRadius:"50%", background:`${tc}1a`, border:`1px solid ${tc}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"8px", fontWeight:"700", color:tc }}>{i+1}</div>
                  {ovs[i] && <div style={{ width:"9px", height:"9px", borderRadius:"2px", background:ovs[i].color, border:`1px solid ${ovs[i].color.replace(/[\d.]+\)$/,"0.9)")}` }}/>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px", flexWrap:"wrap" }}>
                    <div style={{ fontSize:"10px", fontWeight:"700", color:"#ccc" }}>{cap.zone}</div>
                    <div style={{ fontSize:"7px", padding:"1px 6px", borderRadius:"8px", background:`${tc}18`, color:tc, letterSpacing:"1px" }}>{cap.role}</div>
                  </div>
                  <div style={{ fontSize:"10px", color:"#777", lineHeight:1.85 }}>{cap.explain}</div>
                </div>
              </div>
            ))}
            {/* 부적합 사례 */}
            <div style={{ padding:"10px 12px", background:"rgba(158,92,92,0.06)", borderRadius:"6px", border:"1px solid rgba(158,92,92,0.2)" }}>
              <div style={{ fontSize:"7px", color:"#9e6060", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:"5px" }}>⚠ 이 원칙이 맞지 않는 경우</div>
              <div style={{ fontSize:"9px", color:"#7a5555", lineHeight:1.75 }}>{p.mismatch}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 원칙 분류 맵 ─────────────────────────────────────────────────
function PrincipleMap({ selected, onSelect, taskDone }) {
  return (
    <div style={{ position:"relative", width:"100%", paddingBottom:"55%", background:C.bg, borderRadius:"8px", border:`1px solid ${C.border}`, overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, padding:"20px" }}>
        <div style={{ position:"absolute", bottom:"8px", left:"50%", transform:"translateX(-50%)", fontSize:"8px", color:C.dim, letterSpacing:"2px" }}>정적 ←──────────────────────→ 동적</div>
        <div style={{ position:"absolute", left:"6px", top:"50%", transform:"translateY(-50%) rotate(-90deg)", fontSize:"8px", color:C.dim, letterSpacing:"2px", whiteSpace:"nowrap" }}>단순 ↑ · 복합 ↓</div>
        <div style={{ position:"absolute", left:"14%", right:"4%", top:"50%", height:"1px", background:C.border }}/>
        <div style={{ position:"absolute", top:"10%", bottom:"14%", left:"50%", width:"1px", background:C.border }}/>
        {/* 그리드 시스템 영역 레이블 */}
        <div style={{ position:"absolute", left:"18%", top:"10%", fontSize:"7px", color:C.gold, opacity:0.6, letterSpacing:"1px" }}>벤토 그리드</div>
        <div style={{ position:"absolute", left:"55%", top:"10%", fontSize:"7px", color:C.blue, opacity:0.6, letterSpacing:"1px" }}>게르스트너 58유닛</div>
        {PRINCIPLES.map(p => {
          const isSel = selected===p.id, isDone = taskDone[p.id], tc = TAG[p.tag];
          const lx = 14 + p.axis.x * 0.82, ly = 10 + p.axis.y * 0.72;
          return (
            <div key={p.id} onClick={() => onSelect(p.id)}
              style={{ position:"absolute", left:`${lx}%`, top:`${ly}%`, transform:"translate(-50%,-50%)", cursor:"pointer", zIndex:isSel?10:5, transition:"all 0.2s" }}>
              <div style={{ width:isSel?"30px":"22px", height:isSel?"30px":"22px", borderRadius:"50%", background:isSel?tc:`${tc}33`, border:isSel?`2px solid ${tc}`:`1px solid ${tc}66`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", boxShadow:isSel?`0 0 16px ${tc}44`:"none" }}>
                <span style={{ fontSize:isSel?"8px":"7px", fontWeight:"700", color:isSel?"#fff":tc }}>{p.num}</span>
              </div>
              {isDone && <div style={{ position:"absolute", top:"-2px", right:"-2px", width:"8px", height:"8px", borderRadius:"50%", background:"#5c9e7a", border:`1px solid ${C.surface}` }}/>}
              <div style={{ position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)", marginTop:"3px", fontSize:"6px", color:isSel?"#ddd":"#555", fontWeight:isSel?"700":"400", whiteSpace:"nowrap" }}>{p.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 기능 A: 진도 뱃지 모달 ──────────────────────────────────────
const BADGE_DEF = {
  비례:    { emoji:"📐", label:"비례 마스터",    color:C.blue   },
  균형:    { emoji:"⚖️",  label:"균형 마스터",    color:C.purple },
  시선흐름:{ emoji:"👁",  label:"시선 마스터",    color:C.red    },
  여백:    { emoji:"⬜",  label:"여백 마스터",    color:C.green  },
  병치:    { emoji:"🔲",  label:"병치 마스터",    color:C.amber  },
};

function BadgeModal({ taskAnswered, onClose }) {
  // 카테고리별 완료 집계
  const tagStat = {};
  PRINCIPLES.forEach(p => {
    if (!tagStat[p.tag]) tagStat[p.tag] = { total:0, done:0 };
    tagStat[p.tag].total++;
    if (taskAnswered[p.id]) tagStat[p.tag].done++;
  });
  const totalDone = Object.keys(taskAnswered).length;
  const allDone   = totalDone === PRINCIPLES.length;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.87)", zIndex:500,
      display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surface, border:`1px solid ${C.border}`,
        borderRadius:"12px", width:"100%", maxWidth:"460px", padding:"24px" }}>
        <div style={{ fontSize:"8px", color:C.dim, letterSpacing:"3px", textTransform:"uppercase", marginBottom:"6px" }}>나의 학습 뱃지</div>
        <div style={{ fontSize:"19px", fontWeight:"800", color:C.text, marginBottom:"20px" }}>
          {allDone ? "🏅 모든 원칙 완료!" : `${totalDone} / ${PRINCIPLES.length} 원칙 완료`}
        </div>

        {/* 카테고리 뱃지 5개 */}
        <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"18px" }}>
          {Object.entries(tagStat).map(([tag, { total, done }]) => {
            const bd = BADGE_DEF[tag];
            const earned = done === total;
            return (
              <div key={tag} style={{ display:"flex", alignItems:"center", gap:"12px",
                padding:"10px 14px", background:earned?`${bd.color}18`:C.bg,
                borderRadius:"8px", border:`1px solid ${earned?bd.color:C.border}`,
                opacity:earned ? 1 : 0.45, transition:"all 0.2s" }}>
                <div style={{ fontSize:"22px", filter:earned?"none":"grayscale(1)" }}>{bd.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"11px", fontWeight:"700", color:earned?bd.color:"#555" }}>{bd.label}</div>
                  <div style={{ fontSize:"9px", color:C.dim, marginTop:"1px" }}>{tag} 원칙 {done}/{total} 완료</div>
                </div>
                {earned && <div style={{ fontSize:"12px", color:bd.color }}>✓</div>}
              </div>
            );
          })}
        </div>

        {/* 개별 원칙 칩 */}
        <div style={{ fontSize:"8px", color:C.dim, letterSpacing:"2px", marginBottom:"8px" }}>원칙별 상세</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"20px" }}>
          {PRINCIPLES.map(p => {
            const done = !!taskAnswered[p.id];
            const correct = taskAnswered[p.id]?.correct;
            const tc = TAG[p.tag];
            return (
              <div key={p.id} style={{ padding:"3px 9px", borderRadius:"12px",
                background:done?`${tc}22`:C.bg, border:`1px solid ${done?tc:C.border}`,
                color:done?tc:C.muted, fontSize:"8px", fontWeight:done?"700":"400",
                display:"flex", gap:"4px", alignItems:"center" }}>
                {done && <span style={{ fontSize:"7px", color:correct?"#7ada9a":"#da7a7a" }}>{correct?"✓":"✗"}</span>}
                {p.num} {p.name}
              </div>
            );
          })}
        </div>
        <button onClick={onClose} style={{ width:"100%", padding:"10px", background:C.blue,
          border:"none", borderRadius:"5px", color:"#fff", fontSize:"10px", fontWeight:"700",
          cursor:"pointer", letterSpacing:"2px" }}>닫기</button>
      </div>
    </div>
  );
}

// ─── 기능 C: 내 포스터 메모장 ────────────────────────────────────
function MyLogModal({ records, onClose }) {
  const [copied, setCopied] = useState(false);

  const fullText = records.map((r, i) => {
    const p = PRINCIPLES.find(pp => pp.id===r.selected);
    return [
      `[${i+1}] ${p?.full||""}`,
      `시각 과제: ${r.taskCorrect?"정답":"오답"}`,
      r.prediction ? `사전 예측: ${r.prediction}` : "",
      `선택 이유: ${r.reason}`,
      `시각: ${r.timestamp}`,
    ].filter(Boolean).join("\n");
  }).join("\n\n---\n\n");

  const copyAll = () => {
    navigator.clipboard?.writeText(fullText)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.87)", zIndex:500,
      display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surface, border:`1px solid ${C.border}`,
        borderRadius:"12px", width:"100%", maxWidth:"580px", maxHeight:"88vh", display:"flex", flexDirection:"column" }}>
        {/* 헤더 */}
        <div style={{ padding:"16px 20px 12px", borderBottom:`1px solid ${C.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:"8px", color:C.dim, letterSpacing:"3px", textTransform:"uppercase", marginBottom:"3px" }}>내 포스터 메모장</div>
            <div style={{ fontSize:"16px", fontWeight:"700", color:C.text }}>
              나의 선택 기록 <span style={{ color:C.dim, fontSize:"12px", fontWeight:"400" }}>{records.length}개</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.dim, fontSize:"18px", cursor:"pointer" }}>✕</button>
        </div>
        {/* 내용 */}
        <div style={{ padding:"14px 20px", overflowY:"auto", flex:1 }}>
          {records.length === 0
            ? <div style={{ fontSize:"11px", color:C.muted, padding:"30px 0", textAlign:"center", lineHeight:2 }}>
                아직 제출된 기록이 없습니다.<br/>
                <span style={{ fontSize:"9px", color:"#333" }}>③ 비교 단계에서 레이아웃을 선택하고 이유를 제출하면 여기에 기록됩니다.</span>
              </div>
            : <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {records.map((r, i) => {
                  const p = PRINCIPLES.find(pp=>pp.id===r.selected);
                  if (!p) return null;
                  const tc = TAG[p.tag];
                  return (
                    <div key={i} style={{ padding:"12px 14px", background:C.bg, borderRadius:"8px", border:`1px solid ${tc}33` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"6px", flexWrap:"wrap" }}>
                        <div style={{ fontSize:"7px", fontWeight:"700", padding:"1px 7px", borderRadius:"10px",
                          background:`${tc}22`, color:tc }}>{p.num} {p.name}</div>
                        <div style={{ fontSize:"7px", color:r.taskCorrect?"#5c9e7a":"#9e5c5c" }}>
                          과제 {r.taskCorrect?"✓ 정답":"✗ 오답"}
                        </div>
                        <div style={{ fontSize:"7px", color:C.muted, marginLeft:"auto" }}>{r.timestamp}</div>
                      </div>
                      {r.prediction && (
                        <div style={{ fontSize:"9px", color:"#666", lineHeight:1.65, marginBottom:"5px",
                          fontStyle:"italic", padding:"4px 8px", background:C.surface, borderRadius:"3px" }}>
                          <span style={{ color:C.muted, marginRight:"5px" }}>사전 예측</span>{r.prediction}
                        </div>
                      )}
                      <div style={{ fontSize:"10px", color:"#999", lineHeight:1.7 }}>
                        <span style={{ color:C.dim, fontSize:"8px", marginRight:"6px" }}>선택 이유</span>{r.reason}
                      </div>
                    </div>
                  );
                })}
              </div>}
        </div>
        {/* 복사 버튼 */}
        {records.length > 0 && (
          <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
            <button onClick={copyAll} style={{ width:"100%", padding:"9px", background:"transparent",
              border:`1px solid ${copied?C.green:C.border}`, borderRadius:"5px",
              color:copied?C.green:C.dim, fontSize:"9px", cursor:"pointer", letterSpacing:"1px",
              transition:"all 0.2s" }}>
              {copied ? "✓ 복사 완료!" : "📋 전체 기록 텍스트 복사 (제출용)"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 기능 D: 힌트 툴팁 포스터 카드 ──────────────────────────────
function PosterCard({ p, isSelected, isCompare, onClick, pData, showGuides, taskAnswered, variant=0, onShuffle }) {
  const [hovered, setHovered] = useState(false);
  const tc = TAG[p.tag], gc = GRID[p.grid];
  const taskInfo = taskAnswered[p.id];
  const vLabel = ["기본","변형 A","변형 B"][variant%3];

  return (
    <div data-pid={p.id}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor:"pointer", borderRadius:"6px", overflow:"hidden",
        border:(isSelected||isCompare)?`2px solid ${tc}`:"2px solid transparent",
        boxShadow:(isSelected||isCompare)?`0 0 14px ${tc}28`:"none",
        transition:"all 0.15s", background:"#111", position:"relative" }}>
      <div style={{ position:"relative", paddingBottom:"141.4%", background:"#080809" }}>
        <div style={{ position:"absolute", inset:0 }}>
          <Poster p={p} kv={pData.kv} bgColor={pData.bgColor} bgImage={pData.bgImage}
            mainText={pData.main} subText={pData.sub} extra={pData.extra} fontFamily={pData.fontFamily}
            mainSize={pData.mainSize} mainWeight={pData.mainWeight} mainColor={pData.mainColor}
            subSize={pData.subSize} subWeight={pData.subWeight} subColor={pData.subColor}
            showGuides={showGuides} variant={variant}/>
        </div>
        {/* 번호 뱃지 */}
        <div style={{ position:"absolute", top:"5px", right:"5px",
          background:(isSelected||isCompare)?tc:"rgba(0,0,0,0.6)",
          color:"#fff", fontSize:"6px", fontWeight:"700", padding:"1px 4px", borderRadius:"4px" }}>
          {p.num}
        </div>
        {/* 그리드 뱃지 */}
        <div style={{ position:"absolute", top:"5px", left:"5px",
          background:`${gc}22`, border:`1px solid ${gc}44`, color:gc,
          fontSize:"5px", fontWeight:"700", padding:"1px 4px", borderRadius:"4px" }}>
          {p.grid==="bento"?"벤토":"58U"}
        </div>
        {/* 과제 결과 */}
        {taskInfo && (
          <div style={{ position:"absolute", bottom:"18px", right:"5px", fontSize:"6px",
            color:taskInfo.correct?"#5c9e7a":"#9e5c5c",
            background:"rgba(0,0,0,0.7)", padding:"1px 4px", borderRadius:"3px" }}>
            {taskInfo.correct?"✓":"✗"}
          </div>
        )}
        {/* 변형 셔플 버튼 */}
        <button
          onClick={e => { e.stopPropagation(); onShuffle && onShuffle(p.id); }}
          style={{ position:"absolute", bottom:"4px", right:"4px",
            background:"rgba(0,0,0,0.65)", border:"1px solid rgba(255,255,255,0.18)",
            borderRadius:"4px", color:"rgba(255,255,255,0.75)", fontSize:"6px",
            padding:"1px 5px", cursor:"pointer", letterSpacing:"0.5px",
            lineHeight:"1.4" }}>
          ⟳ {vLabel}
        </button>
        {/* 힌트 툴팁 */}
        {hovered && !isSelected && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.78)",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            gap:"5px", padding:"10px", pointerEvents:"none" }}>
            <div style={{ fontSize:"8px", color:tc, fontWeight:"700", letterSpacing:"1px",
              marginBottom:"2px" }}>{p.name}</div>
            {p.keywords.slice(0,3).map((kw,i) => (
              <div key={i} style={{ fontSize:"7px", color:"rgba(255,255,255,0.75)",
                background:"rgba(255,255,255,0.08)", padding:"2px 7px",
                borderRadius:"8px", textAlign:"center", maxWidth:"90%" }}>
                {kw}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding:"5px 6px", background:(isSelected||isCompare)?`${tc}0e`:"#0e0e0e" }}>
        <div style={{ fontSize:"7px", fontWeight:"700", color:(isSelected||isCompare)?tc:"#888", lineHeight:1.3 }}>
          {p.name}
        </div>
        <div style={{ fontSize:"5px", color:C.muted, marginTop:"1px" }}>{p.en}</div>
      </div>
    </div>
  );
}

// ─── 성찰 화면 ────────────────────────────────────────────────────
function ReflectionScreen({ sel, data, taskResult, prediction, reason, onClose }) {
  const tc = TAG[sel.tag];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:450, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.surface, border:`1px solid ${tc}44`, borderRadius:"12px", width:"100%", maxWidth:"640px", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ padding:"20px 24px 0" }}>
          <div style={{ fontSize:"10px", color:tc, letterSpacing:"3px", textTransform:"uppercase", marginBottom:"8px" }}>제출 완료 — 성찰</div>
          <div style={{ fontSize:"19px", fontWeight:"800", color:C.text, marginBottom:"3px" }}>내 선택: {sel.full}</div>
          <div style={{ fontSize:"10px", color:C.dim, marginBottom:"20px" }}>{sel.en}</div>
        </div>
        <div style={{ padding:"0 24px 24px", display:"flex", flexDirection:"column", gap:"12px" }}>
          {/* 예측 vs 결과 */}
          <div style={{ padding:"14px 16px", background:C.bg, borderRadius:"8px", border:`1px solid ${tc}33` }}>
            <div style={{ fontSize:"8px", color:tc, letterSpacing:"2px", marginBottom:"10px" }}>예측 vs 실제</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
              <div>
                <div style={{ fontSize:"8px", color:C.dim, marginBottom:"4px" }}>시각적 과제 결과</div>
                <div style={{ fontSize:"11px", color:taskResult?.correct?"#7ada9a":"#da7a7a", fontWeight:"700" }}>
                  {taskResult?.correct?"✓ 정확히 예측했습니다":"✗ 예측과 달랐습니다"}
                </div>
                {!taskResult?.correct && <div style={{ fontSize:"9px", color:"#666", marginTop:"4px", lineHeight:1.65 }}>{sel.visualQ?.hint}</div>}
              </div>
              {prediction && <div>
                <div style={{ fontSize:"8px", color:C.dim, marginBottom:"4px" }}>내 서술 예측</div>
                <div style={{ fontSize:"10px", color:"#888", lineHeight:1.65, fontStyle:"italic" }}>{prediction}</div>
              </div>}
            </div>
          </div>
          {/* 성찰 질문 */}
          <div style={{ padding:"14px 16px", background:C.bg, borderRadius:"8px", border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:"8px", color:C.dim, letterSpacing:"2px", marginBottom:"10px" }}>더 생각해보기</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {[
                `선택한 ${data.artist||"아티스트"}의 작품 스타일과 ${sel.name} 원칙은 어떻게 연결되나요?`,
                `${data.brand||"브랜드"}의 이미지와 이 레이아웃 원칙이 전달하는 인상은 일치하나요?`,
                `${sel.mismatch.split(".")[0]}에 내 포스터가 해당하지는 않나요?`,
              ].map((q,i) => (
                <div key={i} style={{ display:"flex", gap:"8px", alignItems:"flex-start" }}>
                  <div style={{ width:"16px", height:"16px", borderRadius:"50%", background:`${tc}1a`, border:`1px solid ${tc}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"8px", color:tc, flexShrink:0, marginTop:"1px" }}>{i+1}</div>
                  <div style={{ fontSize:"10px", color:"#777", lineHeight:1.75 }}>{q}</div>
                </div>
              ))}
            </div>
          </div>
          {/* 다음 액션 안내 */}
          <div style={{ padding:"12px 16px", background:C.bg, borderRadius:"8px", border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:"8px", color:C.dim, letterSpacing:"2px", marginBottom:"8px" }}>다음 단계</div>
            <div style={{ fontSize:"10px", color:"#666", lineHeight:1.9 }}>
              📐 다른 원칙도 비교해보고 싶다면 → ③ 비교 단계로 돌아가기<br/>
              🏅 내 학습 완료 현황을 보려면 → 상단 뱃지 버튼<br/>
              📋 선택 기록을 정리하려면 → 상단 메모장 버튼
            </div>
          </div>
          <button onClick={onClose} style={{ padding:"11px", background:tc, border:"none", borderRadius:"5px", color:"#fff", fontSize:"10px", fontWeight:"700", cursor:"pointer", letterSpacing:"2px" }}>확인 — 돌아가기</button>
        </div>
      </div>
    </div>
  );
}

// ─── ④ 퀴즈 탭 ───────────────────────────────────────────────────
// 퀴즈 문제: 포스터를 보고 원칙 맞추기 (식별 퀴즈 5문제)
const QUIZ_POOL = [
  { pid:1, variant:0, q:"이 포스터에서 이미지와 텍스트를 나누는 비율 원칙은?", correct:1 },
  { pid:5, variant:0, q:"한쪽이 크고 한쪽이 작은 이 불균등 분할이 구현하는 원칙은?", correct:5 },
  { pid:4, variant:0, q:"상단 이미지와 하단 텍스트가 중앙 기준으로 대칭인 이 원칙은?", correct:4 },
  { pid:6, variant:0, q:"시선이 좌상→우상→좌하→우하 경로로 이동하는 이 원칙은?", correct:6 },
  { pid:9, variant:0, q:"두 요소가 동일한 면적으로 나뉘어 충돌하는 이 원칙은?", correct:9 },
  { pid:3, variant:0, q:"타이틀이 수학적 중심보다 약간 위쪽에 배치된 이 원칙은?", correct:3 },
  { pid:7, variant:1, q:"정보가 위에서 아래로 내려갈수록 폭이 좁아지는 이 원칙은?", correct:7 },
  { pid:8, variant:0, q:"콘텐츠보다 빈 공간이 훨씬 많은 이 포스터의 원칙은?", correct:8 },
  { pid:2, variant:0, q:"화면을 3×3으로 나눠 교차점에 요소를 배치하는 이 원칙은?", correct:2 },
  { pid:1, variant:2, q:"이미지보다 텍스트가 전면에 크게 배치된 이 비례 원칙은?", correct:1 },
];

function QuizTab({ pData, variants }) {
  // 퀴즈셋과 선택지를 초기화 시 한 번만 생성 (리렌더 시 순서 고정)
  const [quizSet] = useState(() => {
    const shuffled = [...QUIZ_POOL].sort(() => Math.random()-0.5);
    return shuffled.slice(0,5);
  });

  const [choicesMap] = useState(() => {
    const pool = [...QUIZ_POOL].sort(() => Math.random()-0.5).slice(0,5);
    const map = {};
    pool.forEach((q, i) => {
      const wrong = PRINCIPLES.filter(pp=>pp.id!==q.correct)
        .sort(()=>Math.random()-0.5).slice(0,3);
      map[i] = [...wrong, PRINCIPLES.find(pp=>pp.id===q.correct)]
        .sort(()=>Math.random()-0.5);
    });
    return map;
  });

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [finished, setFinished] = useState(false);

  const q = quizSet[current];
  const p = q ? PRINCIPLES.find(pp=>pp.id===q.pid) : null;

  // 현재 문제의 고정된 선택지
  const choices = choicesMap[current] || [];

  const choose = (id) => {
    if (answers[current]!==undefined) return;
    setSelected(id);
    setAnswers(prev=>({...prev,[current]:{chosen:id,correct:id===q.correct}}));
  };

  const next = () => {
    setSelected(null);
    if (current+1 >= quizSet.length) setFinished(true);
    else setCurrent(c=>c+1);
  };

  const score = Object.values(answers).filter(a=>a.correct).length;

  if (finished) return (
    <div style={{ maxWidth:"600px", margin:"0 auto", padding:"40px 20px", display:"flex", flexDirection:"column", gap:"20px" }}>
      <div style={{ fontSize:"10px", color:C.blue, letterSpacing:"3px", textTransform:"uppercase" }}>STEP 4 — 퀴즈 결과</div>
      <div style={{ fontSize:"28px", fontWeight:"800", color:C.text }}>
        {score === 5 ? "🏅 완벽!" : score >= 3 ? "✓ 잘했어요!" : "📖 복습이 필요해요"}
      </div>
      <div style={{ fontSize:"14px", color:C.dim }}>{quizSet.length}문제 중 <span style={{ color:score>=4?C.green:score>=2?C.blue:C.red, fontWeight:"700" }}>{score}문제</span> 정답</div>
      {/* 답안 복기 */}
      <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
        {quizSet.map((qz,i) => {
          const pp = PRINCIPLES.find(pp=>pp.id===qz.pid);
          const ans = answers[i];
          const chosen = PRINCIPLES.find(pp=>pp.id===ans?.chosen);
          return (
            <div key={i} style={{ padding:"12px 16px", background:C.surface, borderRadius:"8px",
              border:`1px solid ${ans?.correct?C.green:C.red}33` }}>
              <div style={{ display:"flex", gap:"8px", alignItems:"flex-start", marginBottom:"6px" }}>
                <span style={{ fontSize:"10px", color:ans?.correct?"#7ada9a":"#da7a7a", fontWeight:"700", flexShrink:0 }}>{ans?.correct?"✓":"✗"}</span>
                <div style={{ fontSize:"10px", color:"#bbb", lineHeight:1.7 }}>{qz.q}</div>
              </div>
              <div style={{ display:"flex", gap:"8px", fontSize:"9px" }}>
                <span style={{ color:C.dim }}>정답: <span style={{ color:TAG[pp?.tag||"비례"], fontWeight:"700" }}>{pp?.full}</span></span>
                {!ans?.correct && <span style={{ color:"#666" }}>내 답: {chosen?.full}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={() => { setCurrent(0); setAnswers({}); setSelected(null); setFinished(false); }}
        style={{ padding:"12px", background:C.blue, border:"none", borderRadius:"6px", color:"#fff",
          fontSize:"11px", fontWeight:"700", cursor:"pointer", letterSpacing:"2px" }}>
        다시 풀기 (같은 문제)
      </button>
    </div>
  );

  if (!p) return null;

  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 55px)" }}>
      {/* 좌: 퀴즈 포스터 */}
      <div style={{ width:"320px", flexShrink:0, padding:"20px", display:"flex", flexDirection:"column", gap:"12px" }}>
        <div style={{ fontSize:"10px", color:C.blue, letterSpacing:"3px", textTransform:"uppercase" }}>
          STEP 4 — 원칙 식별 퀴즈
        </div>
        <div style={{ fontSize:"11px", color:C.dim, lineHeight:1.7 }}>
          포스터를 보고 어떤 레이아웃 원칙이 적용되었는지 맞춰보세요.
        </div>
        {/* 진도 */}
        <div style={{ display:"flex", gap:"4px" }}>
          {quizSet.map((_,i) => (
            <div key={i} style={{ flex:1, height:"3px", borderRadius:"2px",
              background:i<current?C.green:i===current?C.blue:C.muted }}/>
          ))}
        </div>
        <div style={{ fontSize:"9px", color:C.dim }}>{current+1} / {quizSet.length}</div>
        {/* 포스터 */}
        <div style={{ position:"relative", paddingBottom:"141.4%", borderRadius:"8px",
          overflow:"hidden", border:`1px solid ${C.border}` }}>
          <div style={{ position:"absolute", inset:0 }}>
            <Poster p={p} kv={pData.kv} bgColor={pData.bgColor} bgImage={pData.bgImage}
              mainText={pData.main} subText={pData.sub} extra={pData.extra} fontFamily={pData.fontFamily}
              mainSize={18} mainWeight="700" mainColor="#ffffff"
              subSize={8} subWeight="400" subColor="#cccccc"
              showGuides={false} variant={q.variant}/>
          </div>
          {/* 정답 후 원칙 오버레이 표시 */}
          {answers[current] && (
            <div style={{ position:"absolute", bottom:0, left:0, right:0,
              background:`linear-gradient(to top, rgba(0,0,0,0.85), transparent)`,
              padding:"20px 12px 10px", display:"flex", gap:"5px", flexWrap:"wrap" }}>
              {p.keywords.slice(0,3).map((kw,i) => (
                <span key={i} style={{ fontSize:"7px", padding:"2px 7px", borderRadius:"8px",
                  background:`${TAG[p.tag]}33`, color:TAG[p.tag], letterSpacing:"0.5px" }}>{kw}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 우: 문제 + 선택지 */}
      <div style={{ flex:1, padding:"20px", display:"flex", flexDirection:"column", gap:"16px" }}>
        {/* 문제 */}
        <div style={{ padding:"18px 20px", background:C.surface, borderRadius:"10px",
          border:`1px solid ${C.border}`, marginTop:"40px" }}>
          <div style={{ fontSize:"9px", color:C.dim, letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>
            문제 {current+1}
          </div>
          <div style={{ fontSize:"15px", color:C.text, lineHeight:1.75, fontWeight:"600" }}>{q.q}</div>
        </div>

        {/* 선택지 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
          {choices.map(ch => {
            const ans = answers[current];
            const isChosen = selected===ch.id;
            const isCorrect = ch.id===q.correct;
            let bg = C.bg, border = `1px solid ${C.border}`, textColor = "#888";
            if (ans) {
              if (isCorrect) { bg="rgba(74,180,120,0.12)"; border=`1px solid ${C.green}`; textColor="#7ada9a"; }
              else if (isChosen) { bg="rgba(200,80,80,0.1)"; border="1px solid rgba(200,80,80,0.5)"; textColor="#da7a7a"; }
            } else if (isChosen) {
              bg=`${C.blue}22`; border=`1px solid ${C.blue}66`; textColor=C.text;
            }
            return (
              <div key={ch.id} onClick={() => choose(ch.id)}
                style={{ padding:"14px 16px", background:bg, border, borderRadius:"8px",
                  cursor:ans?"default":"pointer", transition:"all 0.18s",
                  display:"flex", gap:"10px", alignItems:"flex-start" }}>
                <div style={{ width:"18px", height:"18px", borderRadius:"50%",
                  background:ans&&isCorrect?"rgba(74,180,120,0.3)":isChosen&&!ans?`${C.blue}33`:"rgba(255,255,255,0.06)",
                  border:`1px solid ${ans&&isCorrect?C.green:isChosen&&!ans?C.blue:C.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:"8px",
                  color:ans&&isCorrect?"#7ada9a":ans&&isChosen?"#da7a7a":"#fff", flexShrink:0, marginTop:"1px" }}>
                  {ans&&isCorrect?"✓":ans&&isChosen?"✗":""}
                </div>
                <div>
                  <div style={{ fontSize:"11px", color:textColor, fontWeight:isCorrect&&ans?"700":"400", marginBottom:"2px" }}>
                    {ch.name}
                  </div>
                  <div style={{ fontSize:"8px", color:C.muted }}>{ch.tag} · {ch.grid==="bento"?"벤토":"58U"}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 정답 후 해설 */}
        {answers[current] && (
          <div style={{ padding:"14px 16px", background:`${TAG[p.tag]}0a`, borderRadius:"8px",
            border:`1px solid ${TAG[p.tag]}33`, animation:"fadeIn 0.3s" }}>
            <div style={{ fontSize:"8px", color:TAG[p.tag], letterSpacing:"2px", textTransform:"uppercase", marginBottom:"6px" }}>
              {answers[current].correct ? "✓ 정답입니다!" : "✗ 오답 — 정답은:"}
            </div>
            <div style={{ fontSize:"11px", color:C.text, fontWeight:"700", marginBottom:"6px" }}>{p.full}</div>
            <div style={{ fontSize:"10px", color:"#888", lineHeight:1.75 }}>{p.concept}</div>
          </div>
        )}

        {/* 다음 버튼 */}
        {answers[current] && (
          <button onClick={next}
            style={{ padding:"12px 24px", background:C.blue, border:"none", borderRadius:"6px",
              color:"#fff", fontSize:"11px", fontWeight:"700", cursor:"pointer", letterSpacing:"1.5px",
              alignSelf:"flex-start" }}>
            {current+1>=quizSet.length ? "결과 보기" : "다음 문제 →"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
export default function LayoutStudio() {
  const STEPS = [
    {id:"material",label:"① 소재"},
    {id:"learn",   label:"② 학습"},
    {id:"compare", label:"③ 비교"},
    {id:"quiz",    label:"④ 퀴즈"},
  ];

  // 소재 상태
  const [step, setStep]           = useState("material");
  const [kv, setKv]               = useState(null);
  const [bgImage, setBgImage]     = useState(null);
  const [bgColor, setBgColor]     = useState("#0d1117");
  const [bgMode, setBgMode]       = useState("color");
  const [mainText, setMainText]   = useState("");
  const [subText, setSubText]     = useState("");
  const [artist, setArtist]       = useState("");
  const [brand, setBrand]         = useState("");
  // 타이포
  const [typoMode, setTypoMode]   = useState(false);
  const [fontKey, setFontKey]     = useState("sans");
  const [mainSize, setMainSize]   = useState(18);
  const [mainWeight, setMainWeight] = useState("700");
  const [mainColor, setMainColor] = useState("#ffffff");
  const [subSize, setSubSize]     = useState(8);
  const [subWeight, setSubWeight] = useState("400");
  const [subColor, setSubColor]   = useState("#cccccc");
  // 학습
  const [selLearn, setSelLearn]   = useState(PRINCIPLES[0].id);
  const [taskAnswered, setTaskAnswered] = useState({});
  const [predictions, setPredictions]  = useState({});
  const [predInput, setPredInput]      = useState("");
  const [showBaseline, setShowBaseline] = useState(false);
  // 비교
  const [selected, setSelected]   = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [reason, setReason]       = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [records, setRecords]     = useState([]);
  const [showBadge, setShowBadge] = useState(false);
  const [showLog, setShowLog]     = useState(false);
  const [showReflect, setShowReflect] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saveTarget, setSaveTarget] = useState(null);
  // 변형(variant) — 원칙별 랜덤 변형 인덱스
  const [variants, setVariants]   = useState(() => {
    const v = {};
    PRINCIPLES.forEach(p => { v[p.id] = 0; });
    return v;
  });
  const shuffleVariant = (pid) => setVariants(prev => ({...prev, [pid]: (prev[pid]+1) % 3}));
  const shuffleAll = () => setVariants(prev => {
    const next = {...prev};
    PRINCIPLES.forEach(p => { next[p.id] = Math.floor(Math.random()*3); });
    return next;
  });

  const kvRef = useRef(), bgRef = useRef();
  const handleImg = useCallback((file, setter) => {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader(); r.onload = e => setter(e.target.result); r.readAsDataURL(file);
  }, []);

  const extra = [artist, brand].filter(Boolean).join(" × ") || "ARTIST × BRAND";
  const fontFamily = FONTS[fontKey].family;
  const sel = selected ? PRINCIPLES.find(p => p.id===selected) : null;
  const learnP = PRINCIPLES.find(p => p.id===selLearn) || PRINCIPLES[0];

  const pData = {
    main: mainText||"MAIN TITLE", sub: subText||"Subtitle text",
    extra, artist, brand, kv,
    bgColor: bgMode==="color" ? bgColor : null,
    bgImage: bgMode==="image" ? bgImage : null,
    fontFamily,
    mainSize:   typoMode ? mainSize   : 18,
    mainWeight: typoMode ? mainWeight : "700",
    mainColor:  typoMode ? mainColor  : "#ffffff",
    subSize:    typoMode ? subSize    : 8,
    subWeight:  typoMode ? subWeight  : "400",
    subColor:   typoMode ? subColor   : "#cccccc",
  };

  const submitSelection = () => {
    if (!sel || !reason.trim()) return;
    setRecords(prev => [...prev, {
      selected: sel.id, reason,
      prediction: predictions[sel.id]||"",
      taskCorrect: taskAnswered[sel.id]?.correct||false,
      timestamp: new Date().toLocaleTimeString("ko-KR"),
    }]);
    setSubmitted(true);
    setShowReflect(true);
  };

  // ─── 이미지 저장 (개선) ───────────────────────────────────────
  // html2canvas CDN 로드 → 3× 고해상도 캡처 → PNG 자동 다운로드
  // 실패 시 우클릭 안내 오버레이 표시
  const savePoster = useCallback(async (pid) => {
    if (!pid) return;
    const targetP = PRINCIPLES.find(p => p.id===pid);
    if (!targetP) return;
    setDownloading(true);
    setSaveTarget(pid);
    try {
      // html2canvas 로드
      if (!window.html2canvas) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      // 저장 대상 엘리먼트 탐색
      const el = document.querySelector(`[data-savepid="${pid}"]`);
      if (!el) throw new Error("element not found");

      // 고해상도 캡처
      const canvas = await window.html2canvas(el, {
        scale: 3, useCORS: true, allowTaint: true,
        backgroundColor: null, logging: false,
      });

      // PNG 다운로드
      const a = document.createElement("a");
      a.download = `${targetP.num}_${targetP.name.replace(/[^가-힣a-zA-Z0-9]/g,"_")}.png`;
      a.href = canvas.toDataURL("image/png");
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch {
      // 실패 시 안내 오버레이 (setSaveTarget으로 표시, 3초 후 해제)
      setTimeout(() => setSaveTarget(null), 3000);
    } finally {
      setDownloading(false);
      setTimeout(() => setSaveTarget(null), 500);
    }
  }, []);

  const inp = { width:"100%", background:"#111318", border:`1px solid ${C.border}`, borderRadius:"5px", color:C.text, fontSize:"11px", padding:"8px 10px", boxSizing:"border-box", outline:"none", fontFamily:"inherit" };
  const bento  = PRINCIPLES.filter(p => p.grid==="bento");
  const gerstner = PRINCIPLES.filter(p => p.grid==="gerstner");
  const comparePairs = compareIds.map(id => PRINCIPLES.find(p => p.id===id)).filter(Boolean);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Helvetica Neue',Arial,sans-serif" }}>
      {/* 모달 */}
      {showCaption && sel && <CaptionModal p={sel} data={pData} prediction={predictions[sel.id]||""} taskResult={taskAnswered[sel.id]} onClose={() => setShowCaption(false)}/>}
      {showBadge && <BadgeModal taskAnswered={taskAnswered} onClose={() => setShowBadge(false)}/>}
      {showLog && <MyLogModal records={records} onClose={() => setShowLog(false)}/>}
      {showReflect && sel && <ReflectionScreen sel={sel} data={pData} taskResult={taskAnswered[sel.id]} prediction={predictions[sel.id]||""} reason={reason} onClose={() => setShowReflect(false)}/>}

      {/* 상단바 */}
      <div style={{ borderBottom:`1px solid ${C.border}`, padding:"10px 22px", background:C.surface, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
        <div>
          <div style={{ fontSize:"8px", color:C.muted, letterSpacing:"3px", textTransform:"uppercase", marginBottom:"2px" }}>건국대학교 영상학과 · AI & DESIGN · 6강</div>
          <div style={{ fontSize:"14px", fontWeight:"700" }}>LAYOUT STUDIO <span style={{ color:C.blue, fontSize:"11px", fontWeight:"400" }}>레이아웃의 원리와 시각적 조직화</span></div>
        </div>
        <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
          {/* 학습 진도 바 */}
          <div style={{ display:"flex", alignItems:"center", gap:"6px", padding:"4px 10px",
            background:C.bg, borderRadius:"12px", border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:"8px", color:C.dim, whiteSpace:"nowrap" }}>진도</div>
            <div style={{ width:"60px", height:"4px", background:C.muted, borderRadius:"3px", overflow:"hidden" }}>
              <div style={{ width:`${Math.round((Object.keys(taskAnswered).length/PRINCIPLES.length)*100)}%`,
                height:"100%", background:Object.keys(taskAnswered).length===PRINCIPLES.length?C.green:C.blue,
                borderRadius:"3px", transition:"width 0.4s" }}/>
            </div>
            <div style={{ fontSize:"8px", color:C.dim, whiteSpace:"nowrap" }}>
              {Object.keys(taskAnswered).length}/{PRINCIPLES.length}
            </div>
          </div>
          {/* 탭 버튼 */}
          {STEPS.map(s => (
            <button key={s.id} onClick={() => setStep(s.id)}
              style={{ padding:"5px 12px", background:step===s.id?C.blue:"transparent",
                border:step===s.id?`1px solid ${C.blue}`:`1px solid ${C.border}`,
                borderRadius:"16px", color:step===s.id?"#fff":C.dim,
                fontSize:"9px", fontWeight:"700", cursor:"pointer", letterSpacing:"0.5px", transition:"all 0.15s" }}>
              {s.label}
            </button>
          ))}
          {/* 기능 A: 뱃지 */}
          <button onClick={() => setShowBadge(true)}
            style={{ padding:"5px 11px", background:"transparent",
              border:`1px solid ${C.gold}55`, borderRadius:"16px", color:C.gold,
              fontSize:"9px", fontWeight:"700", cursor:"pointer" }}>
            🏅 뱃지
          </button>
          {/* 기능 C: 메모장 */}
          <button onClick={() => setShowLog(true)}
            style={{ padding:"5px 11px", background:"transparent",
              border:`1px solid ${C.green}55`, borderRadius:"16px", color:C.green,
              fontSize:"9px", fontWeight:"700", cursor:"pointer" }}>
            📋 메모장{records.length > 0 ? ` (${records.length})` : ""}
          </button>
        </div>
      </div>

      {/* ══ STEP 1: 소재 ═══════════════════════════════════════ */}
      {step==="material" && (
        <div style={{ maxWidth:"660px", margin:"0 auto", padding:"32px 20px" }}>
          <div style={{ marginBottom:"24px" }}>
            <div style={{ fontSize:"10px", color:C.blue, letterSpacing:"3px", textTransform:"uppercase", marginBottom:"8px" }}>STEP 1 — 소재 입력</div>
            <div style={{ fontSize:"21px", fontWeight:"700", marginBottom:"8px" }}>포스터 소재를 입력하세요</div>
            <div style={{ fontSize:"11px", color:C.dim, lineHeight:1.8 }}>아티스트, 브랜드, 텍스트, 이미지를 입력합니다.</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"13px" }}>
            {/* 키비주얼 */}
            <div>
              <div style={{ fontSize:"9px", color:C.dim, marginBottom:"5px", letterSpacing:"1px" }}>KEY VISUAL — 이미지 모듈</div>
              <div onClick={() => kvRef.current.click()}
                style={{ border:`1px dashed ${C.border}`, borderRadius:"6px", padding:"14px", textAlign:"center", cursor:"pointer", minHeight:kv?"auto":"76px", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", background:C.surface }}>
                {kv ? <><img src={kv} alt="" style={{ width:"100%", borderRadius:"4px", maxHeight:"150px", objectFit:"cover" }}/><div style={{ fontSize:"8px", color:C.muted, marginTop:"6px" }}>클릭하여 변경</div></>
                     : <><div style={{ fontSize:"22px", color:C.muted, marginBottom:"5px" }}>⊕</div><div style={{ fontSize:"10px", color:C.muted }}>이미지 드롭 또는 클릭 (JPG·PNG·WEBP)</div></>}
              </div>
              <input ref={kvRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => handleImg(e.target.files[0], setKv)}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
              {[{label:"ARTIST NAME",val:artist,set:setArtist,ph:"예: Wassily Kandinsky"},{label:"BRAND NAME",val:brand,set:setBrand,ph:"예: NIKE"}].map(({ label,val,set,ph }) => (
                <div key={label}>
                  <div style={{ fontSize:"9px", color:C.dim, marginBottom:"4px", letterSpacing:"1px" }}>{label}</div>
                  <input type="text" value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={{ ...inp, fontSize:"12px" }}/>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:"9px", color:C.dim, marginBottom:"4px", letterSpacing:"1px" }}>MAIN TEXT ✱</div>
              <input type="text" value={mainText} onChange={e=>setMainText(e.target.value)} placeholder="예: BEYOND FORM" style={{ ...inp, fontSize:"15px", padding:"10px 12px" }}/>
            </div>
            <div>
              <div style={{ fontSize:"9px", color:C.dim, marginBottom:"4px", letterSpacing:"1px" }}>SUB TEXT</div>
              <textarea value={subText} onChange={e=>setSubText(e.target.value)} placeholder="예: Where art meets motion." style={{ ...inp, resize:"vertical", minHeight:"56px" }}/>
            </div>
            {/* 배경 */}
            <div>
              <div style={{ fontSize:"9px", color:C.dim, marginBottom:"5px", letterSpacing:"1px" }}>BACKGROUND</div>
              <div style={{ display:"flex", gap:"5px", marginBottom:"8px" }}>
                {[["color","단색"],["image","이미지"]].map(([m,l]) => (
                  <button key={m} onClick={() => setBgMode(m)}
                    style={{ padding:"5px 14px", background:bgMode===m?C.blue:"transparent", border:bgMode===m?`1px solid ${C.blue}`:`1px solid ${C.border}`, borderRadius:"4px", color:bgMode===m?"#fff":C.dim, fontSize:"9px", cursor:"pointer" }}>{l}</button>
                ))}
              </div>
              {bgMode==="color"
                ? <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                    <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)} style={{ width:"36px", height:"36px", padding:"2px", border:`1px solid ${C.border}`, borderRadius:"4px", cursor:"pointer" }}/>
                    <input type="text" value={bgColor} onChange={e=>{ if(/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value))setBgColor(e.target.value); }} style={{ ...inp, width:"130px", fontFamily:"monospace" }} placeholder="#0d1117"/>
                  </div>
                : <div>
                    <div onClick={() => bgRef.current.click()} style={{ border:`1px dashed ${C.border}`, borderRadius:"4px", padding:"10px", textAlign:"center", cursor:"pointer", background:C.surface, minHeight:"50px", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
                      {bgImage ? <><img src={bgImage} alt="" style={{ width:"100%", borderRadius:"3px", maxHeight:"70px", objectFit:"cover" }}/><div style={{ fontSize:"8px", color:C.muted, marginTop:"4px" }}>클릭하여 변경</div></>
                               : <><div style={{ fontSize:"14px", color:C.muted }}>⊕</div><div style={{ fontSize:"9px", color:C.muted }}>배경 이미지</div></>}
                    </div>
                    <input ref={bgRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => handleImg(e.target.files[0], setBgImage)}/>
                  </div>}
            </div>
          </div>
          <button onClick={() => { if (!mainText.trim()) { alert("메인 텍스트를 입력해주세요."); return; } setStep("learn"); }}
            style={{ width:"100%", padding:"13px", background:C.blue, border:"none", borderRadius:"6px", color:"#fff", fontSize:"12px", fontWeight:"700", cursor:"pointer", letterSpacing:"2px", marginTop:"18px" }}>
            다음 — 원칙 학습 →
          </button>
        </div>
      )}

      {/* ══ STEP 2: 학습 ═══════════════════════════════════════ */}
      {step==="learn" && (
        <div style={{ maxWidth:"960px", margin:"0 auto", padding:"20px", display:"flex", flexDirection:"column", gap:"16px" }}>
          <div>
            <div style={{ fontSize:"10px", color:C.blue, letterSpacing:"3px", textTransform:"uppercase", marginBottom:"4px" }}>STEP 2 — 원칙 학습</div>
            <div style={{ fontSize:"11px", color:C.dim, lineHeight:1.7 }}>분류 맵에서 원칙 선택 → 개념 학습 → 시각적 예측 과제 완료. 완료한 원칙은 녹색 점으로 표시됩니다.</div>
          </div>

          {/* 원칙 분류 맵 */}
          <PrincipleMap selected={selLearn} onSelect={id => { setSelLearn(id); setPredInput(predictions[id]||""); setShowBaseline(false); }} taskDone={taskAnswered}/>

          {/* 선택된 원칙 학습 카드 */}
          <div style={{ background:C.surface, borderRadius:"10px", border:`1px solid ${TAG[learnP.tag]}33`, padding:"18px", display:"flex", gap:"18px" }}>
            {/* 대형 포스터 미리보기 */}
            <div style={{ width:"190px", flexShrink:0 }}>
              <div style={{ marginBottom:"5px", textAlign:"center" }}>
                <button onClick={() => setShowBaseline(v=>!v)}
                  style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:"10px", color:C.dim, fontSize:"7px", cursor:"pointer", padding:"2px 8px" }}>
                  {showBaseline ? "← 원칙 보기" : "⇄ 기준과 비교"}
                </button>
              </div>
              <div style={{ position:"relative", paddingBottom:"141.4%", borderRadius:"6px", overflow:"hidden", border:`1px solid ${TAG[learnP.tag]}44` }}>
                <div style={{ position:"absolute", inset:0 }}>
                  {showBaseline
                    ? <BaselinePoster mainText={pData.main} subText={pData.sub} extra={pData.extra} kv={pData.kv} bgColor={pData.bgColor} bgImage={pData.bgImage} fontFamily={pData.fontFamily}/>
                    : <Poster p={learnP} kv={pData.kv} bgColor={pData.bgColor} bgImage={pData.bgImage} mainText={pData.main} subText={pData.sub} extra={pData.extra} fontFamily={pData.fontFamily} mainSize={18} mainWeight="700" mainColor="#ffffff" subSize={8} subWeight="400" subColor="#cccccc" showGuides/>}
                </div>
              </div>
              <div style={{ fontSize:"6px", color:C.muted, marginTop:"4px", textAlign:"center" }}>
                {showBaseline ? "기준: 원칙 미적용" : "내 소재 · 그리드 가이드"}
              </div>
            </div>

            {/* 학습 내용 */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"12px" }}>
              <div>
                <div style={{ display:"flex", gap:"5px", marginBottom:"8px" }}>
                  <span style={{ fontSize:"7px", fontWeight:"700", padding:"2px 8px", borderRadius:"4px", background:`${TAG[learnP.tag]}22`, border:`1px solid ${TAG[learnP.tag]}44`, color:TAG[learnP.tag], letterSpacing:"1px" }}>{learnP.tag}</span>
                  <span style={{ fontSize:"7px", fontWeight:"700", padding:"2px 8px", borderRadius:"4px", background:`${GRID[learnP.grid]}22`, border:`1px solid ${GRID[learnP.grid]}44`, color:GRID[learnP.grid] }}>{learnP.grid==="bento"?"벤토 그리드 4×6":"게르스트너 58유닛"}</span>
                </div>
                <div style={{ fontSize:"17px", fontWeight:"800", marginBottom:"4px" }}>{learnP.full}</div>
                <div style={{ fontSize:"10px", color:C.dim, marginBottom:"10px" }}>{learnP.en}</div>
                <div style={{ fontSize:"11px", color:"#aaa", lineHeight:1.85, padding:"10px 14px", background:C.bg, borderRadius:"6px", borderLeft:`3px solid ${GRID[learnP.grid]}` }}>{learnP.concept}</div>
              </div>
              {/* 키워드 */}
              <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                {learnP.keywords.map((kw,i) => (
                  <div key={i} style={{ fontSize:"8px", padding:"3px 9px", borderRadius:"12px", background:C.bg, border:`1px solid ${C.border}`, color:C.dim }}>{kw}</div>
                ))}
              </div>
              {/* 아티스트 컨텍스트 */}
              <div style={{ padding:"9px 13px", background:`${TAG[learnP.tag]}0a`, borderRadius:"6px", border:`1px solid ${TAG[learnP.tag]}22` }}>
                <div style={{ fontSize:"7px", color:TAG[learnP.tag], letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:"4px" }}>🎨 내 소재에서의 의미</div>
                <div style={{ fontSize:"10px", color:"#888", lineHeight:1.75 }}>{learnP.artistContext(artist, brand)}</div>
              </div>
              {/* 부적합 사례 */}
              <div style={{ padding:"8px 12px", background:"rgba(158,92,92,0.05)", borderRadius:"5px", border:"1px solid rgba(158,92,92,0.18)" }}>
                <div style={{ fontSize:"7px", color:"#9e6060", letterSpacing:"1.5px", marginBottom:"4px" }}>⚠ 이 원칙이 맞지 않는 경우</div>
                <div style={{ fontSize:"9px", color:"#7a5555", lineHeight:1.7 }}>{learnP.mismatch}</div>
              </div>
              {/* 시각적 예측 과제 */}
              <div style={{ padding:"13px 15px", background:C.bg, borderRadius:"8px", border:`1px solid ${TAG[learnP.tag]}33` }}>
                <div style={{ fontSize:"8px", color:TAG[learnP.tag], letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>🎯 시각적 예측 과제</div>
                <VisualTask p={learnP} onAnswer={(correct,id) => setTaskAnswered(prev => ({...prev, [learnP.id]:{correct,answerId:id}}))} answered={!!taskAnswered[learnP.id]} pData={pData}/>
                {taskAnswered[learnP.id] && (
                  <div style={{ marginTop:"10px", padding:"8px 12px", background:taskAnswered[learnP.id].correct?"rgba(74,180,120,0.1)":"rgba(200,80,80,0.1)", borderRadius:"5px", border:`1px solid ${taskAnswered[learnP.id].correct?"rgba(74,180,120,0.3)":"rgba(200,80,80,0.3)"}` }}>
                    <div style={{ fontSize:"10px", color:taskAnswered[learnP.id].correct?"#7ada9a":"#da7a7a", fontWeight:"700", marginBottom:"3px" }}>{taskAnswered[learnP.id].correct?"✓ 정확히 이해했습니다!":"✗ 이해를 재확인해보세요"}</div>
                    <div style={{ fontSize:"9px", color:"#777", lineHeight:1.65 }}>{learnP.visualQ?.hint}</div>
                  </div>
                )}
              </div>
              {/* 서술 예측 (선택) */}
              <div>
                <div style={{ fontSize:"8px", color:C.dim, marginBottom:"4px", letterSpacing:"1px" }}>추가 서술 (선택)</div>
                <textarea value={predInput} onChange={e => setPredInput(e.target.value)}
                  placeholder="이 원칙을 내 포스터에 어떻게 활용할지 생각을 적어보세요..."
                  style={{ ...inp, resize:"vertical", minHeight:"46px", fontSize:"10px" }}/>
                {predInput.trim() && <button onClick={() => setPredictions(prev => ({...prev,[learnP.id]:predInput}))}
                  style={{ marginTop:"4px", padding:"5px 14px", background:C.blue, border:"none", borderRadius:"4px", color:"#fff", fontSize:"9px", fontWeight:"700", cursor:"pointer" }}>
                  저장 {predictions[learnP.id]&&"✓"}
                </button>}
              </div>
              {/* 원칙 순환 버튼 */}
              <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                {PRINCIPLES.map(p => (
                  <button key={p.id} onClick={() => { setSelLearn(p.id); setPredInput(predictions[p.id]||""); setShowBaseline(false); }}
                    style={{ width:"26px", height:"26px", borderRadius:"50%", background:selLearn===p.id?TAG[p.tag]:`${TAG[p.tag]}22`, border:selLearn===p.id?`2px solid ${TAG[p.tag]}`:`1px solid ${TAG[p.tag]}44`, color:selLearn===p.id?"#fff":TAG[p.tag], fontSize:"7px", fontWeight:"700", cursor:"pointer", flexShrink:0, position:"relative" }}>
                    {p.num}
                    {taskAnswered[p.id] && <div style={{ position:"absolute", top:"-2px", right:"-2px", width:"7px", height:"7px", borderRadius:"50%", background:"#5c9e7a", border:`1px solid ${C.surface}` }}/>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:"9px", color:Object.keys(taskAnswered).length===PRINCIPLES.length?C.green:C.dim }}>
              과제 완료: {Object.keys(taskAnswered).length} / {PRINCIPLES.length}
            </div>
            <button onClick={() => setStep("compare")}
              style={{ padding:"10px 24px", background:Object.keys(taskAnswered).length>0?C.blue:"#1a1a1a", border:"none", borderRadius:"5px", color:Object.keys(taskAnswered).length>0?"#fff":C.muted, fontSize:"10px", fontWeight:"700", cursor:"pointer", letterSpacing:"1px" }}>
              비교 단계로 →
            </button>
          </div>
        </div>
      )}

      {/* ══ STEP 3: 비교 ═══════════════════════════════════════ */}
      {step==="compare" && (
        <div style={{ display:"flex", minHeight:"calc(100vh - 55px)" }}>
          {/* 사이드바 */}
          <div style={{ width:"218px", flexShrink:0, borderRight:`1px solid ${C.border}`, background:C.surface, padding:"13px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"9px" }}>
            {/* 자유 실험 모드 */}
            <div style={{ padding:"9px", background:C.bg, borderRadius:"5px", border:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:typoMode?"10px":"0" }}>
                <div style={{ fontSize:"8px", color:C.dim, letterSpacing:"1px" }}>자유 실험 모드</div>
                <button onClick={() => setTypoMode(v=>!v)}
                  style={{ padding:"3px 10px", background:typoMode?C.blue:"transparent", border:typoMode?`1px solid ${C.blue}`:`1px solid ${C.border}`, borderRadius:"10px", color:typoMode?"#fff":C.dim, fontSize:"8px", cursor:"pointer", fontWeight:"700" }}>
                  {typoMode?"ON":"OFF"}
                </button>
              </div>
              {typoMode && <div style={{ display:"flex", flexDirection:"column", gap:"7px", marginTop:"10px" }}>
                <div style={{ display:"flex", gap:"4px" }}>
                  {Object.entries(FONTS).map(([k,f]) => (
                    <button key={k} onClick={() => setFontKey(k)}
                      style={{ flex:1, padding:"4px", background:fontKey===k?C.blue:"#161616", border:fontKey===k?`1px solid ${C.blue}`:`1px solid ${C.border}`, borderRadius:"3px", color:fontKey===k?"#fff":C.dim, cursor:"pointer" }}>
                      <div style={{ fontSize:"8px", fontWeight:"700", fontFamily:f.family }}>{f.label}</div>
                    </button>
                  ))}
                </div>
                {[
                  {label:"MAIN",min:12,max:48,val:mainSize,set:setMainSize,wVal:mainWeight,wSet:setMainWeight,cVal:mainColor,cSet:setMainColor,accent:C.blue},
                  {label:"SUB", min:6, max:18,val:subSize, set:setSubSize, wVal:subWeight, wSet:setSubWeight, cVal:subColor, cSet:setSubColor, accent:C.purple},
                ].map(row => (
                  <div key={row.label} style={{ padding:"7px", background:C.surface, borderRadius:"4px", border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:"7px", color:row.accent, letterSpacing:"1px", marginBottom:"5px" }}>{row.label}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px" }}>
                      <div style={{ fontSize:"7px", color:C.muted }}>크기</div>
                      <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                        <input type="range" min={row.min} max={row.max} value={row.val} onChange={e=>row.set(Number(e.target.value))} style={{ width:"70px", accentColor:row.accent }}/>
                        <div style={{ fontSize:"7px", color:row.accent, width:"22px" }}>{row.val}px</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:"2px", flexWrap:"wrap", marginBottom:"4px" }}>
                      {WEIGHTS.map(w => <button key={w.v} onClick={() => row.wSet(w.v)}
                        style={{ padding:"1px 4px", background:row.wVal===w.v?row.accent:"#161616", border:row.wVal===w.v?`1px solid ${row.accent}`:`1px solid ${C.border}`, borderRadius:"2px", color:row.wVal===w.v?"#fff":C.dim, fontSize:"6px", cursor:"pointer", fontFamily, fontWeight:w.v }}>{w.v}</button>)}
                    </div>
                    <div style={{ display:"flex", gap:"4px", alignItems:"center" }}>
                      <input type="color" value={row.cVal} onChange={e=>row.cSet(e.target.value)} style={{ width:"20px", height:"20px", border:`1px solid ${C.border}`, borderRadius:"2px", cursor:"pointer", padding:"1px" }}/>
                      <input type="text" value={row.cVal} onChange={e=>{ if(/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value))row.cSet(e.target.value); }} style={{ flex:1, background:"#161616", border:`1px solid ${C.border}`, borderRadius:"3px", color:C.text, fontSize:"8px", padding:"2px 5px", outline:"none", fontFamily:"monospace" }}/>
                    </div>
                  </div>
                ))}
              </div>}
            </div>
            {/* 뷰 옵션 */}
            <div style={{ display:"flex", gap:"4px" }}>
              <button onClick={() => setShowGuides(v=>!v)}
                style={{ flex:1, padding:"5px", background:showGuides?`${C.gold}22`:"transparent", border:showGuides?`1px solid ${C.gold}66`:`1px solid ${C.border}`, borderRadius:"4px", color:showGuides?C.gold:C.dim, fontSize:"8px", cursor:"pointer", fontWeight:"700" }}>
                📐 그리드
              </button>
              <button onClick={() => setCompareMode(v=>!v)}
                style={{ flex:1, padding:"5px", background:compareMode?`${C.blue}22`:"transparent", border:compareMode?`1px solid ${C.blue}66`:`1px solid ${C.border}`, borderRadius:"4px", color:compareMode?C.blue:C.dim, fontSize:"8px", cursor:"pointer", fontWeight:"700" }}>
                ⇄ 비교
              </button>
            </div>
            {/* 선택 이유 제출 */}
            {sel && !submitted && (
              <div style={{ padding:"9px", background:C.bg, borderRadius:"5px", border:`1px solid ${TAG[sel.tag]}28` }}>
                <div style={{ fontSize:"7px", color:TAG[sel.tag], letterSpacing:"1px", marginBottom:"5px" }}>{sel.num} {sel.name} 선택됨</div>
                {predictions[sel.id] && <div style={{ fontSize:"8px", color:C.dim, marginBottom:"5px", lineHeight:1.6, fontStyle:"italic", padding:"4px 7px", background:C.surface, borderRadius:"3px" }}>예측: {predictions[sel.id]}</div>}
                {taskAnswered[sel.id] && <div style={{ fontSize:"8px", color:taskAnswered[sel.id].correct?"#5c9e7a":"#9e5c5c", marginBottom:"5px" }}>시각 과제: {taskAnswered[sel.id].correct?"✓ 정답":"✗ 오답"}</div>}
                <div style={{ fontSize:"8px", color:C.dim, marginBottom:"3px" }}>선택 이유 ✱</div>
                <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="어떤 점이 내 포스터에 적합한가요?" style={{ ...inp, resize:"vertical", minHeight:"44px", fontSize:"9px", marginBottom:"5px" }}/>
                <div style={{ display:"flex", gap:"4px" }}>
                  <button onClick={() => setShowCaption(true)} style={{ flex:1, padding:"5px", background:"transparent", border:`1px solid ${TAG[sel.tag]}55`, borderRadius:"3px", color:TAG[sel.tag], fontSize:"7px", fontWeight:"700", cursor:"pointer" }}>📖 원칙 확인</button>
                  <button onClick={submitSelection} disabled={!reason.trim()} style={{ flex:1, padding:"5px", background:reason.trim()?"#4a7a4a":"#1a1a1a", border:"none", borderRadius:"3px", color:reason.trim()?"#fff":C.muted, fontSize:"7px", fontWeight:"700", cursor:reason.trim()?"pointer":"default" }}>제출 ✓</button>
                </div>
              </div>
            )}
            {sel && submitted && (
              <div style={{ padding:"9px", background:"rgba(74,120,74,0.08)", borderRadius:"5px", border:"1px solid rgba(74,120,74,0.3)" }}>
                <div style={{ fontSize:"10px", color:"#5c9e5c", fontWeight:"700", marginBottom:"4px" }}>✓ 제출 완료</div>
                <div style={{ display:"flex", gap:"4px", marginTop:"5px" }}>
                  <button onClick={() => setShowCaption(true)} style={{ flex:1, padding:"5px", background:"transparent", border:`1px solid ${TAG[sel.tag]}55`, borderRadius:"3px", color:TAG[sel.tag], fontSize:"7px", fontWeight:"700", cursor:"pointer" }}>📖 원칙</button>
                  <button onClick={() => setShowReflect(true)} style={{ flex:1, padding:"5px", background:"transparent", border:`1px solid ${C.green}55`, borderRadius:"3px", color:C.green, fontSize:"7px", fontWeight:"700", cursor:"pointer" }}>💬 성찰</button>
                  <button onClick={() => savePoster(sel.id)} disabled={downloading} style={{ flex:1, padding:"5px", background:downloading?"transparent":TAG[sel.tag], border:downloading?`1px solid ${C.border}`:"none", borderRadius:"3px", color:downloading?C.muted:"#fff", fontSize:"7px", fontWeight:"700", cursor:downloading?"default":"pointer" }}>{downloading?"⏳":"⬇ PNG"}</button>
                </div>
              </div>
            )}
          </div>

          {/* 메인 그리드 */}
          <div style={{ flex:1, padding:"14px", overflowY:"auto" }}>
            {/* 비교 모드 */}
            {compareMode && comparePairs.length>=2 && (
              <div style={{ marginBottom:"16px" }}>
                <div style={{ fontSize:"9px", color:C.blue, letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>⇄ 나란히 비교</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"10px" }}>
                  {comparePairs.map(p => (
                    <div key={p.id}>
                      <div style={{ position:"relative", paddingBottom:"141.4%", borderRadius:"8px", overflow:"hidden", border:`2px solid ${TAG[p.tag]}`, marginBottom:"8px" }}>
                        <div style={{ position:"absolute", inset:0 }} data-pid={p.id}>
                          <Poster p={p} kv={pData.kv} bgColor={pData.bgColor} bgImage={pData.bgImage} mainText={pData.main} subText={pData.sub} extra={pData.extra} fontFamily={pData.fontFamily} mainSize={pData.mainSize} mainWeight={pData.mainWeight} mainColor={pData.mainColor} subSize={pData.subSize} subWeight={pData.subWeight} subColor={pData.subColor} showGuides={showGuides}/>
                        </div>
                      </div>
                      <div style={{ padding:"10px 12px", background:C.surface, borderRadius:"6px", border:`1px solid ${TAG[p.tag]}33` }}>
                        <div style={{ display:"flex", gap:"4px", marginBottom:"4px" }}>
                          <span style={{ fontSize:"7px", padding:"1px 5px", borderRadius:"3px", background:`${TAG[p.tag]}22`, color:TAG[p.tag] }}>{p.tag}</span>
                          <span style={{ fontSize:"7px", padding:"1px 5px", borderRadius:"3px", background:`${GRID[p.grid]}22`, color:GRID[p.grid] }}>{p.grid==="bento"?"벤토":"58U"}</span>
                        </div>
                        <div style={{ fontSize:"11px", fontWeight:"700", color:C.text, marginBottom:"3px" }}>{p.full}</div>
                        <div style={{ fontSize:"9px", color:C.dim, lineHeight:1.65 }}>{p.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding:"10px 14px", background:C.surface, borderRadius:"6px", border:`1px solid ${C.border}`, fontSize:"9px", color:C.muted, lineHeight:1.8 }}>
                  💬 두 레이아웃의 공통점과 차이점은? 같은 소재에서 어떤 원칙이 더 효과적인가요?
                </div>
                <div style={{ borderTop:`1px solid ${C.border}`, margin:"14px 0" }}/>
              </div>
            )}

            {/* 선택된 포스터 대형 뷰 */}
            {selected && !compareMode && sel && (
              <div style={{ marginBottom:"14px", display:"flex", gap:"16px", alignItems:"flex-start" }}>
                {/* 대형 포스터 + 저장 버튼 */}
                <div style={{ flex:"0 0 250px" }}>
                  {/* 저장용 고해상도 렌더 타겟 */}
                  <div style={{ position:"relative", paddingBottom:"141.4%", borderRadius:"8px",
                    overflow:"hidden", border:`2px solid ${TAG[sel.tag]}`,
                    boxShadow:`0 0 24px ${TAG[sel.tag]}22` }}>
                    <div style={{ position:"absolute", inset:0 }} data-savepid={sel.id}>
                      <Poster p={sel} kv={pData.kv} bgColor={pData.bgColor} bgImage={pData.bgImage}
                        mainText={pData.main} subText={pData.sub} extra={pData.extra} fontFamily={pData.fontFamily}
                        mainSize={pData.mainSize} mainWeight={pData.mainWeight} mainColor={pData.mainColor}
                        subSize={pData.subSize} subWeight={pData.subWeight} subColor={pData.subColor}
                        showGuides={showGuides} variant={variants[sel.id]||0}/>
                    </div>
                    {/* 저장 실패 시 안내 오버레이 */}
                    {saveTarget===sel.id && downloading===false && (
                      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.75)",
                        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                        gap:"8px", padding:"16px" }}>
                        <div style={{ fontSize:"10px", color:"#fff", textAlign:"center", lineHeight:1.8 }}>
                          이미지를 우클릭(또는 길게 누르기) 후<br/>
                          <strong>이미지 저장</strong>을 선택해 주세요
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 저장 버튼 */}
                  <button
                    onClick={() => savePoster(sel.id)}
                    disabled={downloading}
                    style={{ width:"100%", marginTop:"6px", padding:"8px", background:downloading?"#1a1a1a":TAG[sel.tag],
                      border:"none", borderRadius:"5px", color:downloading?C.muted:"#fff",
                      fontSize:"10px", fontWeight:"700", cursor:downloading?"default":"pointer",
                      letterSpacing:"1px", transition:"all 0.2s", display:"flex",
                      alignItems:"center", justifyContent:"center", gap:"6px" }}>
                    {downloading ? (
                      <><span style={{ fontSize:"12px" }}>⏳</span> 저장 중...</>
                    ) : (
                      <><span style={{ fontSize:"12px" }}>⬇</span> PNG로 저장</>
                    )}
                  </button>

                  <button onClick={() => setShowBaseline(v=>!v)}
                    style={{ width:"100%", marginTop:"5px", padding:"5px", background:"transparent",
                      border:`1px solid ${C.border}`, borderRadius:"4px", color:C.dim,
                      fontSize:"8px", cursor:"pointer" }}>
                    {showBaseline ? "▲ 기준 숨기기" : "⇄ 기준과 비교 (원칙 미적용)"}
                  </button>
                  {showBaseline && (
                    <div style={{ position:"relative", paddingBottom:"141.4%", borderRadius:"6px",
                      overflow:"hidden", border:`1px solid ${C.border}`, marginTop:"5px" }}>
                      <div style={{ position:"absolute", inset:0 }}>
                        <BaselinePoster mainText={pData.main} subText={pData.sub} extra={pData.extra}
                          kv={pData.kv} bgColor={pData.bgColor} bgImage={pData.bgImage} fontFamily={pData.fontFamily}/>
                      </div>
                    </div>
                  )}
                </div>

                {/* 원칙 설명 패널 */}
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:"5px", marginBottom:"8px" }}>
                    <span style={{ fontSize:"8px", padding:"2px 8px", borderRadius:"4px",
                      background:`${TAG[sel.tag]}22`, color:TAG[sel.tag], border:`1px solid ${TAG[sel.tag]}44` }}>
                      {sel.tag}
                    </span>
                    <span style={{ fontSize:"8px", padding:"2px 8px", borderRadius:"4px",
                      background:`${GRID[sel.grid]}22`, color:GRID[sel.grid], border:`1px solid ${GRID[sel.grid]}44` }}>
                      {sel.grid==="bento"?"벤토 그리드 4×6":"게르스트너 58유닛"}
                    </span>
                    {taskAnswered[sel.id] && (
                      <span style={{ fontSize:"8px", padding:"2px 8px", borderRadius:"4px",
                        background:taskAnswered[sel.id].correct?"rgba(92,158,122,0.2)":"rgba(158,92,92,0.2)",
                        color:taskAnswered[sel.id].correct?"#5c9e7a":"#9e5c5c" }}>
                        과제 {taskAnswered[sel.id].correct?"✓ 정답":"✗ 오답"}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:"17px", fontWeight:"800", marginBottom:"4px" }}>{sel.full}</div>
                  <div style={{ fontSize:"10px", color:C.dim, marginBottom:"12px" }}>{sel.en}</div>
                  <div style={{ fontSize:"11px", color:"#aaa", lineHeight:1.85, marginBottom:"10px" }}>{sel.concept}</div>
                  <div style={{ padding:"9px 12px", background:`${TAG[sel.tag]}08`, borderRadius:"6px",
                    border:`1px solid ${TAG[sel.tag]}22`, marginBottom:"10px" }}>
                    <div style={{ fontSize:"7px", color:TAG[sel.tag], letterSpacing:"1.5px", marginBottom:"4px" }}>🎨 내 소재에서의 의미</div>
                    <div style={{ fontSize:"10px", color:"#777", lineHeight:1.75 }}>{sel.artistContext(artist, brand)}</div>
                  </div>
                  <div style={{ padding:"8px 12px", background:"rgba(158,92,92,0.05)",
                    borderRadius:"5px", border:"1px solid rgba(158,92,92,0.18)" }}>
                    <div style={{ fontSize:"7px", color:"#9e6060", letterSpacing:"1.5px", marginBottom:"4px" }}>⚠ 맞지 않는 경우</div>
                    <div style={{ fontSize:"9px", color:"#7a5555", lineHeight:1.7 }}>{sel.mismatch}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 그리드 헤더 */}
            <div style={{ marginBottom:"6px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:"11px", fontWeight:"600", color:"#bbb" }}>
                {compareMode?"원칙 선택 (최대 2개)":"레이아웃 선택 — 카드 위에 마우스를 올리면 키워드가 표시됩니다"}
              </div>
              <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                <div style={{ fontSize:"8px", color:C.muted }}>{extra} · A3 297×420mm</div>
                <button onClick={shuffleAll}
                  style={{ padding:"3px 10px", background:"transparent", border:`1px solid ${C.border}`,
                    borderRadius:"10px", color:C.dim, fontSize:"8px", cursor:"pointer" }}>
                  ⟳ 전체 변형 셔플
                </button>
              </div>
            </div>

            {/* 벤토 그리드 그룹 */}
            <div style={{ marginBottom:"5px", display:"flex", alignItems:"center", gap:"6px" }}>
              <div style={{ fontSize:"7px", color:C.gold, letterSpacing:"2px", textTransform:"uppercase" }}>벤토 그리드 (Bento Grid 4×6)</div>
              <div style={{ flex:1, height:"1px", background:`${C.gold}22` }}/>
              <div style={{ fontSize:"6px", color:`${C.gold}66` }}>2025~2026 단일 포스터 주류 · 균등 거터 2.5%</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"7px", marginBottom:"14px" }}>
              {bento.map(p => (
                <PosterCard key={p.id} p={p}
                  isSelected={!compareMode && selected===p.id}
                  isCompare={compareMode && compareIds.includes(p.id)}
                  onClick={() => compareMode
                    ? setCompareIds(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev.slice(-1),p.id])
                    : setSelected(p.id)}
                  pData={pData} showGuides={showGuides} taskAnswered={taskAnswered}
                  variant={variants[p.id]||0} onShuffle={shuffleVariant}/>
              ))}
            </div>

            {/* 게르스트너 58유닛 그룹 */}
            <div style={{ marginBottom:"5px", display:"flex", alignItems:"center", gap:"6px" }}>
              <div style={{ fontSize:"7px", color:C.blue, letterSpacing:"2px", textTransform:"uppercase" }}>게르스트너 58유닛 그리드</div>
              <div style={{ flex:1, height:"1px", background:`${C.blue}22` }}/>
              <div style={{ fontSize:"6px", color:`${C.blue}66` }}>1u = 1.724%</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"7px", marginBottom:"12px" }}>
              {gerstner.map(p => (
                <PosterCard key={p.id} p={p}
                  isSelected={!compareMode && selected===p.id}
                  isCompare={compareMode && compareIds.includes(p.id)}
                  onClick={() => compareMode
                    ? setCompareIds(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev.slice(-1),p.id])
                    : setSelected(p.id)}
                  pData={pData} showGuides={showGuides} taskAnswered={taskAnswered}
                  variant={variants[p.id]||0} onShuffle={shuffleVariant}/>
              ))}
            </div>

            <div style={{ padding:"7px 12px", background:C.surface, borderRadius:"4px",
              border:`1px solid ${C.border}`, fontSize:"7px", color:C.muted, lineHeight:2 }}>
              💡 카드 호버 → 키워드 힌트 · ⟳ 클릭 → 변형 전환 · 클릭 → 선택 · ⬇ PNG 저장 · 📐 그리드 · ⇄ 나란히 비교 · 📖 원칙 보기
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 4: 퀴즈 ═══════════════════════════════════════ */}
      {step==="quiz" && <QuizTab pData={pData} variants={variants}/>}
    </div>
  );
}
