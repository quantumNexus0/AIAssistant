import React from 'react';

const RIGHTS_DATA = [
  { art: 'Article 12–35', title: 'Fundamental Rights Overview', icon: '🏛', desc: 'Part III of the Constitution guarantees six categories of fundamental rights to all citizens.' },
  { art: 'Article 14', title: 'Right to Equality', icon: '⚖️', desc: 'Equality before law and equal protection. No discrimination by State on grounds of religion, race, caste, sex, or birth.' },
  { art: 'Article 19', title: 'Freedom of Speech', icon: '🗣', desc: 'Freedom of speech & expression, assembly, association, movement, residence, and profession.' },
  { art: 'Article 21', title: 'Right to Life & Liberty', icon: '💙', desc: 'No person shall be deprived of life or personal liberty except by procedure established by law.' },
  { art: 'Article 21A', title: 'Right to Education', icon: '📚', desc: 'Free and compulsory education for all children between 6–14 years of age.' },
  { art: 'Article 22', title: 'Protection on Arrest', icon: '🚔', desc: 'Right to be informed of grounds of arrest, consult a legal practitioner, and be produced before magistrate within 24 hours.' },
  { art: 'Article 23–24', title: 'Rights Against Exploitation', icon: '🛡', desc: 'Prohibition of traffic in human beings, forced labour, and employment of children in hazardous occupations.' },
  { art: 'Article 25–28', title: 'Religious Freedom', icon: '🙏', desc: 'Freedom of conscience, right to freely profess, practice, and propagate religion.' },
  { art: 'Article 29–30', title: 'Cultural & Educational Rights', icon: '🎓', desc: 'Protection of interests of minorities; right to establish and administer educational institutions.' },
  { art: 'Article 32', title: 'Right to Constitutional Remedies', icon: '🔔', desc: '"Heart and soul of the Constitution." Right to move Supreme Court for enforcement of fundamental rights. Writ jurisdiction.' },
  { art: 'RTI Act 2005', title: 'Right to Information', icon: '📋', desc: 'Every citizen can request information from public authorities within 30 days.' },
  { art: 'POSH Act 2013', title: 'Protection at Workplace', icon: '👩‍💼', desc: 'Prevention, prohibition, and redressal of sexual harassment at workplace for women.' }
];

export default function RightsTab({ onExploreRight }) {
  return (
    <div className="tab-panel-container">
      <div className="tab-panel-header">
        <h2>Know Your Rights</h2>
        <p>Fundamental Rights guaranteed by the Constitution of India. Click any card to explore with AI.</p>
      </div>

      <div className="rights-grid">
        {RIGHTS_DATA.map((r, i) => (
          <div 
            key={i} 
            className="right-card"
            onClick={() => onExploreRight(`Explain ${r.title} (${r.art}) in Indian law. Include landmark Supreme Court judgments, how to enforce this right, and practical steps a citizen can take.`)}
          >
            <div className="art-ref font-mono">{r.art}</div>
            <div className="right-card-icon">{r.icon}</div>
            <h3>{r.title}</h3>
            <p>{r.desc}</p>
            <button className="expand-btn">Ask AI about this →</button>
          </div>
        ))}
      </div>
    </div>
  );
}
