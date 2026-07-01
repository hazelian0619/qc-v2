const passThreshold = 75;
function isPassed(caseItem) {
  return caseItem.score >= passThreshold && !caseItem.veto;
}

const state = {
  activeView: 'overview',
  selectedCaseId: 'case-001',
  selectedDocumentId: 'doc-discharge',
  selectedDefectId: 'def-002',
  activeReportSection: 'report-overview',
  selectedDashboardDept: '普外科',
  statusFilter: '全部',
  searchText: '',
  departmentFilter: '全部',
  riskFilter: '全部',
  selectedRuleId: 'rule-basic',
  riskOnlyCandidates: false,
  reportIncludedDefects: [],
  selectedCandidateIds: ['case-001', 'case-003', 'case-005'],
  selectedResultIds: [],
  selectedDoctorCaseId: '',
  importMode: 'HIS/EMR',
  activeReportTemplate: 'clinical',
  batchFilters: {
    dischargeStartDate: '2026-06-01',
    dischargeEndDate: '2026-06-27',
    admitStartDate: '2026-05-25',
    admitEndDate: '2026-06-27',
  },
  detailLayout: {
    navWidth: 276,
    defectWidth: 376,
  },
};

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

const reportTemplates = [
  { id: 'clinical', name: '临床科室整改报告', audience: '临床科室 / 责任医生', focus: '缺陷明细、整改要求、责任医生、期限、复核结果' },
  { id: 'hospital', name: '院级质控月报', audience: '质控委员会 / 院领导', focus: '全院趋势、科室排名、高频缺陷、整改闭环率' },
  { id: 'review', name: '等级评审/国考报告', audience: '评审与指标汇报', focus: '指标口径、规则版本、样本范围、操作追溯' },
];

const metrics = [
  { label: '病例', value: '1,248', hint: '本月', target: 'batch', action: '查看导入范围' },
  { label: '均分', value: '86.4', hint: '+0.2', target: 'report', action: '查看院级报告' },
  { label: '未通过', value: '126', hint: '低于 75 分', target: 'review', action: '进入复核队列' },
  { label: '整改中', value: '72', hint: '+3', target: 'doctor', action: '查看临床整改' },
  { label: '否决项', value: '9', hint: '高风险', target: 'review', action: '处理高风险' },
  { label: '缺材料', value: '34', hint: '待确认', target: 'rules', action: '查看规则依据' },
];

const tasks = [
  { name: '出院病例终末质控', scope: '全院｜128 例', progress: 72, status: '质检中', target: 'batch', action: '继续查看质检进度' },
  { name: '手术病例专项', scope: '普外科｜34 例', progress: 100, status: '待复核', target: 'review', action: '进入批量复核' },
  { name: '首页完整性复核', scope: '病案室｜56 例', progress: 44, status: '排队中', target: 'rules', action: '核对首页规则' },
];

const importLogEntries = [
  { title: '当前导入批次', detail: '全院 2026-06 出院病例｜共 42 份' },
];

const rules = [
  { id: 'rule-basic', name: '基础规则', desc: '完整度、时效、签名', enabled: true },
  { id: 'rule-inpatient', name: '住院病历', desc: '入院、病程、出院', enabled: true },
  { id: 'rule-surgery', name: '手术专项', desc: '手术、麻醉、同意书', enabled: false },
  { id: 'rule-homepage', name: '病案首页', desc: '首页、编码、否决项', enabled: false },
];

const defectRanking = [
  { name: '文书完整性', count: 18, percent: 92, target: 'rules', note: '定位基础规则' },
  { name: '出院小结缺项', count: 14, percent: 74, target: 'review', note: '查看相关病历' },
  { name: '医嘱病程不一致', count: 9, percent: 52, target: 'review', note: '进入缺陷复核' },
  { name: '签名节点缺失', count: 7, percent: 38, target: 'rules', note: '查看签名节点' },
];

