// Teste rÃ¡pido da lÃ³gica de replanejamento/gantt do dashboard (roda com: node test_replan.js)
const fs = require("fs");
const html = fs.readFileSync(__dirname + "/index.html", "utf8");
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];

// --- stubs mÃ­nimos de browser ---
const elStub = () => ({ innerHTML: "", textContent: "", style: {}, value: "",
  classList: { add(){}, remove(){}, toggle(){} }, appendChild(){}, dataset: {} });
global.document = {
  querySelectorAll: () => [], querySelector: () => null,
  getElementById: () => elStub(), createElement: () => elStub(),
  addEventListener(){} };
global.window = { addEventListener(){} };
global.localStorage = { _d:{}, getItem(k){ return this._d[k]||null; }, setItem(k,v){ this._d[k]=v; }, removeItem(k){ delete this._d[k]; } };
global.fetch = () => Promise.resolve({ ok:false });
global.alert = () => {}; global.confirm = () => false; global.prompt = () => "";

eval(src + "\n;globalThis.__T={state,replanejar,grupo,renderCronograma,renderGantt,dayIdx,semDatas,cronoModoSet,ganttSet,GANTT_DIAS};");
const T = globalThis.__T;

// --- cenÃ¡rio: hoje 15/07/2026 = S3 ---
// id 1  (DFin, S1, meta 30): concluÃ­do em 02/07 (S1... 02/07 = S1? 29/06-03/07 â†’ S1) âœ”
// id 2  (DFin, S1, meta 30): parcial 12/30 â†’ deve mover p/ S3+
// id 25 (CG,   S1, meta 30): nada feito â†’ move p/ S3+
// id 3  (DFin, S2, meta 28): nada feito â†’ move p/ S3+
// id 7  (DFin, S3, meta 17): futuro na semana atual â†’ fica S3 (se couber)
T.state.sessions = [
  { id:1, data:"2026-07-01", mat:"DFin", topicId:"1", minutos:40, qResolvidas:20, qAcertadas:15 },
  { id:2, data:"2026-07-02", mat:"DFin", topicId:"1", minutos:30, qResolvidas:12, qAcertadas:9 },
  { id:3, data:"2026-07-06", mat:"DFin", topicId:"2", minutos:30, qResolvidas:12, qAcertadas:8 },
];

const p = T.replanejar();
const chk = (nome, cond) => { console.log((cond ? "OK " : "FALHOU ") + nome); if (!cond) process.exitCode = 1; };

console.log("semana atual (cwReal):", p.cwReal);
chk("hoje Ã© S3", p.cwReal === 3);

const i1 = p.info[1], i2 = p.info[2], i25 = p.info[25], i3 = p.info[3], i7 = p.info[7];
chk("id1 concluÃ­do (32/30q)", i1.ok && i1.qr === 32);
chk("id1 semana efetiva = semana da conclusÃ£o (S1)", i1.semEff === 1);
chk("id2 pendente 12/30, movido de S1 p/ >= S3", !i2.ok && i2.resto === 18 && i2.semEff >= 3 && i2.movido);
chk("id25 (CG) nÃ£o iniciado, movido p/ >= S3", !i25.ok && i25.resto === 30 && i25.semEff >= 3);
chk("id3 (S2) movido p/ >= S3", i3.semEff >= 3 && i3.movido);
chk("id7 (S3 original) nÃ£o puxado p/ trÃ¡s", i7.semEff >= 3);

// capacidade nunca deve ser estourada por mais de 1 assunto extra por semana
const usoDFin = {};
Object.values(p.info).filter(i => !i.ok && T.grupo(i.t.mat) === "DFin")
  .forEach(i => usoDFin[i.semEff] = (usoDFin[i.semEff] || 0) + i.resto);
console.log("carga DFin pendente por semana:", usoDFin, "Â· cap DFin:", p.cap.DFin);

// renders nÃ£o devem lanÃ§ar erro
T.renderCronograma(); chk("renderCronograma nÃ£o lanÃ§a", true);
T.renderGantt(); chk("renderGantt nÃ£o lanÃ§a", true);
T.cronoModoSet("original"); chk("modo original nÃ£o lanÃ§a", true);
T.ganttSet("mat","DFin"); T.ganttSet("view","pend"); chk("gantt filtrado nÃ£o lanÃ§a", true);

// gantt: posiÃ§Ãµes dentro do range
chk("T.GANTT_DIAS = 58", T.GANTT_DIAS === 58);
chk("dayIdx clampa", T.dayIdx("2026-01-01") === 0 && T.dayIdx("2026-12-31") === T.GANTT_DIAS - 1);
chk("S1 comeÃ§a no Ã­ndice 4 (29/06)", T.dayIdx("2026-06-29") === 4);
console.log("T.semDatas(8):", T.semDatas(8)); // deve terminar em 2026-08-21
chk("S8 termina em 21/08", T.semDatas(8)[1] === "2026-08-21");

