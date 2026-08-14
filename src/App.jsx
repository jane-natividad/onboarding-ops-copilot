import { useState } from "react";

const RISK_KEYWORDS = {
  red: ["urgent", "asap", "critical", "failed", "error", "missing", "overdue", "blocked", "immediate", "problem", "cannot", "unable"],
  amber: ["delay", "delayed", "waiting", "pending", "unclear", "unsure", "risk", "concern", "slow", "issue", "not sure"],
};

function getRisk(text) {
  const lower = text.toLowerCase();
  if (RISK_KEYWORDS.red.some((k) => lower.includes(k))) return "high";
  if (RISK_KEYWORDS.amber.some((k) => lower.includes(k))) return "medium";
  return "low";
}

function extractExperiment(text) {
  const lower = text.toLowerCase();
  if (lower.includes("yeast surface display")) return "Yeast Surface Display";
  if (lower.includes("flow cytometry") || lower.includes("facs")) return "Flow Cytometry / FACS";
  if (lower.includes("elisa")) return "ELISA Assay";
  if (lower.includes("ngs") || lower.includes("sequencing")) return "NGS Sequencing";
  if (lower.includes("screen")) return "High-Throughput Screen";
  if (lower.includes("assay")) return "Custom Assay";
  if (lower.includes("binding")) return "Binding Assay";
  return "Experiment type not specified";
}

function extractDeadline(text) {
  const dateMatch = text.match(/\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b/);
  if (dateMatch) return dateMatch[0];
  if (/this week/i.test(text)) return "This week";
  if (/next week/i.test(text)) return "Next week";
  if (/monday/i.test(text)) return "Monday";
  if (/tuesday/i.test(text)) return "Tuesday";
  if (/wednesday/i.test(text)) return "Wednesday";
  if (/thursday/i.test(text)) return "Thursday";
  if (/friday/i.test(text)) return "Friday";
  if (/asap|urgent|immediately/i.test(text)) return "ASAP";
  return "No deadline specified";
}