const cases = [
  {
    id: 'case-001',
    patient: '林敏',
    genderAge: '女｜46 岁',
    visitNo: 'ZY2026061807',
    department: '普外科',
    ward: '三病区',
    doctor: '王医生',
    diagnosis: '胆囊结石伴胆囊炎',
    dischargeDate: '2026-06-18',
    score: 82,
    completeness: '7/9',
    completenessPercent: 78,
    severe: 1,
    normal: 4,
    veto: true,
    risk: '高',
    status: '待人工复核',
    reportStatus: '可生成',
    missingDocs: ['病案首页', '知情同意书'],
    documents: [
      { id: 'doc-homepage', name: '病案首页', status: '材料未提供', meta: '未从 HIS 返回' },
      { id: 'doc-admission', name: '入院记录', status: '已检查', meta: '2026-06-11 10:16｜王医生签名' },
      { id: 'doc-course', name: '首次病程记录', status: '已检查', meta: '2026-06-11 12:03｜李医生签名' },
      { id: 'doc-discharge', name: '出院记录', status: '存在缺陷', meta: '2026-06-18 09:42｜王医生签名' },
      { id: 'doc-surgery', name: '手术记录', status: '不适用', meta: '本次住院无手术' },
    ],
    record: [
      '患者因"右上腹痛 3 天"入院，完善血常规、肝胆胰脾彩超等检查，诊断为胆囊结石伴胆囊炎。入院后予抗感染、解痉、补液等治疗。',
      '住院期间患者腹痛较前缓解，体温恢复正常，复查炎症指标下降。出院时一般情况可，生命体征平稳。',
      '出院医嘱：清淡饮食，避免油腻，门诊随访。如腹痛、发热加重及时就诊。',
      '病程记录中 2026-06-15 提及调整抗菌药物，但出院记录未说明调整原因及疗效评价。',
    ],
    defects: [
      {
        id: 'def-001',
        title: '病案首页未提供，完整度不达标',
        type: '文书完整性',
        level: '严重',
        document: '病案首页',
        rule: '基础终末质控规则 R-01：终末病历应包含病案首页；材料未提供需人工确认是否应有未有。',
        reason: 'AI 检查到该病例 HIS/EMR 返回的文书列表中没有病案首页。但该病例为住院终末病历，按规则原则上应包含首页。AI 无法自行判断是"测试数据缺失"还是"医生书写遗漏"，因此标记为严重并提交人工确认。',
        evidence: '病案首页未从 HIS/EMR 返回',
        deduction: 8,
        source: 'AI',
        originalDeduction: 8,
        finalDeduction: 8,
        reviewReason: '',
        reviewStatus: '待人工复核',
        suggestion: '确认是否应有未有，必要时发起整改。',
      },
      {
        id: 'def-002',
        title: '出院记录未交代抗菌药物调整原因',
        type: '出院小结不完整',
        level: '一般',
        document: '出院记录',
        rule: '住院病历规则 R-23：重要治疗调整应在出院记录中说明原因及疗效。',
        reason: 'AI 对比了病程记录与出院记录，发现 2026-06-15 病程中明确记录了"调整抗菌药物为头孢哌酮舒巴坦"，但出院记录全文未提及调整原因、疗效评价及后续方案。属于跨文书信息不一致导致的出院小结缺项。',
        evidence: '2026-06-15 调整抗菌药物；出院记录未说明调整原因及疗效评价',
        deduction: 3,
        source: 'AI',
        originalDeduction: 3,
        finalDeduction: 3,
        reviewReason: '',
        reviewStatus: '待人工复核',
        suggestion: '补充调整依据、反应及复查结果。',
      },
      {
        id: 'def-003',
        title: '知情同意书缺失需确认',
        type: '材料完整性',
        level: '一般',
        document: '知情同意书',
        rule: '基础终末质控规则 R-07：有创操作或特殊治疗应留存对应知情同意材料。',
        reason: 'AI 在病历中识别到"特殊抗菌药物治疗"的记录，按规则可能需要对应知情同意材料，但系统未关联到。因规则未明确该场景是否必须有，AI 标记为一般并提交人工确认。',
        evidence: '本次病例存在特殊抗菌药物治疗记录，但未关联知情同意材料',
        deduction: 2,
        source: 'AI',
        originalDeduction: 2,
        finalDeduction: 2,
        reviewReason: '',
        reviewStatus: '待人工复核',
        suggestion: '人工确认适用场景。',
      },
    ],
  },
  {
    id: 'case-002',
    patient: '周海',
    genderAge: '男｜63 岁',
    visitNo: 'ZY2026062109',
    department: '心内科',
    ward: '二病区',
    doctor: '陈医生',
    diagnosis: '慢性心力衰竭急性加重',
    dischargeDate: '2026-06-21',
    score: 88,
    completeness: '9/9',
    completenessPercent: 100,
    severe: 0,
    normal: 3,
    veto: false,
    risk: '中',
    status: 'AI已完成',
    reportStatus: '待复核',
    missingDocs: [],
    documents: [
      { id: 'doc-homepage', name: '病案首页', status: '已检查', meta: '2026-06-21 10:30｜病案室编码' },
      { id: 'doc-admission', name: '入院记录', status: '已检查', meta: '2026-06-13 09:20｜陈医生签名' },
      { id: 'doc-course', name: '首次病程记录', status: '已检查', meta: '2026-06-13 11:00｜陈医生签名' },
      { id: 'doc-daily', name: '日常病程记录', status: '存在缺陷', meta: '2026-06-15 14:30｜住院医签名' },
      { id: 'doc-discharge', name: '出院记录', status: '已检查', meta: '2026-06-21 10:15｜陈医生签名' },
    ],
    record: [
      '患者因"反复胸闷气促 3 年，加重 1 周"入院。既往扩张型心肌病史，长期服用美托洛尔、呋塞米、螺内酯。',
      '入院查体：BP 138/82，HR 96 次/分，双肺底湿啰音，双下肢轻度水肿。BNP 1840 pg/mL。',
      '入院后予利尿、扩血管、强心治疗。6 月 15 日调整呋塞米为托拉塞米，尿量增加，水肿消退。',
      '出院时症状缓解，BNP 降至 720。出院医嘱：限盐限水，每日称重，规律服药，心内科随访。',
      '日常病程中记录了利尿剂调整，但未记录患者每日出入量及体重变化。',
    ],
    defects: [
      {
        id: 'def-101',
        title: '日常病程记录缺少出入量及体重监测',
        type: '首次病程记录不规范',
        level: '一般',
        document: '日常病程记录',
        rule: '住院病历规则 R-15：心力衰竭患者住院期间应记录出入量及体重变化。',
        reason: 'AI 检查日常病程记录（6/13—6/21），发现仅 6/15 记录了利尿剂调整，但全程未记录每日出入量。心衰患者出入量是评估容量负荷和利尿效果的核心指标，缺项会影响疗效判断的连续性。',
        evidence: '6/13—6/21 病程记录中未见每日出入量及体重数据',
        deduction: 3,
        source: 'AI',
        originalDeduction: 3,
        finalDeduction: 3,
        reviewReason: '',
        reviewStatus: '待人工复核',
        suggestion: '补充每日出入量记录及体重变化趋势。',
      },
    ],
  },
  {
    id: 'case-003',
    patient: '赵琪',
    genderAge: '女｜58 岁',
    visitNo: 'ZY2026061914',
    department: '骨科',
    ward: '一病区',
    doctor: '刘医生',
    diagnosis: '股骨颈骨折术后',
    dischargeDate: '2026-06-19',
    score: 76,
    completeness: '8/9',
    completenessPercent: 89,
    severe: 1,
    normal: 6,
    veto: true,
    risk: '高',
    status: '待临床整改',
    reportStatus: '已生成',
    missingDocs: ['麻醉记录'],
    documents: [
      { id: 'doc-homepage', name: '病案首页', status: '已检查', meta: '2026-06-19 11:00｜病案室编码' },
      { id: 'doc-admission', name: '入院记录', status: '已检查', meta: '2026-06-12 08:40｜刘医生签名' },
      { id: 'doc-course', name: '首次病程记录', status: '已检查', meta: '2026-06-12 10:15｜刘医生签名' },
      { id: 'doc-surgery', name: '手术记录', status: '存在缺陷', meta: '2026-06-13 14:00｜刘医生签名' },
      { id: 'doc-anesthesia', name: '麻醉记录', status: '应有未有', meta: '手术已执行但未返回麻醉记录' },
      { id: 'doc-discharge', name: '出院记录', status: '存在缺陷', meta: '2026-06-19 10:30｜刘医生签名' },
    ],
    record: [
      '患者因"摔倒致右髋疼痛、活动受限 1 天"入院。X 线示右股骨颈骨折，Garden III 型。',
      '入院后完善术前检查，6 月 13 日在腰麻下行右髋关节置换术。手术顺利，术中出血约 200mL。',
      '术后予抗凝、镇痛、预防感染治疗。复查 X 线假体位置良好。6 月 19 日出院。',
      '手术记录中未记录麻醉方式及麻醉医师，术后首次病程未记录麻醉恢复情况。',
    ],
    defects: [
      {
        id: 'def-201',
        title: '麻醉记录缺失（应有未有）',
        type: '文书完整性',
        level: '严重',
        document: '麻醉记录',
        rule: '手术病历规则 R-03：已实施手术必须有对应麻醉记录。',
        reason: 'AI 从手术记录中识别到"腰麻"这一麻醉方式，说明手术确实在麻醉下进行，应有麻醉记录。但 HIS/EMR 未返回任何麻醉记录文书。结合手术已执行的事实，AI 判定为"应有未有"而非"材料未提供"，属于医生书写遗漏。',
        evidence: '手术记录明确记录腰麻，但系统无对应麻醉记录',
        deduction: 10,
        source: 'AI',
        originalDeduction: 10,
        finalDeduction: 10,
        reviewReason: '',
        reviewStatus: '待人工复核',
        suggestion: '补充完整麻醉记录，包括麻醉方式、用药、术中监护。',
      },
      {
        id: 'def-202',
        title: '手术记录缺少术中出血量明细',
        type: '入院记录缺项',
        level: '一般',
        document: '手术记录',
        rule: '手术病历规则 R-08：手术记录应包含术中出血量、输血情况。',
        reason: 'AI 识别到手术记录中有"出血约 200mL"的描述，但缺少是否输血、出血量的精确测量方式。髋关节置换术属中大型手术，出血量是术后管理的重要依据。',
        evidence: '手术记录仅写"出血约 200mL"，未记录输血情况及测量方式',
        deduction: 3,
        source: 'AI',
        originalDeduction: 3,
        finalDeduction: 3,
        reviewReason: '',
        reviewStatus: '待人工复核',
        suggestion: '补充精确出血量、输血记录及术中吸引量。',
      },
    ],
  },
  {
    id: 'case-004',
    patient: '沈宁',
    genderAge: '男｜39 岁',
    visitNo: 'ZY2026062211',
    department: '神经内科',
    ward: '五病区',
    doctor: '黄医生',
    diagnosis: '短暂性脑缺血发作',
    dischargeDate: '2026-06-22',
    score: 94,
    completeness: '9/9',
    completenessPercent: 100,
    severe: 0,
    normal: 1,
    veto: false,
    risk: '低',
    status: '复核通过',
    reportStatus: '已归档',
    missingDocs: [],
    documents: [
      { id: 'doc-homepage', name: '病案首页', status: '已检查', meta: '2026-06-22 14:00｜病案室编码' },
      { id: 'doc-admission', name: '入院记录', status: '已检查', meta: '2026-06-19 09:30｜黄医生签名' },
      { id: 'doc-course', name: '首次病程记录', status: '已检查', meta: '2026-06-19 11:00｜黄医生签名' },
      { id: 'doc-discharge', name: '出院记录', status: '已检查', meta: '2026-06-22 13:45｜黄医生签名' },
    ],
    record: [
      '患者因"发作性右侧肢体无力 2 小时"入院，症状持续约 15 分钟自行缓解。既往高血压病史。',
      '头颅 MRI 未见急性梗死，颈部血管彩超示左颈动脉斑块。ABCD2 评分 3 分，低风险。',
      '予阿司匹林抗血小板、阿托伐他汀稳定斑块治疗。住院期间未再发作。',
      '出院医嘱：规律服药，控制血压，2 周后神经内科门诊随访，如症状再发立即急诊。',
    ],
    defects: [
      {
        id: 'def-301',
        title: '出院记录未注明抗血小板疗程',
        type: '出院小结不完整',
        level: '一般',
        document: '出院记录',
        rule: '住院病历规则 R-23：出院记录应注明关键用药的疗程及随访计划。',
        reason: 'AI 检查出院医嘱，发现阿司匹林仅写"规律服药"未注明疗程。TIA 患者抗血小板治疗时长与卒中预防直接相关，建议明确疗程。',
        evidence: '出院医嘱中阿司匹林仅写"规律服药"',
        deduction: 2,
        source: 'AI',
        originalDeduction: 2,
        finalDeduction: 2,
        reviewReason: '',
        reviewStatus: '已通过',
        suggestion: '明确抗血小板疗程（如 3—6 个月）。',
      },
    ],
  },
  {
    id: 'case-005',
    patient: '马悦',
    genderAge: '女｜71 岁',
    visitNo: 'ZY2026062316',
    department: '普外科',
    ward: '四病区',
    doctor: '宋医生',
    diagnosis: '急性阑尾炎术后',
    dischargeDate: '2026-06-23',
    score: 80,
    completeness: '8/9',
    completenessPercent: 89,
    severe: 1,
    normal: 5,
    veto: false,
    risk: '高',
    status: '待人工复核',
    reportStatus: '可生成',
    missingDocs: ['术前讨论记录'],
    documents: [
      { id: 'doc-homepage', name: '病案首页', status: '已检查', meta: '2026-06-23 09:00｜病案室编码' },
      { id: 'doc-admission', name: '入院记录', status: '已检查', meta: '2026-06-21 18:20｜宋医生签名' },
      { id: 'doc-preop', name: '术前讨论记录', status: '应有未有', meta: '已行急诊手术但无术前讨论' },
      { id: 'doc-surgery', name: '手术记录', status: '已检查', meta: '2026-06-21 21:30｜宋医生签名' },
      { id: 'doc-discharge', name: '出院记录', status: '存在缺陷', meta: '2026-06-23 08:45｜宋医生签名' },
    ],
    record: [
      '患者因"转移性右下腹痛 8 小时"入院，查体右下腹压痛反跳痛阳性。血常规 WBC 13.2×10⁹/L。',
      '诊断为急性化脓性阑尾炎，急诊行腹腔镜阑尾切除术。手术顺利，术后抗感染治疗。',
      '术后恢复良好，体温正常，进食后无不适。6 月 23 日出院。',
      '出院医嘱：半流食，逐步过渡正常饮食，7 天后门诊拆线。',
      '未找到术前讨论记录。患者 71 岁高龄，急诊手术前应有术前评估及讨论记录。',
    ],
    defects: [
      {
        id: 'def-401',
        title: '术前讨论记录缺失（应有未有）',
        type: '文书完整性',
        level: '严重',
        document: '术前讨论记录',
        rule: '手术病历规则 R-02：择期及急诊手术应有术前讨论记录，高龄患者尤需评估。',
        reason: 'AI 识别到手术记录（6/21 21:30 腹腔镜阑尾切除术），但系统中无术前讨论记录。患者 71 岁，属高龄手术患者，按规则应有术前讨论。AI 判定为"应有未有"。虽为急诊手术，规则要求可简化但不能完全省略。',
        evidence: '已行急诊手术（6/21 21:30），患者 71 岁，但无术前讨论记录',
        deduction: 8,
        source: 'AI',
        originalDeduction: 8,
        finalDeduction: 8,
        reviewReason: '',
        reviewStatus: '待人工复核',
        suggestion: '补充术前讨论记录，包括手术指征、风险评估、替代方案。',
      },
      {
        id: 'def-402',
        title: '出院记录未交代术后病理结果',
        type: '医嘱与病程不一致',
        level: '一般',
        document: '出院记录',
        rule: '住院病历规则 R-23：手术病例出院记录应包含术后病理结果。',
        reason: 'AI 检查手术记录中有"切除标本送病理"的描述，但出院记录未提及病理结果。化脓性阑尾炎的病理分型（单纯性/化脓性/坏疽性）影响后续随访方案，缺项会导致随访依据不足。',
        evidence: '手术记录提及送病理，但出院记录未记录病理结果',
        deduction: 3,
        source: 'AI',
        originalDeduction: 3,
        finalDeduction: 3,
        reviewReason: '',
        reviewStatus: '待人工复核',
        suggestion: '补充术后病理结果，并根据分型调整随访计划。',
      },
    ],
  },
];

