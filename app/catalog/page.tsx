"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/hooks/use-i18n";
import { BookOpen, Sparkles, Check, Search, X } from "lucide-react";

interface Course {
  id: string; title: string; subject: string; grade: string;
  semester: string; textbook: string; description: string;
  outline: {section: string; points: string[]}[];
  knowledge: string[]; objectives: string[]; source: string;
}

export default function CatalogPage() {
  const { locale, setLocale } = useI18n();
  const isZh = locale === "zh-CN";
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [grades] = useState(["小学","初中","高中","大学","通用"]);
  const [filterGrade, setFilterGrade] = useState("全部");
  const [filterSubject, setFilterSubject] = useState("全部");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Course | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterGrade !== "全部") params.set("grade", filterGrade);
    if (filterSubject !== "全部") params.set("subject", filterSubject);
    if (search) params.set("search", search);
    fetch(`/api/catalog/list?${params}`).then(r => r.json()).then(d => {
      setCourses(d.courses || []);
      if (d.subjects) setSubjects(d.subjects);
    });
  }, [filterGrade, filterSubject, search]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc" }}>
      <nav style={{
        background: "#fff", borderBottom: "1px solid #eef0f4", padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 60,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <a href="/" style={{ fontWeight: 700, fontSize: 18, color: "#111", textDecoration: "none" }}>
            <span style={{ color: "#7c3aed" }}>playclass</span> Studio
          </a>
          <a href="/dashboard" style={{ fontSize: 14, color: "#666", textDecoration: "none" }}>{isZh ? "创作者看板" : "Dashboard"}</a>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => setLocale(isZh ? "en-US" : "zh-CN")}
            style={{ padding: "6px 12px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13 }}>
            {isZh ? "EN" : "中文"}
          </button>
          <a href="/" style={{ padding: "8px 16px", background: "#7c3aed", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
            {isZh ? "+ 空白创建" : "+ Blank"}
          </a>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{isZh ? "课程案例库" : "Course Library"}</h1>
        <p style={{ color: "#888", marginBottom: 24 }}>{isZh ? "基于人教版/部编版教材章节结构，带详细大纲和知识点。" : "Textbook-aligned courses with detailed outlines."}</p>

        <div style={{ position: "relative", marginBottom: 20 }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: 14, color: "#999" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isZh ? "搜索课程…" : "Search courses…"}
            style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, outline: "none" }} />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {["全部", ...grades].map(g => (
            <button key={g} onClick={() => setFilterGrade(g)}
              style={{
                padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                border: filterGrade === g ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                background: filterGrade === g ? "#7c3aed10" : "#fff",
                color: filterGrade === g ? "#7c3aed" : "#555",
                fontWeight: filterGrade === g ? 600 : 400,
              }}>{g}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {["全部", ...subjects].map(s => (
            <button key={s} onClick={() => setFilterSubject(s)}
              style={{
                padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                border: filterSubject === s ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                background: filterSubject === s ? "#7c3aed10" : "#fff",
                color: filterSubject === s ? "#7c3aed" : "#555",
                fontWeight: filterSubject === s ? 600 : 400,
              }}>{s}</button>
          ))}
        </div>

        <div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>{isZh ? `共 ${courses.length} 门课程` : `${courses.length} courses`}</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {courses.map(c => (
            <div key={c.id} onClick={() => setSelected(c)} style={{
              background: "#fff", borderRadius: 14, padding: 18,
              border: "1px solid #eef0f4", cursor: "pointer",
            }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: "#7c3aed12", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <BookOpen size={20} color="#7c3aed" />
                </div>
                <div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: "#7c3aed", background: "#7c3aed12", padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>{c.subject}</span>
                    <span style={{ fontSize: 10, color: "#999" }}>{c.grade}</span>
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{c.title}</h3>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#888", lineHeight: 1.5, marginBottom: 10 }}>{c.description}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#bbb" }}>{c.textbook}</span>
                <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 500 }}>{isZh ? "查看详情 →" : "View →"}</span>
              </div>
            </div>
          ))}
        </div>

        {courses.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#999" }}>{isZh ? "没有匹配的课程。" : "No courses found."}</div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: 16, padding: 32, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: "#7c3aed12", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <BookOpen size={24} color="#7c3aed" />
              </div>
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#7c3aed", background: "#7c3aed12", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{selected.subject}</span>
                  <span style={{ fontSize: 11, color: "#888" }}>{selected.grade} · {selected.semester}</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{selected.title}</h2>
              </div>
            </div>

            <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 20 }}>{selected.description}</p>

            {selected.outline?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>{isZh ? "课程大纲" : "Outline"}</div>
                {selected.outline.map((o, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>{o.section}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4, marginLeft: 12 }}>
                      {o.points.map(p => (
                        <span key={p} style={{ fontSize: 11, padding: "3px 8px", background: "#f3f4f6", borderRadius: 4, color: "#555" }}>{p}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selected.knowledge?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>{isZh ? "知识点" : "Key Points"}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selected.knowledge.map(k => (
                    <span key={k} style={{ fontSize: 11, padding: "3px 8px", background: "#fef3c7", borderRadius: 4, color: "#92400e" }}>{k}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.objectives?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>{isZh ? "学习目标" : "Learning Objectives"}</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#666", lineHeight: 1.8 }}>
                  {selected.objectives.map(o => <li key={o}>{o}</li>)}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#999", marginBottom: 20 }}>
              <span>{isZh ? "教材" : "Textbook"}：{selected.textbook}</span>
              <span>{isZh ? "来源" : "Source"}：{selected.source}</span>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setSelected(null)} style={{
                padding: "10px 20px", borderRadius: 8, border: "1px solid #ddd",
                background: "#fff", cursor: "pointer", fontSize: 14,
              }}>{isZh ? "关闭" : "Close"}</button>
              <button
                onClick={() => {
                  // Hand the template's brief to the creator workbench, which reads
                  // `requirement` from the query string and pre-fills the composer.
                  const brief = [
                    selected.title,
                    selected.description,
                    selected.outline?.length
                      ? `大纲：${selected.outline.map((o) => `${o.section}（${o.points.join('、')}）`).join('；')}`
                      : '',
                    selected.knowledge?.length ? `知识点：${selected.knowledge.join('、')}` : '',
                    selected.objectives?.length ? `学习目标：${selected.objectives.join('；')}` : '',
                  ]
                    .filter(Boolean)
                    .join('\n');
                  window.location.assign(`/dashboard?requirement=${encodeURIComponent(brief)}`);
                }}
                style={{
                  padding: "10px 20px", borderRadius: 8, border: "none",
                  background: "#7c3aed", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600,
                }}
              >
                <Sparkles size={14} style={{ display: "inline", marginRight: 6 }} />
                {isZh ? "使用此模板生成" : "Use Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}