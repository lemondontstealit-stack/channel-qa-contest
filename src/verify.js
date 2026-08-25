// 功能验证：模拟浏览器环境运行 index.html 中的 JS
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('../index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.log('FAIL: script not found'); process.exit(1); }
const code = m[1];

// ---- DOM stub ----
const captured = [];
function makeEl() {
  return { value: '', innerHTML: '', className: '', id: '', style: {}, onclick: null, onkeydown: null,
    appendChild() {}, remove() {}, scrollTop: 0, src: 'data:stub' };
}
const els = {};
global.document = {
  getElementById(id) { if (!els[id]) els[id] = makeEl(); return els[id]; },
  createElement() { return makeEl(); },
  body: makeEl()
};
global.localStorage = { getItem() { return null; }, setItem() {} };
global.confirm = () => true;
global.setTimeout = (fn) => { fn(); };
global.alert = () => {};

vm.runInThisContext(code);

// 拦截 am() 捕获 AI 回复（同时调用原函数，让会话存储 av/rc 真实运行）
const origAm = global.am;
global.am = function (t, c, n) { captured.push({ t, c }); origAm(t, c, n); };

function ask(q) {
  captured.length = 0;
  els['inp'].value = q;
  global.send();
  return captured.map(x => x.c).join('\n===MSG===\n');
}

// 只看回复、不含用户提问回显（防止回显词掩盖断言）
function askA(q) {
  captured.length = 0;
  els['inp'].value = q;
  global.send();
  return captured.filter(x => x.t === 'a').map(x => x.c).join('\n===MSG===\n');
}

function reset() { _lc = null; _gd = null; _bz = null; _tp = null; _gp = null; _ab = null; _yc = null; }

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

// 参赛复制版使用“完整回答模式”，不再验证原版的逐级菜单与精简回答。
if (code.includes('参赛复制版：取消“精简回答/逐步追问”限制')) {
  let cr = ask('我要开户');
  check('参赛版 开户→直接完整回答', cr.includes('户头类型介绍') && cr.includes('附件10') && !cr.includes('请选择开户类型'), cr.slice(0, 200));
  reset();
  cr = ask('库存怎么调平');
  check('参赛版 库存→直接完整回答', cr.includes('库存调平') && cr.includes('虚拟终端') && cr.includes('库存周转计算') && !cr.includes('请选择'), cr.slice(0, 200));
  reset();
  cr = ask('怎么修改经销商组织信息');
  check('参赛版 变更→直接完整回答', cr.includes('营销组织') && cr.includes('下单组织') && !cr.includes('请输入编号'), cr.slice(0, 200));
  reset();
  cr = ask('开户入口在哪');
  check('参赛版 入口→保留链接直达', cr.includes('distributor_open_list'), cr.slice(0, 200));
  reset();
  cr = ask('附件3');
  check('参赛版 附件→保留精确检索', cr.includes('老板身份证') && cr.includes('法人身份证'), cr.slice(0, 200));
  console.log('\n参赛版验证完成：' + pass + ' 通过，' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
}

// 1. 附件数字：附件9 必须命中附件库（严禁匹配流程条目）
let r = ask('附件9');
check('附件9→附件库', r.includes('实际经营人情况说明'), r.slice(0, 120));

// 2. 附件中文数字：附件九
r = ask('附件九');
check('附件九→附件库', r.includes('实际经营人情况说明'), r.slice(0, 120));

// 3. 附件2
r = ask('附件2');
check('附件2→营业执照', r.includes('营业执照'), r.slice(0, 120));

// 4. 纯数字直达：9 直接匹配附件9，禁止多选弹窗
r = ask('9');
check('纯数字9→附件9直达无弹窗', r.includes('实际经营人情况说明') && !r.includes('匹配到两类内容'), r.slice(0, 200));

// 5. 一码通办：板块名直达（板块名导航路径）
r = ask('一码通办');
check('一码通办→板块列表', r.includes('渠道数据导出路径') && r.includes('转移台账'), r.slice(0, 120));

// 6. 触发词：数据看板 必须调取章节，禁止无匹配话术
r = ask('数据看板');
check('数据看板→一码通办章节', r.includes('一码通办') && r.includes('渠道数据驱动'), r.slice(0, 120));

// 7. 触发词：智慧雪花2.0
r = ask('智慧雪花2.0');
check('智慧雪花2.0→章节', r.includes('渠道数据驱动'), r.slice(0, 120));

// 8. 触发词：渠道数据报表
r = ask('渠道数据报表');
check('渠道数据报表→章节', r.includes('渠道数据驱动'), r.slice(0, 120));

// 9. 触发词：数据报表
r = ask('数据报表');
check('数据报表→章节', r.includes('渠道数据驱动'), r.slice(0, 120));

// 10. 章节内数字导航：先问数据看板，再输入 1
ask('数据看板');
r = ask('1');
check('章节内选1→数据导出路径', r.includes('渠道数据导出路径') && r.includes('库存'), r.slice(0, 120));

// 11. 章节内数字导航：输入 3 → 台账（交接）
ask('数据看板');
r = ask('3');
check('章节内选3→转移台账', r.includes('转移台账') || r.includes('箱码转移'), r.slice(0, 120));

// 12. 子关键词直接检索：台账
r = ask('台账');
check('台账→交接内容直达', r.includes('箱码转移') || r.includes('一码通办相关转移详情'), r.slice(0, 120));

// 13. 子关键词：数据导出
r = ask('数据导出');
check('数据导出→库存报表路径', r.includes('数据导出路径'), r.slice(0, 120));

// 14. 无匹配新话术模板（无板块锁定前提）
reset();
r = ask('今天中午吃什么');
check('无匹配→新统一话术', r.includes('这个问题暂不在渠道管理指南范围内哦~') && r.includes('一码通办数据报表'), r.slice(0, 160));

// 15. 开户三选预判（原有功能）
r = ask('我要开户');
check('我要开户→三选', r.includes('一批新渠道开户') && r.includes('二批开户') && r.includes('管理开户'), r.slice(0, 120));

// 16. 盘库预判
r = ask('怎么盘库');
check('怎么盘库→身份二选', r.includes('公司业务员') && r.includes('经销商人员'), r.slice(0, 120));

// 17. 合同预判五选
r = ask('合同签不了');
check('合同签不了→五选', r.includes('没有收到签署消息') && r.includes('人脸识别失败') && r.includes('经办人信息错误'), r.slice(0, 120));

// 18. 新增地址预判
r = ask('我要新增地址');
check('我要新增地址→四选', r.includes('新开户维护首个地址') && r.includes('拼车地址'), r.slice(0, 120));

// 19. 二批开户隔离
r = ask('如何给二批商开户');
check('二批开户→只答二批', r.includes('二批') && !r.includes('一批新渠道开户'), r.slice(0, 150));

// 20. 一批开户不混二批
r = ask('怎么给一批商开户');
check('一批开户→开户板块', r.includes('一批商管理') || r.includes('开户'), r.slice(0, 120));

// 21. 会话记忆
ask('我要开户');
r = ask('我刚才问了几个问题');
check('会话记忆→历史问题数', r.includes('您一共问了') && r.includes('我要开户'), r.slice(0, 160));

// 22. 合同关键词→吴宜谦联系人兜底
r = ask('人脸识别失败怎么办');
check('合同→吴宜谦兜底', r.includes('吴宜谦'), r.slice(0, 200));

// 22b. 合同签不上→五选（同义转换后仍命中预判）
r = ask('合同签不上怎么办');
check('合同签不上→五选', r.includes('没有收到签署消息') && r.includes('合同作废后无法重新签署'), r.slice(0, 200));

// 22c. 待选状态输入新问题应正常处理（_bz 中断恢复）
ask('我要开户');
r = ask('怎么盘库');
check('待选时新问题→盘库二选', r.includes('公司业务员') && r.includes('经销商人员'), r.slice(0, 200));

// 23. 特约开户转二批
r = ask('特约经销商怎么开户');
check('特约开户→转二批指引', r.includes('特约开户已取消'), r.slice(0, 150));

// 24. 附件碎片词：骑缝章
r = ask('骑缝章');
check('骑缝章→附件1+红线', r.includes('骑缝章'), r.slice(0, 120));

// 25. 奖励会谈强制检索：不得落入无匹配话术
r = ask('奖励会谈');
check('奖励会谈→章节目录', r.includes('经销商奖励会谈') && r.includes('签收奖励规则'), r.slice(0, 160));

// 26. 经销商会谈
r = ask('经销商会谈');
check('经销商会谈→章节目录', r.includes('经销商奖励会谈'), r.slice(0, 160));

// 27. 签收奖励
r = ask('签收奖励');
check('签收奖励→章节目录', r.includes('经销商奖励会谈'), r.slice(0, 160));

// 28. 会谈
r = ask('会谈');
check('会谈→章节目录', r.includes('经销商会谈相关规范'), r.slice(0, 160));

// 29. 奖励会谈章节内数字导航（条目暂无图文内容时应提示销管，绝不落入无匹配话术）
ask('奖励会谈');
r = ask('1');
check('章节内选1→空壳话术+销管', r.includes('暂无详细操作内容') && r.includes('吴宜谦') && !r.includes('渠道管理指南范围内'), r.slice(0, 160));

// 30. 无匹配话术含经销商奖励会谈（无板块锁定前提）
reset();
r = ask('今天中午吃什么');
check('无匹配话术→含奖励会谈', r.includes('经销商奖励会谈'), r.slice(0, 200));

// ===== 指令文档第7节：12条验收用例 =====
r = ask('开户需要准备哪些附件？');
check('验收1 开户附件→清单1-10+高亮', r.includes('附件1') && r.includes('附件10') && r.includes('骑缝章') && r.includes('预包装'), r.slice(0, 200));

r = ask('附件2是什么？');
check('验收2 附件2→营业执照', r.includes('营业执照'), r.slice(0, 120));

r = ask('附件9是什么？');
check('验收3 附件9→实际经营人情况说明', r.includes('实际经营人情况说明'), r.slice(0, 120));

r = ask('一码通办怎么用？');
check('验收4 一码通办→板块内容(非兜底)', r.includes('一码通办') && !r.includes('渠道管理指南范围内'), r.slice(0, 160));

r = ask('奖励会谈怎么操作？');
check('验收5 奖励会谈→空壳话术+转人工', r.includes('暂无详细操作内容') && r.includes('吴宜谦'), r.slice(0, 200));

r = ask('实控人信息怎么导入？');
check('验收6 实控人导入→TPM实控人档案', r.includes('实控人档案管理'), r.slice(0, 160));

r = ask('库存怎么调平？');
check('验收7 库存调平→虚拟终端方案', r.includes('虚拟终端'), r.slice(0, 160));

r = ask('合同签不了怎么办？');
check('验收8 合同签不了→常见问题五选', r.includes('没有收到签署消息') && r.includes('人脸识别失败'), r.slice(0, 200));

r = ask('拼车地址怎么申请？');
check('验收9 拼车地址→仓库专项指引', r.includes('拼车'), r.slice(0, 160));

r = ask('隐藏库是什么？');
check('验收10 隐藏库→飞检核心+考核高亮', r.includes('隐藏库') && r.includes('考核'), r.slice(0, 200));

r = ask('营业执照找不到了帮我看下');
check('验收11 同义词执照→附件2', r.includes('营业执照'), r.slice(0, 160));

r = ask('老板和法人不是同一个人，身份证要几张？');
check('验收12 附件3→两人身份证均需提供', r.includes('两人身份证均需提供'), r.slice(0, 200));

// 路由表补充：箱码/奖盖→交接，渠道激励→奖励会谈，失效→销户
r = ask('箱码转移怎么办');
check('路由 箱码→交接流程', r.includes('箱码'), r.slice(0, 160));
r = ask('渠道激励会谈');
check('路由 渠道激励→奖励会谈目录', r.includes('经销商奖励会谈'), r.slice(0, 160));
r = ask('经销商失效怎么操作');
check('路由 失效→销户', r.includes('销户'), r.slice(0, 160));
r = ask('一批商交接需要哪些资料');
check('路由 交接资料→不被开户附件劫持', r.includes('渠道调整报告') && !r.includes('开户必传附件清单'), r.slice(0, 200));

// ===== 模糊匹配引擎（错别字/同音字，L3编辑距离+L4拼音） =====
// 结果二选一均算通过：HIGH直接命中 或 MEDIUM候选确认框
r = ask('一码通版怎么用');
check('模糊 同音字一码通版→一码通办', r.includes('一码通办') && (r.includes('渠道数据导出路径') || r.includes('您是不是想问')), r.slice(0, 200));

r = ask('营业直照在不在');
check('模糊 错别字营业直照→营业执照', r.includes('营业执照') && r.includes('附件2'), r.slice(0, 200));

r = ask('奖励会弹怎么操作');
check('模糊 同音字奖励会弹→奖励会谈', r.includes('经销商奖励会谈') || (r.includes('您是不是想问') && r.includes('奖励会谈')), r.slice(0, 200));

r = ask('库存吊平');
check('模糊 同音字库存吊平→库存板块路由', r.includes('库存管理') || r.includes('虚拟终端') || (r.includes('您是不是想问') && r.includes('调平')), r.slice(0, 200));

r = ask('我要消户');
check('模糊 同音字消户→销户', r.includes('销户') || (r.includes('您是不是想问') && r.includes('销户')), r.slice(0, 200));

// 模糊层不得劫持无匹配兜底（无板块锁定前提）
reset();
r = ask('今天中午吃什么');
check('模糊 不劫持无匹配兜底', r.includes('这个问题暂不在渠道管理指南范围内哦~'), r.slice(0, 160));

// ===== 板块强制隔离：其他事项/一码通办 严禁调出开户附件内容 =====
r = ask('一批签收奖励需要哪些资料');
check('隔离 签收奖励资料→奖励会谈板块', r.includes('经销商奖励会谈') && !r.includes('开户必传附件清单') && !r.includes('骑缝章'), r.slice(0, 200));

r = ask('签收奖励的附件');
check('隔离 签收奖励的附件→不调开户附件', !r.includes('开户必传附件清单') && !r.includes('骑缝章'), r.slice(0, 200));

r = ask('一批商仓库需要哪些资料');
check('隔离 仓库资料→不调开户附件', !r.includes('开户必传附件清单'), r.slice(0, 200));

r = ask('数据看板需要什么资料');
check('隔离 数据看板资料→一码通办板块', r.includes('一码通办') && !r.includes('开户必传附件清单'), r.slice(0, 200));

r = ask('经销商会谈');
check('隔离 经销商会谈→不含开户内容', !r.includes('开户必传附件清单') && !r.includes('骑缝章') && !r.includes('一批商管理'), r.slice(0, 200));

r = ask('智慧雪花2.0');
check('隔离 智慧雪花→不含开户内容', !r.includes('开户必传附件清单') && !r.includes('骑缝章'), r.slice(0, 200));

// ===== 上下文记忆：锁定板块时"整个流程"类话术直接输出当前板块整套流程 =====
reset();
r = ask('户头类型');
r = ask('整个流程');
check('上下文 开户板块→整个流程输出整套', r.includes('根户头') && r.includes('经办人承诺书'), r.slice(0, 200));

reset();
r = ask('我要开户');
r = ask('全部流程');
check('上下文 开户三选→全部流程输出整套', r.includes('根户头') && r.includes('营业执照'), r.slice(0, 200));

reset();
r = ask('附件9');
r = ask('完整流程给我说一下');
check('上下文 附件后→完整流程输出开户整套', r.includes('根户头') && r.includes('经办人承诺书'), r.slice(0, 200));

reset();
r = ask('怎么盘库');
r = ask('整个流程给我说一下');
check('上下文 盘库菜单→库存整套流程', r.includes('CSMS') && r.includes('CRM'), r.slice(0, 200));

reset();
r = ask('二批开户');
r = ask('完整流程');
check('上下文 二批板块→二批整套流程', r.includes('CRM') && !r.includes('根户头'), r.slice(0, 200));

reset();
r = ask('奖励会谈');
r = ask('整个流程');
check('上下文 奖励会谈→回板块目录(不抛兜底)', r.includes('经销商奖励会谈') && !r.includes('渠道管理指南范围内'), r.slice(0, 200));

reset();
r = ask('一码通办');
r = ask('整个流程');
check('上下文 一码通办→回板块目录(不抛兜底)', r.includes('一码通办') && !r.includes('渠道管理指南范围内'), r.slice(0, 200));

reset();
r = ask('户头类型');
r = ask('下午茶点什么');
check('上下文 锁定板块无命中→板块内检索不抛兜底', r.includes('未在其中找到') && !r.includes('渠道管理指南范围内'), r.slice(0, 200));

reset();
r = ask('整个流程');
check('上下文 无板块锁定→不输出整套流程', !r.includes('根户头'), r.slice(0, 160));

// ===== 上下文记忆扩展：泛化语句变体 + 0等价 + 显式板块词覆盖 =====
reset();
r = ask('我要开户');
r = ask('我想了解全部流程');
check('上下文 我想了解全部流程→开户整套', r.includes('根户头') && r.includes('营业执照'), r.slice(0, 200));

reset();
r = ask('户头类型');
r = ask('查看全部内容');
check('上下文 查看全部内容→开户整套', r.includes('根户头') && r.includes('经办人承诺书'), r.slice(0, 200));

reset();
r = ask('怎么盘库');
r = ask('查看全部完整内容');
check('上下文 查看全部完整内容→库存整套', r.includes('CSMS') && r.includes('CRM'), r.slice(0, 200));

reset();
r = ask('二批开户');
r = ask('全部内容');
check('上下文 全部内容→二批整套', r.includes('CRM') && !r.includes('根户头'), r.slice(0, 200));

reset();
r = ask('户头类型');
r = ask('合同的全部内容');
check('上下文 显式板块词覆盖→合同整套', r.includes('签署') && !r.includes('根户头'), r.slice(0, 200));

reset();
r = ask('如何给一批商开户');
r = ask('0');
check('附件规则 开户菜单输入0→附件清单菜单', r.includes('附件清单') && r.includes('附件10：经办人承诺书') && !r.includes('根户头'), r.slice(0, 300));

reset();
r = ask('如何给一批商开户');
r = ask('0');
r = askA('3');
check('附件规则 清单内输3→附件3直达', r.includes('身份证') && !r.includes('骑缝章'), r.slice(0, 300));

reset();
r = ask('如何给一批商开户');
r = ask('0');
r = askA('0');
check('附件规则 清单内输0→附件1-10全部内容', r.includes('附件1') && r.includes('附件10') && r.includes('<img'), r.slice(0, 300));

reset();
r = ask('如何给一批商开户');
r = ask('0');
r = askA('11');
check('附件规则 清单内越界→提示有效编号', r.includes('请输入有效编号'), r.slice(0, 200));

reset();
r = askA('6');
check('附件规则 纯数字6→附件6印章印模直达无弹窗', r.includes('印章印模') && !r.includes('匹配到两类内容'), r.slice(0, 300));

// ===== 编号精准匹配：菜单数字一一绑定条目，严禁泛语义/附件乱调 =====
reset();
r = ask('如何给一批商开户');
r = ask('1');
check('编号 菜单输1→仅户头类型介绍', r.includes('户头类型介绍') && r.includes('根户头') && !r.includes('骑缝章') && !r.includes('承诺书'), r.slice(0, 200));

reset();
r = ask('如何给一批商开户');
r = ask('1.户头类型介绍');
check('编号 文字+编号→同数字精准', r.includes('户头类型介绍') && r.includes('根户头') && !r.includes('骑缝章'), r.slice(0, 200));

reset();
r = ask('如何给一批商开户');
r = ask('2');
check('编号 菜单输2→仅常规开户', r.includes('常规开户') && !r.includes('骑缝章') && !r.includes('根户头'), r.slice(0, 200));

reset();
r = ask('如何给一批商开户');
r = ask('3');
check('编号 菜单输3→仅操作步骤', r.includes('操作步骤') && !r.includes('骑缝章') && !r.includes('承诺书'), r.slice(0, 200));

reset();
r = ask('如何给一批商开户');
r = ask('4');
check('编号 菜单输4→仅信息录入', r.includes('录入') && !r.includes('骑缝章') && !r.includes('根户头'), r.slice(0, 200));

reset();
r = ask('如何给一批商开户');
r = ask('5');
check('编号 菜单输5→仅附件填写要求', r.includes('附件填写要求') && !r.includes('根户头'), r.slice(0, 200));

reset();
r = ask('如何给一批商开户');
r = ask('6');
r = askA('1');
check('编号 附件清单输1→附件1申请书', r.includes('附件1：经销商账户开设申请书') && r.includes('骑缝章') && !r.includes('根户头'), r.slice(0, 200));

reset();
r = ask('如何给一批商开户');
r = ask('6');
check('编号 菜单输6→附件清单(10项纯附件)', r.includes('附件及补充说明') && r.includes('1. 附件1：经销商账户开设申请书（有三页，需要盖骑缝章）') && r.includes('10. 附件10：经办人承诺书') && !r.includes('（查看截图）') && !r.includes('详细说明'), r.slice(0, 400));
check('编号 附件清单顺序→附件1在前附件10在后', r.indexOf('附件1：经销商账户开设申请书') < r.indexOf('附件10：经办人承诺书'), r.slice(0, 400));

reset();
r = ask('如何给一批商开户');
r = ask('6');
r = askA('4');
check('编号 附件清单输4→附件4预包装', r.includes('附件4：仅销售预包装食品备案/食品经营许可证') && !r.includes('骑缝章'), r.slice(0, 300));

reset();
r = ask('如何给一批商开户');
r = ask('20');
check('编号 越界数字→提示有效编号不落语义', r.includes('请输入有效编号') && !r.includes('根户头') && !r.includes('骑缝章'), r.slice(0, 200));

reset();
r = ask('一码通办');
r = ask('1');
check('编号 一码通办输1→仅数据导出路径', r.includes('数据导出路径') && !r.includes('转码'), r.slice(0, 200));

reset();
r = ask('一码通办');
r = ask('9');
check('编号 一码通办越界→提示有效编号', r.includes('请输入菜单中的有效编号'), r.slice(0, 160));

// ===== 6域21场景：风险点高亮 + 检索标签补漏 =====
r = ask('拼车地址怎么申请');
check('风险 拼车→信息一致红线高亮', r.includes('营运无法维护'), r.slice(0, 200));

r = ask('特约转库存');
check('风险 特约转→取消标签红线高亮', r.includes('奖盖核销'), r.slice(0, 200));

r = ask('推送函怎么制作');
check('风险 推送函→法务审核红线高亮', r.includes('法务审核'), r.slice(0, 200));

r = ask('企业认证');
check('标签 企业认证→专属条目直达', r.includes('企业认证'), r.slice(0, 160));

r = ask('CSMS没有产品条码');
check('标签 产品条码→营销中心手动添加', r.includes('营销中心'), r.slice(0, 200));

r = ask('经销商往来');
check('标签 经销商往来→销户文件清单', r.includes('销户') && r.includes('经销商往来附件清单'), r.slice(0, 200));

r = ask('照片导入');
check('标签 照片导入→证照批量导入', r.includes('照片导入'), r.slice(0, 160));

r = ask('上下级');
check('标签 上下级→挂靠关系', r.includes('挂靠'), r.slice(0, 160));

r = ask('特约审批流');
check('标签 特约审批流→特约TPM审批', r.includes('特约审批流'), r.slice(0, 160));

r = ask('推送函');
check('标签 推送函→适用场景(第21节)', r.includes('适用场景') && r.includes('法务审核'), r.slice(0, 200));

// ===== 企业级体检修复：XSS转义 + 红线不误伤 + 备案直连 =====
check('安全 esc转义函数', typeof esc === 'function' && esc('<b>') === '&lt;b&gt;', '');

reset();
r = ask('<img src=x onerror=alert(1)>');
r = ask('我刚才问了什么');
check('安全 历史回显XSS已转义', r.includes('&lt;img'), r.slice(0, 200));

reset();
r = ask('海南怎么备案');
check('红线 海南备案→不误伤合同甲方红线', r.includes('备案') && !r.includes('合同甲方'), r.slice(0, 200));

reset();
r = ask('合同怎么签字');
check('红线 合同签字→不误伤开户附件红线', !r.includes('所有开户附件必须盖公章'), r.slice(0, 200));

// ===== 指南更新内容映射 =====
r = ask('特约转库存');
check('内容 特约转库存→退货+同级签收+取消标签', r.includes('退货') && r.includes('奖盖核销'), r.slice(0, 200));

r = ask('合同其他问题');
check('内容 合同其他问题→模块指南入口', r.includes('合同管理模块问题指南') || r.includes('doxk9ASnhVapvbpKaOKcUuJMjFc'), r.slice(0, 200));

r = ask('总对总大合同');
check('内容 总对总→库存纠错路径', r.includes('总对总') && r.includes('库存纠错'), r.slice(0, 200));

// ===== FAQ精校：35条标准问答逐项校准 =====
r = ask('26年合同怎么签');
check('FAQ14 26年合同→5步全流程', r.includes('附件上传') && r.includes('提交审批') && r.includes('签署'), r.slice(0, 200));

r = ask('经办人信息录错了');
check('FAQ19 经办人录错→作废重制直达', r.includes('作废') && r.includes('重新制定'), r.slice(0, 200));

r = ask('选不到一批');
check('FAQ5 选不到一批→两大原因直达', r.includes('组织关系没挂到业务部') && r.includes('失效'), r.slice(0, 200));

r = ask('库存提报');
check('FAQ23 库存提报→含条码/范围', r.includes('条码') && r.includes('营销中心'), r.slice(0, 200));

r = ask('拼车地址怎么申请');
check('FAQ28 拼车→场景三全文+审批流', r.includes('拼车审批流') && r.includes('营运'), r.slice(0, 200));

r = ask('修改详细地址');
check('FAQ29 改详细地址→新增后失效旧地址', r.includes('路线作废') && r.includes('新增'), r.slice(0, 200));

r = ask('修改默认地址');
check('FAQ30 默认地址→先取消默认', r.includes('取消默认'), r.slice(0, 200));

r = ask('辅助车型');
check('FAQ-辅助车型→邮件申请', r.includes('邮件'), r.slice(0, 200));

r = ask('批量处理地址');
check('FAQ-批量处理→sheet导入规则', r.includes('批量'), r.slice(0, 200));

r = ask('交付方式');
check('FAQ32 交付方式→自提/承运商', r.includes('自提') && r.includes('承运商'), r.slice(0, 200));

r = ask('巡送巡收');
check('FAQ31 巡送巡收→≤80km+李艺航', r.includes('80') && r.includes('李艺航'), r.slice(0, 200));

r = ask('开户需要哪些附件');
check('FAQ1 开户附件→含渠道调整报告', r.includes('渠道调整'), r.slice(0, 200));

r = ask('常规开户和管理开户的区别');
check('FAQ3 常规vs管理开户→文字自足', r.includes('存量经销商变更营业执照号') && r.includes('管理开户'), r.slice(0, 200));

r = ask('二批批量失效');
check('FAQ10 二批批量失效→Excel表渠道管理岗', r.includes('渠道管理岗') && r.includes('Excel'), r.slice(0, 200));

// ===== 完整输出硬性要求：菜单条目一次输出全部流程+全部注意事项 =====
r = ask('地址信息怎么维护');
check('完整输出 地址信息维护→全流程一次输出', r.includes('地图选址') && r.includes('百度地图') && r.includes('默认地址') && r.includes('批量导入') && r.includes('字典') && r.includes('保存'), r.slice(0, 300));

reset();
r = ask('仓库地址');
r = ask('5');
check('完整输出 仓库菜单输5→场景一完整流程', r.includes('地图选址') && r.includes('字典') && r.includes('保存'), r.slice(0, 300));

reset();
r = ask('仓库地址');
r = ask('99');
check('完整输出 仓库菜单99→全部场景列表', r.includes('场景（十三）'), r.slice(0, 200));

reset();
r = ask('仓库地址');
r = ask('0');
check('完整输出 仓库菜单0→仓库地址专项全量', r.includes('隐藏库') && r.includes('巡送巡收'), r.slice(0, 300));

r = ask('提货车型怎么维护');
check('完整输出 提货车型维护→完整流程', r.includes('添加') && r.includes('模糊搜索'), r.slice(0, 200));

// ===== 歧义问句定向：开户+地址 → 仓库地址专项，严禁落入开户板块 =====
reset();
r = ask('开户地址怎么维护');
check('歧义 开户地址怎么维护→仓库地址专项', r.includes('仓库地址专项') && !r.includes('一批商管理'), r.slice(0, 200));

reset();
r = ask('新开户维护地址');
check('歧义 新开户维护地址→仓库地址专项', r.includes('仓库地址专项') && !r.includes('一批商管理'), r.slice(0, 200));

reset();
r = ask('开户地址新增');
check('歧义 开户地址新增→仓库地址专项', r.includes('仓库地址专项') && !r.includes('一批商管理'), r.slice(0, 200));

reset();
r = ask('新开户地址');
check('歧义 新开户地址→直连地址信息维护全流程', r.includes('地图选址') && !r.includes('一批商管理'), r.slice(0, 200));

reset();
r = ask('开户基础信息录入');
check('歧义 开户信息录入→仍在开户板块', !r.includes('仓库地址专项'), r.slice(0, 200));

reset();
r = ask('开户需要哪些附件');
check('歧义 开户附件→仍为附件清单', r.includes('开户必传附件清单'), r.slice(0, 200));

// ===== 同主题多场景区分：添加辅助车型 ≠ 修改车型，严禁混合输出 =====
r = ask('添加辅助车型');
check('车型区分 添加辅助车型→仅辅助车型流程', r.includes('辅助车型') && r.includes('邮件') && !r.includes('场景（八）'), r.slice(0, 300));

r = ask('新增辅助车型');
check('车型区分 新增辅助车型→仅辅助车型流程', r.includes('邮件') && !r.includes('场景（八）'), r.slice(0, 300));

r = ask('修改车型');
check('车型区分 修改车型→仅修改车型流程', r.includes('修改车型') && !r.includes('辅助车型') && !r.includes('邮件'), r.slice(0, 300));

r = ask('车型变更');
check('车型区分 车型变更→仅修改车型流程', r.includes('修改车型') && !r.includes('邮件'), r.slice(0, 300));

r = ask('调整车型');
check('车型区分 调整车型→仅修改车型流程', r.includes('修改车型') && !r.includes('邮件'), r.slice(0, 300));

// ===== 精准故障场景直达：完整复述异常现象→直接方案，禁止候选弹窗 =====
r = ask('详细地址描述中的省/市/区/街道重复');
check('故障直达 省市区街道重复→直接方案不弹候选', r.includes('唯一不重复') && !r.includes('找到以下相关条目'), r.slice(0, 300));

r = ask('盖章后无法进入下一步');
check('故障直达 盖章后无法下一步→直接方案不弹候选', r.includes('合同专用章审批人') && !r.includes('找到以下相关条目'), r.slice(0, 300));

r = ask('没有收到签署消息');
check('故障直达 没收到签署消息→直接催办方案', r.includes('催办') && !r.includes('找到以下相关条目'), r.slice(0, 300));

r = ask('地址重复怎么解决');
check('故障直达 地址重复→直接省市区重复方案', r.includes('唯一不重复') && !r.includes('找到以下相关条目'), r.slice(0, 300));

// ===== 场景编号直达：明确携带场景（X）→直接输出，跳过菜单/列表 =====
r = ask('场景（十三）详细地址描述中的省/市/区/街道重复');
check('场景直达 场景十三全称→直接方案', r.includes('唯一不重复') && !r.includes('仓库地址全部场景') && !r.includes('找到以下相关条目'), r.slice(0, 300));

r = ask('场景十三详细地址描述中的省市区街道重复');
check('场景直达 场景十三无括号→直接方案', r.includes('唯一不重复') && !r.includes('仓库地址全部场景'), r.slice(0, 300));

r = ask('场景（八）需要修改车型');
check('场景直达 场景八→仅修改车型', r.includes('修改车型') && !r.includes('邮件'), r.slice(0, 300));

r = ask('场景（三）地址申请新增（拼车地址）');
check('场景直达 场景三→仅拼车流程', r.includes('拼车审批流'), r.slice(0, 300));

r = ask('场景（一）提货仓车型维护');
check('场景直达 场景一车型→仅车型维护', r.includes('模糊搜索') && !r.includes('地图选址'), r.slice(0, 300));

reset();
r = ask('仓库地址');
check('菜单排版 全部场景统一展开无99折叠', r.includes('场景（十三）') && !r.includes('查看其余'), r.slice(0, 400));

// ===== 限定条件精准匹配：互斥分类词只留唯一条目 =====
r = ask('地址申请新增（非拼车地址）');
check('分类 非拼车→仅非拼车流程不弹候选', r.includes('非拼车') && !r.includes('找到以下相关条目'), r.slice(0, 300));

r = ask('地址申请新增（拼车地址）');
check('分类 拼车→仅拼车流程不弹候选', r.includes('拼车审批流') && !r.includes('找到以下相关条目'), r.slice(0, 300));

r = ask('新增地址拼车');
check('分类 新增地址+拼车→直连拼车不弹四选', r.includes('拼车审批流') && !r.includes('请选择地址业务'), r.slice(0, 300));

r = ask('地址申请新增');
check('分类 无分类词→弹拼车非拼车两条候选', r.includes('找到以下相关条目') && r.includes('非拼车') && r.includes('拼车'), r.slice(0, 300));

// ===== 板块目录分层：库存菜单按业务场景分组，命名统一 =====
r = ask('库存管理');
check('分层 库存菜单→四组归类非平铺', r.includes('库存盘点') && r.includes('库存调平') && r.includes('库存周转计算') && r.includes('库存调整') && !r.includes('查看更多条目'), r.slice(0, 400));

r = ask('库存盘点');
check('分层 库存盘点→分组菜单', r.includes('库存盘点') && r.includes('库存调平'), r.slice(0, 400));

// ===== 合同分组菜单：25/26年合同相邻，地区专项归组，无嵌套编号 =====
reset();
r = ask('合同');
check('分组 合同菜单→25/26年相邻不拆散', r.includes('25年经销商合同订立') && r.includes('26年经销商合同订立') && r.includes('常见问题答疑') && r.includes('电子签/推送函') && r.includes('地区专项') && !r.includes('查看更多条目'), r.slice(0, 500));

reset();
r = ask('经销商合同/推送函');
check('分组 合同板块名→同一分组菜单', r.includes('25年经销商合同订立') && r.includes('地区专项'), r.slice(0, 500));

reset();
r = ask('合同');
r = ask('2');
check('分组 合同菜单输2→海南地区专项', r.includes('海南营销中心'), r.slice(0, 300));

reset();
r = ask('合同');
r = ask('0');
check('分组 合同菜单0→合同全量', r.includes('企业认证') && r.includes('推送函'), r.slice(0, 300));

r = ask('如何给一批商开户');
check('分组 开户菜单查看附件清单文字贴合板块', r.includes('6. 查看附件清单（附件1-10）'), r.slice(0, 400));

// ===== 详情标题后置处理：头部(数字)剔除，正文步骤编号原样保留，菜单保留编号 =====
r = ask('人脸识别无法通过');
check('标题处理 (5)人脸识别→剔除头部括号序号', r.includes('人脸识别无法通过') && !r.includes('（5）人脸识别'), r.slice(0, 300));

r = ask('经销商交接');
r = ask('1');
check('标题处理 正文内部(1)(2)步骤编号原样保留', r.includes('（1）渠道现状') && r.includes('（2）调整原因'), r.slice(0, 300));

r = ask('如何给一批商开户');
check('标题处理 菜单编号完整保留', r.includes('1. 户头类型介绍') && r.includes('2. 常规开户') && r.includes('6. 查看附件清单'), r.slice(0, 400));

// ===== 编号冲突规则：菜单未列出的条目不允许用数字直调，故障条目仅关键词触发 =====
reset();
r = ask('如何给一批商开户');
r = ask('7');
check('编号冲突 初始菜单输7→提示有效编号不越权', r.includes('请输入有效编号') && !r.includes('骑缝章'), r.slice(0, 300));

reset();
r = ask('如何给一批商开户');
r = ask('6');
r = ask('7');
check('编号冲突 分页后输7→分页内条目正常', !r.includes('请输入有效编号'), r.slice(0, 300));

r = ask('人脸识别失败怎么办');
check('编号冲突 故障条目走关键词→正常直达', r.includes('人脸识别') && !r.includes('请输入有效编号'), r.slice(0, 300));

// ===== 内部索引ID：bizXX/errXX 文本直查，纯数字不触发 =====
reset();
r = ask('err006');
check('索引ID err006→人脸识别故障直达', r.includes('人脸识别') && r.includes('cookie'), r.slice(0, 300));

reset();
r = ask('ERR009');
check('索引ID err009大小写→企业认证', r.includes('企业认证'), r.slice(0, 300));

reset();
r = ask('biz001');
check('索引ID biz001→开户入口', r.includes('开户入口') || r.includes('经销商开户管理'), r.slice(0, 300));

reset();
r = ask('biz015');
check('索引ID biz015→海南电子签指引', r.includes('海南营销中心'), r.slice(0, 300));

reset();
r = ask('6');
check('索引ID 纯数字6→不触发故障索引err006', !r.includes('人脸识别'), r.slice(0, 200));

// ===== 故障问题强制匹配：完整故障问句直达方案，禁止出目录菜单 =====
r = ask('合同制定了，润酒购、经办人手机上都没收到签署消息怎么办');
check('故障强制 完整收不到消息问句→直达催办方案', r.includes('催办') && r.includes('snowsign.crb.cn') && !r.includes('合同板块全部业务'), r.slice(0, 300));

r = ask('签署完还需要其他人审批');
check('故障强制 签署完还需审批→直达审批人方案', r.includes('合同专用章审批人') && !r.includes('合同板块全部业务'), r.slice(0, 300));

r = ask('合同作废时无法重新订立、签署');
check('故障强制 作废无法重签→直达作废方案', r.includes('确认作废') && !r.includes('合同板块全部业务'), r.slice(0, 300));

r = ask('合同签署报错怎么办');
check('故障强制 报错类→直达报错方案不给总菜单', !r.includes('合同板块全部业务') && (r.includes('报错') || r.includes('答疑')), r.slice(0, 300));

reset();
r = ask('合同怎么签');
check('故障强制 模糊合同提问→仍出分组菜单', r.includes('25年经销商合同订立') && r.includes('26年经销商合同订立'), r.slice(0, 300));

// ===== 26年合同5子项强制隔离：单点查询仅输出命中的那一个子项（askA只验回复，防回显掩盖） =====
r = askA('合同订立入口');
check('订立入口 未指明年份→25/26双选', r.includes('请问您要查哪个年度') && r.includes('25年：合同订立入口与电子签填写指引') && r.includes('26年：26年合同订立入口') && !r.includes('合同内容填写'), r.slice(0, 300));

r = askA('1');
check('订立入口 选1→25年入口条目', r.includes('电子签填写指引') && r.includes('合同订立入口') && !r.includes('26年'), r.slice(0, 300));

r = askA('合同订立入口');
r = askA('2');
check('订立入口 选2→26年入口条目', r.includes('26年合同订立入口') && !r.includes('25年') && !r.includes('合同内容填写'), r.slice(0, 300));

r = askA('合同内容填写');
check('26年合同 内容填写→仅填写内容', r.includes('合同内容填写') && !r.includes('附件上传') && !r.includes('提交审批'), r.slice(0, 300));
check('26年合同 内容填写→截图保留不丢失', r.includes('<img'), r.slice(0, 300));

r = askA('提交审批');
check('26年合同 提交审批→仅审批内容', r.includes('提交审批') && !r.includes('附件上传'), r.slice(0, 300));
check('26年合同 提交审批→截图保留不丢失', r.includes('<img'), r.slice(0, 300));

r = askA('提交后经销商怎么去签署');
check('26年合同 签署子项→仅签署内容', r.includes('提交后经销商怎么去签署') && !r.includes('附件上传') && !r.includes('提交审批'), r.slice(0, 300));
check('26年合同 签署子项→截图保留不丢失', r.includes('<img'), r.slice(0, 300));

r = askA('26年合同怎么签');
check('26年合同 完整诉求→5子项合并输出', r.includes('合同订立入口') && r.includes('合同内容填写') && r.includes('附件上传') && r.includes('提交审批') && r.includes('签署'), r.slice(0, 400));

reset();
r = ask('合同');
r = askA('4');
check('26年合同 菜单输4→仅入口子项', r.includes('合同订立入口') && !r.includes('合同内容填写'), r.slice(0, 300));

// ===== 26年合同5子项输出强制过滤：26年+子项组合不拼整块，明确完整诉求才5项 =====
r = askA('26年合同订立入口');
check('26年合同 26年+订立入口→仅入口子项', r.includes('合同订立入口') && !r.includes('合同内容填写') && !r.includes('附件上传') && !r.includes('提交审批'), r.slice(0, 300));

r = askA('26年合同提交审批');
check('26年合同 26年+提交审批→仅审批子项', r.includes('提交审批') && !r.includes('附件上传') && !r.includes('合同订立入口') && !r.includes('合同内容填写'), r.slice(0, 300));

r = askA('26年合同附件上传');
check('26年合同 26年+附件上传→仅附件子项', r.includes('附件上传') && !r.includes('提交审批') && !r.includes('合同内容填写'), r.slice(0, 300));

r = askA('26年合同全部流程');
check('26年合同 明确全部流程→仅5子项不夹带25年', r.includes('合同订立入口') && r.includes('提交后经销商怎么去签署') && !r.includes('25年'), r.slice(0, 400));

r = askA('25年合同附件上传');
check('26年合同 25年组合→不劫持到26年附件', r.includes('电子签填写指引') && !r.includes('26年'), r.slice(0, 300));

// ===== 经销商合同/推送函板块全局强制规则：编号直达/多编号点名/菜单请求/年份隔离/0全量 =====
reset();
r = ask('合同');
r = askA('6');
check('合同规则 输6→仅附件上传子项', r.includes('附件上传') && !r.includes('提交审批') && !r.includes('合同内容填写'), r.slice(0, 300));

reset();
r = ask('合同');
r = askA('4、5、6全部给我');
check('合同规则 多编号点名→4/5/6三条', r.includes('合同订立入口') && r.includes('合同内容填写') && r.includes('附件上传') && !r.includes('提交审批'), r.slice(0, 400));

reset();
r = ask('合同');
r = askA('列出所有选项');
check('合同规则 列出所有选项→1-26完整目录', r.includes('25年经销商合同订立') && r.includes('26年经销商合同订立') && r.includes('常见问题答疑') && r.includes('电子签/推送函') && r.includes('26. 经销商润酒购签署'), r.slice(0, 500));

reset();
r = askA('合同内容填写');
check('合同规则 业务提问→不打印1-26目录', !r.includes('合同板块全部业务'), r.slice(0, 300));

reset();
r = askA('25年合同订立入口');
check('合同规则 25年订立入口→仅25年不串26年', r.includes('电子签填写指引') && !r.includes('26年'), r.slice(0, 300));

reset();
r = ask('26年合同怎么签');
r = askA('0');
check('合同规则 数字0→合同板块全部完整内容', r.includes('25年') && r.includes('经销商合同签署'), r.slice(0, 300));

// ===== 分组隔离强化：跨分组禁止乱串、普通提问零导航 =====
reset();
r = askA('26年合同签署进度');
check('合同规则 26年+进度→仅4-9内容不串进度组', r.includes('合同订立入口') && !r.includes('业务员查看') && !r.includes('合同板块全部业务'), r.slice(0, 300));

reset();
r = askA('25年合同签署进度');
check('合同规则 25年+进度→仅1-3内容不串26年', r.includes('电子签填写指引') && !r.includes('26年') && !r.includes('合同板块全部业务'), r.slice(0, 300));

reset();
r = askA('签署进度怎么查');
check('合同规则 纯进度提问→仅10-11不串其他组', (r.includes('业务员查看') || r.includes('签署进度')) && !r.includes('合同板块全部业务') && !r.includes('合同订立入口'), r.slice(0, 300));

reset();
r = askA('推送函怎么发');
check('合同规则 推送函→21-26组内容不串其他', r.includes('推送函') && !r.includes('合同板块全部业务') && !r.includes('合同订立入口'), r.slice(0, 300));

// ===== 导航文字零容忍：具体业务回答禁止出现任何导航标志性文字 =====
reset();
r = askA('26年合同怎么签');
check('导航自检 5项全流程→零导航文字', !r.includes('合同板块全部业务') && !r.includes('输入编号一次性查看该条目完整内容') && !r.includes('25年经销商合同订立') && !r.includes('26年经销商合同订立') && !r.includes('查看/推进合同签署进度') && !r.includes('常见问题答疑') && !r.includes('输入 0 查看合同板块全部完整内容'), r.slice(0, 300));

reset();
r = askA('合同订立入口');
check('导航自检 4号条目→零导航文字', !r.includes('26年经销商合同订立') && !r.includes('合同板块全部业务') && r.includes('合同订立入口'), r.slice(0, 300));

reset();
r = askA('签署进度怎么查');
check('导航自检 进度条目→零导航文字', !r.includes('查看/推进合同签署进度') && r.includes('业务员查看'), r.slice(0, 300));

reset();
r = askA('合同签署报错怎么办');
check('导航自检 故障答疑菜单→不含「常见问题答疑」', !r.includes('常见问题答疑') && !r.includes('合同板块全部业务'), r.slice(0, 300));

reset();
r = askA('推送函怎么发');
check('导航自检 推送函条目→保留业务正文不被自检误杀', r.includes('适用场景') && !r.includes('合同板块全部业务'), r.slice(0, 300));

// ===== 分组名查询：只输出该组编号菜单（组内从1编号），严禁混入其他分组与整板目录 =====
reset();
r = askA('26年经销商合同订立');
check('分组名 26年经销商合同订立→仅4-9组菜单组内从1', r.includes('1. 26年合同订立入口') && r.includes('6. 印章管理员更换作废重签说明') && !r.includes('25年经销商合同订立') && !r.includes('合同板块全部业务') && !r.includes('<img'), r.slice(0, 400));

reset();
r = askA('26年经销商的合同订立');
check('分组名 26年经销商的合同订立→组内从1', r.includes('1. 26年合同订立入口') && r.includes('5. 提交后经销商签署方式') && !r.includes('25年经销商合同订立') && !r.includes('合同板块全部业务'), r.slice(0, 400));

reset();
r = askA('26年合同');
check('分组名 26年合同→组内从1', r.includes('1. 26年合同订立入口') && !r.includes('合同板块全部业务') && !r.includes('25年经销商合同订立'), r.slice(0, 300));

reset();
r = askA('25年合同');
check('分组名 25年合同→仅1-3组菜单', r.includes('1. 合同订立入口与电子签填写指引') && r.includes('3. 广州填写指引（地区专项）') && !r.includes('26年经销商合同订立') && !r.includes('<img'), r.slice(0, 300));

reset();
r = askA('26年合同怎么签');
check('分组名 完整诉求26年合同怎么签→仍5项全量含截图', r.includes('合同订立入口') && r.includes('附件上传') && r.includes('<img'), r.slice(0, 300));

// ===== 分组名变体与尾标点容忍 =====
reset();
r = askA('26年经销商合同订立。');
check('分组名 尾标点容忍→组内从1', r.includes('1. 26年合同订立入口') && !r.includes('25年经销商合同订立') && !r.includes('<img'), r.slice(0, 400));

reset();
r = askA('什么是26年合同订立');
check('分组名 前置问法→组内从1', r.includes('1. 26年合同订立入口') && !r.includes('合同板块全部业务') && !r.includes('<img'), r.slice(0, 400));

reset();
r = askA('26年经销商合同');
check('分组名 26年经销商合同→组内从1', r.includes('1. 26年合同订立入口') && !r.includes('25年经销商合同订立') && !r.includes('<img'), r.slice(0, 300));

reset();
r = askA('26年合同签署方式');
check('分组名 签署方式→仅8号签署子项', r.includes('提交后经销商怎么去签署') && !r.includes('附件上传') && !r.includes('合同订立入口'), r.slice(0, 300));

// ===== 组内编号：组菜单输号按组内顺序定位 =====
reset();
r = askA('26年经销商合同订立');
r = askA('3');
check('组内编号 输3→附件上传子项', r.includes('附件上传') && !r.includes('提交审批') && !r.includes('合同订立入口'), r.slice(0, 300));

reset();
r = askA('26年经销商合同订立');
r = askA('6');
check('组内编号 输6→印章管理员条目', r.includes('印章管理员') && !r.includes('合同内容填写') && !r.includes('合同订立入口'), r.slice(0, 300));

reset();
r = askA('合同签署失败');
check('组内编号 故障菜单→组内从1编号', r.includes('1. 乙方银行账户报错') && r.includes('9. 其他问题指南入口') && !r.includes('12. 乙方银行账户报错'), r.slice(0, 300));

// ===== 细分直达：问具体细分直接给细分，不倾倒整块 =====
reset();
r = askA('广州电子签怎么填写');
check('细分直达 广州电子签→仅广州填写指引', r.includes('广州电子签填写指引') && !r.includes('海南营销中心') && !r.includes('25年经销商合同订立') && !r.includes('合同板块全部业务') && !r.includes('合同订立入口'), r.slice(0, 300));

reset();
r = askA('海南电子签怎么填写');
check('细分直达 海南电子签→仅海南填写指引', r.includes('海南营销中心') && !r.includes('广州') && !r.includes('25年经销商合同订立') && !r.includes('合同板块全部业务'), r.slice(0, 300));

reset();
r = askA('海南备案');
check('细分直达 海南备案→不受影响仍开户备案', r.includes('备案') && !r.includes('电子签填写'), r.slice(0, 300));

reset();
r = askA('广州填写指引');
check('细分直达 广州填写指引→直达广州条目', r.includes('广州电子签填写指引') && !r.includes('海南营销中心'), r.slice(0, 300));

// ===== 实控人细分直达：问具体条目直接给该条目，不倒出整板块 =====
reset();
r = askA('实际控制人导入失联');
check('细分直达 实际控制人导入→仅导入关联条目', r.includes('实际控制人导入关联') && !r.includes('证照') && !r.includes('照片导入') && !r.includes('关于这个板块'), r.slice(0, 300));

reset();
r = askA('证照批量导入');
check('细分直达 证照批量导入→仅证照条目', r.includes('证照信息批量导入') && !r.includes('照片导入'), r.slice(0, 300));

reset();
r = askA('照片导入后匹配经销商');
check('细分直达 照片导入后匹配→仅匹配条目', r.includes('匹配经销商') && !r.includes('证照信息批量导入') && !r.includes('模版填写注意事项'), r.slice(0, 300));

reset();
r = askA('模版填写注意事项');
check('细分直达 模版注意事项→仅补充条目', r.includes('模版填写注意事项') && !r.includes('照片导入'), r.slice(0, 300));

// ===== 口语化问句匹配：日常说法也能命中规范词库 =====
reset();
r = askA('开个户怎么弄');
check('口语 开个户怎么弄→开户三选', r.includes('请选择开户类型') && !r.includes('渠道管理指南范围内'), r.slice(0, 300));

reset();
r = askA('怎么签合同');
check('口语 怎么签合同→合同分组菜单', r.includes('25年经销商合同订立') && r.includes('26年经销商合同订立'), r.slice(0, 300));

reset();
r = askA('合同怎么弄');
check('口语 合同怎么弄→合同分组菜单', r.includes('25年经销商合同订立') && r.includes('26年经销商合同订立'), r.slice(0, 300));

reset();
r = askA('这个户怎么开');
check('口语 这个户怎么开→开户引导菜单', r.includes('关于这个板块') && r.includes('户头类型介绍'), r.slice(0, 300));

reset();
r = askA('地址怎么弄');
check('口语 地址怎么弄→仓库地址专项', r.includes('仓库地址全部场景') && r.includes('模式的改变'), r.slice(0, 300));

reset();
r = askA('怎么盘货');
check('口语 怎么盘货→盘库二选', r.includes('请选择您的身份') && r.includes('经销商人员'), r.slice(0, 300));

reset();
r = askA('奖励怎么拿');
check('口语 奖励怎么拿→奖励会谈板块', r.includes('经销商奖励会谈') && !r.includes('渠道管理指南范围内'), r.slice(0, 300));

reset();
r = askA('送货地址怎么改');
check('口语 送货地址→仓库地址专项', r.includes('模式的改变'), r.slice(0, 300));

reset();
r = askA('隐藏的仓库');
check('口语 隐藏的仓库→隐藏库红线', r.includes('隐藏库'), r.slice(0, 300));

reset();
r = askA('库存对不上');
check('口语 库存对不上→库存调平', r.includes('虚拟终端') || r.includes('调平'), r.slice(0, 300));

reset();
r = askA('注销经销商');
check('口语 注销经销商→销户流程', r.includes('销户'), r.slice(0, 300));

// ===== 全局条目边界隔离：单点查询严格单条目截断 =====
reset();
r = ask('如何给一批商开户');
r = ask('2');
check('条目隔离 查常规开户→不带出管理开户', r.includes('常规开户') && !r.includes('管理开户'), r.slice(0, 300));

r = ask('附件9');
check('条目隔离 查附件9→不带出附件8/附件10', r.includes('实际经营人情况说明') && !r.includes('附件8') && !r.includes('附件10'), r.slice(0, 300));

reset();
r = ask('如何给一批商开户');
r = ask('1');
check('条目隔离 查户头类型→不带出常规开户', r.includes('户头类型介绍') && !r.includes('常规开户') && !r.includes('管理开户'), r.slice(0, 300));

reset();
r = ask('库存管理');
r = ask('7');
check('分层 库存菜单输7→调平完整流程', r.includes('虚拟终端') && r.includes('STTS'), r.slice(0, 300));

reset();
r = ask('库存管理');
r = ask('0');
check('分层 库存菜单0→库存全量', r.includes('特约转经销商') && r.includes('周转'), r.slice(0, 300));

r = ask('经销商库存数据导出路径');
check('完整输出 数据导出→两套流程齐全', r.includes('营销数据平台') && r.includes('报表中心'), r.slice(0, 300));

console.log('\n===== 结果: ' + pass + ' PASS / ' + fail + ' FAIL =====');
process.exit(fail ? 1 : 0);
