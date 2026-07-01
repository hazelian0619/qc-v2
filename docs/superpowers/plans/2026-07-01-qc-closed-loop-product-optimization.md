# QC Closed-Loop Product Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the static AI medical-record quality-control prototype into a two-role closed-loop demo centered on batch review, doctor rectification, recovery review, and audience-specific reporting.

**Architecture:** Keep the app as a static HTML/CSS/JavaScript prototype, but introduce a clearer domain model inside `app.js`: case lifecycle states, defect adjudication states, operation logs, doctor tasks, and report templates. Replace the current module-oriented navigation with lifecycle-oriented navigation while reusing existing static rendering patterns.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Python `http.server` for local preview. This repository has no local test framework, so verification uses deterministic browser/manual checks against `http://127.0.0.1:4173/`.

---

## Scope Guardrails

- Do not introduce a frontend framework, bundler, or test runner in this pass.
- Do not split `app.js` unless the user explicitly approves a refactor; the existing repo uses a single static JS file.
- Do not commit changes unless the user explicitly asks for commits.
- Preserve the static-demo nature: all workflow effects are simulated in local in-memory data.
- Use the logo file supplied by the user only as a local asset copied into the repo.

## File Structure

- Modify: `index.html` — brand block, lifecycle navigation, renamed/added view sections and placeholder containers.
- Modify: `app.js` — lifecycle data model, render functions, action handlers, score recalculation, doctor task flow, report template switching.
- Modify: `styles.css` — brand lockup, workflow navigation, three-column review workbench, doctor task layout, report template layout, status tags.
- Create: `assets/qianshu-wenyi-logo.jpg` — local copy of the supplied logo image.
- Modify: `README.md` — update local preview and demo-flow notes after implementation.

## Verification Commands

- Start server: `python3 -m http.server 4173`
- Open app: `http://127.0.0.1:4173/`
- Check HTML response: `curl -s -I http://127.0.0.1:4173/`
- Browser smoke via existing workspace Playwright dependency from parent folder:

```bash
cd /Users/pluviophile/交互ui
node - <<'NODE'
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  const checks = [
    '千枢问医',
    '批量复核',
    '临床整改',
    '回收复核',
    '报告中心',
    '规则看板'
  ];
  for (const text of checks) {
    if (!(await page.getByText(text).first().isVisible())) throw new Error(`Missing visible text: ${text}`);
  }
  await browser.close();
})();
NODE
```

---

### Task 1: Add Brand Asset and Lifecycle Navigation

**Files:**
- Create: `assets/qianshu-wenyi-logo.jpg`
- Modify: `index.html:16-47`
- Modify: `styles.css:1-140`

- [ ] **Step 1: Copy the supplied logo into the repo**

Run:

```bash
mkdir -p assets
cp '/Users/pluviophile/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_wz9fknqggqhb22_4563/temp/RWTemp/2026-06/46bd36fc937d78164f29cf12fa32c0f7/千枢问医logo.jpg' assets/qianshu-wenyi-logo.jpg
```

Expected: `assets/qianshu-wenyi-logo.jpg` exists and can be opened.

- [ ] **Step 2: Replace the sidebar brand block in `index.html`**

Replace the current `.brand-block` content with:

```html
<div class="brand-block">
  <img class="brand-logo" src="./assets/qianshu-wenyi-logo.jpg" alt="千枢问医" />
  <div class="brand-copy">
    <h1>千枢问医</h1>
    <p>AI 终末病历质控系统</p>
  </div>
</div>
```

- [ ] **Step 3: Replace the main navigation labels in `index.html`**

Use these buttons inside `#mainNav`:

```html
<button class="nav-item is-active" data-view="overview" type="button"><span>总览驾驶舱</span></button>
<button class="nav-item" data-view="batch" type="button"><span>导入质检</span></button>
<button class="nav-item" data-view="review" type="button"><span>批量复核</span></button>
<button class="nav-item" data-view="doctor" type="button"><span>临床整改</span></button>
<button class="nav-item" data-view="recovery" type="button"><span>回收复核</span></button>
<button class="nav-item" data-view="report" type="button"><span>报告中心</span></button>
<button class="nav-item" data-view="rules" type="button"><span>规则看板</span></button>
```

- [ ] **Step 4: Add brand CSS in `styles.css`**

Add or update these rules near the existing sidebar/brand styles:

```css
.brand-block {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 12px;
  align-items: center;
}

.brand-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 14px;
  background: #ffffff;
}

.brand-copy h1 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.02em;
}

.brand-copy p {
  margin: 3px 0 0;
  color: var(--muted-text);
  font-size: 12px;
  line-height: 1.35;
}
```

- [ ] **Step 5: Verify navigation renders**

Run the local server and confirm the left navigation shows the six lifecycle items plus “总览驾驶舱”.

Expected: no broken image icon; “千枢问医” appears in the sidebar.

---

### Task 2: Introduce Lifecycle States and Score Recalculation

**Files:**
- Modify: `app.js:1-420`

- [ ] **Step 1: Add lifecycle constants after `state` in `app.js`**