const statusTabs = ['全部', '待AI质检', 'AI质检中', 'AI已完成', '待人工复核', '待临床整改', '复核通过', '未通过'];

const viewMeta = {
  overview: '总览驾驶舱',
  batch: '导入质检',
  review: '批量复核',
  doctor: '临床整改',
  recovery: '回收复核',
  results: '质检结果',
  detail: '单病例质控',
  report: '报告中心',
  rectify: '整改复核',
  rules: '规则看板',
};

const element = (selector) => document.querySelector(selector);
const elements = (selector) => Array.from(document.querySelectorAll(selector));

function formatDateRange(start, end) {
  return `${start} 至 ${end}`;
}

function syncBatchDateInputs() {
  const mapping = {
    '#batchDischargeStart': state.batchFilters.dischargeStartDate,
    '#batchDischargeEnd': state.batchFilters.dischargeEndDate,
    '#batchAdmitStart': state.batchFilters.admitStartDate,
    '#batchAdmitEnd': state.batchFilters.admitEndDate,
  };
  Object.entries(mapping).forEach(([selector, value]) => {
    const input = element(selector);
    if (input) input.value = value;
  });
}

function applyDetailLayout() {
  const detailLayout = element('.case-detail-layout');
  if (!detailLayout) return;
  detailLayout.style.setProperty('--detail-nav-width', `${state.detailLayout.navWidth}px`);
  detailLayout.style.setProperty('--detail-defect-width', `${state.detailLayout.defectWidth}px`);
}

