import React from 'react';
import {
  Landmark,
  Scale,
  Mic,
  Heart,
  BookOpen,
  ShieldAlert,
  Shield,
  Church,
  GraduationCap,
  Bell,
  ClipboardList,
  ShieldCheck
} from 'lucide-react';

const RIGHTS_DATA = [
  { art: 'Article 12–35', Icon: Landmark, title: 'Fundamental Rights Overview', desc: 'Part III of the Constitution guarantees six categories of fundamental rights to all citizens.' },
  { art: 'Article 14', Icon: Scale, title: 'Right to Equality', desc: 'Equality before law and equal protection. No discrimination by State on grounds of religion, race, caste, sex, or birth.' },
  { art: 'Article 19', Icon: Mic, title: 'Freedom of Speech', desc: 'Freedom of speech & expression, assembly, association, movement, residence, and profession.' },
  { art: 'Article 21', Icon: Heart, title: 'Right to Life & Liberty', desc: 'No person shall be deprived of life or personal liberty except by procedure established by law.' },
  { art: 'Article 21A', Icon: BookOpen, title: 'Right to Education', desc: 'Free and compulsory education for all children between 6–14 years of age.' },
  { art: 'Article 22', Icon: ShieldAlert, title: 'Protection on Arrest', desc: 'Right to be informed of grounds of arrest, consult a legal practitioner, and be produced before magistrate within 24 hours.' },
  { art: 'Article 23–24', Icon: Shield, title: 'Rights Against Exploitation', desc: 'Prohibition of traffic in human beings, forced labour, and employment of children in hazardous occupations.' },
  { art: 'Article 25–28', Icon: Church, title: 'Religious Freedom', desc: 'Freedom of conscience, right to freely profess, practice, and propagate religion.' },
  { art: 'Article 29–30', Icon: GraduationCap, title: 'Cultural & Educational Rights', desc: 'Protection of interests of minorities; right to establish and administer educational institutions.' },
  { art: 'Article 32', Icon: Bell, title: 'Right to Constitutional Remedies', desc: '"Heart and soul of the Constitution." Right to move Supreme Court for enforcement of fundamental rights. Writ jurisdiction.' },
  { art: 'RTI Act 2005', Icon: ClipboardList, title: 'Right to Information', desc: 'Every citizen can request information from public authorities within 30 days.' },
  { art: 'POSH Act 2013', Icon: ShieldCheck, title: 'Protection at Workplace', desc: 'Prevention, prohibition, and redressal of sexual harassment at workplace for women.' }
];

export default function RightsTab({ onExploreRight }) {
  return (
    <div className="tab-panel-container">
      <div className="tab-panel-header">
        <h2>Know Your Rights</h2>
        <p>Fundamental Rights guaranteed by the Constitution of India. Click any card to explore with AI.</p>
      </div>

      <div className="rights-grid">
        {RIGHTS_DATA.map(({ art, Icon, title, desc }, i) => (
          <div
            key={i}
            className="right-card"
            onClick={() => onExploreRight(`Explain ${title} (${art}) in Indian law. Include landmark Supreme Court judgments, how to enforce this right, and practical steps a citizen can take.`)}
          >
            <div className="art-ref font-mono">{art}</div>
            <div className="right-card-icon">
              <Icon size={24} strokeWidth={1.5} />
            </div>
            <h3>{title}</h3>
            <p>{desc}</p>
            <button className="expand-btn">Ask AI about this →</button>
          </div>
        ))}
      </div>
    </div>
  );
}