Insert:

```js
const lifecycleStates = {
  pendingAi: '待AI质检',
  aiRunning: 'AI质检中',
  aiDone: 'AI已完成',
  pendingReview: '待人工复核',
  reviewing: '质控复核中',
  pendingDoctor: '待临床整改',
  doctorFixing: '整改中',
  appealed: '申诉中',
  pendingRecovery: '已整改待复核',
  overdue: '整改超时',
  passed: '复核通过',
};

const defectStatuses = {
  pending: '待人工复核',
  accepted: '已认可',
  rejected: '已驳回',
  adjusted: '已改判',
  manual: '人工补录',
  returned: '待整改',
};
```

- [ ] **Step 2: Normalize demo case status values**

Update each case object so `status` values use the lifecycle labels above. Keep existing labels that already match, and change `已通过` to `复核通过`.

For each defect, keep existing fields and ensure these fields exist:

```js
source: 'AI',
originalDeduction: 5,
finalDeduction: 5,
reviewReason: '',
```

Use the existing `points` value for both `originalDeduction` and `finalDeduction` when a defect already has points.

- [ ] **Step 3: Add score helpers before `selectedCase()`**

Insert:

```js
function activeDefects(caseItem) {
  return caseItem.defects.filter((defect) => defect.reviewStatus !== defectStatuses.rejected);
}

function recalculatedScore(caseItem) {
  const totalDeduction = activeDefects(caseItem).reduce((sum, defect) => sum + (Number(defect.finalDeduction ?? defect.points) || 0), 0);
  return Math.max(0, 100 - totalDeduction);
}

function scoreLabel(caseItem) {
  const recalculated = recalculatedScore(caseItem);
  return recalculated === caseItem.score ? `AI初判 ${caseItem.score}分` : `AI初判 ${caseItem.score}分 → 质控改判 ${recalculated}分`;
}

function addCaseLog(caseItem, title, detail) {
  caseItem.logs = caseItem.logs || [];
  caseItem.logs.unshift({ title, detail, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) });
}
```

- [ ] **Step 4: Verify score helper in browser console**

Open the app and run a manual interaction later after Task 4. Before Task 4, verify there are no console errors on initial load.

Expected: app loads and existing pages still render.

---

### Task 3: Add Review, Doctor, and Recovery View Containers

**Files:**
- Modify: `index.html:260-385`
- Modify: `app.js:372-432`

- [ ] **Step 1: Replace the old results/detail/rectify sections with new containers**

Keep `batchView`, `reportView`, and `rulesView`. Replace `resultsView`, `detailView`, and `rectifyView` with:

```html
<section class="view" id="reviewView" aria-labelledby="reviewTitle">
  <div id="reviewWorkbench"></div>
</section>

<section class="view" id="doctorView" aria-labelledby="doctorTitle">
  <div id="doctorWorkspace"></div>
</section>

<section class="view" id="recoveryView" aria-labelledby="recoveryTitle">
  <div id="recoveryWorkspace"></div>
</section>
```

- [ ] **Step 2: Update `viewMeta` in `app.js`**

Use:

```js
const viewMeta = {
  overview: '总览驾驶舱',
  batch: '导入质检',
  review: '批量复核',
  doctor: '临床整改',
  recovery: '回收复核',
  report: '报告中心',
  rules: '规则看板',
};
```

- [ ] **Step 3: Update `navigate(viewName)` render calls**

Inside `navigate`, replace detail/rectify calls with:

```js
if (viewName === 'review') renderReviewWorkbench();
if (viewName === 'doctor') renderDoctorWorkspace();
if (viewName === 'recovery') renderRecoveryWorkspace();
if (viewName === 'report') renderReport();
if (viewName === 'rules') renderRules();
```

- [ ] **Step 4: Add temporary render stubs before `renderReport()`**

Insert:

```js
function renderReviewWorkbench() {
  element('#reviewWorkbench').innerHTML = '<section class="surface"><h3 id="reviewTitle">批量复核</h3><p>批量复核工作台正在加载。</p></section>';
}

function renderDoctorWorkspace() {
  element('#doctorWorkspace').innerHTML = '<section class="surface"><h3 id="doctorTitle">临床整改</h3><p>医生整改任务正在加载。</p></section>';
}

function renderRecoveryWorkspace() {
  element('#recoveryWorkspace').innerHTML = '<section class="surface"><h3 id="recoveryTitle">回收复核</h3><p>回收复核队列正在加载。</p></section>';
}
```

- [ ] **Step 5: Verify each navigation item opens**

Click each nav item.

Expected: title changes and no `Cannot read properties of null` console errors appear.

---

### Task 4: Build Three-Column Batch Review Workbench

**Files:**
- Modify: `app.js` — replace Task 3 `renderReviewWorkbench()` stub
- Modify: `styles.css` — add review workbench layout rules

- [ ] **Step 1: Add queue helper functions before `renderReviewWorkbench()`**

Insert:

```js
function reviewQueueCases() {
  return cases.filter((caseItem) => [
    lifecycleStates.aiDone,
    lifecycleStates.pendingReview,
    lifecycleStates.reviewing,
    lifecycleStates.pendingDoctor,
    lifecycleStates.appealed,
    lifecycleStates.pendingRecovery,
    lifecycleStates.overdue,
  ].includes(caseItem.status));
}

function selectedReviewCase() {
  const queue = reviewQueueCases();
  if (!queue.find((caseItem) => caseItem.id === state.selectedCaseId) && queue[0]) state.selectedCaseId = queue[0].id;
  return cases.find((caseItem) => caseItem.id === state.selectedCaseId) || cases[0];
}
```

- [ ] **Step 2: Replace `renderReviewWorkbench()`**

Use this implementation:

```js
function renderReviewWorkbench() {
  const queue = reviewQueueCases();
  const caseItem = selectedReviewCase();
  const reviewedCount = cases.filter((item) => item.status === lifecycleStates.passed).length;
  element('#reviewWorkbench').innerHTML = `
    <div class="review-workbench">
      <aside class="surface review-queue-panel">
        <div class="section-heading compact">
          <div><p class="eyebrow">复核队列</p><h3 id="reviewTitle">批量复核</h3></div>
          <span class="status-pill calm">${reviewedCount} / ${cases.length}</span>
        </div>
        <div class="queue-summary">
          <button class="queue-filter is-active" type="button">高风险 ${cases.filter((item) => item.risk === '高').length}</button>
          <button class="queue-filter" type="button">中风险 ${cases.filter((item) => item.risk === '中').length}</button>
          <button class="queue-filter" type="button">低风险 ${cases.filter((item) => item.risk === '低').length}</button>
        </div>
        <button class="button button-secondary full-width" id="bulkPassLowRiskButton" type="button">低风险批量认可并通过</button>
        <div class="review-queue-list">
          ${queue.map((item) => `
            <button class="review-queue-card ${item.id === caseItem.id ? 'is-active' : ''}" data-review-case="${item.id}" type="button">
              <strong>${item.patient}</strong>
              <span>${item.visitNo}｜${item.department}</span>
              <small>${scoreLabel(item)}｜${item.risk}风险｜${item.defects.length}缺陷</small>
              <em>${item.status}</em>
            </button>
          `).join('')}
        </div>
      </aside>
      <section class="surface review-case-panel">
        <div class="review-case-header">
          <div><p class="eyebrow">当前病历</p><h3>${caseItem.patient}｜${caseItem.department}</h3><span>${caseItem.diagnosis}｜${caseItem.visitNo}</span></div>
          <strong>${scoreLabel(caseItem)}</strong>
        </div>
        <div class="review-defect-list">
          ${caseItem.defects.map((defect) => `
            <article class="review-defect-card" data-defect-card="${defect.id}">
              <div class="defect-card-topline"><strong>${defect.title}</strong><span class="status-pill warning">${defect.reviewStatus}</span></div>
              <p>${defect.description}</p>
              <dl class="defect-evidence-grid"><div><dt>规则依据</dt><dd>${defect.rule}</dd></div><div><dt>扣分</dt><dd>${defect.finalDeduction ?? defect.points} 分</dd></div><div><dt>来源</dt><dd>${defect.source || 'AI'}</dd></div></dl>
              <div class="defect-actions">
                <button class="tiny-button" data-review-action="accept" data-defect-id="${defect.id}" type="button">认可</button>
                <button class="tiny-button" data-review-action="reject" data-defect-id="${defect.id}" type="button">驳回</button>
                <button class="tiny-button" data-review-action="adjust" data-defect-id="${defect.id}" type="button">改判扣分</button>
                <button class="tiny-button" data-review-action="return" data-defect-id="${defect.id}" type="button">退回临床</button>
              </div>
            </article>
          `).join('')}
        </div>
        <div class="review-footer-actions">
          <button class="button button-secondary" id="manualDefectButton" type="button">补录人工缺陷</button>
          <button class="button button-primary" id="approveAndNextButton" type="button">确认并下一份 ⇥</button>
        </div>
      </section>
      <aside class="surface evidence-panel">
        <div class="section-heading compact"><div><p class="eyebrow">证据链</p><h3>原文与日志</h3></div></div>
        <div class="evidence-box"><strong>原文高亮</strong><p>${caseItem.documents?.find((doc) => doc.status.includes('缺陷') || doc.status.includes('未提供'))?.meta || '当前病历暂无异常原文定位'}</p><mark>系统定位到与当前缺陷相关的原文段落。</mark></div>
        <div class="evidence-box"><strong>规则依据</strong><p>${caseItem.defects[0]?.rule || '暂无规则'}</p></div>
        <div class="evidence-box"><strong>操作日志</strong>${(caseItem.logs || [{ time: '10:32', title: 'AI 初判完成', detail: scoreLabel(caseItem) }]).map((log) => `<p>${log.time}｜${log.title}<br><small>${log.detail}</small></p>`).join('')}</div>
      </aside>
    </div>
  `;
}
```