function showToast(message) {
  const toast = element('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timerId);
  showToast.timerId = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

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

function selectedCase() {
  return cases.find((caseItem) => caseItem.id === state.selectedCaseId) || cases[0];
}

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

function doctorTaskCases() {
  return cases.filter((caseItem) => [lifecycleStates.pendingDoctor, lifecycleStates.doctorFixing, lifecycleStates.appealed, lifecycleStates.overdue].includes(caseItem.status));
}

function selectedDoctorCase() {
  const tasks = doctorTaskCases();
  if (!tasks.find((caseItem) => caseItem.id === state.selectedDoctorCaseId) && tasks[0]) state.selectedDoctorCaseId = tasks[0].id;
  return cases.find((caseItem) => caseItem.id === state.selectedDoctorCaseId) || tasks[0];
}

function recoveryCases() {
  return cases.filter((caseItem) => [lifecycleStates.pendingRecovery, lifecycleStates.appealed, lifecycleStates.overdue].includes(caseItem.status));
}

function navigate(viewName) {
  state.activeView = viewName;
  elements('.view').forEach((viewElement) => viewElement.classList.remove('is-visible'));
  element(`#${viewName}View`).classList.add('is-visible');
  elements('.nav-item').forEach((button) => button.classList.toggle('is-active', button.dataset.view === viewName));
  element('#viewTitle').textContent = viewMeta[viewName];
  if (viewName === 'review') renderReviewWorkbench();
  if (viewName === 'doctor') renderDoctorWorkspace();
  if (viewName === 'recovery') renderRecoveryWorkspace();
  if (viewName === 'report') renderReport();
  if (viewName === 'rules') {
    renderRules();
    renderDashboard();
  }
}

function riskClass(risk) {
  if (risk === '高') return 'high';
  if (risk === '中') return 'mid';
  return 'low';
}

function renderMetrics() {
  element('#metricGrid').innerHTML = metrics.map((metric) => `
    <button class="metric-card overview-action-card" data-view-link="${metric.target}" type="button" aria-label="${metric.action}">
      <span>${metric.label}</span>
      <strong>${metric.value}</strong>
      <small>${metric.hint}</small>
      <em>${metric.action}</em>
    </button>
  `).join('');
}

function renderOverview() {
  renderMetrics();
  const priorityCases = [...cases].sort((firstCase, secondCase) => secondCase.severe - firstCase.severe || firstCase.score - secondCase.score).slice(0, 4);
  element('#priorityQueue').innerHTML = `
    <table class="compact-case-table">
      <thead><tr><th>记录号</th><th>患者</th><th>科室</th><th>主要诊断</th><th>完整度</th><th>严重</th><th>一般</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>${priorityCases.map((caseItem) => `
        <tr class="overview-click-row" data-case-detail="${caseItem.id}" tabindex="0" aria-label="查看 ${caseItem.patient} 的复核详情">
          <td>${caseItem.visitNo}</td>
          <td><strong>${caseItem.patient}</strong></td>
          <td>${caseItem.department}</td>
          <td>${caseItem.diagnosis}</td>
          <td>${caseItem.completeness}</td>
          <td>${caseItem.severe}</td>
          <td>${caseItem.normal}</td>
          <td><span class="status-pill ${caseItem.status === lifecycleStates.passed ? 'calm' : 'warning'}">${caseItem.status}</span></td>
          <td><button class="text-button" data-case-detail="${caseItem.id}" type="button">查看详情</button></td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;

  element('#defectRanking').innerHTML = defectRanking.map((defectItem, index) => `
    <button class="rank-item overview-action-card" data-view-link="${defectItem.target}" type="button" aria-label="${defectItem.name}：${defectItem.note}">
      <span class="rank-index">${index + 1}</span>
      <div>
        <strong>${defectItem.name}</strong>
        <small>${defectItem.note}</small>
        <div class="rank-bar"><span style="width:${defectItem.percent}%"></span></div>
      </div>
      <strong>${defectItem.count}</strong>
    </button>
  `).join('');

  element('#taskList').innerHTML = tasks.map((task) => `
    <button class="task-item overview-action-card" data-view-link="${task.target}" type="button" aria-label="${task.action}">
      <div class="section-heading compact">
        <strong>${task.name}</strong>
        <span class="status-pill ${task.progress === 100 ? 'calm' : 'warning'}">${task.status}</span>
      </div>
      <p>${task.scope}</p>
      <div class="progress-track"><span style="width:${task.progress}%"></span></div>
      <small>${task.action}</small>
    </button>
  `).join('');
}

function renderBatch() {
  syncBatchDateInputs();
  element('#ruleOptions').innerHTML = rules.map((rule) => `
    <button class="rule-option ${rule.id === state.selectedRuleId ? 'is-selected' : ''}" data-rule-id="${rule.id}" type="button">
      <strong>${rule.name}</strong>
      <span>${rule.desc}</span>
    </button>
  `).join('');
  renderImportLog();
  renderCandidates();
}

function renderImportLog() {
  element('#importSourceTag').textContent = state.importMode;
  element('#importLog').innerHTML = importLogEntries.map((entry) => `
    <div class="import-log-item">
      <strong>${entry.title}</strong>
      <span>${entry.detail}</span>
    </div>
  `).join('');
}

function renderCandidates() {
  const candidateCases = state.riskOnlyCandidates ? cases.filter((caseItem) => caseItem.risk === '高') : cases;
  element('#matchedCount').textContent = candidateCases.length * 8 + 2;
  element('#candidateCases').innerHTML = candidateCases.map((caseItem, index) => `
    <label class="candidate-row">
      <input type="checkbox" data-candidate-id="${caseItem.id}" ${state.selectedCandidateIds.includes(caseItem.id) ? 'checked' : ''} />
      <span><strong>${caseItem.patient}｜${caseItem.visitNo}</strong><span>${caseItem.department}｜${caseItem.ward}｜${caseItem.dischargeDate}｜${caseItem.diagnosis}</span></span>
      <span class="risk-pill ${riskClass(caseItem.risk)}">${caseItem.risk}风险</span>
    </label>
  `).join('');
  element('#candidateSelectionSummary').innerHTML = `
    <span>已选择 <strong>${state.selectedCandidateIds.length}</strong> 份病例</span>
    <span>批量范围：${state.importMode}｜规则组 ${rules.find((rule) => rule.id === state.selectedRuleId)?.name || '基础规则'}</span>
  `;
}

function filteredCases() {
  return cases.filter((caseItem) => {
    const matchesStatus = state.statusFilter === '全部' || caseItem.status === state.statusFilter || (state.statusFilter === '未通过' && !isPassed(caseItem));
    const matchesDepartment = state.departmentFilter === '全部' || caseItem.department === state.departmentFilter;
    const matchesRisk = state.riskFilter === '全部' || caseItem.risk === state.riskFilter;
    const searchTarget = `${caseItem.patient}${caseItem.visitNo}${caseItem.department}${caseItem.doctor}${caseItem.diagnosis}`;
    const matchesSearch = !state.searchText || searchTarget.includes(state.searchText);
    return matchesStatus && matchesDepartment && matchesRisk && matchesSearch;
  });
}

function renderResults() {
  element('#statusTabs').innerHTML = statusTabs.map((status) => `
    <button class="segment-button ${status === state.statusFilter ? 'is-active' : ''}" data-status="${status}" type="button">${status}</button>
  `).join('');

  const visibleCases = filteredCases();
  const rows = filteredCases().map((caseItem) => `
    <tr>
      <td><input type="checkbox" data-result-id="${caseItem.id}" ${state.selectedResultIds.includes(caseItem.id) ? 'checked' : ''} /></td>
      <td><button class="case-link" data-case-detail="${caseItem.id}" type="button">${caseItem.patient}<br><small>${caseItem.visitNo}</small></button></td>
      <td>${caseItem.department}<br><small>${caseItem.doctor}</small></td>
      <td>${caseItem.diagnosis}</td>
      <td><strong>${caseItem.score}</strong> 分</td>
      <td><span class="complete-meter"><span class="mini-meter"><span style="width:${caseItem.completenessPercent}%"></span></span>${caseItem.completeness}</span></td>
      <td>严重 ${caseItem.severe}<br><small>一般 ${caseItem.normal}</small></td>
      <td>${caseItem.veto ? '<span class="status-pill danger">一票否决</span>' : '<span class="status-pill calm">无</span>'}</td>
      <td><span class="risk-pill ${riskClass(caseItem.risk)}">${caseItem.risk}风险</span></td>
      <td>${caseItem.status}</td>
      <td>
        <button class="button button-ghost" data-case-detail="${caseItem.id}" type="button">详情</button>
        <button class="button button-ghost" data-case-report="${caseItem.id}" type="button">报告</button>
      </td>
    </tr>
  `).join('');

  element('#qualityTable').innerHTML = `
    <table>
      <thead><tr><th>选择</th><th>患者 / 住院号</th><th>科室 / 医生</th><th>主要诊断</th><th>总分</th><th>完整度</th><th>缺陷数</th><th>否决项</th><th>风险</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="11">暂无符合条件的病例。请调整筛选条件。</td></tr>'}</tbody>
    </table>
  `;
  element('#selectedResultCount').textContent = `已选 ${state.selectedResultIds.length} 份病例`;
  element('#selectVisibleResultsButton').textContent = visibleCases.length && visibleCases.every((caseItem) => state.selectedResultIds.includes(caseItem.id)) ? '取消全选当前列表' : '全选当前列表';
}

function renderDetail() {
  applyDetailLayout();
  const caseItem = selectedCase();
  const documents = caseItem.documents;
  const activeDocument = documents.find((documentItem) => documentItem.id === state.selectedDocumentId) || documents[0];
  element('#detailCaseMeta').textContent = `住院号 ${caseItem.visitNo}｜${caseItem.dischargeDate} 出院｜${caseItem.doctor}`;
  element('#detailTitle').textContent = `${caseItem.patient}｜${caseItem.department}｜${caseItem.diagnosis}`;
  element('#detailScore').textContent = `${caseItem.score} 分`;
  element('#caseSummaryGrid').innerHTML = [
    ['文书完整度', caseItem.completeness],
    ['严重缺陷', `${caseItem.severe} 个`],
    ['一般缺陷', `${caseItem.normal} 个`],
    ['一票否决', caseItem.veto ? '有' : '无'],
    ['是否通过', isPassed(caseItem) ? '通过' : '未通过'],
  ].map(([label, value]) => `<div class="summary-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');

  element('#documentList').innerHTML = documents.map((documentItem) => {
    const statusClass = documentItem.status === '应有未有' ? 'danger' : documentItem.status === '存在缺陷' ? 'warning' : documentItem.status === '材料未提供' ? 'warning' : 'calm';
    return `
    <button class="doc-item ${documentItem.id === activeDocument.id ? 'is-active' : ''}" data-document-id="${documentItem.id}" type="button">
      <strong>${documentItem.name}</strong>
      <span><span class="status-pill ${statusClass}">${documentItem.status}</span> ${documentItem.meta}</span>
    </button>
  `}).join('');

  element('#recordMeta').textContent = activeDocument.meta;
  element('#recordTitle').textContent = `${activeDocument.name}原文`;
  const recordLines = caseItem.record;
  const activeDefect = caseItem.defects.find((defect) => defect.id === state.selectedDefectId);
  element('#medicalRecord').innerHTML = recordLines.map((line, index) => {
    let highlightedLine = line;
    if (activeDefect && activeDefect.evidence) {
      const evidencePhrases = activeDefect.evidence.split(/[；;]/);
      evidencePhrases.forEach((phrase) => {
        const trimmed = phrase.trim();
        if (trimmed && line.includes(trimmed)) {
          highlightedLine = highlightedLine.split(trimmed).join(`<mark class="evidence" id="evidence-${index}">${trimmed}</mark>`);
        }
      });
    }
    return `<p>${highlightedLine}</p>`;
  }).join('');

  if (activeDefect) {
    const evidenceEl = element('mark.evidence');
    if (evidenceEl) evidenceEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const defects = caseItem.defects;
  element('#defectCards').innerHTML = defects.map((defect) => `
    <article class="defect-card ${defect.id === state.selectedDefectId ? 'is-active' : ''}" data-defect-focus="${defect.id}">
      <header><h4>${defect.title}</h4><span class="status-pill ${defect.level === '严重' ? 'danger' : 'warning'}">${defect.level}</span></header>
      <p>${defect.suggestion}</p>
      <div class="defect-meta">
        <span class="status-pill calm">${defect.type}</span>
        <span class="status-pill warning">扣 ${defect.deduction} 分</span>
        <span class="status-pill ${defect.reviewStatus === '已通过' ? 'calm' : 'warning'}">${defect.reviewStatus}</span>
      </div>
      <p><strong>规则依据：</strong>${defect.rule}</p>
      <p><strong>AI 判断理由：</strong>${defect.reason}</p>
      <p><strong>原文证据：</strong>${defect.evidence}</p>
      <div class="defect-actions">
        <button class="tiny-button" data-defect-action="confirm" data-defect-id="${defect.id}" type="button">确认问题</button>
        <button class="tiny-button danger" data-defect-action="ignore" data-defect-id="${defect.id}" type="button">忽略</button>
        <button class="tiny-button" data-defect-action="report" data-defect-id="${defect.id}" type="button">加入报告</button>
        <button class="tiny-button" data-defect-action="rectify" data-defect-id="${defect.id}" type="button">加入整改</button>
      </div>
    </article>
  `).join('');
}

function initDetailResizers() {
  const detailLayout = element('.case-detail-layout');
  const leftResizer = element('#detailResizerLeft');
  const rightResizer = element('#detailResizerRight');
  if (!detailLayout || !leftResizer || !rightResizer) return;

  const startDrag = (side, resizer, startEvent) => {
    if (window.innerWidth <= 1180) return;
    startEvent.preventDefault();
    const startX = startEvent.clientX;
    const startNavWidth = state.detailLayout.navWidth;
    const startDefectWidth = state.detailLayout.defectWidth;
    resizer.classList.add('is-dragging');

    const onMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      if (side === 'left') {
        state.detailLayout.navWidth = Math.min(340, Math.max(220, startNavWidth + delta));
      } else {
        state.detailLayout.defectWidth = Math.min(520, Math.max(320, startDefectWidth - delta));
      }
      applyDetailLayout();
    };

    const onUp = () => {
      resizer.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  leftResizer.addEventListener('pointerdown', (event) => startDrag('left', leftResizer, event));
  rightResizer.addEventListener('pointerdown', (event) => startDrag('right', rightResizer, event));
  const resetLayout = () => {
    state.detailLayout.navWidth = 276;
    state.detailLayout.defectWidth = 376;
    applyDetailLayout();
  };
  leftResizer.addEventListener('dblclick', resetLayout);
  rightResizer.addEventListener('dblclick', resetLayout);
}

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

function renderReport() {
  const caseItem = selectedCase();
  const defects = caseItem.defects;
  const passText = isPassed(caseItem) ? '通过' : '未通过';
  const activeTemplate = reportTemplates.find((template) => template.id === state.activeReportTemplate) || reportTemplates[0];
  const reportSections = [
    { id: 'report-overview', title: '基本信息', meta: `${caseItem.department}｜${caseItem.visitNo}` },
    { id: 'report-defects', title: '缺陷明细', meta: `${defects.length} 条问题` },
    { id: 'report-actions', title: '整改建议', meta: '处理路径' },
    { id: 'report-documents', title: '文书完整度', meta: `${caseItem.documents.length} 份文书` },
  ];

  if (!reportSections.some((section) => section.id === state.activeReportSection)) {
    state.activeReportSection = reportSections[0].id;
  }

  element('#reportOutline').innerHTML = reportSections.map((section) => `
    <button
      class="report-outline-item ${section.id === state.activeReportSection ? 'is-active' : ''}"
      data-report-section="${section.id}"
      type="button"
    >
      <strong>${section.title}</strong>
      <span>${section.meta}</span>
    </button>
  `).join('');

  element('#reportPaper').innerHTML = `
    <div class="report-template-grid">
      ${reportTemplates.map((template) => `
        <button class="report-template-card ${template.id === activeTemplate.id ? 'is-active' : ''}" data-report-template="${template.id}" type="button">
          <strong>${template.name}</strong>
          <span>${template.audience}</span>
          <small>${template.focus}</small>
        </button>
      `).join('')}
    </div>
    <article class="report-paper">
      <section class="report-section" id="report-overview">
        <h4>${caseItem.patient}</h4>
        <p class="report-note">当前模板：${activeTemplate.name}。本报告面向 ${activeTemplate.audience}，重点呈现 ${activeTemplate.focus}。</p>
        <p class="report-patient-meta">${caseItem.department}｜${caseItem.visitNo}｜${caseItem.genderAge}｜主治：${caseItem.doctor}｜${caseItem.diagnosis}</p>
        <dl>
          <div><dt>病例总分</dt><dd>${caseItem.score} 分</dd></div>
          <div><dt>质控结论</dt><dd>${passText}</dd></div>
          <div><dt>文书完整度</dt><dd>${caseItem.completeness}</dd></div>
          <div><dt>风险等级</dt><dd>${caseItem.risk}风险</dd></div>
        </dl>
        <dl>
          <div><dt>严重缺陷</dt><dd>${caseItem.severe} 个</dd></div>
          <div><dt>一般缺陷</dt><dd>${caseItem.normal} 个</dd></div>
          <div><dt>一票否决</dt><dd>${caseItem.veto ? '有' : '无'}</dd></div>
          <div><dt>质控状态</dt><dd>${caseItem.status}</dd></div>
        </dl>
      </section>

      <section class="report-section" id="report-defects">
        <h5 class="report-section-title">缺陷明细</h5>
        <ol class="report-defect-list">${defects.map((defect) => `
          <li>
            <strong>${defect.title}</strong>（${defect.level}｜${defect.type}｜扣 ${defect.deduction} 分）<br>
            规则依据：${defect.rule}<br>
            AI 判断理由：${defect.reason}<br>
            原文证据：${defect.evidence}<br>
            整改建议：${defect.suggestion}<br>
            复核状态：${defect.reviewStatus}
          </li>
        `).join('')}</ol>
      </section>

      <section class="report-section" id="report-actions">
        <h5 class="report-section-title">整改建议汇总</h5>
        <p class="report-note">请责任科室补齐缺失文书，完善关键治疗记录与疗效评价。质控科人工确认后标记为待整改，进入复核流程。</p>
      </section>

      <section class="report-section" id="report-documents">
        <h5 class="report-section-title">文书完整度明细</h5>
        <div class="report-doc-list">
          ${caseItem.documents.map((doc) => `
            <article class="report-doc-item">
              <div>
                <strong>${doc.name}</strong>
                <small>${doc.meta}</small>
              </div>
              <span class="status-pill ${doc.status.includes('缺陷') || doc.status.includes('未提供') || doc.status.includes('应有未有') ? 'warning' : 'calm'}">${doc.status}</span>
            </article>
          `).join('')}
        </div>
      </section>
    </article>
  `;

  syncReportSection();
}

function syncReportSection(scrollTargetId) {
  const reportBody = element('#reportPaper');
  if (!reportBody) return;

  if (scrollTargetId) {
    const section = element(`#${scrollTargetId}`);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      state.activeReportSection = scrollTargetId;
    }
  } else {
    const sections = elements('.report-section');
    const containerTop = reportBody.getBoundingClientRect().top;
    let currentId = sections[0]?.id;

    sections.forEach((section) => {
      const offset = section.getBoundingClientRect().top - containerTop;
      if (offset <= 48) currentId = section.id;
    });

    if (currentId) state.activeReportSection = currentId;
  }

  elements('.report-outline-item').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.reportSection === state.activeReportSection);
  });
}

