import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function LandingPage() {
  const [companyName, setCompanyName] = useState("شركة الجبل الذهبي للمقاولات والاستثمار العقاري");
  const [phone, setPhone] = useState("01120715027");
  const [companyLogo, setCompanyLogo] = useState<string>("/logo.jpeg");

  // Editable Landing Page Content State
  const [heroTitle, setHeroTitle] = useState("بناء المستقبل بأعلى معايير الجودة والهندسة المتقدمة");
  const [heroSubtitle, setHeroSubtitle] = useState("رائدون في مجالات المقاولات العامة، المنشآت الخرسانية، أعمال التشطيبات، وإدارة المشاريع الضخمة بمصر والشرق الأوسط.");
  const [statsProjects, setStatsProjects] = useState("45+");
  const [statsValue, setStatsValue] = useState("250M+");
  const [statsLabor, setStatsLabor] = useState("500+");
  const [projectsList, setProjectsList] = useState<any[]>([]);

  useEffect(() => {
    // Load Landing Page settings from Supabase or LocalStorage
    async function loadLandingSettings() {
      try {
        const { data: sData } = await supabase.from("Setting").select("*");
        if (sData) {
          const nameS = sData.find((s: any) => s.key === "companyName");
          const phoneS = sData.find((s: any) => s.key === "phone");
          const logoS = sData.find((s: any) => s.key === "companyLogo");
          const hTitleS = sData.find((s: any) => s.key === "landing_hero_title");
          const hSubS = sData.find((s: any) => s.key === "landing_hero_subtitle");
          const sProjS = sData.find((s: any) => s.key === "landing_stats_projects");
          const sValS = sData.find((s: any) => s.key === "landing_stats_value");
          const sLabS = sData.find((s: any) => s.key === "landing_stats_labor");

          if (nameS?.value) setCompanyName(nameS.value);
          if (phoneS?.value) setPhone(phoneS.value);
          if (logoS?.value) setCompanyLogo(logoS.value);
          if (hTitleS?.value) setHeroTitle(hTitleS.value);
          if (hSubS?.value) setHeroSubtitle(hSubS.value);
          if (sProjS?.value) setStatsProjects(sProjS.value);
          if (sValS?.value) setStatsValue(sValS.value);
          if (sLabS?.value) setStatsLabor(sLabS.value);
        }

        // Load featured projects
        const { data: pData } = await supabase.from("Project").select("*").limit(6);
        if (pData) setProjectsList(pData);
      } catch (e) {
        console.error(e);
      }
    }
    loadLandingSettings();
  }, []);

  return (
    <div style={{ fontFamily: "cairo, system-ui, sans-serif", background: "#0b0f19", color: "#f3f4f6", minHeight: "100vh", direction: "rtl" }}>
      {/* NAVBAR */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)", background: "rgba(11, 15, 25, 0.85)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", padding: "14px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={companyLogo} alt="Logo" style={{ height: 44, width: 44, borderRadius: 10, objectFit: "cover", border: "2px solid #d97706" }} onError={(e) => { e.currentTarget.src = "/logo.jpeg"; }} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: "#fff" }}>{companyName}</div>
              <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700 }}>نظام المقاولات والاستثمار العقاري</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href={`tel:${phone}`} style={{ display: "flex", alignItems: "center", gap: 6, color: "#9ca3af", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
              📞 <span>{phone}</span>
            </a>
            <Link to="/login" style={{ background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", color: "#fff", padding: "8px 20px", borderRadius: 10, textDecoration: "none", fontWeight: 800, fontSize: 13, boxShadow: "0 4px 14px rgba(217, 119, 6, 0.3)" }}>
              🔐 دخول النظام
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={{ padding: "80px 24px 60px", maxWidth: 1200, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <div style={{ background: "radial-gradient(circle, rgba(217,119,6,0.15) 0%, rgba(11,15,25,0) 70%)", position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", height: "100%", pointerEvents: "none" }} />
        
        <span style={{ display: "inline-block", background: "rgba(217, 119, 6, 0.15)", border: "1px solid rgba(217, 119, 6, 0.3)", color: "#f59e0b", padding: "6px 16px", borderRadius: 30, fontSize: 12, fontWeight: 800, marginBottom: 20 }}>
          🏗️ الجودة والإتقان في التنفيذ الإنشائي
        </span>

        <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, lineHeight: 1.25, maxWidth: 900, margin: "0 auto 20px", color: "#ffffff", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
          {heroTitle}
        </h1>

        <p style={{ fontSize: 16, color: "#9ca3af", maxWidth: 750, margin: "0 auto 35px", lineHeight: 1.7 }}>
          {heroSubtitle}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
          <a href="#projects" style={{ background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "#fff", padding: "12px 28px", borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: 14, boxShadow: "0 4px 16px rgba(37, 99, 235, 0.3)" }}>
            🏗️ استكشف مشاريعنا
          </a>
          <a href={`https://wa.me/2${phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "12px 28px", borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: 14 }}>
            💬 تواصل معنا واتساب
          </a>
        </div>
      </section>

      {/* STATS COUNTER */}
      <section style={{ maxWidth: 1000, margin: "0 auto 60px", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 30, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#f59e0b" }}>{statsProjects}</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4, fontWeight: 700 }}>مشروعاً إنشائياً منجزاً</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#10b981" }}>{statsValue}</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4, fontWeight: 700 }}>حجم العقود والاستثمارات</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#3b82f6" }}>{statsLabor}</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4, fontWeight: 700 }}>مهندس وفني وعامل موقع</div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section style={{ maxWidth: 1100, margin: "0 auto 80px", padding: "0 24px" }}>
        <h2 style={{ textAlign: "center", fontSize: 24, fontWeight: 900, marginBottom: 40 }}>⚙️ خدماتنا التخصصية في المقاولات</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏗️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: "#fff" }}>المباني والهياكل الخرسانية</h3>
            <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>تنفيذ الهياكل الخرسانية المسلحة، القواعد، الأعضاء والأسقف وفق أحدث الكودات الإنشائية وبأعلى معدلات الأمان.</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🛠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: "#fff" }}>أعمال المباني والتشطيبات</h3>
            <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>أعمال المباني، البياض، النجارة، الحدادة المسلحة، السباكة، الكهرباء، والدهانات الداخلية والخارجية الفاخرة.</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚛</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: "#fff" }}>إدارة وتأجير المعدات</h3>
            <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>أسطول حديث من المعدات والآلات، الحفارات، اللودرات، والسيارات المجهزة لإدارة مواقع العمل بكفاءة وسرعة.</p>
          </div>
        </div>
      </section>

      {/* FEATURED PROJECTS SHOWCASE */}
      <section id="projects" style={{ maxWidth: 1100, margin: "0 auto 80px", padding: "0 24px" }}>
        <h2 style={{ textAlign: "center", fontSize: 24, fontWeight: 900, marginBottom: 40 }}>🏢 نماذج من مشاريعنا التنفيذية</h2>
        
        {projectsList.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, background: "rgba(255,255,255,0.02)", borderRadius: 16, color: "#9ca3af" }}>
            جاري تحديث قائمة المشاريع التنفيذية...
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {projectsList.map((p) => (
              <div key={p.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ background: "#d97706", color: "#fff", padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>{p.code}</span>
                  <span style={{ color: "#10b981", fontSize: 12, fontWeight: 700 }}>{p.status || "جاري التنفيذ"}</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{p.name}</h3>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>العميل / الجهة المريضة: {p.client || "غير محدد"}</div>
                {p.notes && <div style={{ fontSize: 12, color: "#6b7280", borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: 8 }}>{p.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "30px 24px", textAlign: "center", color: "#6b7280", fontSize: 12 }}>
        <div>جميع الحقوق محفوظة © {new Date().getFullYear()} - {companyName}</div>
        <div style={{ marginTop: 6, fontSize: 11 }}>تليفون التواصل: {phone}</div>
      </footer>
    </div>
  );
}