- [ ] **Step 3: Add CSS for the workbench**

Add:

```css
.review-workbench {
  display: grid;
  grid-template-columns: 280px minmax(460px, 1fr) 340px;
  gap: 16px;
  min-height: calc(100vh - 132px);
}

.review-queue-panel,
.review-case-panel,
.evidence-panel {
  min-width: 0;
}

.queue-summary,
.defect-actions,
.review-footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.queue-filter,
.review-queue-card {
  border: 1px solid var(--border);
  background: var(--surface-muted);
  border-radius: 14px;
  padding: 10px 12px;
  text-align: left;
}

.review-queue-card {
  display: grid;
  width: 100%;
  gap: 4px;
  margin-top: 10px;
  cursor: pointer;
}

.review-queue-card.is-active {
  border-color: #2563eb;
  background: #eff6ff;
}

.full-width {
  width: 100%;
  margin-top: 12px;
}

.review-case-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.review-defect-list {
  display: grid;
  gap: 12px;
}

.review-defect-card,
.evidence-box {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface-muted);
  padding: 14px;
}

.defect-card-topline {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.defect-evidence-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.evidence-panel {
  display: grid;
  align-content: start;
  gap: 12px;
}
```

- [ ] **Step 4: Verify layout**

Open “批量复核”.

Expected: three columns visible at desktop width; current case defects appear in the middle; evidence appears on the right.

---

### Task 5: Implement Review Actions and Batch Pass

**Files:**
- Modify: `app.js:1032-1222`

- [ ] **Step 1: Add event handling for review case selection**

Inside the body click listener, add:

```js
const reviewCaseButton = event.target.closest('[data-review-case]');
if (reviewCaseButton) {
  state.selectedCaseId = reviewCaseButton.dataset.reviewCase;
  const caseItem = selectedReviewCase();
  caseItem.status = lifecycleStates.reviewing;
  addCaseLog(caseItem, '进入人工复核', '质控员打开该病历进行缺陷裁决');
  renderReviewWorkbench();
}
```

- [ ] **Step 2: Add defect adjudication handling**

Inside the same listener, add:

```js
const reviewActionButton = event.target.closest('[data-review-action]');
if (reviewActionButton) {
  const caseItem = selectedReviewCase();
  const defect = caseItem.defects.find((item) => item.id === reviewActionButton.dataset.defectId);
  const action = reviewActionButton.dataset.reviewAction;
  if (defect && action === 'accept') {
    defect.reviewStatus = defectStatuses.accepted;
    addCaseLog(caseItem, '认可 AI 缺陷', `${defect.title} 保留扣分 ${defect.finalDeduction ?? defect.points} 分`);
    showToast('已认可该 AI 缺陷，扣分保留');
  }
  if (defect && action === 'reject') {
    defect.reviewStatus = defectStatuses.rejected;
    defect.finalDeduction = 0;
    defect.reviewReason = '质控员判定该 AI 缺陷不成立';
    addCaseLog(caseItem, '驳回 AI 缺陷', `${defect.title} 扣分已回补，总分重算为 ${recalculatedScore(caseItem)} 分`);
    showToast('已驳回该 AI 缺陷，分数已回补');
  }
  if (defect && action === 'adjust') {
    const base = Number(defect.finalDeduction ?? defect.points) || 0;
    defect.reviewStatus = defectStatuses.adjusted;
    defect.finalDeduction = Math.max(1, base - 2);
    defect.reviewReason = `质控员将扣分从 ${base} 分改判为 ${defect.finalDeduction} 分`;
    addCaseLog(caseItem, '改判扣分', defect.reviewReason);
    showToast('已改判扣分，分数实时重算');
  }
  if (defect && action === 'return') {
    defect.reviewStatus = defectStatuses.returned;
    caseItem.status = lifecycleStates.pendingDoctor;
    caseItem.ownerDoctor = caseItem.ownerDoctor || '王医生';
    caseItem.rectifyDue = '明日 18:00';
    addCaseLog(caseItem, '退回临床整改', `${defect.title} 已退回 ${caseItem.ownerDoctor}，整改期限 ${caseItem.rectifyDue}`);
    showToast('已退回临床医生整改');
  }
  renderReviewWorkbench();
  renderDoctorWorkspace();
  renderRecoveryWorkspace();
}
```

- [ ] **Step 3: Add manual defect action**

Add:

```js
const manualDefectButton = event.target.closest('#manualDefectButton');
if (manualDefectButton) {
  const caseItem = selectedReviewCase();
  const newDefect = {
    id: `manual-${Date.now()}`,
    title: '人工补录：出院医嘱缺少复诊时间',
    description: '质控员复核原文后补录 AI 未召回缺陷。',
    rule: 'R-2026-061 出院医嘱完整性',
    points: 3,
    originalDeduction: 0,
    finalDeduction: 3,
    source: '人工补录',
    reviewStatus: defectStatuses.manual,
    reviewReason: '人工发现出院医嘱未明确复诊时间',
  };
  caseItem.defects.push(newDefect);
  addCaseLog(caseItem, '补录人工缺陷', `${newDefect.title}，扣 ${newDefect.finalDeduction} 分`);
  renderReviewWorkbench();
  showToast('已补录人工缺陷并计入总分');
}
```