function renderRectify() {
  const lanes = [
    { title: '待人工复核', hint: 'AI已完成', items: cases.filter((caseItem) => caseItem.status === lifecycleStates.pendingReview) },
    { title: '待临床整改', hint: '科室处理中', items: cases.filter((caseItem) => caseItem.status === lifecycleStates.pendingDoctor) },
    { title: '已整改待复核', hint: '医生已提交', items: cases.filter((caseItem) => caseItem.status === lifecycleStates.pendingRecovery) },
    { title: '复核通过', hint: '可归档', items: cases.filter((caseItem) => caseItem.status === lifecycleStates.passed) },
  ];
  element('#rectifyBoard').innerHTML = lanes.map((lane) => `
    <section class="rectify-lane">
      <header><strong>${lane.title}</strong><span>${lane.items.length}</span></header>
      <p>${lane.hint}</p>
      ${lane.items.map((caseItem) => `
        <article class="rectify-card">
          <div class="rectify-card-main">
            <strong>${caseItem.patient}｜${caseItem.department}</strong>
            <span>${caseItem.visitNo}｜${caseItem.diagnosis}</span>
          </div>
          <div class="rectify-card-meta">
            <span class="risk-pill ${riskClass(caseItem.risk)}">${caseItem.risk}风险</span>
            <span class="status-pill warning">${caseItem.completeness}</span>
          </div>
          <div class="rectify-card-actions">
            <button class="tiny-button" data-case-detail="${caseItem.id}" type="button">进入复核</button>
          </div>
        </article>
      `).join('') || '<div class="empty-card">暂无病例</div>'}
    </section>
  `).join('');
}

