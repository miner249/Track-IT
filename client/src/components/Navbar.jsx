import '../styles/Navbar.css';

function Navbar({ currentPage, onNavigate, liveCount }) {
  const tabs = [
    { id: 'home', label: 'My Bets', x: 400 },
    { id: 'my-live-bets', label: 'Live Bets', x: 520 },
    { id: 'scheduled', label: 'Schedule', x: 660 },
  ];

  const activeTab = tabs.find(tab => tab.id === currentPage) || tabs[0];

  return (
    <nav className="navbar">
      <svg 
        width="100%" 
        height="80" 
        viewBox="0 0 1200 80" 
        preserveAspectRatio="xMidYMid meet"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="1200" height="80" fill="#FFFFFF"/>
        
        {/* Logo */}
        <text 
          x="40" 
          y="52" 
          fill="#0052CC" 
          style={{
            fontFamily: 'Inter, Arial, sans-serif',
            fontWeight: 'bold',
            fontSize: '32px',
            letterSpacing: '-1px'
          }}
        >
          TRACK <tspan fill="#16A34A">IT</tspan>
        </text>
        
        {/* Navigation Tabs */}
        <g style={{
          fontFamily: 'Inter, Arial, sans-serif',
          fontWeight: 600,
          fontSize: '14px',
          textTransform: 'uppercase'
        }}>
          {tabs.map((tab) => (
            <g key={tab.id}>
              <text 
                x={tab.x} 
                y="48" 
                fill={currentPage === tab.id ? '#0052CC' : 'rgba(51, 51, 51, 0.8)'}
                style={{ cursor: 'pointer' }}
                onClick={() => onNavigate(tab.id)}
              >
                {tab.label}
              </text>
              {currentPage === tab.id && (
                <rect 
                  x={tab.x} 
                  y="58" 
                  width={tab.label.length * 8} 
                  height="3" 
                  fill="#0052CC"
                />
              )}
            </g>
          ))}
        </g>
        
        {/* Live Indicator */}
        {liveCount > 0 && (
          <>
            <circle cx="1140" cy="43" r="6" fill="#DC2626">
              <animate 
                attributeName="opacity" 
                values="1;0.3;1" 
                dur="2s" 
                repeatCount="indefinite" 
              />
            </circle>
            <text 
              x="1095" 
              y="48" 
              fill="#DC2626" 
              style={{
                fontFamily: 'Inter, Arial, sans-serif',
                fontWeight: 'bold',
                fontSize: '12px'
              }}
            >
              LIVE
            </text>
          </>
        )}
      </svg>
    </nav>
  );
}

export default Navbar;