- [ ] **Step 4: Add approve-and-next action**

Add:

```js
const approveAndNextButton = event.target.closest('#approveAndNextButton');
if (approveAndNextButton) {
  const queue = reviewQueueCases();
  const caseItem = selectedReviewCase();
  caseItem.status = lifecycleStates.passed;
  addCaseLog(caseItem, '复核通过', `最终分数 ${recalculatedScore(caseItem)} 分，进入报告候选`);
  const currentIndex = queue.findIndex((item) => item.id === caseItem.id);
  const nextCase = queue[currentIndex + 1] || reviewQueueCases()[0];
  if (nextCase) state.selectedCaseId = nextCase.id;
  renderReviewWorkbench();
  renderOverview();
  showToast('当前病历已复核通过，已切换到下一份');
}
```

- [ ] **Step 5: Add batch low-risk pass action**

Add:

```js
const bulkPassLowRiskButton = event.target.closest('#bulkPassLowRiskButton');
if (bulkPassLowRiskButton) {
  const lowRiskCases = cases.filter((caseItem) => caseItem.risk === '低' && [lifecycleStates.aiDone, lifecycleStates.pendingReview].includes(caseItem.status));
  lowRiskCases.forEach((caseItem) => {
    caseItem.status = lifecycleStates.passed;
    addCaseLog(caseItem, '批量认可并通过', `质控员按低风险筛选批量放行，本批影响 ${lowRiskCases.length} 份病历`);
  });
  renderReviewWorkbench();
  renderOverview();
  showToast(`已批量认可并通过 ${lowRiskCases.length} 份低风险病历`);
}
```

- [ ] **Step 6: Verify interactions**

Manual checks:

1. Click “驳回” on a defect.
2. Confirm the score label changes from `AI初判` to `AI初判 → 质控改判`.
3. Click “补录人工缺陷”.
4. Confirm a new defect card appears and the score changes.
5. Click “退回临床”.
6. Confirm the case appears in the doctor workspace after Task 6.

---

### Task 6: Build Doctor Rectification Workspace

**Files:**
- Modify: `app.js` — replace Task 3 `renderDoctorWorkspace()` stub
- Modify: `styles.css` — add doctor layout rules

- [ ] **Step 1: Add doctor task helper before `renderDoctorWorkspace()`**

Insert:

```js
function doctorTaskCases() {
  return cases.filter((caseItem) => [lifecycleStates.pendingDoctor, lifecycleStates.doctorFixing, lifecycleStates.appealed, lifecycleStates.overdue].includes(caseItem.status));
}

function selectedDoctorCase() {
  const tasks = doctorTaskCases();
  if (!tasks.find((caseItem) => caseItem.id === state.selectedDoctorCaseId) && tasks[0]) state.selectedDoctorCaseId = tasks[0].id;
  return cases.find((caseItem) => caseItem.id === state.selectedDoctorCaseId) || tasks[0];
}
```

- [ ] **Step 2: Replace `renderDoctorWorkspace()`**

Use:

```js
function renderDoctorWorkspace() {
  const tasks = doctorTaskCases();
  const caseItem = selectedDoctorCase();
  element('#doctorWorkspace').innerHTML = `
    <div class="doctor-workspace">
      <aside class="surface doctor-task-list">
        <div class="section-heading compact"><div><p class="eyebrow">临床医生</p><h3 id="doctorTitle">我的整改任务</h3></div></div>
        <div class="doctor-task-stats"><span>待整改 ${tasks.filter((item) => item.status === lifecycleStates.pendingDoctor).length}</span><span>申诉中 ${tasks.filter((item) => item.status === lifecycleStates.appealed).length}</span><span>超时 ${tasks.filter((item) => item.status === lifecycleStates.overdue).length}</span></div>
        ${tasks.length ? tasks.map((item) => `
          <button class="doctor-task-card ${item.id === caseItem?.id ? 'is-active' : ''}" data-doctor-case="${item.id}" type="button">
            <strong>${item.patient}</strong><span>${item.visitNo}｜${item.department}</span><small>${item.defects.filter((defect) => defect.reviewStatus === defectStatuses.returned).length || item.defects.length} 条问题｜${item.rectifyDue || '明日 18:00'}</small><em>${item.status}</em>
          </button>
        `).join('') : '<p class="empty-copy">暂无医生整改任务。</p>'}
      </aside>
      <section class="surface doctor-detail-panel">
        ${caseItem ? `
          <div class="section-heading"><div><p class="eyebrow">整改详情</p><h3>${caseItem.patient}｜${caseItem.diagnosis}</h3><span>退回人：质控科 张老师｜整改期限：${caseItem.rectifyDue || '明日 18:00'}</span></div></div>
          <div class="doctor-defect-list">
            ${caseItem.defects.filter((defect) => defect.reviewStatus === defectStatuses.returned || defect.reviewStatus === defectStatuses.accepted || defect.reviewStatus === defectStatuses.manual).map((defect) => `
              <article class="doctor-defect-card"><strong>${defect.title}</strong><p>${defect.description}</p><dl><div><dt>规则依据</dt><dd>${defect.rule}</dd></div><div><dt>整改要求</dt><dd>请补充病历原文并提交质控科复核。</dd></div></dl><button class="tiny-button" type="button">查看原文</button></article>
            `).join('')}
          </div>
          <label class="rectify-note"><span>整改说明</span><textarea id="doctorRectifyNote" rows="4" placeholder="填写已修改内容、补充位置或申诉理由"></textarea></label>
          <div class="doctor-actions"><button class="button button-primary" id="submitRectifyButton" type="button">已整改，提交复核</button><button class="button button-secondary" id="submitAppealButton" type="button">我认为无问题，提交申诉</button></div>
        ` : '<p class="empty-copy">质控科退回临床后，医生任务会显示在这里。</p>'}
      </section>
    </div>
  `;
}
```

