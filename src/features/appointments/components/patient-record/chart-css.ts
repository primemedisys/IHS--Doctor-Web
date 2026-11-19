/**
 * The patient record's own design system — "ink on cool chart paper".
 *
 * Every rule is nested under `.chart`, so this page can carry a visual identity
 * of its own (chart paper, a serif display face, a monospaced number column)
 * without leaking a single declaration into the rest of the doctor app.
 *
 * LIGHT ONLY, deliberately. The palette is a clinical instrument here: severity
 * hues have to keep their exact relationship to each other and to the paper
 * they sit on, and `color-scheme: light` also pins the native date input so it
 * can't render a dark widget on pale paper when the app is in dark mode.
 *
 * Type scale comes from three fonts loaded by the route (next/font), read here
 * through `--font-*` variables with real fallbacks — if the wrapper class ever
 * goes missing the page degrades to Georgia/system-ui rather than to nothing.
 */
export const CHART_CSS = `
.chart{
  --paper:#FFFFFF; --surface:#FFFFFF; --surface-2:#F4F5F4; --raise:#FFFFFF;
  --ink:#202733; --muted:#667085; --faint:#8A929E; --line:#E4E7E5; --line-2:#EAECF0;

  --primary:#102B5C; --primary-600:#0A1F45; --primary-soft:#F0F1F2; --primary-line:#D0D4DA;

  /* clinical severity — reserved for findings only, never for navigation */
  --low:#2E86C1;   --low-soft:#E7F1F8;   --low-line:#CBE0EF;
  --warn:#B07714;  --warn-soft:#FAF1DE;  --warn-line:#EDD9AF;
  --high:#C0392B;  --high-soft:#FBEBE8;  --high-line:#F1CFC9;
  --crit:#96190D;  --crit-soft:#F7E2DE;  --crit-line:#EBC3BB;
  --ok:#2E7D53;    --ok-soft:#E6F2EB;    --ok-line:#CBE4D5;

  /* document kinds — the register's four paper columns. A hue per kind, so a
     doctor learns "green is the prescription, violet is the scan" once and then
     finds it by colour instead of by reading. Muted tints, never floods: this
     is a register, and the one saturated accent on the page stays the allergy
     band. Violet is the palette's own #5B4CB0, already used for SX FU. */
  --vio:#5B4CB0;   --vio-soft:#EDEBF8;   --vio-line:#D6D1F0;

  --display:var(--font-plus-jakarta-sans),system-ui,sans-serif;
  --sans:var(--font-plus-jakarta-sans),system-ui,sans-serif;
  --mono:var(--font-spline-mono),ui-monospace,monospace;
  --r:14px; --r-sm:10px; --r-xs:7px;
  --sh:0 1px 2px rgba(16,24,40,.05);
  --sh-sm:none;

  color-scheme:light;
  font-family:var(--sans); color:var(--ink); background:var(--paper);
  -webkit-font-smoothing:antialiased; line-height:1.45;

  /* Bleed out over the dashboard shell's own padding (p: {xs:2, md:4}) so the
     chart paper runs edge to edge. Without this the shell's background shows
     as a seam around the sheet, and the page reads as a card sitting on a
     different surface instead of as the surface itself. */
  margin:-16px; padding:16px; min-height:calc(100dvh - 88px);
}
@media (min-width:900px){ .chart{ margin:-32px; padding:32px; min-height:calc(100dvh - 128px); } }
.chart *{box-sizing:border-box;}
.chart button{font-family:inherit; cursor:pointer;}
.chart :focus-visible{outline:2px solid var(--primary); outline-offset:2px; border-radius:5px;}
.chart .mono{font-family:var(--mono); font-variant-numeric:tabular-nums;}

/* severity → tokens. Names match the backend's VitalStatus exactly, so a band
   is never re-derived on the client. */
.chart .sv-normal,.chart .sv-unknown{--c:var(--ink); --cs:transparent; --cl:transparent;}
.chart .sv-low{--c:var(--low); --cs:var(--low-soft); --cl:var(--low-line);}
.chart .sv-borderline{--c:var(--warn); --cs:var(--warn-soft); --cl:var(--warn-line);}
.chart .sv-high{--c:var(--high); --cs:var(--high-soft); --cl:var(--high-line);}
.chart .sv-critical{--c:var(--crit); --cs:var(--crit-soft); --cl:var(--crit-line);}

/* ---------- page ---------- */
/* Full bleed: no centred measure. A record is read across, not down a column —
   the flowsheet wants every field visible without a horizontal scroll. */
.chart .page{width:100%; margin:0; padding:4px 0 48px;}
.chart .crumb{display:inline-flex; align-items:center; gap:6px; color:var(--muted); font-size:12.5px; font-weight:600; background:none; border:0; padding:5px 2px; margin-bottom:14px;}
.chart .crumb:hover{color:var(--primary);}

/* ---------- allergy alert band (the signature) ---------- */
.chart .allergyband{display:flex; align-items:center; gap:13px; background:var(--crit-soft); border:1px solid var(--crit-line); border-left:4px solid var(--crit); border-radius:var(--r-sm); padding:12px 16px; margin-bottom:14px;}
.chart .allergyband .ab-ic{width:30px; height:30px; border-radius:8px; background:var(--crit); color:#fff; display:grid; place-items:center; flex:0 0 auto;}
.chart .allergyband .ab-lab{font-size:11px; letter-spacing:.1em; text-transform:uppercase; font-weight:700; color:var(--crit);}
.chart .allergyband .ab-list{font-size:14px; font-weight:600; color:var(--ink); margin-top:1px;}
.chart .allergyband .ab-list b{color:var(--crit);}
.chart .allergyband.clear{background:var(--ok-soft); border-color:var(--ok-line); border-left-color:var(--ok);}
.chart .allergyband.clear .ab-ic{background:var(--ok);}
.chart .allergyband.clear .ab-lab{color:var(--ok);}

/* ---------- patient banner ---------- */
.chart .banner{background:var(--surface); border:1px solid var(--line); border-radius:var(--r); box-shadow:var(--sh-sm); padding:20px 22px; margin-bottom:14px;}
.chart .banner .top{display:flex; align-items:flex-start; gap:16px;}
.chart .pav{width:56px; height:56px; border-radius:14px; background:var(--primary); color:#fff; display:grid; place-items:center; font-family:var(--display); font-weight:600; font-size:20px; flex:0 0 auto; overflow:hidden;}
.chart .pav img{width:100%; height:100%; object-fit:cover;}
.chart .banner .idblock{flex:1; min-width:0;}
.chart .pname{font-family:var(--display); font-weight:600; font-size:26px; line-height:1.05; letter-spacing:-.01em;}
.chart .identifiers{display:flex; flex-wrap:wrap; gap:5px 16px; margin-top:6px; font-size:13px; color:var(--muted);}
.chart .identifiers .mrn{font-family:var(--mono); color:var(--ink); font-weight:500;}
.chart .identifiers .sep{color:var(--faint);}
.chart .banner .rx{flex:0 0 auto;}
.chart .banner .rule{height:1px; background:var(--line-2); margin:17px 0;}
.chart .banner .cols{display:grid; grid-template-columns:1.1fr 1fr 1fr; gap:20px;}
@media (max-width:760px){ .chart .banner .cols{grid-template-columns:1fr 1fr;} .chart .banner .top{flex-wrap:wrap;} .chart .banner .rx{width:100%;} }
@media (max-width:460px){ .chart .banner .cols{grid-template-columns:1fr;} }
.chart .bcol .k{font-size:10.5px; letter-spacing:.09em; text-transform:uppercase; color:var(--faint); font-weight:700; margin-bottom:6px;}
.chart .bcol .v{font-size:13.5px; line-height:1.55;}
.chart .bcol .v.q{color:var(--muted);}
.chart .factline{display:flex; gap:8px; margin-bottom:5px;}
.chart .factline .fk{color:var(--faint); min-width:52px; font-size:12.5px;}
.chart .factline .fv{font-weight:600; word-break:break-word;}

/* ---------- vitals at a glance ---------- */
.chart .glance{background:var(--surface); border:1px solid var(--line); border-radius:var(--r); box-shadow:var(--sh-sm); padding:16px 18px; margin-bottom:14px;}
.chart .glance .gh{display:flex; align-items:baseline; gap:10px; margin-bottom:14px; flex-wrap:wrap;}
.chart .glance .gh h3{font-family:var(--display); font-weight:600; font-size:16px; margin:0;}
.chart .glance .gh .when{font-size:12px; color:var(--muted); font-family:var(--mono);}
.chart .tiles{display:grid; grid-template-columns:repeat(6,1fr); gap:10px;}
@media (max-width:820px){ .chart .tiles{grid-template-columns:repeat(3,1fr);} }
@media (max-width:440px){ .chart .tiles{grid-template-columns:repeat(2,1fr);} }
.chart .tile{border:1px solid var(--line); border-radius:var(--r-sm); padding:11px 12px 10px; background:var(--raise); position:relative; overflow:hidden;}
.chart .tile.flag{background:var(--cs); border-color:var(--cl);}
.chart .tile.flag::before{content:""; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--c);}
.chart .tile .tk{font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--faint); font-weight:700;}
.chart .tile .tv{font-family:var(--mono); font-size:21px; font-weight:500; color:var(--c); line-height:1.1; margin-top:5px; display:flex; align-items:baseline; gap:3px;}
.chart .tile .tv .u{font-size:11px; color:var(--faint); font-weight:400;}
.chart .tile .tv .arr{font-size:14px;}
.chart .tile .trange{font-size:10.5px; color:var(--faint); font-family:var(--mono); margin-top:3px;}
.chart .tile .trend{font-size:10.5px; color:var(--muted); margin-top:2px; display:flex; align-items:center; gap:3px;}
.chart .tile .trend .d{font-family:var(--mono);}

/* ---------- sticky context bar ---------- */
.chart .context{position:sticky; z-index:30; background:var(--paper); padding:12px 0; margin-bottom:6px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; border-bottom:1px solid var(--line);}
.chart .context .cdate{font-family:var(--display); font-weight:600; font-size:19px; letter-spacing:-.01em;}
.chart .chip{display:inline-flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:999px; white-space:nowrap; border:1px solid;}
.chart .chip.today{background:var(--ok-soft); color:var(--ok); border-color:var(--ok-line);}
.chart .chip.past{background:var(--warn-soft); color:var(--warn); border-color:var(--warn-line);}
.chart .chip.stat{background:var(--primary-soft); color:var(--primary-600); border-color:var(--primary-line); text-transform:capitalize;}
.chart .context .tools{margin-left:auto; display:flex; align-items:center; gap:10px; flex-wrap:wrap;}

/* buttons / fields */
.chart .btn{border:1px solid var(--line); background:var(--surface); color:var(--ink); font-weight:600; font-size:13px; padding:8px 13px; border-radius:9px; display:inline-flex; align-items:center; gap:7px;}
.chart .btn:hover{background:var(--surface-2); border-color:var(--primary-line);}
.chart .btn.primary{background:var(--primary); color:#fff; border-color:var(--primary);}
.chart .btn.primary:hover{background:var(--primary-600); border-color:var(--primary-600);}
.chart .btn:disabled{opacity:.5; cursor:not-allowed;}
.chart .datefield{display:inline-flex; align-items:center; gap:8px; border:1px solid var(--line); background:var(--surface); border-radius:9px; padding:2px 4px 2px 11px;}
.chart .datefield label{font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--faint); font-weight:700;}
.chart .datefield input{font-family:var(--mono); font-size:12.5px; border:0; background:transparent; padding:6px 4px; color:var(--ink);}
.chart .datefield input:focus{outline:none;}
.chart .clearbtn{border:0; background:var(--surface-2); color:var(--muted); font-size:11px; width:20px; height:20px; border-radius:6px; margin-right:2px; display:grid; place-items:center;}
.chart .clearbtn:hover{color:var(--ink);}

/* ---------- the time spine ---------- */
.chart .timeline{position:relative; padding-left:38px; margin-top:4px;}
.chart .timeline::before{content:""; position:absolute; left:15px; top:10px; bottom:26px; width:2px; background:var(--line);}
.chart .node{position:relative; margin-bottom:16px;}
.chart .node::before{content:""; position:absolute; left:-31px; top:5px; width:12px; height:12px; border-radius:50%; background:var(--surface); border:3px solid var(--low); z-index:1;}
.chart .node.current::before{left:-33px; top:3px; width:16px; height:16px; border-color:var(--primary); background:var(--primary);}
.chart .node.current::after{content:""; position:absolute; left:-38px; top:-2px; width:26px; height:26px; border-radius:50%; border:2px solid var(--primary-line); animation:chartPulse 2.6s ease-out infinite;}
@keyframes chartPulse{0%{transform:scale(.7); opacity:.7;} 70%{transform:scale(1.15); opacity:0;} 100%{opacity:0;}}
.chart .node-head{display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:9px; min-height:22px;}
.chart .node-date{font-family:var(--display); font-weight:600; font-size:17px;}
.chart .node-year{font-family:var(--mono); font-size:12px; color:var(--faint);}
.chart .node-rel{font-size:11.5px; color:var(--muted);}
.chart .node-tag{font-size:10px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:#fff; background:var(--primary); border-radius:999px; padding:3px 9px; margin-left:auto;}
.chart .card{background:var(--surface); border:1px solid var(--line); border-radius:var(--r); box-shadow:var(--sh-sm); overflow:hidden;}
.chart .node.current .card{border-color:var(--primary-line);}
.chart .seg{padding:14px 16px; border-bottom:1px solid var(--line-2);}
.chart .seg:last-child{border-bottom:0;}
.chart .seg-h{font-size:11px; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); font-weight:700; margin:0 0 11px; display:flex; align-items:center; gap:8px;}
.chart .seg-h .n{font-family:var(--mono); font-weight:600; color:var(--faint); background:var(--surface-2); border-radius:999px; padding:0 7px; font-size:11px;}

/* flowsheet */
.chart .flow{overflow-x:hidden;}
.chart table.fs{width:100%; border-collapse:collapse; table-layout:fixed;}
.chart .fs th{padding:0 4px 8px; border-bottom:1px solid var(--line); text-align:center; vertical-align:bottom;}
.chart .fs th .lb{font-size:10px; letter-spacing:.04em; text-transform:uppercase; color:var(--muted); font-weight:700;}
.chart .fs th .rg{font-size:9.5px; color:var(--faint); font-family:var(--mono); font-weight:400; margin-top:1px;}
.chart .fs th.lead{text-align:left; width:92px;}
.chart .fs td{padding:10px 4px; text-align:center; border-bottom:1px solid var(--line-2); vertical-align:middle;}
.chart .fs tr:last-child td{border-bottom:0;}
.chart .fs td.lead{text-align:left;}
.chart .fs .when{font-family:var(--mono); font-size:12px; font-weight:500;}
.chart .fs .src{font-size:10px; color:var(--faint); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.chart .cell{display:inline-flex; align-items:center; gap:3px; font-family:var(--mono); font-size:13.5px; color:var(--c); padding:2px 5px; border-radius:6px; position:relative;}
.chart .cell.sv-low,.chart .cell.sv-borderline,.chart .cell.sv-high{font-weight:600;}
.chart .cell.sv-critical{font-weight:700; background:var(--cs); box-shadow:inset 0 0 0 1.5px var(--c);}
.chart .cell .arr{font-size:11px;}
.chart .cell .wn{font-size:10px;}
.chart .cell .tip{position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); background:var(--ink); color:#fff; font-family:var(--sans); font-size:11px; white-space:nowrap; padding:4px 8px; border-radius:6px; opacity:0; pointer-events:none; transition:.12s; z-index:6; font-weight:500;}
.chart .cell:hover .tip,.chart .cell:focus-visible .tip{opacity:1;}
.chart .dash{color:var(--faint); font-family:var(--mono); font-size:13px;}
.chart .fscards{display:none;}
@media (max-width:720px){ .chart table.fs{display:none;} .chart .fscards{display:flex; flex-direction:column; gap:9px;} }
.chart .fscard{border:1px solid var(--line); border-radius:var(--r-sm); background:var(--raise); padding:11px 12px;}
.chart .fscard .fh{display:flex; justify-content:space-between; margin-bottom:8px; gap:10px;}
.chart .fscard .fh .when{font-family:var(--mono); font-weight:600; font-size:12.5px;}
.chart .fscard .fh .src{font-size:10.5px; color:var(--faint);}
.chart .fscard .fg{display:grid; grid-template-columns:repeat(3,1fr); gap:8px;}
.chart .fscard .fi .k{font-size:9.5px; letter-spacing:.04em; text-transform:uppercase; color:var(--faint); font-weight:700;}
.chart .fscard .fi .val{margin-top:2px;}
.chart .recby{font-size:11px; color:var(--faint); margin-top:9px;}
.chart .noreads{font-size:12.5px; color:var(--muted);}

/* consultation */
.chart .visit{border-left:2px solid var(--line); padding:0 0 0 13px; margin-bottom:13px;}
.chart .visit:last-child{margin-bottom:0;}
.chart .visit.cur{border-left-color:var(--primary);}
.chart .visit .vt{display:flex; align-items:baseline; gap:9px; flex-wrap:wrap; margin-bottom:6px;}
.chart .visit .vtime{font-family:var(--mono); font-weight:600; font-size:13.5px;}
.chart .visit .vdoc{font-weight:700; font-size:13.5px;}
.chart .visit .vspec{font-size:12px; color:var(--muted);}
.chart .visit .vmode{display:inline-flex; align-items:center; gap:5px; font-size:11px; color:var(--muted); border:1px solid var(--line); border-radius:999px; padding:2px 8px;}
.chart .visit .vfacts{display:flex; flex-wrap:wrap; gap:4px 16px; font-size:12.5px; color:var(--ink);}
.chart .visit .vf .k{color:var(--faint); margin-right:5px;}
.chart .visit .vf .v{font-weight:600;}
.chart .pdfbtn{display:inline-flex; align-items:center; gap:6px; font-size:11.5px; font-weight:600; color:var(--primary-600); background:var(--primary-soft); border:1px solid var(--primary-line); border-radius:7px; padding:4px 9px; margin-top:7px;}
.chart .pdfbtn:hover{background:#E4E7E5;}

/* documents */
.chart .docs{display:grid; grid-template-columns:repeat(4,1fr); gap:11px;}
@media (max-width:720px){ .chart .docs{grid-template-columns:1fr 1fr;} }
@media (max-width:420px){ .chart .docs{grid-template-columns:1fr;} }
.chart .dcol .dh{font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--faint); font-weight:700; margin-bottom:7px; display:flex; gap:6px;}
.chart .dcol .dh .n{font-family:var(--mono); color:var(--muted);}
.chart .drow{display:flex; align-items:center; gap:7px; border:1px solid var(--line); border-radius:var(--r-sm); padding:8px 9px; margin-bottom:6px; background:var(--raise);}
.chart .drow .dtag{flex:1; min-width:0; font-size:12px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.chart .drow .dsrc{font-size:9.5px; color:var(--faint); text-transform:capitalize;}
.chart .dic{width:26px; height:26px; border-radius:7px; border:1px solid var(--line); background:var(--surface); display:grid; place-items:center; color:var(--muted); flex:0 0 auto;}
.chart .dic:hover{color:var(--primary); border-color:var(--primary-line); background:var(--primary-soft);}
.chart .dnone{font-size:11.5px; color:var(--faint); font-style:italic; padding:3px 2px;}

/* pager */
.chart .pager{display:flex; flex-direction:column; align-items:center; gap:8px; padding:2px 0 8px;}
.chart .pager .cnt{font-size:11.5px; color:var(--faint); font-family:var(--mono);}

/* ---------- sections (notes, referrals) ---------- */
.chart .section{background:var(--surface); border:1px solid var(--line); border-radius:var(--r); box-shadow:var(--sh-sm); overflow:hidden; margin-top:20px;}
.chart .section .sh{display:flex; align-items:center; gap:11px; padding:15px 18px; border-bottom:1px solid var(--line); flex-wrap:wrap;}
.chart .section .sic{width:32px; height:32px; border-radius:9px; display:grid; place-items:center; background:var(--primary-soft); color:var(--primary-600); flex:0 0 auto;}
.chart .section .stitle{font-family:var(--display); font-weight:600; font-size:17px;}
.chart .section .scount{font-family:var(--mono); font-size:12px; color:var(--muted); background:var(--surface-2); border:1px solid var(--line); border-radius:999px; padding:0 8px;}
.chart .section .saction{margin-left:auto;}
.chart .section .sbody{padding:16px 18px;}

/* clinical notes (SOAP) */
.chart .nnav{display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; gap:10px;}
.chart .nnav .cnt{font-size:12px; color:var(--muted); font-family:var(--mono);}
.chart .nnav .cnt b{color:var(--ink);}
.chart .nnav .btns{display:flex; gap:6px;}
.chart .ib{border:1px solid var(--line); background:var(--surface); width:30px; height:30px; border-radius:8px; display:grid; place-items:center; color:var(--muted);}
.chart .ib:hover:not(:disabled){background:var(--surface-2); color:var(--ink);}
.chart .ib:disabled{opacity:.35; cursor:not-allowed;}
.chart .note .ntop{display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:13px; padding-bottom:11px; border-bottom:1px solid var(--line-2);}
.chart .note .nby{font-weight:700; font-size:14px;}
.chart .note .nwhen{font-family:var(--mono); font-size:12px; color:var(--faint);}
.chart .soap{display:grid; grid-template-columns:22px 1fr; gap:4px 12px;}
.chart .soap .tagcol{font-family:var(--display); font-weight:600; font-size:15px; color:var(--primary); line-height:1.5;}
.chart .soap .field{margin-bottom:9px;}
.chart .soap .field .k{font-size:10.5px; letter-spacing:.05em; text-transform:uppercase; color:var(--faint); font-weight:700; margin-bottom:2px;}
.chart .soap .field .v{font-size:13.5px; line-height:1.5; white-space:pre-wrap;}
.chart .nvits{display:flex; flex-wrap:wrap; gap:6px; margin-top:11px;}
.chart .nvchip{display:inline-flex; align-items:center; gap:5px; font-family:var(--mono); font-size:12px; border:1px solid var(--line); background:var(--surface-2); border-radius:999px; padding:3px 10px;}
.chart .nvchip .k{font-family:var(--sans); font-size:10px; color:var(--faint); font-weight:700; letter-spacing:.03em;}
.chart .addwrap{margin-top:14px; padding-top:14px; border-top:1px solid var(--line-2);}
.chart .nform{display:grid; grid-template-columns:1fr 1fr; gap:10px;}
@media (max-width:540px){ .chart .nform{grid-template-columns:1fr;} }
.chart .fld{display:flex; flex-direction:column; gap:4px;}
.chart .fld label{font-size:10.5px; letter-spacing:.04em; text-transform:uppercase; color:var(--faint); font-weight:700;}
.chart .fld input,.chart .fld textarea{font-family:var(--sans); font-size:13px; border:1px solid var(--line); background:var(--surface-2); border-radius:8px; padding:8px 10px; color:var(--ink); resize:vertical;}
.chart .fld.mono input{font-family:var(--mono);}
.chart .fld input:focus,.chart .fld textarea:focus{outline:none; border-color:var(--primary); background:var(--surface);}
.chart .nsub{grid-column:1/-1; display:flex; align-items:center; gap:12px; margin-top:2px; flex-wrap:wrap;}
.chart .nsub .hint{font-size:11.5px; color:var(--faint);}
.chart .emptyline{font-size:13px; color:var(--muted); padding:6px 2px 14px;}

/* referrals */
.chart .ref{display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid var(--line-2); flex-wrap:wrap;}
.chart .ref:last-child{border-bottom:0;}
.chart .ref .rn{font-weight:700; font-size:13.5px;}
.chart .ref .rm{font-size:12px; color:var(--muted); margin-top:1px;}
.chart .ref .rr{margin-left:auto; display:flex; align-items:center; gap:10px;}
.chart .rstat{font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; white-space:nowrap; border:1px solid;}
.chart .rstat.await{background:var(--warn-soft); color:var(--warn); border-color:var(--warn-line);}
.chart .rstat.booked{background:var(--low-soft); color:var(--low); border-color:var(--low-line);}
.chart .rstat.done{background:var(--ok-soft); color:var(--ok); border-color:var(--ok-line);}
.chart .rstat.cancel{background:var(--surface-2); color:var(--muted); border-color:var(--line);}
.chart .linkbtn{background:none; border:0; color:var(--high); font-size:12px; font-weight:700;}
.chart .linkbtn:hover{text-decoration:underline;}

/* states */
.chart .state{background:var(--surface); border:1px solid var(--line); border-radius:var(--r); box-shadow:var(--sh-sm); padding:42px 24px; text-align:center; color:var(--muted);}
.chart .state .sic2{width:46px; height:46px; border-radius:13px; background:var(--surface-2); border:1px solid var(--line); display:grid; place-items:center; margin:0 auto 14px; color:var(--faint);}
.chart .state h4{font-family:var(--display); font-weight:600; font-size:19px; color:var(--ink); margin:0 0 6px;}
.chart .state p{margin:0 auto; max-width:44ch; font-size:13.5px;}
.chart .rxnote{font-size:12.5px; color:var(--muted); line-height:1.5; background:var(--surface-2); border:1px dashed var(--line); border-radius:var(--r-sm); padding:10px 12px; max-width:340px;}

/* ---------- monthly register ----------
   The record read as a ward register: one month at a time, days as banded
   subheadings, one row per entry. A table (not a card list) because the doctor
   reads DOWN a column — every diagnosis in October — far more often than they
   read across a single visit. */
.chart .monthbar{display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:2px 0 12px;}
.chart .monthbar .msel{font-family:var(--sans); font-size:13px; font-weight:700; color:var(--ink); border:1px solid var(--line); background:var(--surface); border-radius:9px; padding:7px 10px;}
.chart .monthbar .msel:focus{outline:none; border-color:var(--primary);}
.chart .monthbar .mcount{font-family:var(--mono); font-size:12px; color:var(--muted);}
/* The month/year controls travel together to the right end of the bar. Grouped
   in one flex box rather than pushed individually, so the arrows, the two
   selects and "This visit" can never be split across a wrap. */
.chart .monthbar .mnav{margin-left:auto; display:flex; align-items:center; gap:8px; flex-wrap:wrap;}
.chart .monthbar .mcount b{color:var(--ink); font-weight:600;}

.chart .reg{background:var(--surface); border:1px solid var(--line); border-radius:var(--r); box-shadow:var(--sh-sm); overflow:hidden;}
.chart .regscroll{overflow-x:auto;}
/* Ten columns now (six clinical + four document kinds), so the min-width rises
   with them — the wrapper scrolls horizontally rather than letting the capsules
   crush into two characters each. */
.chart .regtable{width:100%; border-collapse:collapse; font-size:13px; min-width:1040px;}
.chart .regtable th{font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); font-weight:700; text-align:left; padding:13px 14px; border-bottom:1px solid var(--line); white-space:nowrap;}
.chart .regtable td{padding:13px 14px; border-bottom:1px solid var(--line-2); vertical-align:top;}
.chart .regtable tr:last-child td{border-bottom:0;}
.chart .regtable .num{font-family:var(--mono); font-size:12px; color:var(--faint); width:52px;}

/* Day band — the register's spine. Sticky so the date stays readable while
   scrolling a long month. */
.chart .dayrow th{position:sticky; top:0; z-index:2; background:var(--surface-2); border-bottom:1px solid var(--line); border-top:1px solid var(--line); padding:9px 14px; text-transform:none; letter-spacing:0;}
.chart .dayrow .dayhead{display:flex; align-items:center; gap:9px; flex-wrap:wrap; width:100%; background:none; border:0; padding:0; text-align:left; color:inherit;}
.chart .dayrow .dw{font-family:var(--mono); font-size:12px; color:var(--muted);}
.chart .dayrow .dd{font-family:var(--mono); font-size:12.5px; font-weight:600; color:var(--ink);}
.chart .dayrow .dn{font-size:11.5px; color:var(--faint);}
.chart .dayrow .dtag{font-size:10px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:#fff; background:var(--primary); border-radius:999px; padding:3px 9px;}
.chart .dayrow .dchev{margin-left:auto; display:inline-flex; align-items:center; gap:6px; font-size:11.5px; color:var(--muted);}

/* Entry rows */
.chart .regtable .who{display:flex; gap:9px;}
.chart .regtable .acc{width:3px; border-radius:2px; background:var(--line); flex:0 0 auto;}
.chart .regtable tr.cur .acc{background:var(--primary);}
.chart .regtable .nm{font-weight:700; font-size:13.5px; color:var(--ink);}
.chart .regtable .sub{font-family:var(--mono); font-size:11.5px; color:var(--muted); margin-top:2px;}
.chart .regtable .tm{font-family:var(--mono); font-size:12.5px; color:var(--ink); white-space:nowrap;}
.chart .regtable .tm .rel{display:block; font-family:var(--sans); font-size:11px; color:var(--faint); margin-top:2px;}
.chart .dx{display:inline-block; font-family:var(--mono); font-size:11.5px; font-weight:600; text-transform:uppercase; letter-spacing:.03em; color:var(--low); background:var(--low-soft); border:1px solid var(--low-line); border-radius:7px; padding:4px 9px;}
.chart .tx{font-size:13px; color:var(--ink); max-width:34ch;}
.chart .dash{color:var(--faint);}
.chart .marks{display:flex; flex-wrap:wrap; gap:6px;}
/* One document per line. Wrapping them side by side truncated every label to
   two words, which is the one thing a capsule has to get across. */
.chart .marks.col{flex-direction:column; align-items:flex-start; gap:5px;}
.chart .doccap{display:inline-flex; align-items:center; gap:4px; max-width:100%;}
.chart .mk.doc{max-width:100%; cursor:pointer;}
/* One hue per document kind, matching the dot on its column header. */
.chart .mk.doc.k-prescription{color:var(--ok);   background:var(--ok-soft);   border-color:var(--ok-line);}
.chart .mk.doc.k-report{      color:var(--low);  background:var(--low-soft);  border-color:var(--low-line);}
.chart .mk.doc.k-xray{        color:var(--warn); background:var(--warn-soft); border-color:var(--warn-line);}
.chart .mk.doc.k-mri{         color:var(--vio);  background:var(--vio-soft);  border-color:var(--vio-line);}
.chart .mk.doc:hover{filter:brightness(.96);}
/* The header dot teaches the mapping — colour is never the only signal, the
   column it sits in is still labelled in words. */
.chart .regtable th .kd{display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; vertical-align:middle;}
.chart .regtable th .kd.k-prescription{background:var(--ok);}
.chart .regtable th .kd.k-report{background:var(--low);}
.chart .regtable th .kd.k-xray{background:var(--warn);}
.chart .regtable th .kd.k-mri{background:var(--vio);}
.chart .mk.doc .doclab{overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
/* An Rx number is an identifier — mono keeps the digits aligned down a column
   of them, which is how a doctor tells 000003 from 000008 at a glance. */
.chart .mk.doc .doclab.mono{font-family:var(--mono); font-size:11px;}
/* Rare action, so it stays out of the way until the capsule is hovered — but it
   keeps its focus ring, so the keyboard path never disappears. */
.chart .doccap .pen{padding:3px 6px; opacity:0; cursor:pointer; transition:opacity .15s;}
.chart .doccap:hover .pen{opacity:1;}
.chart .doccap .pen:focus-visible{opacity:1;}
.chart .mk{display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600; color:var(--muted); background:var(--surface-2); border:1px solid var(--line); border-radius:999px; padding:3px 9px; white-space:nowrap;}
.chart .mk.rx{color:var(--ok); background:var(--ok-soft); border-color:var(--ok-line);}
.chart .mk.rx:hover{filter:brightness(.97);}

/* The day's detail, opened from its band: the flowsheet and documents that the
   table's own columns cannot carry. */
.chart .detailrow td{background:var(--surface-2); padding:10px 14px 14px; border-bottom:1px solid var(--line);}
/* The vitals sheet as its own card — inset and bordered, so its columns never
   look like a continuation of the register's seven. */
.chart .vpanel{background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:11px 13px 13px; box-shadow:var(--sh-sm);}
.chart .vpanel .dh{display:flex; align-items:center; gap:7px; font-size:11px; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); font-weight:700; margin:0 0 10px;}
.chart .vpanel .vn{margin-left:auto; font-family:var(--mono); font-size:11px; letter-spacing:0; text-transform:none; color:var(--faint); font-weight:500;}
.chart .detail{display:grid; gap:14px; padding-top:12px;}
.chart .detail .dh{font-size:11px; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); font-weight:700; margin:0 0 9px;}

/* ---------- MUI bridge ----------
   Shared controls that still render as MUI inside this page (the prescription
   action, "add vitals") are re-skinned to the chart's button rather than
   rebuilt, so their behaviour and permissions logic stay in ONE place. Dialogs
   are portalled outside .chart and are deliberately untouched. */
.chart .MuiButton-root{font-family:var(--sans); text-transform:none; font-weight:600; font-size:13px; letter-spacing:0; border-radius:9px; padding:7px 13px; box-shadow:none; min-width:0;}
.chart .MuiButton-root:hover{box-shadow:none;}
.chart .MuiButton-contained{background:var(--primary); color:#fff;}
.chart .MuiButton-contained:hover{background:var(--primary-600);}
.chart .MuiButton-outlined,.chart .MuiButton-text{border:1px solid var(--line); background:var(--surface); color:var(--ink);}
.chart .MuiButton-outlined:hover,.chart .MuiButton-text:hover{background:var(--surface-2); border-color:var(--primary-line);}
.chart .MuiCircularProgress-root{color:var(--primary);}

@media (prefers-reduced-motion:reduce){ .chart *{animation:none !important; transition:none !important;} }
`;
