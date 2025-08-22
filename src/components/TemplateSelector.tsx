import HelpIcon from "./HelpIcon";
import type { TemplateSpec } from "./SongForm";
import React from "react";

interface Props {
  S: Record<string, React.CSSProperties>;
  templates: Record<string, TemplateSpec>;
  selectedTemplate: string;
  setSelectedTemplate: (name: string) => void;
  applyTemplate: (tpl: TemplateSpec) => void;
}

export default function TemplateSelector({
  S,
  templates,
  selectedTemplate,
  setSelectedTemplate,
  applyTemplate,
}: Props) {
  return (
    <div style={S.panel}>
      <label style={S.label}>
        Song Templates
        <HelpIcon text="Select a preset arrangement and settings" />
      </label>
      <select
        aria-label="Song Templates"
        value={selectedTemplate}
        onChange={(e) => {
          const templateName = e.target.value;
          setSelectedTemplate(templateName);
          if (templateName && templates[templateName]) {
            applyTemplate(templates[templateName]);
          }
        }}
        style={{ ...S.input, padding: "8px 12px" }}
      >
        <option value="">Custom Structure</option>
        {Object.keys(templates).map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