- [ ] **Step 3: Add doctor action handlers**

Inside body click listener, add:

```js
const doctorCaseButton = event.target.closest('[data-doctor-case]');
if (doctorCaseButton) {
  state.selectedDoctorCaseId = doctorCaseButton.dataset.doctorCase;
  renderDoctorWorkspace();
}

const submitRectifyButton = event.target.closest('#submitRectifyButton');
if (submitRectifyButton) {
  const caseItem = selectedDoctorCase();
  caseItem.status = lifecycleStates.pendingRecovery;
  addCaseLog(caseItem, '医生提交整改', '责任医生已提交整改说明，等待质控科回收复核');
  renderDoctorWorkspace();
  renderRecoveryWorkspace();
  showToast('医生已提交整改，任务回到质控科待复核');
}

const submitAppealButton = event.target.closest('#submitAppealButton');
if (submitAppealButton) {
  const caseItem = selectedDoctorCase();
  caseItem.status = lifecycleStates.appealed;
  addCaseLog(caseItem, '医生提交申诉', '责任医生认为病历无问题，等待质控科裁决');
  renderDoctorWorkspace();
  renderRecoveryWorkspace();
  showToast('医生已提交申诉，等待质控科裁决');
}
```

- [ ] **Step 4: Add CSS**

Add:

```css
.doctor-workspace {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
}

.doctor-task-stats,
.doctor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.doctor-task-card,
.doctor-defect-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-muted);
  padding: 14px;
}

.doctor-task-card {
  display: grid;
  width: 100%;
  gap: 4px;
  margin-top: 10px;
  text-align: left;
}

.doctor-task-card.is-active {
  border-color: #f59e0b;
  background: #fffbeb;
}

.doctor-defect-list {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}

.rectify-note {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.rectify-note textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  resize: vertical;
}
```

- [ ] **Step 5: Verify doctor flow**

Manual checks:

1. From “批量复核”, click “退回临床”.
2. Navigate to “临床整改”.
3. Confirm the case appears as a doctor task.
4. Click “已整改，提交复核”.
5. Confirm the task leaves doctor pending list and appears in recovery after Task 7.

---

### Task 7: Build Recovery Review Workspace

**Files:**
- Modify: `app.js` — replace Task 3 `renderRecoveryWorkspace()` stub
- Modify: `styles.css` — reuse review card styles and add recovery status styles if needed

- [ ] **Step 1: Add recovery helper**

Insert before `renderRecoveryWorkspace()`:

```js
function recoveryCases() {
  return cases.filter((caseItem) => [lifecycleStates.pendingRecovery, lifecycleStates.appealed, lifecycleStates.overdue].includes(caseItem.status));
}
```

- [ ] **Step 2: Replace `renderRecoveryWorkspace()`**

Use:

```js
function renderRecoveryWorkspace() {
  const items = recoveryCases();
  element('#recoveryWorkspace').innerHTML = `
    <section class="surface recovery-workspace">
      <div class="section-heading"><div><p class="eyebrow">质控科</p><h3 id="recoveryTitle">回收复核</h3><span>医生整改提交和申诉裁决集中处理</span></div></div>
      <div class="recovery-lanes">
        ${[
          { title: '已整改待复核', status: lifecycleStates.pendingRecovery },
          { title: '申诉待裁决', status: lifecycleStates.appealed },
          { title: '整改超时', status: lifecycleStates.overdue },
        ].map((lane) => `
          <section class="recovery-lane"><h4>${lane.title}</h4>
            ${items.filter((item) => item.status === lane.status).map((item) => `
              <article class="recovery-card"><strong>${item.patient}</strong><span>${item.visitNo}｜${item.department}</span><small>${scoreLabel(item)}</small><div><button class="tiny-button" data-recovery-action="pass" data-recovery-case="${item.id}" type="button">复核通过</button><button class="tiny-button" data-recovery-action="return-again" data-recovery-case="${item.id}" type="button">再次退回</button><button class="tiny-button" data-recovery-action="accept-appeal" data-recovery-case="${item.id}" type="button">接受申诉</button></div></article>
            `).join('') || '<p class="empty-copy">暂无任务</p>'}
          </section>
        `).join('')}
      </div>
    </section>
  `;
}
```