function extractMissing(text) {
  const items = [];
  if (/missing.{0,60}(sequence|protein)|protein.{0,30}(missing|not.{0,10}confirm|don.t.{0,10}have|waiting)|don.t.{0,20}have.{0,20}(sequence|protein)/i.test(text)) items.push("Target protein sequence");
  if (/(not sure|unclear|missing|don.t know).{0,40}(sample|quantity|amount)|sample.{0,30}(not sure|unclear|missing)/i.test(text)) items.push("Sample quantity / concentration");
  if (/no.{0,20}confirm|not confirm|awaiting confirm|waiting.{0,20}confirm/i.test(text)) items.push("Customer confirmation");
  if (/missing.{0,40}(buffer|condition|protocol)/i.test(text)) items.push("Protocol / buffer conditions");
  if (/missing.{0,40}(contact|email|name)/i.test(text)) items.push("Customer contact details");
  if (items.length === 0 && /missing|unclear|don't have|do not have|need/i.test(text)) items.push("Additional information required — review message");
  return items;
}

function calcLabScore(missingItems) {
  let score = 100;
  if (missingItems.some(i => i.toLowerCase().includes("protein sequence"))) score -= 20;
  if (missingItems.some(i => i.toLowerCase().includes("sample"))) score -= 10;
  if (missingItems.some(i => i.toLowerCase().includes("confirmation"))) score -= 15;
  if (missingItems.some(i => i.toLowerCase().includes("protocol"))) score -= 12;
  if (missingItems.some(i => i.toLowerCase().includes("contact"))) score -= 8;
  if (missingItems.some(i => i.toLowerCase().includes("additional"))) score -= 15;
  return Math.max(0, score);
}

function getScoreStatus(score) {
  if (score >= 85) return { label: "Ready to start", color: "#166534", bg: "#dcfce7", border: "#86efac" };
  if (score >= 60) return { label: "Nearly ready", color: "#92400e", bg: "#fef3c7", border: "#fcd34d" };
  return { label: "Not ready", color: "#991b1b", bg: "#fee2e2", border: "#fca5a5" };
}

function calcImpact(risk, missingItems, deadline) {
  const isUrgent = deadline === "ASAP" || deadline === "This week" || deadline === "Wednesday" || deadline === "Monday" || deadline === "Tuesday";
  if (risk === "high" && isUrgent) return { level: "Critical", detail: "Immediate action required. Risk of missed SLA and customer escalation.", color: "#991b1b", bg: "#fee2e2" };
  if (risk === "high") return { level: "High", detail: "Significant blockers present. Resolve missing items before scheduling lab time.", color: "#92400e", bg: "#fef3c7" };
  if (risk === "medium") return { level: "Medium", detail: "Some gaps need resolving. Can proceed to planning but not lab execution.", color: "#1e40af", bg: "#dbeafe" };
  return { level: "Low", detail: "Experiment appears well-specified. Proceed to scheduling.", color: "#166534", bg: "#dcfce7" };
}

function getActions(missingItems, risk, deadline) {
  const actions = [];
  if (missingItems.some(i => i.toLowerCase().includes("protein sequence"))) actions.push("Request target protein sequence from customer immediately");
  if (missingItems.some(i => i.toLowerCase().includes("sample"))) actions.push("Clarify sample quantity and concentration requirements");
  if (missingItems.some(i => i.toLowerCase().includes("confirmation"))) actions.push("Send confirmation request to customer with deadline");
  if (missingItems.some(i => i.toLowerCase().includes("protocol"))) actions.push("Share standard protocol template with customer for review");
  if (risk === "high") actions.push("Flag to lab manager — do not schedule until blockers resolved");
  if (deadline === "ASAP" || deadline === "This week") actions.push("Prioritise in this week's lab queue once information received");
  if (actions.length === 0) actions.push("Review message with lab team", "Confirm experiment parameters", "Schedule intake call if needed");
  return actions;
}

function generateEmail(experiment, deadline, missingItems) {
  const missingList = missingItems.length > 0
    ? missingItems.map(i => `- ${i}`).join("\n")
    : "- No outstanding items at this time";
  return `Subject: Re: ${experiment} — Information Required

Hi,

Thank you for reaching out about your upcoming ${experiment} project. We're excited to support your work.

To proceed with scheduling your experiment${deadline !== "No deadline specified" ? ` by ${deadline}` : ""}, we need the following information:

${missingList}

Once we receive this, we can confirm your slot in our pipeline and begin preparation. Please don't hesitate to reach out if you have any questions.

Best regards,
Lab Operations Team`;
}

const Card = ({ title, children, accent }) => (
  <div style={{ background: "#fff", border: `1px solid ${accent || "#e5e7eb"}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
    <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", background: "#fafafa", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{title}</span>
    </div>
    <div style={{ padding: "16px 20px" }}>{children}</div>
  </div>
);

const ScoreBar = ({ score }) => {
  const status = getScoreStatus(score);
  const segments = [
    { label: "Protein sequence", points: 20, missing: score <= 80 },
    { label: "Sample quantity", points: 10, missing: score <= 70 },
    { label: "Customer confirmation", points: 15, missing: score <= 85 },
  ];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 42, fontWeight: 700, color: status.color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 18, color: "#9ca3af", marginBottom: 4 }}>/100</span>
        <span style={{ fontSize: 13, fontWeight: 500, padding: "4px 10px", borderRadius: 20, background: status.bg, color: status.color, border: `1px solid ${status.border}`, marginBottom: 4 }}>{status.label}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "#f3f4f6", overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: "100%", width: `${score}%`, borderRadius: 4, background: score >= 85 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444", transition: "width 0.5s" }} />
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 500 }}>Score deductions</div>
      {segments.map((s, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < segments.length - 1 ? "1px solid #f9fafb" : "none" }}>
          <span style={{ fontSize: 13, color: s.missing ? "#991b1b" : "#6b7280" }}>{s.label}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: s.missing ? "#991b1b" : "#22c55e" }}>{s.missing ? `-${s.points} pts` : "✓ ok"}</span>
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  function handleAnalyse() {
    if (!input.trim()) return;
    const experiment = extractExperiment(input);
    const deadline = extractDeadline(input);
    const missing = extractMissing(input);
    const risk = getRisk(input);
    const score = calcLabScore(missing);
    const impact = calcImpact(risk, missing, deadline);
    const actions = getActions(missing, risk, deadline);
    const email = generateEmail(experiment, deadline, missing);
    setResult({ experiment, deadline, missing, risk, score, impact, actions, email });
    setCopied(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(result.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const riskStyle = {
    high: { label: "High Risk", color: "#991b1b", bg: "#fee2e2", border: "#fca5a5" },
    medium: { label: "Needs Attention", color: "#92400e", bg: "#fef3c7", border: "#fcd34d" },
    low: { label: "On Track", color: "#166534", bg: "#dcfce7", border: "#86efac" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ borderBottom: "1px solid #e5e7eb", background: "#fff", padding: "0 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Onboarding Ops Copilot</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>Operations Copilot</div>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", padding: "4px 10px", borderRadius: 6 }}>Internal tool · v1.0</div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
        {!result ? (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>Customer Onboarding Copilot</h1>
              <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Paste a customer message. Get instant operational analysis, risk assessment, and a draft follow-up email.</p>
            </div>
            <Card title="Paste customer message">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste customer email or onboarding message here..."
                style={{ width: "100%", minHeight: 200, padding: 14, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit", lineHeight: 1.6 }}
              />
              <button
                onClick={handleAnalyse}
                style={{ marginTop: 12, padding: "10px 24px", background: "#111827", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}
              >
                Analyse →
              </button>
            </Card>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, padding: "5px 14px", borderRadius: 20, background: riskStyle[result.risk].bg, color: riskStyle[result.risk].color, border: `1px solid ${riskStyle[result.risk].border}` }}>
                  {riskStyle[result.risk].label}
                </span>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Lab Readiness: {result.score}/100</span>
              </div>
              <button onClick={() => setResult(null)} style={{ fontSize: 13, color: "#6b7280", background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>
                ← New analysis
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 0 }}>
              <Card title="Experiment type">
                <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 6 }}>{result.experiment}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Detected from customer message</div>
              </Card>
              <Card title="Deadline">
                <div style={{ fontSize: 15, fontWeight: 600, color: result.deadline === "No deadline specified" ? "#9ca3af" : "#111827", marginBottom: 6 }}>{result.deadline}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Target date for experiment start</div>
              </Card>
            </div>

            <Card title="Missing information" accent={result.missing.length > 0 ? "#fca5a5" : "#86efac"}>
              {result.missing.length === 0 ? (
                <div style={{ fontSize: 14, color: "#166534" }}>✓ No missing information detected</div>
              ) : (
                result.missing.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < result.missing.length - 1 ? "1px solid #fef2f2" : "none" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: "#374151" }}>{item}</span>
                  </div>
                ))
              )}
            </Card>

            <Card title="Lab readiness score">
              <ScoreBar score={result.score} />
            </Card>

            <Card title="Operational impact" accent={result.impact.bg}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: result.impact.bg, color: result.impact.color }}>{result.impact.level}</span>
              </div>
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{result.impact.detail}</div>
            </Card>

            <Card title="Recommended actions">
              {result.actions.map((action, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: i < result.actions.length - 1 ? "1px solid #f9fafb" : "none" }}>
                  <span style={{ minWidth: 22, height: 22, borderRadius: "50%", background: "#f3f4f6", color: "#374151", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                  <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{action}</span>
                </div>
              ))}
            </Card>

            <Card title="Draft customer follow-up email">
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button onClick={handleCopy} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: copied ? "#dcfce7" : "#fff", color: copied ? "#166534" : "#374151", cursor: "pointer" }}>
                  {copied ? "✓ Copied" : "Copy email"}
                </button>
              </div>
              <pre style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit", background: "#f9fafb", padding: 16, borderRadius: 8, border: "1px solid #f3f4f6" }}>
                {result.email}
              </pre>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