function renderRules() {
  element('#ruleBoard').innerHTML = rules.map((rule) => `
    <article class="rule-tile">
      <div class="section-heading compact">
        <h4>${rule.name}</h4>
        <span class="status-pill ${rule.enabled ? 'calm' : 'warning'}">${rule.enabled ? '启用中' : '待启用'}</span>
      </div>
      <p>${rule.desc}</p>
      <div class="rule-meta">
        <span>v2.1</span><span>${rule.id === 'rule-homepage' ? '首页口径' : '病例评分'}</span><span>可追溯</span>
      </div>
      <button class="button button-ghost" type="button">规则明细</button>
    </article>
  `).join('');
}

function renderDashboard() {
  const departments = [
    { name: '普外科', pass: 68, avg: 82.4, defects: 29, rectify: 61, delta: -3.1, risk: '高', focus: '首页缺项' },
    { name: '心内科', pass: 82, avg: 88.1, defects: 14, rectify: 74, delta: 1.8, risk: '中', focus: '病程闭环' },
    { name: '骨科', pass: 64, avg: 79.6, defects: 31, rectify: 58, delta: -4.6, risk: '高', focus: '手术材料' },
    { name: '神经内科', pass: 91, avg: 93.2, defects: 8, rectify: 86, delta: 2.5, risk: '低', focus: '签名一致性' },
  ];
  const trendSeries = [
    { day: '06/21', total: 42, closed: 24 },
    { day: '06/22', total: 55, closed: 31 },
    { day: '06/23', total: 37, closed: 22 },
    { day: '06/24', total: 68, closed: 39 },
    { day: '06/25', total: 51, closed: 34 },
    { day: '06/26', total: 44, closed: 29 },
    { day: '06/27', total: 32, closed: 21 },
  ];
  const maxTrendValue = Math.max(...trendSeries.map((item) => item.total));
  const activeDepartment = departments.find((department) => department.name === state.selectedDashboardDept) || departments[0];
  const chartWidth = 620;
  const chartHeight = 228;
  const paddingX = 24;
  const paddingTop = 16;
  const paddingBottom = 30;
  const innerWidth = chartWidth - (paddingX * 2);
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const pointX = (index) => paddingX + (innerWidth * index / (trendSeries.length - 1));
  const pointY = (value) => paddingTop + innerHeight - ((value / maxTrendValue) * innerHeight);
  const totalPoints = trendSeries.map((item, index) => `${pointX(index)},${pointY(item.total)}`).join(' ');
  const closedPoints = trendSeries.map((item, index) => `${pointX(index)},${pointY(item.closed)}`).join(' ');
  const areaPath = `M ${pointX(0)} ${pointY(trendSeries[0].total)} ${trendSeries.slice(1).map((item, index) => `L ${pointX(index + 1)} ${pointY(item.total)}`).join(' ')} L ${pointX(trendSeries.length - 1)} ${chartHeight - paddingBottom} L ${pointX(0)} ${chartHeight - paddingBottom} Z`;
  const issueSources = [
    { name: '文书完整性', value: 38 },
    { name: '首页字段缺项', value: 24 },
    { name: '签名节点缺失', value: 19 },
    { name: '病程闭环不足', value: 14 },
  ];
  element('#analyticsGrid').innerHTML = `
    <div class="analytics-cards analytics-cards-compact">
      <article><span>全院通过率</span><strong>74%</strong><small>较上月 +3.2%</small></article>
      <article><span>平均得分</span><strong>86.2</strong><small>目标 90 分</small></article>
      <article><span>高频缺陷</span><strong>48</strong><small>文书完整性最多</small></article>
      <article><span>整改及时率</span><strong>69%</strong><small>平均 2.8 天</small></article>
    </div>

    <section class="analytics-workbench analytics-workbench-fixed">
      <aside class="department-compare department-directory">
        <div class="section-heading compact">
          <div>
            <h4>科室对比</h4>
            <p>左侧固定目录，选中后右侧看趋势与重点</p>
          </div>
        </div>
        <div class="department-rows department-directory-list">
          ${departments.map((department) => `
            <button class="department-row ${department.name === activeDepartment.name ? 'is-active' : ''}" data-dashboard-dept="${department.name}" type="button">
              <div class="department-row-main">
                <div class="department-name-block">
                  <strong>${department.name}</strong>
                  <span class="status-pill ${department.risk === '高' ? 'danger' : department.risk === '中' ? 'warning' : 'calm'}">${department.risk}风险</span>
                </div>
                <small>${department.focus}</small>
              </div>
              <div class="department-row-metric pass">
                <span>通过率</span>
                <strong>${department.pass}%</strong>
                <div class="metric-track"><span style="width:${department.pass}%"></span></div>
              </div>
              <div class="department-row-metric avg">
                <span>平均分</span>
                <strong>${department.avg}</strong>
                <small class="${department.delta >= 0 ? 'up' : 'down'}">${department.delta >= 0 ? '+' : ''}${department.delta}</small>
              </div>
              <div class="department-row-metric defects">
                <span>缺陷数</span>
                <strong>${department.defects}</strong>
              </div>
              <div class="department-row-metric rectify">
                <span>整改及时率</span>
                <strong>${department.rectify}%</strong>
                <div class="metric-track subtle"><span style="width:${department.rectify}%"></span></div>
              </div>
            </button>
          `).join('')}
        </div>
      </aside>

      <section class="analytics-stage">
        <article class="trend-panel trend-panel-refined">
          <div class="section-heading compact">
            <div>
              <h4>缺陷趋势</h4>
              <p>右侧分析区单独滚动，首屏只保留关键趋势</p>
            </div>
            <div class="trend-legend">
              <span><i class="legend-dot total"></i>新增缺陷</span>
              <span><i class="legend-dot closed"></i>已闭环</span>
            </div>
          </div>

          <div class="trend-focus-card">
            <div>
              <span class="trend-focus-label">当前焦点</span>
              <strong>${activeDepartment.name}</strong>
              <small>${activeDepartment.focus}｜${activeDepartment.risk}风险</small>
            </div>
            <div class="trend-focus-metrics">
              <div><span>通过率</span><strong>${activeDepartment.pass}%</strong></div>
              <div><span>均分</span><strong>${activeDepartment.avg}</strong></div>
              <div><span>及时率</span><strong>${activeDepartment.rectify}%</strong></div>
            </div>
          </div>

          <div class="trend-svg-frame">
            <svg class="trend-svg" viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="近7日缺陷趋势">
              <defs>
                <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgba(126,164,209,0.28)"></stop>
                  <stop offset="100%" stop-color="rgba(126,164,209,0.03)"></stop>
                </linearGradient>
              </defs>
              ${[0, 1, 2, 3].map((step) => {
                const y = paddingTop + ((innerHeight / 3) * step);
                return `<line x1="${paddingX}" y1="${y}" x2="${chartWidth - paddingX}" y2="${y}" class="trend-grid-line"></line>`;
              }).join('')}
              <path d="${areaPath}" class="trend-area"></path>
              <polyline points="${totalPoints}" class="trend-line total"></polyline>
              <polyline points="${closedPoints}" class="trend-line closed"></polyline>
              ${trendSeries.map((item, index) => `
                <circle cx="${pointX(index)}" cy="${pointY(item.total)}" r="4.5" class="trend-point total"></circle>
                <circle cx="${pointX(index)}" cy="${pointY(item.closed)}" r="4" class="trend-point closed"></circle>
              `).join('')}
            </svg>
            <div class="trend-axis">
              ${trendSeries.map((item) => `
                <div class="trend-axis-item">
                  <strong>${item.total}</strong>
                  <small>${item.day}</small>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="analytics-bottom-grid">
            <article class="source-panel">
              <div class="mini-panel-head">
                <h5>缺陷来源</h5>
                <small>主要问题占比</small>
              </div>
              <div class="source-list">
                ${issueSources.map((item) => `
                  <div class="source-item">
                    <span>${item.name}</span>
                    <div class="source-bar"><i style="width:${item.value}%"></i></div>
                    <strong>${item.value}%</strong>
                  </div>
                `).join('')}
              </div>
            </article>

            <div class="trend-summary">
              <div><span>峰值</span><strong>06/24</strong><small>68 条</small></div>
              <div><span>闭环率</span><strong>61%</strong><small>较上周 +4%</small></div>
              <div><span>主要来源</span><strong>文书完整性</strong><small>占比 38%</small></div>
            </div>
          </div>
        </article>
      </section>
    </section>
  `;
}

function bindEvents() {
  element('#mainNav').addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (button) navigate(button.dataset.view);
  });

  document.body.addEventListener('click', (event) => {
    const viewLink = event.target.closest('[data-view-link]');
    if (viewLink) navigate(viewLink.dataset.viewLink);

    const caseDetailButton = event.target.closest('[data-case-detail]');
    if (caseDetailButton) {
      state.selectedCaseId = caseDetailButton.dataset.caseDetail;
      state.selectedDocumentId = 'doc-discharge';
      state.selectedDefectId = selectedCase().defects[0]?.id || '';
      navigate('review');
    }

    const caseReportButton = event.target.closest('[data-case-report]');
    if (caseReportButton) {
      state.selectedCaseId = caseReportButton.dataset.caseReport;
      navigate('report');
      showToast(`${selectedCase().patient} 的质控报告已生成`);
    }

    const reviewCaseButton = event.target.closest('[data-review-case]');
    if (reviewCaseButton) {
      state.selectedCaseId = reviewCaseButton.dataset.reviewCase;
      const caseItem = selectedReviewCase();
      caseItem.status = lifecycleStates.reviewing;
      addCaseLog(caseItem, '进入人工复核', '质控员打开该病历进行缺陷裁决');
      renderReviewWorkbench();
    }

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

    const defectFocusButton = event.target.closest('[data-defect-focus]');
    if (defectFocusButton) {
      state.selectedDefectId = defectFocusButton.dataset.defectFocus;
      const defect = selectedCase().defects.find((d) => d.id === state.selectedDefectId);
      if (defect) state.selectedDocumentId = defect.document === '病案首页' ? 'doc-homepage' : defect.document === '入院记录' ? 'doc-admission' : defect.document === '首次病程记录' ? 'doc-course' : defect.document === '日常病程记录' ? 'doc-daily' : defect.document === '术前讨论记录' ? 'doc-preop' : defect.document === '手术记录' ? 'doc-surgery' : defect.document === '麻醉记录' ? 'doc-anesthesia' : 'doc-discharge';
      renderReviewWorkbench();
    }

    const ruleButton = event.target.closest('[data-rule-id]');
    if (ruleButton) {
      state.selectedRuleId = ruleButton.dataset.ruleId;
      renderBatch();
      showToast(`已选择：${rules.find((rule) => rule.id === state.selectedRuleId).name}`);
    }

    const dashboardDeptButton = event.target.closest('[data-dashboard-dept]');
    if (dashboardDeptButton) {
      state.selectedDashboardDept = dashboardDeptButton.dataset.dashboardDept;
      renderDashboard();
    }

    const statusButton = event.target.closest('[data-status]');
    if (statusButton) {
      state.statusFilter = statusButton.dataset.status;
      renderReviewWorkbench();
    }

    const documentButton = event.target.closest('[data-document-id]');
    if (documentButton) {
      state.selectedDocumentId = documentButton.dataset.documentId;
      renderReviewWorkbench();
    }

    const candidateCheckbox = event.target.closest('[data-candidate-id]');
    if (candidateCheckbox) {
      const caseId = candidateCheckbox.dataset.candidateId;
      if (candidateCheckbox.checked) {
        if (!state.selectedCandidateIds.includes(caseId)) state.selectedCandidateIds.push(caseId);
      } else {
        state.selectedCandidateIds = state.selectedCandidateIds.filter((id) => id !== caseId);
      }
      renderCandidates();
    }

    const resultCheckbox = event.target.closest('[data-result-id]');
    if (resultCheckbox) {
      const caseId = resultCheckbox.dataset.resultId;
      if (resultCheckbox.checked) {
        if (!state.selectedResultIds.includes(caseId)) state.selectedResultIds.push(caseId);
      } else {
        state.selectedResultIds = state.selectedResultIds.filter((id) => id !== caseId);
      }
      renderReviewWorkbench();
    }

    const defectActionButton = event.target.closest('[data-defect-action]');
    if (defectActionButton) {
      const defectId = defectActionButton.dataset.defectId;
      const action = defectActionButton.dataset.defectAction;
      const caseItem = selectedCase();
      const defect = caseItem.defects.find((d) => d.id === defectId);

      if (action === 'confirm') {
        if (defect) defect.reviewStatus = '已确认';
      }
      if (action === 'ignore') {
        if (defect) defect.reviewStatus = '已忽略';
      }
      if (action === 'report') {
        state.reportIncludedDefects.push(defectId);
      }
      if (action === 'rectify') {
        if (defect) defect.reviewStatus = '待整改';
        caseItem.status = '待整改';
        renderReviewWorkbench();
        renderRecoveryWorkspace();
      }
      renderReviewWorkbench();

      const actionText = {
        confirm: '已确认该缺陷，状态将进入报告候选',
        ignore: '已忽略该缺陷，并保留人工痕迹',
        report: '已加入本病例质控报告',
        rectify: '已加入整改队列，可在整改复核页跟踪',
      }[action];
      showToast(actionText);
    }

    const reportPrev = event.target.closest('#reportPrevButton');
    if (reportPrev) {
      const index = cases.findIndex((c) => c.id === state.selectedCaseId);
      state.selectedCaseId = cases[(index - 1 + cases.length) % cases.length].id;
      state.activeReportSection = 'report-overview';
      renderReport();
    }
    const reportNext = event.target.closest('#reportNextButton');
    if (reportNext) {
      const index = cases.findIndex((c) => c.id === state.selectedCaseId);
      state.selectedCaseId = cases[(index + 1) % cases.length].id;
      state.activeReportSection = 'report-overview';
      renderReport();
    }
    const reportSectionButton = event.target.closest('[data-report-section]');
    if (reportSectionButton) {
      state.activeReportSection = reportSectionButton.dataset.reportSection;
      syncReportSection(state.activeReportSection);
    }
    const reportTemplateButton = event.target.closest('[data-report-template]');
    if (reportTemplateButton) {
      state.activeReportTemplate = reportTemplateButton.dataset.reportTemplate;
      renderReport();
    }
    const reportPdf = event.target.closest('#reportPdfButton');
    if (reportPdf) showToast(`已生成 ${selectedCase().patient} 的 PDF 报告`);
    const reportBatch = event.target.closest('#reportBatchButton');
    if (reportBatch) showToast('已生成批量报告导出任务：PDF + Excel + 复核意见');

    const importHisButton = event.target.closest('#importHisButton');
    if (importHisButton) {
      state.importMode = 'HIS/EMR';
      importLogEntries.unshift({ title: '批量调取完成', detail: 'HIS/EMR 返回 42 份待质控病例，已自动匹配基础资料' });
      renderBatch();
      showToast('已从 HIS/EMR 批量调取病例');
    }

    const uploadZipButton = event.target.closest('#uploadZipButton');
    if (uploadZipButton) {
      state.importMode = 'ZIP 病例包';
      importLogEntries.unshift({ title: '病例包上传完成', detail: '已识别 18 份病例，待补齐病案首页与知情同意材料' });
      renderBatch();
      showToast('已模拟上传病例包并完成批量识别');
    }

    const uploadExcelButton = event.target.closest('#uploadExcelButton');
    if (uploadExcelButton) {
      state.importMode = 'Excel 名单';
      importLogEntries.unshift({ title: '名单导入完成', detail: '已导入住院号清单 26 条，系统正在按名单拉取对应病例' });
      renderBatch();
      showToast('已模拟上传 Excel 名单并建立批量任务');
    }

    const selectAllCandidatesButton = event.target.closest('#selectAllCandidatesButton');
    if (selectAllCandidatesButton) {
      const visibleCandidateIds = (state.riskOnlyCandidates ? cases.filter((caseItem) => caseItem.risk === '高') : cases).map((caseItem) => caseItem.id);
      const allSelected = visibleCandidateIds.every((id) => state.selectedCandidateIds.includes(id));
      state.selectedCandidateIds = allSelected
        ? state.selectedCandidateIds.filter((id) => !visibleCandidateIds.includes(id))
        : Array.from(new Set([...state.selectedCandidateIds, ...visibleCandidateIds]));
      renderCandidates();
    }

    const clearCandidateSelectionButton = event.target.closest('#clearCandidateSelectionButton');
    if (clearCandidateSelectionButton) {
      state.selectedCandidateIds = [];
      renderCandidates();
    }

    const selectVisibleResultsButton = event.target.closest('#selectVisibleResultsButton');
    if (selectVisibleResultsButton) {
      const visibleIds = filteredCases().map((caseItem) => caseItem.id);
      const allSelected = visibleIds.length && visibleIds.every((id) => state.selectedResultIds.includes(id));
      state.selectedResultIds = allSelected
        ? state.selectedResultIds.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...state.selectedResultIds, ...visibleIds]));
      renderReviewWorkbench();
    }

    const bulkReviewButton = event.target.closest('#bulkReviewButton');
    if (bulkReviewButton) {
      cases.forEach((caseItem) => {
        if (state.selectedResultIds.includes(caseItem.id) && caseItem.status === lifecycleStates.aiDone) caseItem.status = lifecycleStates.pendingReview;
      });
      renderReviewWorkbench();
      renderRecoveryWorkspace();
      showToast(`已将 ${state.selectedResultIds.length} 份病例加入人工复核队列`);
    }
  });

  document.body.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const row = event.target.closest('.overview-click-row[data-case-detail]');
    if (!row) return;
    event.preventDefault();
    state.selectedCaseId = row.dataset.caseDetail;
    state.selectedDocumentId = 'doc-discharge';
    state.selectedDefectId = selectedCase().defects[0]?.id || '';
    navigate('review');
  });

  element('#globalSearch').addEventListener('input', (event) => {
    state.searchText = event.target.value.trim();
    if (state.activeView !== 'review') navigate('review');
    renderReviewWorkbench();
  });

  element('#departmentFilter')?.addEventListener('change', (event) => {
    state.departmentFilter = event.target.value;
    renderReviewWorkbench();
  });

  element('#riskFilter')?.addEventListener('change', (event) => {
    state.riskFilter = event.target.value;
    renderReviewWorkbench();
  });

  element('#syncHisButton').addEventListener('click', () => showToast('已模拟同步 HIS/EMR：新增 12 份出院病例'));
  element('#previewCasesButton').addEventListener('click', () => {
    showToast(`已按当前条件预览病例：出院日期 ${formatDateRange(state.batchFilters.dischargeStartDate, state.batchFilters.dischargeEndDate)}`);
  });
  element('#createTaskButton').addEventListener('click', () => {
    const targetIds = state.selectedCandidateIds.length ? state.selectedCandidateIds : cases.map((caseItem) => caseItem.id);
    tasks.unshift({
      name: '新建终末质控任务',
      scope: `${state.importMode}｜${targetIds.length} 份病例｜${formatDateRange(state.batchFilters.dischargeStartDate, state.batchFilters.dischargeEndDate)}｜${rules.find((rule) => rule.id === state.selectedRuleId)?.name || '基础规则'}`,
      progress: 8,
      status: 'AI质检中',
    });
    cases.forEach((caseItem) => {
      if (targetIds.includes(caseItem.id) && [lifecycleStates.pendingAi, lifecycleStates.aiDone, lifecycleStates.pendingReview].includes(caseItem.status)) {
        caseItem.status = lifecycleStates.aiRunning;
      }
    });
    renderOverview();
    renderReviewWorkbench();
    showToast(`AI 批量质检任务已创建，${targetIds.length} 份病例进入"AI质检中"`);
    navigate('overview');
  });
  element('#selectRiskOnlyButton').addEventListener('click', () => {
    state.riskOnlyCandidates = !state.riskOnlyCandidates;
    renderCandidates();
  });
  element('#exportSelectedButton')?.addEventListener('click', () => showToast('已生成当前筛选结果的报告导出任务：PDF + Excel + 复核意见'));

  const batchDateInputs = {
    batchDischargeStart: 'dischargeStartDate',
    batchDischargeEnd: 'dischargeEndDate',
    batchAdmitStart: 'admitStartDate',
    batchAdmitEnd: 'admitEndDate',
  };

  Object.entries(batchDateInputs).forEach(([id, key]) => {
    const input = element(`#${id}`);
    if (!input) return;
    input.addEventListener('change', (event) => {
      state.batchFilters[key] = event.target.value;
      showToast(`已更新${id.includes('Discharge') ? '出院' : '入院'}日期：${formatDateRange(
        id.includes('Discharge') ? state.batchFilters.dischargeStartDate : state.batchFilters.admitStartDate,
        id.includes('Discharge') ? state.batchFilters.dischargeEndDate : state.batchFilters.admitEndDate,
      )}`);
    });
  });

  element('#reportPaper')?.addEventListener('scroll', () => {
    if (state.activeView === 'report') syncReportSection();
  });

}

function init() {
  renderOverview();
  renderBatch();
  renderReviewWorkbench();
  renderDoctorWorkspace();
  renderRecoveryWorkspace();
  renderRules();
  renderDashboard();
  bindEvents();
  initDetailResizers();
}

init();