- [ ] **Step 3: Add recovery action handlers**

Inside body click listener, add:

```js
const recoveryActionButton = event.target.closest('[data-recovery-action]');
if (recoveryActionButton) {
  const caseItem = cases.find((item) => item.id === recoveryActionButton.dataset.recoveryCase);
  const action = recoveryActionButton.dataset.recoveryAction;
  if (caseItem && action === 'pass') {
    caseItem.status = lifecycleStates.passed;
    addCaseLog(caseItem, '回收复核通过', `最终分数 ${recalculatedScore(caseItem)} 分，可进入报告输出`);
    showToast('回收复核通过');
  }
  if (caseItem && action === 'return-again') {
    caseItem.status = lifecycleStates.pendingDoctor;
    addCaseLog(caseItem, '再次退回临床', '质控科复核后仍不通过，已再次退回责任医生');
    showToast('已再次退回临床整改');
  }
  if (caseItem && action === 'accept-appeal') {
    caseItem.defects.forEach((defect) => {
      if (defect.reviewStatus === defectStatuses.returned) {
        defect.reviewStatus = defectStatuses.rejected;
        defect.finalDeduction = 0;
      }
    });
    caseItem.status = lifecycleStates.passed;
    addCaseLog(caseItem, '接受医生申诉', `相关缺陷已驳回，最终分数 ${recalculatedScore(caseItem)} 分`);
    showToast('已接受申诉并放行');
  }
  renderRecoveryWorkspace();
  renderReviewWorkbench();
  renderDoctorWorkspace();
}
```

- [ ] **Step 4: Add CSS**

Add:

```css
.recovery-lanes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.recovery-lane {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface-muted);
  padding: 14px;
}

.recovery-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid var(--border);
  margin-top: 10px;
}
```

- [ ] **Step 5: Verify recovery flow**

Manual checks:

1. Submit a doctor rectification.
2. Navigate to “回收复核”.
3. Click “复核通过”.
4. Confirm the case leaves recovery list and appears as passed in review queue/report data.

---

### Task 8: Upgrade Report Center and Rules Copy

**Files:**
- Modify: `app.js` — update `renderReport()` and `renderRules()` copy/sections
- Modify: `styles.css` — add report template selector styling if missing

- [ ] **Step 1: Add report template state**

In `state`, add:

```js
activeReportTemplate: 'clinical',
```

Add constants near lifecycle constants:

```js
const reportTemplates = [
  { id: 'clinical', name: '临床科室整改报告', audience: '临床科室 / 责任医生', focus: '缺陷明细、整改要求、责任医生、期限、复核结果' },
  { id: 'hospital', name: '院级质控月报', audience: '质控委员会 / 院领导', focus: '全院趋势、科室排名、高频缺陷、整改闭环率' },
  { id: 'review', name: '等级评审/国考报告', audience: '评审与指标汇报', focus: '指标口径、规则版本、样本范围、操作追溯' },
];
```

- [ ] **Step 2: Update `renderReport()` high-level structure**

Keep existing report paper rendering if useful, but add a template selector before the report preview:

```js
const activeTemplate = reportTemplates.find((template) => template.id === state.activeReportTemplate) || reportTemplates[0];
```

Render template cards with:

```html
<div class="report-template-grid">
  ${reportTemplates.map((template) => `
    <button class="report-template-card ${template.id === activeTemplate.id ? 'is-active' : ''}" data-report-template="${template.id}" type="button">
      <strong>${template.name}</strong>
      <span>${template.audience}</span>
      <small>${template.focus}</small>
    </button>
  `).join('')}
</div>
```

Add copy in the report preview:

```html
<p class="report-note">当前模板：${activeTemplate.name}。本报告面向 ${activeTemplate.audience}，重点呈现 ${activeTemplate.focus}。</p>
```

- [ ] **Step 3: Add report template click handler**

Inside body click listener, add:

```js
const reportTemplateButton = event.target.closest('[data-report-template]');
if (reportTemplateButton) {
  state.activeReportTemplate = reportTemplateButton.dataset.reportTemplate;
  renderReport();
}
```

- [ ] **Step 4: Update rules dashboard language**

In `renderRules()`, make the section title and cards emphasize:

```text
规则版本：终末病历 v2.1
高频触发规则：出院记录完整性、病案首页必填项、手术记录闭环
管理分析：科室 × 规则热力图、缺陷来源、整改闭环率
```

- [ ] **Step 5: Add CSS**

Add:

```css
.report-template-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.report-template-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-muted);
  padding: 14px;
  display: grid;
  gap: 6px;
  text-align: left;
}

.report-template-card.is-active {
  border-color: #2563eb;
  background: #eff6ff;
}
```

- [ ] **Step 6: Verify report templates**

Manual checks:

1. Navigate to “报告中心”.
2. Click each of the three report templates.
3. Confirm preview copy changes for clinical, hospital, and review audiences.

