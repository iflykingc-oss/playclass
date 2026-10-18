# OpenMAIC 深度调研 Brief

日期: 2026-09-27
深度: deep
工作区: C:\Users\Administrator\Desktop\playclass\research\openmaic-optimization

## 问题

从**商业化产品**视角，综合分析 OpenMAIC（Open Multi-Agent Interactive Classroom，开放式多智能体交互课堂）及其二次开发产品 playclass 的：
1. 代码与架构现状
2. 真实用户反馈（GitHub issues、社区、Discord、飞书、论坛）
3. 竞品功能与定价（AI 课件/演示生成、教育互动课堂、AI 教师）
4. 哪些方面最需要优化（按优先级）

## 范围

**In scope**
- 生成质量（大纲/幻灯片/互动页/PBL/视频）
- 课堂体验（AI 老师、白板、语音、多智能体）
- 导出与分享（PPTX/MP4/HTML）
- 账户/计费/机构能力（playclass 平台层）
- 竞品对比：Gamma、Tome、Canva Magic Design、Beautiful.ai、ClassPoint、Nearpod、Curipod、希沃、101教育PPT、Khanmigo、Duolingo Max 等
- 学术/工程上的多智能体课堂、苏格拉底式辅导相关进展

**Out of scope**
- 详细代码重构方案（只指出方向）
- 法律合规细条文
- 非英语/中文市场的长尾竞品

## 假设

- 受众：playclass / OpenMAIC 的产品与工程决策者
- 时间窗：近 12–18 个月的市场与反馈为主，架构现状看当前代码库
- 中国 + 国际双市场都要考虑

## Angles

- F1 用户反馈：OpenMAIC GitHub issues/discussions、社区评价、痛点与表扬
- F2 竞品（AI 演示/课件生成）：Gamma、Tome、Canva、Beautiful.ai 等功能与定价
- F3 竞品（教育互动课堂/教学工具）：ClassPoint、Nearpod、Curipod、希沃、101教育、Khanmigo 等
- F4 代码与架构：OpenMAIC/playclass 架构、复杂度、可扩展性、技术债（本地为主）
- F5 生成质量与 AI 教学法：多智能体课堂、苏格拉底/建构式学习、测评与可信度
- F6 产品完成度与商业化缺口：导出、协作、LMS 集成、机构管理、定价实践
