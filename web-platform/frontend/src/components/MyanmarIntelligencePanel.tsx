import React from "react";
import MyanmarFlowMap from "@/components/MyanmarFlowMap";

const MyanmarIntelligencePanel: React.FC = () => {
  return (
    <div className="myanmar-glass-panel">
      <div className="panel-header">
        <h3 className="panel-title">Logixa Flow</h3>
        <div className="panel-subtitle">Myanmar Intelligence</div>
      </div>

      <div className="panel-stats grid grid-cols-2 gap-4 mt-4">
        <div className="stat">
          <div className="stat-label">Active Logistics</div>
          <div className="stat-value cyan">42</div>
          <div className="stat-small">Data Signal <span className="accent">98%</span></div>
        </div>

        <div className="stat">
          <div className="stat-label">Transports</div>
          <div className="stat-value orange">3</div>
          <div className="stat-small">Transport Routes <span className="muted">—</span></div>
        </div>
      </div>

      <div className="map-container mt-6">
        <MyanmarFlowMap />
      </div>
    </div>
  );
};

export default MyanmarIntelligencePanel;