---

### Task 9: Align Overview and Existing Links to New Flow

**Files:**
- Modify: `index.html` — update `data-view-link` values
- Modify: `app.js` — update render copy and stale route references

- [ ] **Step 1: Replace stale `data-view-link="results"`**

In `index.html`, change links that previously went to results/detail/rectify:

```html
data-view-link="results"
```

to:

```html
data-view-link="review"
```

For整改-related links, use:

```html
data-view-link="recovery"
```

- [ ] **Step 2: Update overview CTA copy**

Change overview buttons to:

```html
<button class="button button-secondary" data-view-link="review" type="button">进入批量复核</button>
<button class="button button-primary" data-view-link="batch" type="button">发起导入质检</button>
```

- [ ] **Step 3: Update global search behavior**

Replace:

```js
if (state.activeView !== 'results') navigate('results');
renderResults();
```

with:

```js
if (state.activeView !== 'review') navigate('review');
renderReviewWorkbench();
```

- [ ] **Step 4: Remove or bypass stale handlers**

Handlers for `[data-case-detail]`, `[data-case-report]`, and old detail-specific controls can remain if still used by report cards, but they must not call removed DOM containers. Replace calls to `renderDetail()` with `renderReviewWorkbench()` when the action is review-related.

- [ ] **Step 5: Verify no stale view IDs are referenced**

Run:

```bash
rg -n "resultsView|detailView|rectifyView|data-view=\"results\"|data-view=\"detail\"|data-view=\"rectify\"|renderDetail\(|renderResults\(|renderRectify\(" index.html app.js
```

Expected: no matches for removed view IDs or removed nav data-view values. Matches for old function definitions are acceptable only if those functions are still called by retained fallback paths and their DOM targets exist.

---

### Task 10: Documentation and Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README current prototype capabilities**

Replace the capabilities list with:

```markdown
- 病例导入与 AI 批量质检任务
- 流程化导航：导入质检 → 批量复核 → 临床整改 → 回收复核 → 报告中心 → 规则看板
- 质控科批量复核工作台
- AI 缺陷认可、驳回、改判扣分
- 人工补录缺陷与分数重算
- 低风险病例批量认可并通过
- 在线退回临床整改
- 临床医生整改任务与申诉
- 质控科回收复核
- 面向临床、院级、评审的报告模板
- 规则版本与管理看板
```

- [ ] **Step 2: Run static server**

Run:

```bash
cd /Users/pluviophile/交互ui/qc-v2
python3 -m http.server 4173
```

Expected: server starts without errors and serves `index.html`.

- [ ] **Step 3: Run browser smoke**

From another terminal, run:

```bash
cd /Users/pluviophile/交互ui
node - <<'NODE'
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  for (const text of ['千枢问医', '批量复核', '临床整改', '回收复核', '报告中心', '规则看板']) {
    if (!(await page.getByText(text).first().isVisible())) throw new Error(`Missing ${text}`);
  }
  await page.getByText('批量复核').first().click();
  if (!(await page.getByText('低风险批量认可并通过').first().isVisible())) throw new Error('Review workbench missing batch pass action');
  await page.getByText('临床整改').first().click();
  if (!(await page.getByText('我的整改任务').first().isVisible())) throw new Error('Doctor workspace missing');
  await page.getByText('报告中心').first().click();
  if (!(await page.getByText('临床科室整改报告').first().isVisible())) throw new Error('Report templates missing');
  await browser.close();
})();
NODE
```

Expected: command exits with status 0.

- [ ] **Step 4: Manual demo walkthrough**

Verify this sequence in the browser:

1. Sidebar shows 千枢问医 brand.
2. Navigate to “导入质检”; existing batch import remains usable.
3. Navigate to “批量复核”; three-column workbench appears.
4. Click “驳回” on a defect; score label changes.
5. Click “补录人工缺陷”; a new manual defect appears.
6. Click “退回临床”; toast confirms clinical return.
7. Navigate to “临床整改”; returned case appears.
8. Click “已整改，提交复核”; toast confirms return to quality-control queue.
9. Navigate to “回收复核”; submitted case appears.
10. Click “复核通过”; case leaves recovery lane.
11. Navigate to “报告中心”; switch among three report templates.
12. Navigate to “规则看板”; rules and management analysis are visible.

- [ ] **Step 5: Check git diff**

Run:

```bash
git status --short
git diff -- index.html app.js styles.css README.md
```

Expected: only planned files changed, plus `assets/qianshu-wenyi-logo.jpg`. Do not commit unless the user asks.

---

## Self-Review Notes

- Spec coverage: all P0 items from the design spec map to Tasks 1-7 and 9; P1 report/rules work maps to Task 8; documentation maps to Task 10.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation placeholders are intentionally included.
- Type consistency: lifecycle state labels, defect status labels, and handler dataset names are defined before use.
- Known risk: existing `app.js` has old render functions and handlers. Task 9 explicitly removes stale route references after new views are working, reducing the risk of a large unsafe rewrite.

