const fs = require('fs');
let content = fs.readFileSync('src/components/CaseAnalyzerTab.jsx', 'utf8');

// Add safeStr definition
if (!content.includes('const safeStr =')) {
    content = content.replace(
        '  return (\n    <div className="tab-panel-container case-analyzer-wrapper">',
        `  const safeStr = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="tab-panel-container case-analyzer-wrapper">`
    );
}

// Function to safely wrap expressions in JSX
const toReplace = [
    '{step.action}', '{step.forum}', '{step.timeline}', '{step.court_fee}', '{step.legal_basis}', '{d}',
    '{act}', '{f}', '{ev.date}', '{ev.event}', '{ev.legal_significance}',
    '{issue.issue_number}', '{issue.issue}', '{issue.client_position}', '{issue.likely_outcome}',
    '{law.act_name}', '{law.section}', '{law.new_law_equivalent}', '{law.exact_text}', '{law.applicability}',
    '{law.punishment_or_relief}', '{c.article}', '{c.title}', '{c.relevance}', '{c.enforcement_mechanism}',
    '{step.dependencies}', '{st.step}', '{st.action}', '{st.timeline}', '{st.purpose}', '{s}', '{r}', '{rl}',
    '{ca.their_argument}', '{ca.our_counter}', '{ca.supporting_law}', '{p}', '{qa.anticipated_question}',
    '{qa.suggested_answer}', '{cr.risk}', '{cr.probability}', '{cr.impact}', '{cr.mitigation}',
    '{m.milestone}', '{m.estimated_time_from_now}', '{lim.action}', '{lim.deadline}', '{lim.applicable_law}',
    '{lim.consequence_of_missing}', '{pr.case_name}', '{pr.year}', '{pr.citation}', '{pr.bench_strength}',
    '{pr.ratio_decidendi}', '{pr.applicability_to_case}', '{act.priority}', '{act.action}',
    '{act.responsible}', '{act.deadline}', '{act.consequence_of_inaction}',
    '{analysisResult.executive_summary?.case_overview}',
    '{analysisResult.executive_summary?.client_position_strength || \\'mixed\\'}',
    '{analysisResult.executive_summary?.bottom_line}',
    '{analysisResult.legal_strategy?.primary_strategy?.approach}',
    '{analysisResult.legal_strategy?.primary_strategy?.probability_of_success}',
    '{analysisResult.legal_strategy?.primary_strategy?.description}',
    '{analysisResult.legal_strategy?.alternative_strategy?.approach}',
    '{analysisResult.legal_strategy?.alternative_strategy?.description}',
    '{analysisResult.legal_strategy?.interim_reliefs_strategy?.recommended_application}',
    '{analysisResult.legal_strategy?.settlement_strategy?.optimal_time_to_settle}',
    '{analysisResult.legal_strategy?.settlement_strategy?.settlement_range}',
    '{analysisResult.legal_strategy?.settlement_strategy?.negotiation_leverage}',
    '{analysisResult.risk_assessment?.best_case_scenario}',
    '{analysisResult.risk_assessment?.worst_case_scenario}',
    '{analysisResult.risk_assessment?.most_likely_outcome}',
    '{analysisResult.estimated_timeline?.best_case_duration}',
    '{analysisResult.estimated_timeline?.worst_case_duration}'
];

for (const expr of toReplace) {
    const inner = expr.substring(1, expr.length - 1);
    // Be careful to only match exactly {expr} and not already wrapped ones
    const regex = new RegExp('\\\\{' + inner.replace(/[.*+?^\\${}()|[\\]\\\\]/g, '\\\\$&') + '\\\\}', 'g');
    content = content.replace(regex, '{safeStr(' + inner + ')}');
}

fs.writeFileSync('src/components/CaseAnalyzerTab.jsx', content);
console.log("Replaced unsafe JSX renders");
